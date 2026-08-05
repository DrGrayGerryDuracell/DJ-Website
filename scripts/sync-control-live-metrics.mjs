#!/usr/bin/env node
import { performance } from "node:perf_hooks";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = `${repoRoot}/control/js/live-metrics.json`;
const catalogPath = `${repoRoot}/assets/data/merch-catalog.js`;
const linkStatusPath = `${repoRoot}/assets/data/live-link-status.js`;
const uploadProgressPath = `${repoRoot}/artifacts/upload-queue/upload-progress-2026-04-01.md`;

const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
const websiteBase = "https://drgray-mrsdrgray.com";
const hermesProfileRoot = join(process.env.HOME || "/Users/jarvisgray", ".hermes", "profiles", "zentralserver");
const hermesDbPath = join(hermesProfileRoot, "state.db");
const hermesGatewayStatePath = join(hermesProfileRoot, "gateway_state.json");
const hermesGatewayLifecyclePath = join(hermesProfileRoot, "gateway.lifecycle.json");
const hermesChannelDirectoryPath = join(hermesProfileRoot, "channel_directory.json");
const hermesBrainVaultStatePath = join(hermesProfileRoot, "state", "brain_vault_state.json");
const hermesArgusBridgeStatePath = join(hermesProfileRoot, "state", "argus_bridge_state.json");
const hermesActiveSessionsPath = join(hermesProfileRoot, "runtime", "active_sessions.json");
const hermesCronOutputPath = join(hermesProfileRoot, "cron", "output");
const corePages = [
  "/",
  "/index.html",
  "/bio.html",
  "/musik.html",
  "/videos.html",
  "/shop.html",
  "/kontakt.html",
  "/control"
];

function safeNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toPercent(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function classifyFetchIssue(error) {
  const message = String(error?.message || error || "");
  const code = String(error?.cause?.code || error?.code || "").toUpperCase();
  const haystack = `${code} ${message}`.toLowerCase();

  if (
    code === "ENOTFOUND" ||
    code === "EAI_AGAIN" ||
    haystack.includes("could not resolve host") ||
    haystack.includes("name or service not known") ||
    haystack.includes("dns")
  ) {
    return "dns";
  }

  if (
    code === "ECONNREFUSED" ||
    code === "ECONNRESET" ||
    code === "ETIMEDOUT" ||
    haystack.includes("failed to fetch") ||
    haystack.includes("fetch failed") ||
    haystack.includes("network") ||
    haystack.includes("timeout")
  ) {
    return "network";
  }

  return "unknown";
}

function loadWindowData(filePath, key) {
  const code = readFileSync(filePath, "utf8");
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(code, context);
  return context.window[key];
}

function readJsonFile(filePath, fallback = null) {
  try {
    if (!existsSync(filePath)) {
      return fallback;
    }
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function sqliteQueryJson(dbPath, query, fallback = []) {
  try {
    if (!existsSync(dbPath)) {
      return fallback;
    }
    const output = execFileSync("sqlite3", ["-json", dbPath, query], { encoding: "utf8" });
    if (!output.trim()) {
      return fallback;
    }
    return JSON.parse(output);
  } catch {
    return fallback;
  }
}

function formatBerlinDate(epochSeconds) {
  if (!Number.isFinite(epochSeconds)) {
    return null;
  }
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Berlin"
  }).format(new Date(epochSeconds * 1000));
}

function toEpochSeconds(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 1e12 ? value / 1000 : value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) {
      return parsed / 1000;
    }
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric > 1e12 ? numeric / 1000 : numeric;
    }
  }
  return null;
}

function maskLongDigits(value) {
  return String(value ?? "").replace(/\b\d{5,}\b/g, (match) => `${match.slice(0, 3)}…${match.slice(-2)}`);
}

