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
  "build-merch-bundle": { cmd: process.execPath, args: [join(repoRoot, "scripts/build-merch-content-bundle.mjs")] },
  "build-shop-master-pack": { cmd: process.execPath, args: [join(repoRoot, "scripts/build-shop-master-pack.mjs")] },
  "write-hermes-spool": { cmd: process.execPath, args: [join(repoRoot, "scripts/write-hermes-spool-message.mjs")] },
  "check-links": { cmd: "/bin/bash", args: [join(repoRoot, "scripts/check-shirtee-links.sh")] },
  "kanban-create": { cmd: process.execPath, args: [join(repoRoot, "scripts/kanban-create.mjs")] },
  "kanban-run-pipeline": { cmd: process.execPath, args: [join(repoRoot, "scripts/kanban-run-pipeline.mjs")] },
  "kanban-task-action": { cmd: process.execPath, args: [join(repoRoot, "scripts/kanban-task-action.mjs")] }
};

function ensureStateFiles() {
  mkdirSync(stateDir, { recursive: true });
  if (!existsSync(statePath)) {
    writeFileSync(statePath, JSON.stringify({ updatedAt: null, controls: {} }, null, 2), "utf8");
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
    return json(response, result.ok ? 200 : 500, result);
  }

  if (request.method === "POST" && url.pathname === "/api/control/kanban-task-action") {
    const body = await readJsonBody(request);
    const id = String(body.id || "").trim();
    const action = String(body.action || "").trim();
    if (!id || !["retry", "archive", "complete"].includes(action)) {
      return badRequest(response, "id und ein gültiges action (retry|archive|complete) sind erforderlich.");
    }
    const result = await runCommand("kanban-task-action", [`--id=${id}`, `--action=${action}`]);
    return json(response, result.ok ? 200 : 500, result);
  }

  if (request.method === "POST" && url.pathname === "/api/control/kanban-create") {
    const body = await readJsonBody(request);
    const title = String(body.title || "").trim();
    if (!title) {
      return badRequest(response, "title ist erforderlich.");
    }
    const result = await runCommand("kanban-create", [`--title=${title}`]);
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
      "merch-bundle": join(repoRoot, "artifacts", "merch-bundle", "latest", "manifest.json"),
      "shop-master": join(repoRoot, "artifacts", "shop-master", "latest", "manifest.json"),
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
      room: body.room || null,
      automation: body.automation || null,
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
