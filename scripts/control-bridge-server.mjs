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
const overridesPath = join(repoRoot, "assets", "data", "control-overrides.json");

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
  "ha.service-call": async (payload) => runHaServiceCall(payload),
  "website.page-status": async ({ pageId, status }) => ({ ok: true, pageId, status }),
  "website.page-note": async ({ pageId, note }) => ({ ok: true, pageId, note }),
  "website.page-lock": async ({ pageId, locked }) => ({ ok: true, pageId, locked: Boolean(locked) }),
  "website.save-page-content": async ({ pageId, fields }) => savePageContent(pageId, fields),
  "shop.prepare-draft": async ({ draftId, stage }) => ({ ok: true, draftId, stage }),
  "shop.draft-status": async ({ draftId, status }) => ({ ok: true, draftId, status }),
  "shop.save-item": async ({ itemId, fields }) => saveShopItem(itemId, fields),
  "content.plan-entry": async ({ id, status, owner }) => ({ ok: true, id, status, owner }),
  "content.save-plan-entry": async ({ id, fields }) => savePlannerEntry(id, fields),
  "content.save-idea": async ({ id, fields }) => savePlannerIdea(id, fields),
  "content.queue-upload": async ({ id, payload }) => queueTikTokUpload(id, payload),
  "content.confirm-upload": async ({ uploadId, status, note }) => confirmTikTokUpload(uploadId, status, note),
  "social.save-account": async ({ accountId, fields }) => saveSocialAccount(accountId, fields),
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
  "ha.service-call": (payload, result) => ({
    kind: "ha-runtime",
    id: payload.room || payload.entityId || payload.service || "service-call",
    patch: {
      state: result.mode === "remote-ha" ? "live" : "ready",
      stateLabel: result.mode === "remote-ha" ? "Servicecall gesendet" : "Queue gespeichert",
      lastAction: "ha.service-call"
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
  "website.save-page-content": (payload, result) => ({
    kind: "website-page",
    id: payload.pageId,
    patch: {
      contentSavedAt: result.savedAt,
      contentMode: result.mode,
      ...Object.fromEntries(
        Object.entries(payload.fields || {}).map(([key, value]) => [key, value])
      ),
      lastAction: result.action || "website.save-page-content"
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
  "shop.save-item": (payload, result) => ({
    kind: "shop-draft",
    id: payload.itemId,
    patch: {
      contentSavedAt: result.savedAt,
      ...Object.fromEntries(
        Object.entries(payload.fields || {}).map(([key, value]) => [key, value])
      ),
      lastAction: result.action || "shop.save-item"
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
  "content.save-plan-entry": (payload, result) => ({
    kind: "planner-entry",
    id: payload.id,
    patch: {
      ...Object.fromEntries(
        Object.entries(payload.fields || {}).map(([key, value]) => [key, value])
      ),
      contentSavedAt: result.savedAt,
      lastAction: result.action || "content.save-plan-entry"
    }
  }),
  "content.save-idea": (payload, result) => ({
    kind: "planner-idea",
    id: payload.id,
    patch: {
      ...Object.fromEntries(
        Object.entries(payload.fields || {}).map(([key, value]) => [key, value])
      ),
      contentSavedAt: result.savedAt,
      lastAction: result.action || "content.save-idea"
    }
  }),
  "content.queue-upload": (payload, result) => ({
    kind: "planner-entry",
    id: payload.id,
    patch: {
      uploadState: result.mode === "queued-upload" ? "queued" : "draft",
      uploadStateLabel: result.mode === "queued-upload" ? "Wartet auf Freigabe" : "Entwurf",
      queueStatus: result.queued?.status || "queued",
      queueStatusLabel: mapStatusLabel(result.queued?.status || "queued"),
      queueId: result.queued?.id || null,
      uploadSavedAt: result.savedAt,
      lastAction: result.action || "content.queue-upload"
    }
  }),
  "content.confirm-upload": (payload, result) => ({
    kind: "planner-entry",
    id: result.plannerId || payload.plannerId || "content-upload",
    patch: {
      uploadState: result.queueStatus || payload.status || "confirmed",
      uploadStateLabel: mapStatusLabel(result.queueStatus || payload.status || "confirmed"),
      queueStatus: result.queueStatus || payload.status || "confirmed",
      queueStatusLabel: mapStatusLabel(result.queueStatus || payload.status || "confirmed"),
      queueNote: payload.note || "",
      queueId: payload.uploadId || null,
      uploadSavedAt: result.savedAt,
      lastAction: result.action || "content.confirm-upload"
    }
  }),
  "social.save-account": (payload, result) => ({
    kind: "social-account",
    id: payload.accountId,
    patch: {
      ...Object.fromEntries(
        Object.entries(payload.fields || {}).map(([key, value]) => [key, value])
      ),
      contentSavedAt: result.savedAt,
      lastAction: result.action || "social.save-account"
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
  if (!existsSync(overridesPath)) {
    writeFileSync(
      overridesPath,
      JSON.stringify(
        {
          updatedAt: null,
          pages: {},
          shopItems: {},
          shopDrafts: {},
          contentPlanner: { calendar: {}, ideas: {}, drafts: {} },
          socialAccounts: {},
          homeAssistant: { lastServiceCalls: [] },
          tiktokUploadQueue: []
        },
        null,
        2
      ),
      "utf8"
    );
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

function readOverrides() {
  return readJson(overridesPath, {
    updatedAt: null,
    pages: {},
    shopItems: {},
    shopDrafts: {},
    contentPlanner: { calendar: {}, ideas: {}, drafts: {} },
    socialAccounts: {},
    homeAssistant: { lastServiceCalls: [] },
    tiktokUploadQueue: []
  });
}

function writeOverrides(value) {
  value.updatedAt = new Date().toISOString();
  writeJson(overridesPath, value);
}

function cleanFields(fields) {
  return Object.fromEntries(
    Object.entries(fields || {}).filter(([, value]) => value !== undefined)
  );
}

async function savePageContent(pageId, fields) {
  if (!pageId) {
    return { ok: false, error: "pageId ist erforderlich." };
  }
  const overrides = readOverrides();
  overrides.pages = overrides.pages && typeof overrides.pages === "object" ? overrides.pages : {};
  overrides.pages[pageId] = {
    ...(overrides.pages[pageId] || {}),
    ...cleanFields(fields),
    updatedAt: new Date().toISOString()
  };
  writeOverrides(overrides);
  return { ok: true, pageId, savedAt: overrides.pages[pageId].updatedAt, mode: "file-override" };
}

async function saveShopItem(itemId, fields) {
  if (!itemId) {
    return { ok: false, error: "itemId ist erforderlich." };
  }
  const overrides = readOverrides();
  overrides.shopItems = overrides.shopItems && typeof overrides.shopItems === "object" ? overrides.shopItems : {};
  overrides.shopItems[itemId] = {
    ...(overrides.shopItems[itemId] || {}),
    ...cleanFields(fields),
    updatedAt: new Date().toISOString()
  };
  writeOverrides(overrides);
  return { ok: true, itemId, savedAt: overrides.shopItems[itemId].updatedAt, mode: "file-override" };
}

async function savePlannerEntry(id, fields) {
  if (!id) {
    return { ok: false, error: "id ist erforderlich." };
  }
  const overrides = readOverrides();
  overrides.contentPlanner = overrides.contentPlanner && typeof overrides.contentPlanner === "object" ? overrides.contentPlanner : { calendar: {}, ideas: {}, drafts: {} };
  overrides.contentPlanner.calendar = overrides.contentPlanner.calendar && typeof overrides.contentPlanner.calendar === "object" ? overrides.contentPlanner.calendar : {};
  overrides.contentPlanner.calendar[id] = {
    ...(overrides.contentPlanner.calendar[id] || {}),
    ...cleanFields(fields),
    updatedAt: new Date().toISOString()
  };
  writeOverrides(overrides);
  return { ok: true, id, savedAt: overrides.contentPlanner.calendar[id].updatedAt, mode: "file-override" };
}

async function savePlannerIdea(id, fields) {
  if (!id) {
    return { ok: false, error: "id ist erforderlich." };
  }
  const overrides = readOverrides();
  overrides.contentPlanner = overrides.contentPlanner && typeof overrides.contentPlanner === "object" ? overrides.contentPlanner : { calendar: {}, ideas: {}, drafts: {} };
  overrides.contentPlanner.ideas = overrides.contentPlanner.ideas && typeof overrides.contentPlanner.ideas === "object" ? overrides.contentPlanner.ideas : {};
  overrides.contentPlanner.ideas[id] = {
    ...(overrides.contentPlanner.ideas[id] || {}),
    ...cleanFields(fields),
    updatedAt: new Date().toISOString()
  };
  writeOverrides(overrides);
  return { ok: true, id, savedAt: overrides.contentPlanner.ideas[id].updatedAt, mode: "file-override" };
}

async function saveSocialAccount(accountId, fields) {
  if (!accountId) {
    return { ok: false, error: "accountId ist erforderlich." };
  }
  const overrides = readOverrides();
  overrides.socialAccounts = overrides.socialAccounts && typeof overrides.socialAccounts === "object" ? overrides.socialAccounts : {};
  overrides.socialAccounts[accountId] = {
    ...(overrides.socialAccounts[accountId] || {}),
    ...cleanFields(fields),
    updatedAt: new Date().toISOString()
  };
  writeOverrides(overrides);
  return { ok: true, accountId, savedAt: overrides.socialAccounts[accountId].updatedAt, mode: "file-override" };
}

async function queueTikTokUpload(id, payload) {
  const overrides = readOverrides();
  overrides.tiktokUploadQueue = Array.isArray(overrides.tiktokUploadQueue) ? overrides.tiktokUploadQueue : [];
  const entry = {
    id: `tt-upload-${Date.now()}`,
    plannerId: id || null,
    createdAt: new Date().toISOString(),
    status: "queued",
    payload: payload || null
  };
  overrides.tiktokUploadQueue.push(entry);
  overrides.tiktokUploadQueue = overrides.tiktokUploadQueue.slice(-40);
  writeOverrides(overrides);
  return { ok: true, id, savedAt: entry.createdAt, mode: "queued-upload", queued: entry };
}

async function confirmTikTokUpload(uploadId, status = "confirmed", note = "") {
  if (!uploadId) {
    return { ok: false, error: "uploadId ist erforderlich." };
  }
  const overrides = readOverrides();
  overrides.tiktokUploadQueue = Array.isArray(overrides.tiktokUploadQueue) ? overrides.tiktokUploadQueue : [];
  const index = overrides.tiktokUploadQueue.findIndex((entry) => entry.id === uploadId);
  if (index === -1) {
    return { ok: false, error: "Upload-Queue Eintrag nicht gefunden." };
  }
  const nextEntry = {
    ...overrides.tiktokUploadQueue[index],
    status,
    note: String(note || "").trim(),
    confirmedAt: new Date().toISOString()
  };
  overrides.tiktokUploadQueue[index] = nextEntry;
  writeOverrides(overrides);
  return {
    ok: true,
    uploadId,
    plannerId: nextEntry.plannerId || null,
    queueStatus: nextEntry.status,
    savedAt: nextEntry.confirmedAt,
    mode: "queue-confirmed"
  };
}

async function runHaServiceCall(payload) {
  const queue = readJson(haQueuePath, { updatedAt: null, queue: [] });
  const queuedEntry = {
    id: `ha-${Date.now()}`,
    createdAt: new Date().toISOString(),
    kind: "service-call",
    source: "control-dashboard",
    status: "queued",
    payload
  };

  const haUrl = String(process.env.HOME_ASSISTANT_URL || "").trim().replace(/\/$/, "");
  const haToken = String(process.env.HOME_ASSISTANT_TOKEN || "").trim();
  const domain = String(payload?.domain || "").trim();
  const service = String(payload?.service || "").trim();

  if (haUrl && haToken && domain && service) {
    const response = await fetch(`${haUrl}/api/services/${domain}/${service}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${haToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify(payload?.data || {})
    });
    if (!response.ok) {
      return { ok: false, error: `HA Servicecall fehlgeschlagen (${response.status})` };
    }
    const overrides = readOverrides();
    overrides.homeAssistant = overrides.homeAssistant && typeof overrides.homeAssistant === "object" ? overrides.homeAssistant : { lastServiceCalls: [] };
    overrides.homeAssistant.lastServiceCalls = Array.isArray(overrides.homeAssistant.lastServiceCalls) ? overrides.homeAssistant.lastServiceCalls : [];
    overrides.homeAssistant.lastServiceCalls.push({
      createdAt: queuedEntry.createdAt,
      domain,
      service,
      entityId: payload?.entityId || null,
      mode: "remote-ha"
    });
    overrides.homeAssistant.lastServiceCalls = overrides.homeAssistant.lastServiceCalls.slice(-24);
    writeOverrides(overrides);
    return { ok: true, mode: "remote-ha", domain, service, savedAt: queuedEntry.createdAt };
  }

  queue.queue.push(queuedEntry);
  queue.updatedAt = new Date().toISOString();
  writeJson(haQueuePath, queue);
  return { ok: true, mode: "queued-local", savedAt: queuedEntry.createdAt, queued: queuedEntry };
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
    queued: "Wartet",
    confirmed: "Bestaetigt",
    hold: "Halten",
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