function sanitizeSnippet(value, maxLength = 140) {
  const text = maskLongDigits(String(value ?? "").replace(/\s+/g, " ").trim())
    .replace(/password\s*[:=]\s*[^,;\]\}]+/gi, "password: [redacted]")
    .replace(/token\s*[:=]\s*[^,;\]\}]+/gi, "token: [redacted]");
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function findLatestHermesSpoolFile() {
  if (!existsSync(hermesCronOutputPath)) {
    return null;
  }

  let latestPath = null;
  let latestMtime = 0;
  for (const entry of readdirSync(hermesCronOutputPath, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const candidate = join(hermesCronOutputPath, entry.name, "last_message_to_send.txt");
    if (!existsSync(candidate)) continue;
    const mtime = statSync(candidate).mtimeMs;
    if (mtime > latestMtime) {
      latestMtime = mtime;
      latestPath = candidate;
    }
  }

  return latestPath;
}

function countByTable(dbPath, tableName) {
  const rows = sqliteQueryJson(dbPath, `select count(*) as count from ${tableName};`, []);
  return Number(rows?.[0]?.count || 0);
}

function parseJsonMaybe(value) {
  if (value == null) return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function buildHermesRuntimeSnapshot() {
  const gatewayState = readJsonFile(hermesGatewayStatePath, {});
  const gatewayLifecycle = readJsonFile(hermesGatewayLifecyclePath, {});
  const channelDirectory = readJsonFile(hermesChannelDirectoryPath, {});
  const brainVaultState = readJsonFile(hermesBrainVaultStatePath, {});
  const argusBridgeState = readJsonFile(hermesArgusBridgeStatePath, {});
  const activeSessionsState = readJsonFile(hermesActiveSessionsPath, {});

  const sessionRows = sqliteQueryJson(
    hermesDbPath,
    `select id, source, model, message_count, tool_call_count, started_at, ended_at, end_reason, title, session_key, chat_type, display_name, archived, profile_name
     from sessions
     order by started_at desc
     limit 8;`
  );

  const recentMessageRows = sqliteQueryJson(
    hermesDbPath,
    `select session_id, role, coalesce(content, api_content, '') as content, timestamp, tool_name
     from messages
     order by timestamp desc
     limit 10;`
  );

  const delegationRows = sqliteQueryJson(
    hermesDbPath,
    `select delegation_id, origin_session, state, dispatched_at, completed_at, updated_at, result_json, task_json
     from async_delegations
     order by updated_at desc
     limit 5;`
  );

  const deliveryRows = sqliteQueryJson(
    hermesDbPath,
    `select obligation_id, session_key, platform, chat_id, thread_id, content, state, attempts, created_at, updated_at, last_error
     from delivery_obligations
     order by updated_at desc
     limit 5;`
  );

  const routingRows = sqliteQueryJson(
    hermesDbPath,
    `select session_key, entry_json, updated_at
     from gateway_routing
     order by updated_at desc
     limit 8;`
  );

  const stateMetaRows = sqliteQueryJson(
    hermesDbPath,
    `select key, value
     from state_meta
     order by key asc;`
  );

  const counts = {
    sessions: countByTable(hermesDbPath, "sessions"),
    messages: countByTable(hermesDbPath, "messages"),
    delegations: countByTable(hermesDbPath, "async_delegations"),
    obligations: countByTable(hermesDbPath, "delivery_obligations"),
    routing: countByTable(hermesDbPath, "gateway_routing")
  };

  const activeSessions = sessionRows.filter((row) => !row.ended_at && Number(row.archived || 0) === 0);
  const activeTelegramSession = activeSessions.find((row) => String(row.source || "").includes("telegram")) || activeSessions[0] || sessionRows[0] || null;
  const latestDelegation = delegationRows[0] || null;
  const latestDelivery = deliveryRows[0] || null;
  const latestSpoolPath = findLatestHermesSpoolFile();
  const latestSpoolPreview = latestSpoolPath ? sanitizeSnippet(readFileSync(latestSpoolPath, "utf8"), 180) : null;
  const routingSession = routingRows
    .map((row) => {
      const entry = parseJsonMaybe(row.entry_json) || {};
      return {
        sessionKey: row.session_key,
        sessionId: entry.session_id || entry.session_key || null,
        displayName: entry.display_name || entry.origin?.chat_name || entry.origin?.user_name || null,
        platform: entry.platform || entry.origin?.platform || null,
        chatType: entry.chat_type || entry.origin?.chat_type || null,
        updatedAt: formatBerlinDate(toEpochSeconds(row.updated_at)) || "n/a"
      };
    })
    .filter((row) => row.sessionKey);
  const currentRouting = routingSession[0] || null;

  const recentMessages = recentMessageRows
    .map((row) => ({
      topic: `${String(row.role || "message").toUpperCase()} • ${row.session_id ? String(row.session_id).slice(-8) : "session"}`,
      time: formatBerlinDate(Number(row.timestamp)) || "unbekannt",
      from: row.role || "message",
      to: row.tool_name || "Hermes",
      summary: sanitizeSnippet(row.content),
      status: row.role === "assistant" ? "live" : row.role === "user" ? "connected" : "info",
      statusLabel: row.role === "assistant" ? "Assistant" : row.role === "user" ? "User" : "System"
    }))
    .filter((item) => item.summary.length > 0);

  const recentSessions = sessionRows.map((row) => ({
    name: row.title || row.profile_name || row.display_name || row.id,
    role: row.source || "session",
    route: row.session_key || row.id,
    channel: row.model || "n/a",
    status: !row.ended_at ? "live" : "connected",
    statusLabel: !row.ended_at ? "Live" : "Historisch",
    tags: [
      row.message_count ? `${row.message_count} msgs` : null,
      row.tool_call_count ? `${row.tool_call_count} tools` : null,
      row.end_reason ? `Ende: ${row.end_reason}` : null
    ].filter(Boolean)
  }));

  const sourceRegistry = [
    {
      name: "Hermes state.db",
      kind: "Runtime",
      state: counts.sessions > 0 ? "live" : "support",
      detail: `${counts.sessions} Sessions, ${counts.messages} Nachrichten, ${counts.delegations} Delegationen`,
      route: hermesDbPath,
      channel: "SQLite"
    },
    {
      name: "Gateway State",
      kind: "Bridge",
      state: gatewayState.gateway_state === "running" ? "live" : "support",
      detail: `Telegram ${gatewayState?.platforms?.telegram?.state || "unbekannt"} • Active Agents ${gatewayState?.active_agents ?? 0}`,
      route: hermesGatewayStatePath,
      channel: "JSON"
    },
    {
      name: "Telegram Spool",
      kind: "Delivery",
      state: latestSpoolPath ? "connected" : "support",
      detail: latestSpoolPreview || "Kein aktueller Nachrichtenspool gefunden",
      route: latestSpoolPath || hermesCronOutputPath,
      channel: "last_message_to_send.txt"
    },
    {
      name: "Channel Directory",
      kind: "Routing",
      state: "connected",
      detail: `Channels: ${Object.keys(channelDirectory?.platforms || {}).length || 0} • updated ${formatBerlinDate(toEpochSeconds(channelDirectory.updated_at)) || channelDirectory.updated_at || "n/a"}`,
      route: hermesChannelDirectoryPath,
      channel: "Directory"
    },
    {
      name: "Brain Vault State",
      kind: "Memory",
      state: "sync",
      detail: `Last run ${brainVaultState.last_run_utc || "n/a"} • Added ${brainVaultState.last_added ?? 0}`,
      route: hermesBrainVaultStatePath,
      channel: "Vault"
    },
    {
      name: "Argus Bridge",
      kind: "Support",
      state: Number(argusBridgeState.warning_count || 0) > 0 ? "support" : "ready",
      detail: `Warnings ${argusBridgeState.warning_count ?? 0} • ${argusBridgeState.last_warning || "kein Hinweis"}`,
      route: hermesArgusBridgeStatePath,
      channel: "Bridge"
    },
    {
      name: "Active Sessions",
      kind: "Runtime",
      state: activeSessionsState?.entries?.length ? "live" : "sync",
      detail: `${activeSessionsState?.entries?.length || 0} aktive Runtime-Einträge`,
      route: hermesActiveSessionsPath,
      channel: "JSON"
    }
  ];

  const runtime = {
    gatewayState,
    gatewayLifecycle,
    channelDirectory,
    brainVaultState,
    argusBridgeState,
    activeSessionsState,
    counts,
    activeTelegramSession,
    latestDelegation,
    latestDelivery,
    latestSpoolPath,
    latestSpoolPreview,
    routingRows,
    stateMetaRows,
    currentRouting
  };

  return {
    runtime,
    sourceRegistry,
    sessions: recentSessions,
    recentMessages,
    recentDelegations: delegationRows.map((row) => ({
      from: row.origin_session || "Hermes",
      to: "Async Delegation",
      task: sanitizeSnippet(parseJsonMaybe(row.task_json)?.goal || parseJsonMaybe(row.task_json)?.task || parseJsonMaybe(row.result_json)?.summary || row.delegation_id),
      channel: row.state || "delegation",
      priority: Number(row.state === "error" ? 2 : 1) ? (row.state === "error" ? "P1" : "P0") : "P1",
      status: row.state === "error" ? "support" : "live",
      statusLabel: row.state === "error" ? "Error" : "Live"
    })),
    recentObligations: deliveryRows.map((row) => ({
      label: row.obligation_id || row.session_key || "Obligation",
      value: sanitizeSnippet(row.content || row.last_error || row.state || "n/a", 100),
      status: row.state === "delivered" ? "connected" : row.state === "error" ? "support" : "live",
      statusLabel: row.state === "delivered" ? "Delivered" : row.state === "error" ? "Error" : "Live"
    })),
    metrics: {
      agentCount: Math.max(1, activeSessions.length),
      routeCount: Math.max(routingRows.length, counts.routing),
      deviceCount: Object.keys(channelDirectory?.platforms || {}).length + 5,
      liveCount: Number(gatewayState?.gateway_state === "running") + Number(gatewayState?.platforms?.telegram?.state === "connected") + Number(activeSessions.length > 0),
      delegationCount: counts.delegations,
      conversationCount: recentMessages.length,
      sourceCount: sourceRegistry.length
    }
  };
}

function loadSubmittedIdsFromProgress() {
  try {
    const raw = readFileSync(uploadProgressPath, "utf8");
    const ids = [...raw.matchAll(/`([a-z0-9-]+)`/gi)].map((match) => match[1]);
    return new Set(ids);
  } catch {
    return new Set();
  }
}

async function fetchText(url) {
  const response = await fetch(url, {
    method: "GET",
    redirect: "follow",
    headers: { "user-agent": USER_AGENT }
  });
  return response.text();
}

async function checkPage(path) {
  const url = `${websiteBase}${path}`;
  const start = performance.now();
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { "user-agent": USER_AGENT }
    });
    const end = performance.now();
    const timingMs = Math.max(1, Math.round(end - start));
    const contentLengthHeader = response.headers.get("content-length");
    const contentLength = contentLengthHeader ? Number(contentLengthHeader) : null;
    const ok = response.status === 200;
    return {
      path,
      url,
      status: response.status,
      ok,
      timingMs,
      contentLength
    };
  } catch (error) {
    return {
      path,
      url,
      status: 0,
      ok: false,
      timingMs: null,
      contentLength: null,
      errorKind: classifyFetchIssue(error),
      errorMessage: sanitizeSnippet(error?.message || String(error || ""), 120)
    };
  }
}

function findTikTokPayload(html) {
  const match = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function deepFindObjectWithKeys(node, requiredKeys) {
  if (!node || typeof node !== "object") return null;
  const ok = requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(node, key));
  if (ok) return node;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = deepFindObjectWithKeys(item, requiredKeys);
      if (found) return found;
    }
    return null;
  }
  for (const value of Object.values(node)) {
    const found = deepFindObjectWithKeys(value, requiredKeys);
    if (found) return found;
  }
  return null;
}

