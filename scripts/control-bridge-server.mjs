#!/usr/bin/env node
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(join(dirname(fileURLToPath(import.meta.url)), ".."));
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";
const stateDir = join(repoRoot, "artifacts", "control-bridge");
const statePath = join(stateDir, "state.json");
const haQueuePath = join(stateDir, "ha-command-queue.json");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".mp4": "video/mp4",
  ".txt": "text/plain; charset=utf-8"
};

const COMMANDS = {
  "sync-control-live": { cmd: process.execPath, args: [join(repoRoot, "scripts/sync-control-live-metrics.mjs")] },
  verify: { cmd: process.execPath, args: [join(repoRoot, "scripts/verify-build-safety.mjs")] },
  "check-live-links": { cmd: process.execPath, args: [join(repoRoot, "scripts/sync-live-link-status.mjs")] },
  "generate-upload-queue": { cmd: process.execPath, args: [join(repoRoot, "scripts/generate-upload-queue.mjs")] },
  "generate-upload-batches": { cmd: process.execPath, args: [join(repoRoot, "scripts/prepare-shirtee-upload-batches.mjs")] },
  "generate-shirtee-api-request": { cmd: process.execPath, args: [join(repoRoot, "scripts/generate-shirtee-api-request.mjs")] },
  "write-hermes-spool": { cmd: process.execPath, args: [join(repoRoot, "scripts/write-hermes-spool-message.mjs")] },
  "check-links": { cmd: "/bin/bash", args: [join(repoRoot, "scripts/check-shirtee-links.sh")] }
};

const ACTIONS = {
  "ha.toggle-device": async ({ entityId, nextState }) => ({ ok: true, entityId, nextState, mode: "queued-local" }),
  "ha.run-scene": async ({ room, scene }) => ({ ok: true, room, scene, mode: "queued-local" }),
  "ha.run-automation": async ({ automation, mode }) => ({ ok: true, automation, automationMode: mode, mode: "queued-local" }),
  "website.page-status": async ({ pageId, status }) => ({ ok: true, pageId, status }),
  "website.page-note": async ({ pageId, note }) => ({ ok: true, pageId, note }),
  "website.page-lock": async ({ pageId, locked }) => ({ ok: true, pageId, locked: Boolean(locked) }),
  "shop.prepare-draft": async ({ draftId, stage }) => ({ ok: true, draftId, stage }),
  "shop.draft-status": async ({ draftId, status }) => ({ ok: true, draftId, status }),
  "content.plan-entry": async ({ id, status, owner }) => ({ ok: true, id, status, owner }),
  "ops.run-subagent": async ({ agentId, mode }) => ({ ok: true, agentId, mode }),
  "ops.vault-writeback": async ({ nodeId, mode }) => ({ ok: true, nodeId, mode })
};