async function getTikTokProfileFallback(uniqueId) {
  const profileUrl = `https://www.tiktok.com/@${uniqueId}`;
  let html = "";
  try {
    html = await fetchText(profileUrl);
  } catch {
    return {
      profileUrl,
      source: "tiktok-public-html-fallback",
      canonical: null,
      statusCode: null,
      followers: null,
      likes: null,
      videos: null,
      error: "network_unavailable"
    };
  }
  const payload = findTikTokPayload(html);
  const scope = payload?.__DEFAULT_SCOPE__ || {};
  const detail = scope["webapp.user-detail"] || {};
  const seo = scope["seo.abtest"] || {};
  const stats = deepFindObjectWithKeys(scope, ["followerCount", "heartCount", "videoCount"]);
  return {
    profileUrl,
    source: "tiktok-public-html-fallback",
    canonical: typeof seo.canonical === "string" ? seo.canonical : null,
    statusCode: typeof detail.statusCode === "number" ? detail.statusCode : null,
    followers: safeNumber(stats?.followerCount),
    likes: safeNumber(stats?.heartCount),
    videos: safeNumber(stats?.videoCount)
  };
}

async function getTikTokProfileFromApi(accessToken) {
  const headers = {
    authorization: `Bearer ${accessToken}`,
    "content-type": "application/json; charset=UTF-8",
    "user-agent": USER_AGENT
  };

  let userResponse;
  try {
    userResponse = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,username,avatar_url,profile_deep_link,is_verified,follower_count,following_count,likes_count,video_count",
      {
        method: "GET",
        headers
      }
    );
  } catch {
    return {
      source: "tiktok-api-v2",
      available: false,
      error: "network_unavailable"
    };
  }

  if (!userResponse.ok) {
    return {
      source: "tiktok-api-v2",
      available: false,
      error: `user_info_${userResponse.status}`
    };
  }

  const userPayload = await userResponse.json();
  const user = userPayload?.data?.user || {};
  const username = typeof user.username === "string" ? user.username : null;
  const deepLink = typeof user.profile_deep_link === "string" ? user.profile_deep_link : null;
  const canonical = username ? `https://www.tiktok.com/@${username}` : deepLink;

  let videos = safeNumber(user.video_count);
  let recentVideoCount = null;
  let videoListAvailable = false;

  let videoResponse;
  try {
    videoResponse = await fetch("https://open.tiktokapis.com/v2/video/list/?fields=id,title,create_time,duration,view_count,like_count,comment_count,share_count", {
      method: "POST",
      headers,
      body: JSON.stringify({ max_count: 20 })
    });
  } catch {
    videoResponse = null;
  }

  if (videoResponse.ok) {
    const videoPayload = await videoResponse.json();
    const list = Array.isArray(videoPayload?.data?.videos) ? videoPayload.data.videos : [];
    recentVideoCount = list.length;
    videoListAvailable = true;
    if (videos == null && recentVideoCount != null) {
      videos = recentVideoCount;
    }
  }

  return {
    source: "tiktok-api-v2",
    available: true,
    canonical,
    statusCode: 200,
    followers: safeNumber(user.follower_count),
    likes: safeNumber(user.likes_count),
    videos,
    following: safeNumber(user.following_count),
    recentVideoCount,
    videoListAvailable,
    isVerified: Boolean(user.is_verified),
    username
  };
}

async function getTikTokProfile(uniqueId, accessToken) {
  if (typeof accessToken === "string" && accessToken.trim().length > 0) {
    const apiProfile = await getTikTokProfileFromApi(accessToken.trim());
    if (apiProfile.available) {
      return apiProfile;
    }
  }

  return getTikTokProfileFallback(uniqueId);
}

async function getSoundCloudClientId() {
  let html = "";
  try {
    html = await fetchText("https://soundcloud.com");
  } catch {
    return null;
  }
  const jsUrls = [...html.matchAll(/https:\/\/a-v2\.sndcdn\.com\/assets\/[^" ]+\.js/g)].map((m) => m[0]).slice(0, 24);
  for (const jsUrl of jsUrls) {
    try {
      const code = await fetchText(jsUrl);
      const match = code.match(/client_id:"([a-zA-Z0-9]{20,})/);
      if (match) return match[1];
    } catch {
      // continue
    }
  }
  return null;
}

async function getSoundCloudProfile() {
  let clientId = null;
  try {
    clientId = await getSoundCloudClientId();
  } catch {
    clientId = null;
  }
  if (!clientId) {
    return { available: false, source: "soundcloud-public-api", error: "client_id_nicht_gefunden" };
  }

  const resolveUrl = `https://api-v2.soundcloud.com/resolve?url=${encodeURIComponent("https://soundcloud.com/drgray_sic")}&client_id=${clientId}`;
  let response;
  try {
    response = await fetch(resolveUrl, { headers: { "user-agent": USER_AGENT } });
  } catch {
    return { available: false, source: "soundcloud-public-api", error: "network_unavailable" };
  }
  if (!response.ok) {
    return { available: false, source: "soundcloud-public-api", error: `resolve_${response.status}` };
  }

  const profile = await response.json();
  if (profile.kind !== "user") {
    return { available: false, source: "soundcloud-public-api", error: "ungueltiges_profil" };
  }

  return {
    available: true,
    source: "soundcloud-public-api",
    user: {
      id: profile.id,
      username: profile.username,
      permalink_url: profile.permalink_url,
      followers_count: safeNumber(profile.followers_count),
      followings_count: safeNumber(profile.followings_count),
      track_count: safeNumber(profile.track_count),
      playlist_count: safeNumber(profile.playlist_count)
    }
  };
}

function parseHrefCounts() {
  const files = ["index.html", "bio.html", "musik.html", "videos.html", "shop.html", "kontakt.html"];
  const counters = {
    tiktok: 0,
    tiktokDr: 0,
    tiktokMrs: 0,
    soundcloud: 0,
    shop: 0,
    contact: 0
  };

  for (const file of files) {
    const html = readFileSync(`${repoRoot}/${file}`, "utf8");
    counters.tiktok += (html.match(/tiktok\.com\//g) || []).length;
    counters.tiktokDr += (html.match(/tiktok\.com\/@drgray_mrsdrgray/g) || []).length;
    counters.tiktokMrs += (html.match(/tiktok\.com\/@gray\.afterhours/g) || []).length;
    counters.soundcloud += (html.match(/soundcloud\.com\//g) || []).length;
    counters.shop += (html.match(/shirtee\.com\//g) || []).length;
    counters.contact += (html.match(/kontakt\.html|mailto:/g) || []).length;
  }
  return counters;
}

async function getShirteeStoreOverview() {
  const url = "https://www.shirtee.com/de/store/drgray-mrsdrgray/";
  let html = "";
  try {
    html = await fetchText(url);
  } catch {
    return {
      url,
      productCount: 0,
      productNames: [],
      available: false,
      error: "network_unavailable"
    };
  }
  const names = [...html.matchAll(/<h2 class="product-name">\s*<a[^>]*>\s*([^<]+?)\s*<\/a>/g)]
    .map((match) => match[1].trim())
    .filter(Boolean);

  return {
    url,
    productCount: names.length,
    productNames: names.slice(0, 8)
  };
}

function mapSectionLabel(section) {
  const lookup = {
    men: "Herren",
    women: "Damen",
    couple: "Couple",
    unisex: "Unisex",
    accessories: "Accessoires",
    special: "Special"
  };
  return lookup[section] || String(section || "Sonstiges");
}

async function main() {
  const catalog = loadWindowData(catalogPath, "MERCH_CATALOG");
  const liveLinkStatus = loadWindowData(linkStatusPath, "LIVE_LINK_STATUS");
  const submittedIds = loadSubmittedIdsFromProgress();

  const [pageChecks, soundcloud, tiktokDr, tiktokMrs, shirteeStore] = await Promise.all([
    Promise.all(corePages.map((path) => checkPage(path))),
    getSoundCloudProfile(),
    getTikTokProfile("drgray_mrsdrgray", process.env.TIKTOK_DR_ACCESS_TOKEN),
    getTikTokProfile("gray.afterhours", process.env.TIKTOK_MRS_ACCESS_TOKEN),
    getShirteeStoreOverview()
  ]);

  const now = new Date();
  const generatedAtIso = now.toISOString();
  const generatedAtLabel = new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Berlin"
  }).format(now);

  const pageOk = pageChecks.filter((item) => item.ok).length;
  const pageFail = pageChecks.length - pageOk;
  const pageHttpFailures = pageChecks.filter((item) => !item.ok && item.status >= 400);
  const pageEnvironmentFailures = pageChecks.filter((item) => !item.ok && item.status === 0 && item.errorKind && item.errorKind !== "unknown");
  const pageEnvironmentIssue = pageChecks.length > 0 && pageEnvironmentFailures.length === pageChecks.length && pageHttpFailures.length === 0;
  const pageProblemCount = pageEnvironmentIssue ? 0 : pageFail;
  const avgResponse = Math.round(
    pageChecks.filter((item) => typeof item.timingMs === "number").reduce((sum, item) => sum + item.timingMs, 0) /
      Math.max(pageChecks.filter((item) => typeof item.timingMs === "number").length, 1)
  );

  const items = Array.isArray(catalog?.items) ? catalog.items : [];
  const statusCount = {};
  const sectionCount = {};
  for (const item of items) {
    statusCount[item.status] = (statusCount[item.status] || 0) + 1;
    sectionCount[item.section] = (sectionCount[item.section] || 0) + 1;
  }

  const externalResults = Object.values(liveLinkStatus?.items || {});
  const shopChecked = externalResults.length;
  const shopLive = externalResults.filter((result) => result.verified && Number(result.httpCode) === 200).length;
  const shopFail = shopChecked - shopLive;
  const shopEnvironmentIssue = shopChecked > 0 && externalResults.every((result) => Number(result.httpCode) === 0);
  const shopProblemCount = shopEnvironmentIssue ? 0 : shopFail;

  const sectionRows = Object.entries(sectionCount)
    .map(([section, count]) => ({ label: mapSectionLabel(section), items: count }))
    .sort((a, b) => b.items - a.items);

  const externalByHref = new Map(
    externalResults
      .filter((entry) => typeof entry?.sourceHref === "string" && entry.sourceHref.length > 0)
      .map((entry) => [entry.sourceHref, entry])
  );

  const catalogItemStates = items.map((item, index) => {
    const rawHref = typeof item?.href === "string" && item.href.length > 0 ? item.href : liveLinkStatus?.storeHref || "https://www.shirtee.com/de/store/drgray-mrsdrgray/";
    const href = rawHref.startsWith("http") ? rawHref : rawHref.startsWith("/") ? rawHref : `/${rawHref.replace(/^\.?\//, "")}`;
    const linked = externalByHref.get(href);
    const catalogStatus = String(item?.status || "Unbekannt");
    const loweredStatus = catalogStatus.toLowerCase();
    const hasImage = typeof item?.image === "string" && item.image.trim().length > 0;
    const imageSrc = hasImage ? (item.image.startsWith("http") ? item.image : item.image.startsWith("/") ? item.image : `/${item.image}`) : "";
    const verified = Boolean(linked?.verified) && Number(linked?.httpCode) === 200;
    const isUploaded = verified || loweredStatus.includes("live im store");
    const isSubmitted = !isUploaded && submittedIds.has(item?.id || `catalog-${index + 1}`);
    const isReady = !isUploaded && (loweredStatus.includes("uploadbereit") || loweredStatus.includes("top upload"));
    const uploadState = isUploaded ? "uploaded" : isSubmitted ? "submitted" : isReady ? "ready" : "pending";
    const uploadLabel = isUploaded ? "Bereits hochgeladen" : isSubmitted ? "Eingereicht (in Pruefung)" : isReady ? "Uploadbereit" : "Noch offen";

    return {
      id: item?.id || `catalog-${index + 1}`,
      title: item?.title || `Artikel ${index + 1}`,
      line: item?.line || "Unbekannt",
      section: item?.section || "other",
      sectionLabel: mapSectionLabel(item?.section),
      catalogStatus,
      href,
      hasImage,
      imageSrc,
      uploadState,
      uploadLabel,
      verifiedLink: verified,
      httpCode: Number(linked?.httpCode) || 0
    };
  });

  const uploadedCount = catalogItemStates.filter((item) => item.uploadState === "uploaded").length;
  const submittedCount = catalogItemStates.filter((item) => item.uploadState === "submitted").length;
  const readyCount = catalogItemStates.filter((item) => item.uploadState === "ready").length;
  const pendingCount = catalogItemStates.filter((item) => item.uploadState === "pending").length;

  const topProducts = externalResults
    .slice(0, 6)
    .map((entry, index) => {
      const linkedItem = items.find((item) => item.href === entry.sourceHref);
      return {
        name: linkedItem?.title || `Produktlink ${index + 1}`,
        httpCode: Number(entry.httpCode) || 0,
        href: entry.sourceHref || linkedItem?.href || (liveLinkStatus?.storeHref || "https://www.shirtee.com/de/store/drgray-mrsdrgray/"),
        statusLabel: entry.verified ? "erreichbar" : "Fehler",
        sourceLabel: "Shirtee-Linkcheck"
      };
    });

  const hrefCounts = parseHrefCounts();
  const storeVisibleProducts = shirteeStore.productCount > 0 ? shirteeStore.productCount : shopLive;
  const storeVisibleProductNames = shirteeStore.productNames.length ? shirteeStore.productNames : topProducts.map((row) => row.name).slice(0, 6);

  const socialRows = [
    {
      platform: "TikTok Dr. Gray",
      metricValue: hrefCounts.tiktokDr,
      valueLabel:
        tiktokDr.followers != null
          ? `${tiktokDr.followers.toLocaleString("de-DE")} Follower • ${tiktokDr.videos != null ? `${tiktokDr.videos} Videos` : `${hrefCounts.tiktokDr} Linksignale`}`
          : `${hrefCounts.tiktokDr} Linksignale im Seiteninhalt`,
      statusLabel: tiktokDr.canonical ? "Profil erreichbar" : "Profil nicht bestaetigt",
      sourceLabel: `${tiktokDr.source === "tiktok-api-v2" ? "TikTok API v2 OAuth" : "TikTok Profil-HTML"}${tiktokDr.statusCode != null ? ` • Code ${tiktokDr.statusCode}` : ""}${tiktokDr.likes != null ? ` • Likes ${tiktokDr.likes.toLocaleString("de-DE")}` : ""}`
    },
    {
      platform: "TikTok Mrs. Dr. Gray",
      metricValue: hrefCounts.tiktokMrs,
      valueLabel:
        tiktokMrs.followers != null
          ? `${tiktokMrs.followers.toLocaleString("de-DE")} Follower • ${tiktokMrs.videos != null ? `${tiktokMrs.videos} Videos` : `${hrefCounts.tiktokMrs} Linksignale`}`
          : `${hrefCounts.tiktokMrs} Linksignale im Seiteninhalt`,
      statusLabel: tiktokMrs.canonical ? "Profil erreichbar" : "Profil nicht bestaetigt",
      sourceLabel: `${tiktokMrs.source === "tiktok-api-v2" ? "TikTok API v2 OAuth" : "TikTok Profil-HTML"}${tiktokMrs.statusCode != null ? ` • Code ${tiktokMrs.statusCode}` : ""}${tiktokMrs.likes != null ? ` • Likes ${tiktokMrs.likes.toLocaleString("de-DE")}` : ""}`
    },
    {
      platform: "SoundCloud",
      metricValue: hrefCounts.soundcloud,
      valueLabel: soundcloud.available ? `${soundcloud.user.followers_count.toLocaleString("de-DE")} Follower • ${hrefCounts.soundcloud} Linksignale` : `${hrefCounts.soundcloud} Linksignale im Seiteninhalt`,
      statusLabel: soundcloud.available ? `${soundcloud.user.track_count} Tracks` : "Lokal nicht verifizierbar",
      sourceLabel: "SoundCloud Public API"
    },
    {
      platform: "Shop",
      metricValue: storeVisibleProducts,
      valueLabel: `${storeVisibleProducts} Produkte sichtbar • ${shopLive}/${shopChecked} gepruefte Produktlinks`,
      statusLabel: shopFail > 0 ? `${shopFail} Links fehlerhaft` : "Alle geprueften Links erreichbar",
      sourceLabel: "Shirtee-Linkcheck"
    }
  ];

  const socialStrongest = [...socialRows]
    .filter((row) => typeof row.metricValue === "number")
    .sort((a, b) => b.metricValue - a.metricValue)[0];

  const tiktokEnvironmentIssue = [tiktokDr, tiktokMrs].some((entry) => entry.error === "network_unavailable");
  const soundcloudEnvironmentIssue = !soundcloud.available && ["network_unavailable", "client_id_nicht_gefunden"].includes(soundcloud.error || "");
  const warningCount = pageProblemCount + shopProblemCount + (soundcloud.available || soundcloudEnvironmentIssue ? 0 : 1);

  const agentsRoom = {
    metrics: {
      agentCount: 12,
      routeCount: 9,
      deviceCount: 11,
      liveCount: 8,
      delegationCount: 8,
      conversationCount: 6
    },
    routing: [
      { from: "Mensch", to: "Hermes", channel: "Telegram", purpose: "oberste Steuerstufe", status: "live", statusLabel: "Live" },
      { from: "Hermes", to: "Jarvis", channel: "Orchestrierung", purpose: "verteilen und sortieren", status: "live", statusLabel: "Live" },
      { from: "Jarvis", to: "Argus", channel: "Vorpruefung", purpose: "Diagnose und Zweitbewertung", status: "support", statusLabel: "Support" },
      { from: "Hermes", to: "OpenClaw Gateway", channel: "Queue / Bridge", purpose: "Delegation und Zwischenablage", status: "connected", statusLabel: "Verbunden" },
      { from: "Jarvis", to: "Forge", channel: "Infra / Skills / Server", purpose: "Engineering und Umsetzung", status: "live", statusLabel: "Live" },
      { from: "Jarvis", to: "Sentinel", channel: "Logs / Health / Security", purpose: "Monitoring und Sicherheit", status: "live", statusLabel: "Live" },
      { from: "Jarvis", to: "Oracle", channel: "Briefings", purpose: "Kontext, Wetter und News", status: "ready", statusLabel: "Bereit" },
      { from: "Jarvis", to: "Muse", channel: "Content / Audio / Social", purpose: "Content und Media", status: "ready", statusLabel: "Bereit" },
      { from: "Jarvis", to: "Heimdall", channel: "Home Assistant", purpose: "Smart Home und Automationen", status: "connected", statusLabel: "Verbunden" }
    ],
    agents: [
      { name: "Hermes", role: "Primär-Controller und Telegram-Hub", route: "Mensch -> Hermes", channel: "Control / Review", status: "live", statusLabel: "Live", tags: ["Telegram", "Control", "Review"] },
      { name: "Jarvis", role: "Organizer und Verteiler", route: "Hermes -> Jarvis", channel: "Routing", status: "live", statusLabel: "Live", tags: ["Delegation", "Graph", "Queue"] },
      { name: "Argus", role: "Vorpruefung und Diagnose", route: "Jarvis -> Argus", channel: "Checks", status: "support", statusLabel: "Support", tags: ["Audit", "Second Pass", "Safety"] },
      { name: "OpenClaw Gateway", role: "Broker und Bridge-Schicht", route: "Hermes -> Gateway", channel: "Queue", status: "connected", statusLabel: "Verbunden", tags: ["Bridge", "Queue", "Delegation"] },
      { name: "Forge", role: "OpenClaw Infra, Skills und Server", route: "Jarvis -> Forge", channel: "Engineering", status: "live", statusLabel: "Live", tags: ["Infra", "Skills", "Server"] },
      { name: "Sentinel", role: "Monitoring, Logs und Security", route: "Jarvis -> Sentinel", channel: "Watch", status: "live", statusLabel: "Live", tags: ["Logs", "Health", "Security"] },
      { name: "Oracle", role: "Briefings, Wetter und News", route: "Jarvis -> Oracle", channel: "Briefings", status: "ready", statusLabel: "Bereit", tags: ["Briefing", "Weather", "News"] },
      { name: "Muse", role: "TikTok, SoundCloud und Content", route: "Jarvis -> Muse", channel: "Media", status: "ready", statusLabel: "Bereit", tags: ["Content", "Audio", "Social"] },
      { name: "Heimdall", role: "Home Assistant und Smart Home", route: "Jarvis -> Heimdall", channel: "Home", status: "connected", statusLabel: "Verbunden", tags: ["HA", "Scenes", "Devices"] },
      { name: "Friday", role: "Schwere Reparaturen und Deep Work", route: "Jarvis -> Friday", channel: "Repair", status: "ready", statusLabel: "Bereit", tags: ["Deep Work", "Fixes", "Review"] },
      { name: "Claude", role: "High trust, Nachpruefung und komplexe Arbeit", route: "Escalation", channel: "Claude", status: "support", statusLabel: "Support", tags: ["Escalation", "Review", "Reasoning"] },
      { name: "Codex", role: "Code-ausfuehrende Eskalationsschicht", route: "Escalation", channel: "Codex", status: "support", statusLabel: "Support", tags: ["Code", "Fixes", "Implementation"] }
    ],
    devices: [
      { name: "Mac mini", role: "Zentralserver", route: "Mac mini -> alles", channel: "SMB / Host", status: "connected", statusLabel: "Verbunden", tags: ["Zentrale", "SMB", "HA"] },
      { name: "MacBook", role: "Arbeits- und Mirror-Node", route: "MacBook -> Hermes", channel: "Mirror", status: "connected", statusLabel: "Verbunden", tags: ["Mirror", "Review", "Remote"] },
      { name: "iMac", role: "Operator-Station", route: "iMac -> Control", channel: "Operator", status: "live", statusLabel: "Live", tags: ["iMac", "Dashboard", "Control"] },
      { name: "iPhone", role: "Telegram / Mobile Companion", route: "iPhone -> Hermes", channel: "Telegram", status: "active", statusLabel: "Aktiv", tags: ["Mobile", "Telegram", "Alerts"] },
      { name: "Home Assistant", role: "Automation und Bruecke", route: "HA -> Mac mini", channel: "Automation", status: "live", statusLabel: "Live", tags: ["HA", "Scenes", "Bridge"] },
      { name: "GitHub", role: "Repo Sync und Codebasis", route: "GitHub -> Repo", channel: "Sync", status: "connected", statusLabel: "Verbunden", tags: ["Repo", "PR", "Workflow"] },
      { name: "Obsidian", role: "Vault und Live-Gedächtnis", route: "Vault -> Graph", channel: "Memory", status: "sync", statusLabel: "Sync", tags: ["Vault", "Graph", "Memory"] },
      { name: "StreamDeck", role: "Aktionen und Hotkeys", route: "StreamDeck -> Ops", channel: "Actions", status: "ready", statusLabel: "Bereit", tags: ["Shortcuts", "Macros", "Live"] },
      { name: "Rodecaster", role: "Audio-Routing", route: "Rodecaster -> Audio", channel: "Audio", status: "ready", statusLabel: "Bereit", tags: ["Audio", "Mic", "Scenes"] },
      { name: "TikTok Live Studio", role: "Content Live-Fläche", route: "TikTok -> Content", channel: "Live", status: "ready", statusLabel: "Bereit", tags: ["Live", "Content", "Publishing"] },
      { name: "SoundCloud", role: "Music Publishing", route: "SoundCloud -> Public", channel: "Audio", status: "live", statusLabel: "Live", tags: ["Audio", "Public", "Music"] }
    ],
    delegations: [
      { from: "Hermes", to: "Jarvis", task: "Eingaben priorisieren und in Arbeitsstränge verteilen", channel: "Telegram", priority: "P0", status: "live", statusLabel: "Live" },
      { from: "Jarvis", to: "Argus", task: "Zweitbewertung fuer Risko, Logik und Korrektheit", channel: "Checks", priority: "P1", status: "support", statusLabel: "Support" },
      { from: "Jarvis", to: "Heimdall", task: "HA-Backups und Smart-Home-Status prüfen", channel: "Home Assistant", priority: "P1", status: "live", statusLabel: "Live" },
      { from: "Hermes", to: "OpenClaw Gateway", task: "Queue und Bridge fuer Delegationen offen halten", channel: "Bridge", priority: "P1", status: "connected", statusLabel: "Verbunden" },
      { from: "Jarvis", to: "Forge", task: "Repo, Infrastruktur und Fixes bereitstellen", channel: "Engineering", priority: "P0", status: "live", statusLabel: "Live" },
      { from: "Jarvis", to: "Sentinel", task: "Logs, Health und Security kontinuierlich ueberwachen", channel: "Monitoring", priority: "P0", status: "live", statusLabel: "Live" },
      { from: "Jarvis", to: "Muse", task: "Content und Audio fuer Social-Aktionen vorbereiten", channel: "Media", priority: "P2", status: "ready", statusLabel: "Bereit" },
      { from: "Jarvis", to: "Friday", task: "Schwere Reparaturen und Deep-Work-Fixes sammeln", channel: "Repair", priority: "P2", status: "ready", statusLabel: "Bereit" }
    ],
    conversations: [
      { topic: "Kontrollkette", time: generatedAtLabel, from: "Mensch", to: "Hermes", summary: "Alle Eingaben starten beim zentralen Telegram-Hub und gehen von dort in die Verteilung.", status: "live", statusLabel: "Live" },
      { topic: "Routing", time: generatedAtLabel, from: "Hermes", to: "Jarvis", summary: "Jarvis bekommt die Arbeitsstränge, sortiert sie und gibt sie an die Unteragenten weiter.", status: "live", statusLabel: "Live" },
      { topic: "Vorpruefung", time: generatedAtLabel, from: "Jarvis", to: "Argus", summary: "Argus liefert Zweitbewertung und Diagnose, bevor etwas weiter eskaliert wird.", status: "support", statusLabel: "Support" },
      { topic: "Speicher", time: generatedAtLabel, from: "Jarvis", to: "Obsidian", summary: "Notizen und Vault-Kontext bleiben synchron, damit das Kontrollzentrum konsistent bleibt.", status: "sync", statusLabel: "Sync" },
      { topic: "Home Assistant", time: generatedAtLabel, from: "Jarvis", to: "Heimdall", summary: "HA-Backups und Device-Verbindungen werden fuer den Mac mini als Zentrale betrachtet.", status: "live", statusLabel: "Live" },
      { topic: "Engineering", time: generatedAtLabel, from: "Jarvis", to: "Forge", summary: "Forge haelt die technischen Pfade, Repos und Infrastruktur-Arbeiten zusammen.", status: "ready", statusLabel: "Bereit" }
    ],
    liveData: [
      { label: "Telegram", value: "Mensch -> Hermes", status: "live", statusLabel: "Live" },
      { label: "Routing", value: "Hermes -> Jarvis", status: "connected", statusLabel: "Verbunden" },
      { label: "Vorpruefung", value: "Jarvis -> Argus", status: "support", statusLabel: "Support" },
      { label: "HA-Bruecke", value: "Jarvis -> Heimdall", status: "live", statusLabel: "Live" },
      { label: "Repo Sync", value: "GitHub -> Codebasis", status: "connected", statusLabel: "Verbunden" },
      { label: "Memory Sync", value: "Obsidian -> Graph", status: "sync", statusLabel: "Sync" },
      { label: "Audio", value: "Rodecaster -> Output", status: "ready", statusLabel: "Bereit" },
      { label: "Live Content", value: "TikTok / SoundCloud", status: "ready", statusLabel: "Bereit" }
    ]
  };

  const hermesRuntime = buildHermesRuntimeSnapshot();
  agentsRoom.metrics = {
    ...agentsRoom.metrics,
    agentCount: Math.max(agentsRoom.metrics.agentCount || 0, hermesRuntime.metrics.agentCount || 0),
    routeCount: Math.max(agentsRoom.metrics.routeCount || 0, hermesRuntime.metrics.routeCount || 0),
    deviceCount: Math.max(agentsRoom.metrics.deviceCount || 0, hermesRuntime.metrics.deviceCount || 0),
    liveCount: Math.max(agentsRoom.metrics.liveCount || 0, hermesRuntime.metrics.liveCount || 0),
    delegationCount: Math.max(agentsRoom.metrics.delegationCount || 0, hermesRuntime.metrics.delegationCount || 0),
    conversationCount: Math.max(agentsRoom.metrics.conversationCount || 0, hermesRuntime.metrics.conversationCount || 0),
    sourceCount: hermesRuntime.metrics.sourceCount || agentsRoom.metrics.sourceCount || 0
  };
  agentsRoom.runtime = hermesRuntime.runtime;
  agentsRoom.sourceRegistry = hermesRuntime.sourceRegistry;
  agentsRoom.sessions = hermesRuntime.sessions;
  agentsRoom.recentMessages = hermesRuntime.recentMessages;
  agentsRoom.recentDelegations = hermesRuntime.recentDelegations;
  agentsRoom.recentObligations = hermesRuntime.recentObligations;

  const data = {
    metadata: {
      mode: "live",
      generatedAt: generatedAtIso,
      generatedAtLabel,
      timezone: "Europe/Berlin",
      activeRange: "Live-Check"
    },
    systemStatus: {
      website: {
        label: "Website",
        value: pageEnvironmentIssue ? "Lokal nicht verifizierbar" : pageProblemCount === 0 ? "Erreichbar" : `${pageProblemCount} Fehler`,
        level: pageEnvironmentIssue ? "info" : pageProblemCount === 0 ? "ok" : "warn"
      },
      storeLinks: {
        label: "Shop-Links",
        value: shopEnvironmentIssue ? "Lokal nicht verifizierbar" : `${shopLive}/${shopChecked} erreichbar`,
        level: shopEnvironmentIssue ? "info" : shopProblemCount === 0 ? "ok" : "warn"
      },
      social: {
        label: "Social-Profile",
        value: tiktokEnvironmentIssue
          ? "Lokal nicht verifizierbar"
          : `${[tiktokDr, tiktokMrs].filter((entry) => entry.canonical).length}/2 TikTok erreichbar`,
        level: tiktokEnvironmentIssue ? "info" : [tiktokDr, tiktokMrs].filter((entry) => entry.canonical).length === 2 ? "ok" : "warn"
      },
      deployment: { label: "Datenstand", value: generatedAtLabel, level: "info" }
    },
    overviewKpis: [
      { id: "pagesChecked", label: "Gepruefte Seiten", value: pageChecks.length, delta: "Live", trend: "neutral" },
      { id: "pagesOk", label: "Seiten OK", value: pageOk, delta: pageEnvironmentIssue ? "lokal nicht verifizierbar" : "Live", trend: pageProblemCount === 0 ? "up" : "neutral" },
      { id: "pagesFail", label: "Seiten mit Fehler", value: pageProblemCount, delta: pageEnvironmentIssue ? "Umgebung" : "Live", trend: pageProblemCount > 0 ? "down" : "neutral" },
      { id: "responseAvg", label: "Ø Antwortzeit (ms)", value: avgResponse, delta: "Live", trend: "neutral" },
      { id: "merchItems", label: "Merch Artikel gesamt", value: items.length, delta: "Katalog", trend: "neutral" },
      { id: "shopLinks", label: "Shop-Links geprueft", value: shopChecked, delta: "Shirtee", trend: "neutral" },
      { id: "shopLinksOk", label: "Shop-Links OK", value: shopLive, delta: shopEnvironmentIssue ? "lokal nicht verifizierbar" : "Shirtee", trend: shopProblemCount === 0 ? "up" : "neutral" },
      { id: "soundcloudFollowers", label: "SoundCloud Follower", value: soundcloud.available ? soundcloud.user.followers_count : null, delta: soundcloudEnvironmentIssue ? "lokal nicht verifizierbar" : "Live", trend: "neutral" },
      { id: "tiktokProfiles", label: "TikTok Profile erreichbar", value: [tiktokDr, tiktokMrs].filter((entry) => entry.canonical).length, delta: tiktokEnvironmentIssue ? "lokal nicht verifizierbar" : "Live", trend: "neutral" },
      { id: "siteTiktokLinks", label: "TikTok Links auf Website", value: hrefCounts.tiktok, delta: "Inhalt", trend: "neutral" },
      { id: "siteShopLinks", label: "Shop Links auf Website", value: hrefCounts.shop, delta: "Inhalt", trend: "neutral" },
      { id: "warnings", label: "Offene Warnungen", value: warningCount, delta: "Pruefstatus", trend: warningCount > 0 ? "down" : "neutral" }
    ],
    websiteMetrics: {
      trafficSeries: pageChecks.map((item) => ({
        label: item.path === "/" ? "Start" : item.path.replace("/", "").replace(".html", ""),
        visitors: item.timingMs || 0,
        pageviews: item.contentLength ? Math.round(item.contentLength / 1024) : 0
      })),
      topPages: pageChecks
        .slice()
        .sort((a, b) => (b.contentLength || 0) - (a.contentLength || 0))
        .slice(0, 5)
        .map((item) => ({
          page: item.path,
          views: item.contentLength ? Math.round(item.contentLength / 1024) : 0,
          ctr: item.ok ? "200" : String(item.status || 0)
        })),
      audiences: [
        { label: pageEnvironmentIssue ? "Nicht verifizierbar" : "Erreichbar", value: pageEnvironmentIssue ? 0 : toPercent(pageOk, pageChecks.length) },
        { label: pageEnvironmentIssue ? "Umgebung" : "Fehler", value: pageEnvironmentIssue ? 0 : toPercent(pageProblemCount, pageChecks.length) }
      ],
      sources: [
        { label: "TikTok Links", value: hrefCounts.tiktok },
        { label: "SoundCloud Links", value: hrefCounts.soundcloud },
        { label: "Shop Links", value: hrefCounts.shop },
        { label: "Kontakt Links", value: hrefCounts.contact }
      ],
      devices: [
        { label: "2xx", value: toPercent(pageChecks.filter((item) => item.status >= 200 && item.status < 300).length, pageChecks.length) },
        { label: "3xx", value: toPercent(pageChecks.filter((item) => item.status >= 300 && item.status < 400).length, pageChecks.length) },
        { label: "4xx/5xx", value: toPercent(pageChecks.filter((item) => item.status >= 400 || item.status === 0).length, pageChecks.length) }
      ],
      regions: [],
      engagement: {
        avgSession: `${avgResponse} ms`,
        bounceRate: "nicht gemessen",
        buttonCtr: "nicht gemessen"
      }
    },
    shopMetrics: {
      linkHealth: {
        checkedLinks: shopChecked,
        okLinks: shopLive,
        failLinks: shopProblemCount,
        reachabilityRate: shopEnvironmentIssue ? "nicht verifizierbar" : shopChecked ? `${toPercent(shopLive, shopChecked)}%` : "0%",
        checkedAt: generatedAtIso,
        checkedAtLabel: generatedAtLabel
      },
      catalog: {
        totalItems: items.length,
        liveItems: statusCount["Live im Store"] || shopLive,
        uploadWave: (statusCount.Uploadbereit || 0) + (statusCount["Top Upload"] || 0),
        conceptItems: Math.max(items.length - ((statusCount["Live im Store"] || shopLive) + (statusCount.Uploadbereit || 0) + (statusCount["Top Upload"] || 0)), 0),
        sections: sectionRows,
        storeVisibleProducts,
        storeVisibleProductNames,
        uploadedCount,
        submittedCount,
        readyCount,
        pendingCount,
        itemStates: catalogItemStates
      },
      topProducts,
      timeline: externalResults.slice(0, 8).map((entry, index) => ({
        time: generatedAtLabel,
        type: entry.verified ? "ok" : shopEnvironmentIssue ? "info" : "warning",
        detail: shopEnvironmentIssue ? `Shop-Link ${index + 1}: lokal nicht verifizierbar` : `Shop-Link ${index + 1}: HTTP ${entry.httpCode}`
      }))
    },
    socialMetrics: {
      links: socialRows,
      strongestPlatform: socialStrongest?.platform || "nicht verfuegbar",
      routes: [
        { from: "Website", to: "TikTok Dr. Gray", channel: "Hero / CTA", status: "live" },
        { from: "Website", to: "TikTok Mrs. Dr. Gray", channel: "Hero / CTA", status: "live" },
        { from: "Website", to: "SoundCloud", channel: "Player / Music", status: soundcloud.available ? "live" : soundcloudEnvironmentIssue ? "info" : "check" },
        { from: "Instagram", to: "nicht genutzt", channel: "kein Kanal", status: "info" }
      ],
      comparisons: [
        { label: "TikTok Links im Seiteninhalt", value: String(hrefCounts.tiktok) },
        { label: "SoundCloud Links im Seiteninhalt", value: String(hrefCounts.soundcloud) },
        { label: "Shop Links im Seiteninhalt", value: String(hrefCounts.shop) }
      ],
      officialAccounts: [
        { label: "Website", url: websiteBase, status: "live" },
        { label: "Shirtee Store", url: liveLinkStatus?.storeHref || "https://www.shirtee.com/de/store/drgray-mrsdrgray/", status: shopEnvironmentIssue ? "check" : shopProblemCount === 0 ? "live" : "check" },
        { label: "SoundCloud", url: "https://soundcloud.com/drgray_sic", status: soundcloud.available ? "live" : soundcloudEnvironmentIssue ? "check" : "check" },
        { label: "TikTok Dr. Gray", url: "https://www.tiktok.com/@drgray_mrsdrgray", status: tiktokDr.canonical ? "live" : tiktokEnvironmentIssue ? "check" : "check" },
        { label: "TikTok Mrs. Dr. Gray", url: "https://www.tiktok.com/@gray.afterhours", status: tiktokMrs.canonical ? "live" : tiktokEnvironmentIssue ? "check" : "check" }
      ]
    },
    performanceMetrics: {
      webVitals: [
        { metric: "Core Web Vitals", value: "nicht verbunden", state: "info" },
        { metric: "HTTP Seitenchecks", value: pageEnvironmentIssue ? "lokal nicht verifizierbar" : `${pageOk}/${pageChecks.length} OK`, state: pageEnvironmentIssue ? "info" : pageProblemCount === 0 ? "good" : "warn" },
        { metric: "Shirtee-Linkchecks", value: shopEnvironmentIssue ? "lokal nicht verifizierbar" : `${shopLive}/${shopChecked} OK`, state: shopEnvironmentIssue ? "info" : shopProblemCount === 0 ? "good" : "warn" }
      ],
      responseTime: `${avgResponse} ms`,
      uptime: pageEnvironmentIssue ? "lokal nicht verifizierbar" : `${toPercent(pageOk, pageChecks.length)}% (Seitencheck)`,
      externalChecks: [
        { label: "Website Core-Pfade", status: pageEnvironmentIssue ? "lokal nicht verifizierbar" : `${pageOk}/${pageChecks.length} erreichbar`, level: pageEnvironmentIssue ? "info" : pageProblemCount === 0 ? "ok" : "warn" },
        { label: "Shop Produktlinks", status: shopEnvironmentIssue ? "lokal nicht verifizierbar" : `${shopLive}/${shopChecked} erreichbar`, level: shopEnvironmentIssue ? "info" : shopProblemCount === 0 ? "ok" : "warn" },
        { label: "SoundCloud Profil", status: soundcloud.available ? "OK" : soundcloudEnvironmentIssue ? "lokal nicht verifizierbar" : "Nicht abrufbar", level: soundcloud.available ? "ok" : soundcloudEnvironmentIssue ? "info" : "warn" }
      ],
      errorLog: [
        ...(pageProblemCount > 0 ? [{ id: "WEB-001", scope: "website", message: `${pageProblemCount} Seiten liefern keinen HTTP 200 Status`, level: "warn" }] : []),
        ...(shopProblemCount > 0 ? [{ id: "SHOP-001", scope: "shop", message: `${shopProblemCount} gepruefte Shop-Links sind nicht erreichbar`, level: "warn" }] : []),
        ...(!soundcloud.available && !soundcloudEnvironmentIssue ? [{ id: "SOC-001", scope: "soundcloud", message: "SoundCloud API aktuell nicht auslesbar", level: "warn" }] : [])
      ]
    },
    contentPerformance: {
      strongestSections: sectionRows.slice(0, 3).map((row) => ({
        section: row.label,
        score: toPercent(row.items, Math.max(items.length, 1))
      })),
      ctas: [
        { name: "TikTok Links", clicks: hrefCounts.tiktok, rate: "Live-Linkcount" },
        { name: "Shop Links", clicks: hrefCounts.shop, rate: "Live-Linkcount" },
        { name: "SoundCloud Links", clicks: hrefCounts.soundcloud, rate: "Live-Linkcount" }
      ],
      weakSpots: [
        ...(pageProblemCount > 0 ? [{ item: "Seitenverfuegbarkeit", note: "Mindestens ein Seitenpfad antwortet nicht mit HTTP 200." }] : []),
        ...(shopProblemCount > 0 ? [{ item: "Produktlink-Verfuegbarkeit", note: "Nicht alle geprueften Shop-Links sind erreichbar." }] : []),
        ...(pageEnvironmentIssue ? [{ item: "Netzwerk-DNS", note: "Die Umgebung kann die Hauptdomain nicht aufloesen; das ist kein Site-Fehler." }] : []),
        ...(shopEnvironmentIssue ? [{ item: "Shop-Pruefung", note: "Die lokale Umgebung kann die Shirtee-Links nicht verifizieren." }] : []),
        ...(hrefCounts.contact === 0 ? [{ item: "Kontakt-CTA", note: "Keine Kontakt-Links im Seiteninhalt erkannt." }] : [])
      ]
    },
    activityFeed: [
      { id: "EVT-1", time: generatedAtLabel, type: "check", text: `Live-Pruefung abgeschlossen: ${pageChecks.length} Seitenchecks` },
      { id: "EVT-2", time: generatedAtLabel, type: "check", text: shopEnvironmentIssue ? "Shop-Linkcheck: lokal nicht verifizierbar" : `Shop-Linkcheck: ${shopLive}/${shopChecked} erreichbar` },
      { id: "EVT-3", time: generatedAtLabel, type: "check", text: soundcloudEnvironmentIssue ? "SoundCloud: lokal nicht verifizierbar" : `SoundCloud: ${soundcloud.available ? "Profilsignal abrufbar" : "kein Profilsignal"}` },
      { id: "EVT-4", time: generatedAtLabel, type: "check", text: tiktokEnvironmentIssue ? "TikTok Profile: lokal nicht verifizierbar" : `TikTok Profile: ${[tiktokDr, tiktokMrs].filter((entry) => entry.canonical).length}/2 erreichbar` }
    ],
    alerts: [
      ...(pageEnvironmentIssue
        ? [{ id: "AL-WEB", level: "info", title: "Website lokal nicht verifizierbar", description: "Die Shell-Umgebung kann die Domain nicht aufloesen; das Dashboard zeigt deshalb keinen falschen Ausfall an.", source: "Website Monitoring" }]
        : pageProblemCount > 0
          ? [{ id: "AL-WEB", level: "warn", title: "Seitenchecks mit Fehler", description: `${pageProblemCount} von ${pageChecks.length} geprueften Seiten sind nicht auf HTTP 200.`, source: "Website Monitoring" }]
          : [{ id: "AL-WEB", level: "ok", title: "Alle Seiten erreichbar", description: "Alle geprueften Kernseiten antworten mit HTTP 200.", source: "Website Monitoring" }]),
      ...(shopEnvironmentIssue
        ? [{ id: "AL-SHOP", level: "info", title: "Shop lokal nicht verifizierbar", description: "Die lokale Umgebung kann die Shirtee-Links nicht testen; der Status bleibt deshalb neutral.", source: "Shop Monitoring" }]
        : shopProblemCount > 0
          ? [{ id: "AL-SHOP", level: "warn", title: "Shop-Link Problem", description: `${shopProblemCount} gepruefte Produktlinks liefern keinen OK-Status.`, source: "Shop Monitoring" }]
          : [{ id: "AL-SHOP", level: "ok", title: "Shop-Links erreichbar", description: "Alle geprueften Produktlinks sind erreichbar.", source: "Shop Monitoring" }]),
      {
        id: "AL-SOC",
        level: soundcloud.available ? "ok" : soundcloudEnvironmentIssue ? "info" : "warn",
        title: soundcloud.available ? "SoundCloud Live-Profil erkannt" : soundcloudEnvironmentIssue ? "SoundCloud lokal nicht verifizierbar" : "SoundCloud eingeschraenkt",
        description: soundcloud.available
          ? `${soundcloud.user.followers_count} Follower und ${soundcloud.user.track_count} Tracks verifiziert.`
          : soundcloudEnvironmentIssue
            ? "Die lokale Umgebung kann keine stabilen SoundCloud-Metriken abrufen."
            : "Aktuell keine stabilen SoundCloud-Metriken abrufbar.",
        source: "Social Monitoring"
      }
    ],
    quickActions: [
      { id: "qa-1", label: "Website oeffnen", href: websiteBase, external: true },
      { id: "qa-2", label: "Shop Seite oeffnen", href: `${websiteBase}/shop.html`, external: true },
      { id: "qa-3", label: "Shirtee Store", href: liveLinkStatus?.storeHref || "https://www.shirtee.com/de/store/drgray-mrsdrgray/", external: true },
      { id: "qa-4", label: "SoundCloud Profil", href: "https://soundcloud.com/drgray_sic", external: true },
      { id: "qa-5", label: "TikTok Dr. Gray", href: "https://www.tiktok.com/@drgray_mrsdrgray", external: true },
      { id: "qa-6", label: "TikTok Mrs. Dr. Gray", href: "https://www.tiktok.com/@gray.afterhours", external: true },
      { id: "qa-7", label: "Kontakt testen", href: `${websiteBase}/kontakt.html`, external: true },
      { id: "qa-8", label: "Upload Queue CSV", href: "#export-upload-queue", external: false },
      { id: "qa-9", label: "Live-Daten neu laden", href: "#reload", external: false },
      { id: "qa-10", label: "Abmelden", href: "#logout", external: false }
    ],
    agentsRoom
  };

  writeFileSync(outPath, JSON.stringify(data, null, 2), "utf8");
  console.log(`Wrote ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