const ACTION_STATE_PATCHERS = {
  "ha.toggle-device": (payload, result) => ({
    kind: "ha-room",
    id: payload.room,
    patch: {
      [`device:${payload.entityId}`]: payload.nextState,
      [`deviceLabel:${payload.entityId}`]: payload.nextState === "on" ? "An" : payload.nextState === "off" ? "Aus" : mapStatusLabel(payload.nextState),
      state: payload.nextState === "off" ? "connected" : "live",
      stateLabel: payload.nextState === "off" ? "Verbunden" : "Live",
      lastAction: result.action || "ha.toggle-device"
    }
  }),
  "ha.run-scene": (payload, result) => ({
    kind: "ha-room",
    id: payload.room,
    patch: {
      activeScene: payload.scene,
      activeSceneLabel: String(payload.scene || "").trim() || "Szene",
      state: "live",
      stateLabel: "Live",
      lastAction: result.action || "ha.run-scene"
    }
  }),
  "ha.run-automation": (payload, result) => ({
    kind: "ha-automation",
    id: payload.automation,
    patch: {
      enabled: payload.mode !== "pause",
      lastMode: payload.mode,
      state: payload.mode === "pause" ? "warn" : payload.mode === "run" ? "live" : "connected",
      stateLabel: payload.mode === "pause" ? "Pausiert" : payload.mode === "run" ? "Aktiv" : "Verbunden"
    }
  }),
  "website.page-status": (payload, result) => ({
    kind: "website-page",
    id: payload.pageId,
    patch: {
      status: payload.status,
      statusLabel: mapStatusLabel(payload.status),
      lastAction: result.action || "website.page-status"
    }
  }),
  "website.page-note": (payload, result) => ({
    kind: "website-page",
    id: payload.pageId,
    patch: {
      note: String(payload.note || "").trim(),
      lastAction: result.action || "website.page-note"
    }
  }),
  "website.page-lock": (payload, result) => ({
    kind: "website-page",
    id: payload.pageId,
    patch: {
      draftLock: Boolean(payload.locked),
      lockLabel: Boolean(payload.locked) ? "Gesperrt" : "Offen",
      lastAction: result.action || "website.page-lock"
    }
  }),
  "shop.prepare-draft": (payload, result) => ({
    kind: "shop-draft",
    id: payload.draftId,
    patch: {
      stage: payload.stage,
      stageLabel: mapStageLabel(payload.stage),
      lastAction: result.action || "shop.prepare-draft"
    }
  }),
  "shop.draft-status": (payload, result) => ({
    kind: "shop-draft",
    id: payload.draftId,
    patch: {
      state: payload.status,
      stateLabel: mapStatusLabel(payload.status),
      lastAction: result.action || "shop.draft-status"
    }
  }),
  "content.plan-entry": (payload, result) => ({
    kind: "planner-entry",
    id: payload.id,
    patch: {
      status: payload.status,
      statusLabel: mapStatusLabel(payload.status),
      owner: payload.owner || null,
      lastAction: result.action || "content.plan-entry"
    }
  }),
  "ops.run-subagent": (payload, result) => ({
    kind: "subagent",
    id: payload.agentId,
    patch: {
      mode: payload.mode,
      modeLabel: mapModeLabel(payload.mode),
      state: payload.mode === "argus-first" ? "support" : "live",
      stateLabel: payload.mode === "argus-first" ? "Argus zuerst" : "Cloud-first",
      lastAction: result.action || "ops.run-subagent"
    }
  }),
  "ops.vault-writeback": (payload, result) => ({
    kind: "vault-node",
    id: payload.nodeId,
    patch: {
      mode: payload.mode,
      modeLabel: mapModeLabel(payload.mode),
      state: payload.mode === "summary-only" ? "connected" : "sync",
      stateLabel: payload.mode === "summary-only" ? "Summary-only" : "Writeback",
      lastAction: result.action || "ops.vault-writeback"
    }
  })
};

function ensureStateFiles() {
  mkdirSync(stateDir, { recursive: true });
  if (!existsSync(statePath)) {
    writeFileSync(statePath, JSON.stringify({ updatedAt: null, controls: {}, actions: [], commands: [] }, null, 2), "utf8");
  }
  if (!existsSync(haQueuePath)) {
    writeFileSync(haQueuePath, JSON.stringify({ updatedAt: null, queue: [] }, null, 2), "utf8");
  }
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function mapStatusLabel(value) {
  const lookup = {
    live: "Live",
    connected: "Verbunden",
    ready: "Bereit",
    draft: "Entwurf",
    review: "Review",
    approved: "Freigegeben",
    scheduled: "Eingeplant",
    submitted: "Pruefung",
    uploaded: "Hochgeladen",
    pending: "Offen",
    warn: "Pruefen",
    support: "Support",
    sync: "Sync"
  };
  return lookup[String(value || "").toLowerCase()] || String(value || "Aktualisiert");
}

function mapStageLabel(value) {
  const lookup = {
    "batch-prepared": "Batch bereit",
    queue: "Queue",
    draft: "Entwurf",
    review: "Review",
    live: "Live"
  };
  return lookup[String(value || "").toLowerCase()] || String(value || "Aktualisiert");
}

function mapModeLabel(value) {
  const lookup = {
    "cloud-first": "Cloud-first",
    "argus-first": "Argus zuerst",
    writeback: "Writeback",
    "summary-only": "Summary-only",
    run: "Ausfuehren",
    pause: "Pausieren"
  };
  return lookup[String(value || "").toLowerCase()] || String(value || "Aktualisiert");
}

function applyControlStatePatch(state, kind, id, patch) {
  if (!kind || !id || !patch || typeof patch !== "object") {
    return state;
  }
  state.controls = state.controls && typeof state.controls === "object" ? state.controls : {};
  state.controls[kind] = state.controls[kind] && typeof state.controls[kind] === "object" ? state.controls[kind] : {};
  state.controls[kind][id] = {
    ...(state.controls[kind][id] || {}),
    ...patch,
    updatedAt: new Date().toISOString()
  };
  return state;
}

function json(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

function notFound(response) {
  json(response, 404, { error: "not_found" });
}

function badRequest(response, message) {
  json(response, 400, { error: "bad_request", message });
}

function readBody(request) {
  return new Promise((resolveBody, rejectBody) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => resolveBody(Buffer.concat(chunks).toString("utf8")));
    request.on("error", rejectBody);
  });
}

async function readJsonBody(request) {
  const body = await readBody(request);
  if (!body.trim()) return {};
  return JSON.parse(body);
}

function runCommand(name, extraArgs = []) {
  const spec = COMMANDS[name];
  if (!spec) {
    return Promise.resolve({ ok: false, code: 127, stdout: "", stderr: `Unknown command: ${name}` });
  }

  return new Promise((resolveRun) => {
    const child = spawn(spec.cmd, [...spec.args, ...extraArgs], {
      cwd: repoRoot,
      env: process.env
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("close", (code) => {
      resolveRun({ ok: code === 0, code: code ?? 1, stdout, stderr });
    });
  });
}

async function runAction(name, payload) {
  const action = ACTIONS[name];
  if (!action) {
    return { ok: false, error: `Unknown action: ${name}` };
  }

  try {
    const result = await action(payload);
    if (!result.ok) return result;
    const state = readJson(statePath, { updatedAt: null, controls: {}, actions: [], commands: [] });
    const patcher = ACTION_STATE_PATCHERS[name];
    if (patcher) {
      const nextPatch = patcher(payload, { ...result, action: name });
      if (nextPatch?.kind && nextPatch?.id && nextPatch?.patch) {
        applyControlStatePatch(state, nextPatch.kind, nextPatch.id, nextPatch.patch);
      }
    }
    state.actions = Array.isArray(state.actions) ? state.actions : [];
    state.actions.push({
      id: `action-${Date.now()}`,
      action: name,
      payload,
      createdAt: new Date().toISOString(),
      status: "completed"
    });
    state.actions = state.actions.slice(-24);
    state.updatedAt = new Date().toISOString();
    writeJson(statePath, state);
    return result;
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown action error" };
  }
}

function sanitizePath(urlPath) {
  const cleaned = decodeURIComponent(urlPath.split("?")[0]);
  const candidate = cleaned === "/" ? "/index.html" : cleaned;
  const safePath = normalize(candidate).replace(/^(\.\.[/\\])+/, "");
  return join(repoRoot, safePath.startsWith("/") ? safePath.slice(1) : safePath);
}

function serveStatic(requestPath, response) {
  let filePath = sanitizePath(requestPath);

  if (requestPath === "/control" || requestPath === "/control/") {
    filePath = join(repoRoot, "control", "index.html");
  }

  if (!existsSync(filePath)) {
    return false;
  }

  const stats = statSync(filePath);
  if (stats.isDirectory()) {
    const indexPath = join(filePath, "index.html");
    if (!existsSync(indexPath)) return false;
    filePath = indexPath;
  }

  const type = MIME_TYPES[extname(filePath).toLowerCase()] || "application/octet-stream";
  response.writeHead(200, {
    "content-type": type,
    "cache-control": requestPath.includes("/control/js/live-metrics.json") ? "no-store" : "public, max-age=60"
  });
  createReadStream(filePath).pipe(response);
  return true;
}

async function handleApi(request, response, url) {
  ensureStateFiles();

  if (request.method === "GET" && url.pathname === "/api/control/health") {
    return json(response, 200, {
      ok: true,
      mode: "local-bridge",
      availableCommands: Object.keys(COMMANDS),
      updatedAt: new Date().toISOString()
    });
  }

  if (request.method === "GET" && url.pathname === "/api/control/state") {
    return json(response, 200, readJson(statePath, { updatedAt: null, controls: {} }));
  }

  if (request.method === "POST" && url.pathname === "/api/control/state") {
    const body = await readJsonBody(request);
    if (!body.kind || !body.id || !body.controlId) {
      return badRequest(response, "kind, id und controlId sind erforderlich.");
    }
    const state = readJson(statePath, { updatedAt: null, controls: {} });
    state.controls[body.kind] = state.controls[body.kind] || {};
    state.controls[body.kind][body.id] = state.controls[body.kind][body.id] || {};
    state.controls[body.kind][body.id][body.controlId] = Boolean(body.value);
    state.updatedAt = new Date().toISOString();
    writeJson(statePath, state);
    return json(response, 200, { ok: true, state });
  }

  if (request.method === "POST" && url.pathname === "/api/control/command") {
    const body = await readJsonBody(request);
    if (!body.command) {
      return badRequest(response, "command ist erforderlich.");
    }
    const result = await runCommand(body.command);
    const state = readJson(statePath, { updatedAt: null, controls: {}, actions: [], commands: [] });
    state.commands = Array.isArray(state.commands) ? state.commands : [];
    state.commands.push({
      id: `command-${Date.now()}`,
      command: body.command,
      createdAt: new Date().toISOString(),
      status: result.ok ? "completed" : "failed"
    });
    state.commands = state.commands.slice(-24);
    state.updatedAt = new Date().toISOString();
    writeJson(statePath, state);
    return json(response, result.ok ? 200 : 500, result);
  }

  if (request.method === "POST" && url.pathname === "/api/control/action") {
    const body = await readJsonBody(request);
    const result = await runAction(body.action, body.payload || {});
    return json(response, result.ok ? 200 : 500, result);
  }

  if (request.method === "POST" && url.pathname === "/api/control/hermes-spool") {
    const body = await readJsonBody(request);
    if (!String(body.message || "").trim()) {
      return badRequest(response, "message ist erforderlich.");
    }
    const extraArgs = [`--message=${String(body.message)}`];
    if (body.chatId) {
      extraArgs.push(`--chat-id=${String(body.chatId)}`);
    }
    const result = await runCommand("write-hermes-spool", extraArgs);
    return json(response, result.ok ? 200 : 500, result);
  }

  if (request.method === "GET" && url.pathname === "/api/control/artifact") {
    const kind = url.searchParams.get("kind");
    const map = {
      "upload-queue": join(repoRoot, "artifacts", "upload-queue", "shirtee-upload-queue.json"),
      "batch-manifest": join(repoRoot, "artifacts", "upload-batches", "manifest.json"),
      "shirtee-request": join(repoRoot, "artifacts", "requests", "shirtee-api-request.md"),
      "live-metrics": join(repoRoot, "control", "js", "live-metrics.json")
    };
    const filePath = map[kind];
    if (!filePath || !existsSync(filePath)) {
      return notFound(response);
    }
    return json(response, 200, {
      ok: true,
      kind,
      path: filePath.replace(`${repoRoot}/`, ""),
      content: readFileSync(filePath, "utf8")
    });
  }

  if (request.method === "POST" && url.pathname === "/api/control/ha-queue") {
    const body = await readJsonBody(request);
    if (!body.room && !body.automation) {
      return badRequest(response, "room oder automation ist erforderlich.");
    }
    const queue = readJson(haQueuePath, { updatedAt: null, queue: [] });
    queue.queue.push({
      id: `ha-${Date.now()}`,
      createdAt: new Date().toISOString(),
      kind: body.automation ? "automation" : "room",
      room: body.room || null,
      automation: body.automation || null,
      requestedState: body.payload?.state || null,
      source: "control-dashboard",
      status: "queued",
      payload: body.payload || null
    });
    queue.updatedAt = new Date().toISOString();
    writeJson(haQueuePath, queue);
    return json(response, 200, { ok: true, queued: queue.queue.at(-1) });
  }

  return notFound(response);
}

createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://127.0.0.1:${port}`);
    if (url.pathname.startsWith("/api/control/")) {
      await handleApi(request, response, url);
      return;
    }

    if (serveStatic(url.pathname, response)) {
      return;
    }

    notFound(response);
  } catch (error) {
    json(response, 500, {
      error: "server_error",
      message: error instanceof Error ? error.message : "unbekannter Fehler"
    });
  }
}).listen(port, host, () => {
  ensureStateFiles();
  console.log(`Control bridge listening on http://${host}:${port}`);
});
