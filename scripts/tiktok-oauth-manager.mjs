#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const HOME_DIR = process.env.HOME || "/Users/jarvisgray";
const DEFAULT_STORE_PATH = join(HOME_DIR, ".hermes", "secrets", "tiktok-oauth-store.json");
const TOKEN_ENDPOINT = "https://open.tiktokapis.com/v2/oauth/token/";
const AUTHORIZE_ENDPOINT = "https://www.tiktok.com/v2/auth/authorize/";
const DEFAULT_SCOPES = ["user.info.basic", "video.list", "video.upload"];

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function safeNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function readJson(filePath, fallback) {
  try {
    if (!existsSync(filePath)) return fallback;
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function normalizeScopes(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((entry) => String(entry || "").trim()).filter(Boolean))];
  }
  if (typeof value === "string" && value.trim()) {
    return [...new Set(value.split(/[,\s]+/).map((entry) => entry.trim()).filter(Boolean))];
  }
  return [...DEFAULT_SCOPES];
}

function envAccountPrefix(accountKey) {
  return String(accountKey || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_");
}

function tokenStorePath() {
  return process.env.TIKTOK_TOKEN_STORE_PATH || DEFAULT_STORE_PATH;
}

function readTokenStore() {
  const filePath = tokenStorePath();
  const payload = readJson(filePath, {});
  return {
    filePath,
    payload: payload && typeof payload === "object" ? payload : {}
  };
}

function writeTokenStore(nextPayload) {
  const filePath = tokenStorePath();
  writeJson(filePath, nextPayload);
  return filePath;
}

function getAccountConfig(accountKey, overrides = {}) {
  const envKey = envAccountPrefix(accountKey);
  return {
    accountKey: normalizeKey(accountKey),
    displayName: overrides.displayName || process.env[`TIKTOK_${envKey}_DISPLAY_NAME`] || accountKey,
    clientKey: overrides.clientKey || process.env.TIKTOK_CLIENT_KEY || "",
    clientSecret: overrides.clientSecret || process.env.TIKTOK_CLIENT_SECRET || "",
    redirectUri: overrides.redirectUri || process.env.TIKTOK_REDIRECT_URI || "",
    accessToken: overrides.accessToken || process.env[`TIKTOK_${envKey}_ACCESS_TOKEN`] || "",
    refreshToken: overrides.refreshToken || process.env[`TIKTOK_${envKey}_REFRESH_TOKEN`] || "",
    scopes: normalizeScopes(overrides.scopes || process.env.TIKTOK_OAUTH_SCOPES),
    forceRefresh: overrides.forceRefresh === true,
    nowEpoch: overrides.nowEpoch || Math.floor(Date.now() / 1000)
  };
}

function extractTokenBundle(payload, fallbackRefreshToken = "") {
  const data = payload?.data || payload || {};
  const accessToken = typeof data.access_token === "string" ? data.access_token : "";
  const refreshToken = typeof data.refresh_token === "string" ? data.refresh_token : fallbackRefreshToken;
  const expiresIn = safeNumber(data.expires_in) || 0;
  const refreshExpiresIn = safeNumber(data.refresh_expires_in) || 0;
  const nowEpoch = Math.floor(Date.now() / 1000);
  return {
    accessToken,
    refreshToken,
    openId: typeof data.open_id === "string" ? data.open_id : null,
    scope: typeof data.scope === "string" ? data.scope : null,
    tokenType: typeof data.token_type === "string" ? data.token_type : "Bearer",
    expiresAt: expiresIn > 0 ? nowEpoch + expiresIn : null,
    refreshExpiresAt: refreshExpiresIn > 0 ? nowEpoch + refreshExpiresIn : null,
    updatedAt: new Date().toISOString()
  };
}

function mergeStoredAccount(accountKey, overrides = {}) {
  const config = getAccountConfig(accountKey, overrides);
  const store = readTokenStore();
  const accountState = store.payload?.accounts?.[config.accountKey] || {};
  return {
    config,
    storePath: store.filePath,
    storePayload: store.payload,
    accountState
  };
}

function persistAccountState(accountKey, nextState) {
  const normalizedKey = normalizeKey(accountKey);
  const { payload } = readTokenStore();
  const nextPayload = {
    ...payload,
    updatedAt: new Date().toISOString(),
    accounts: {
      ...(payload.accounts || {}),
      [normalizedKey]: nextState
    }
  };
  return writeTokenStore(nextPayload);
}

function isTokenFresh(bundle, nowEpoch, bufferSeconds = 300) {
  if (!bundle || typeof bundle !== "object") return false;
  if (typeof bundle.accessToken !== "string" || bundle.accessToken.trim().length < 10) return false;
  if (!bundle.expiresAt) return true;
  return Number(bundle.expiresAt) - bufferSeconds > nowEpoch;
}

async function fetchToken(grantType, body) {
  const params = new URLSearchParams({ grant_type: grantType, ...body });
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json"
    },
    body: params
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorText = payload?.error_description || payload?.message || payload?.error || `token_${response.status}`;
    throw new Error(errorText);
  }
  return payload;
}

export function buildTikTokAuthorizeUrl(accountKey, overrides = {}) {
  const config = getAccountConfig(accountKey, overrides);
  if (!config.clientKey || !config.redirectUri) {
    throw new Error("TIKTOK_CLIENT_KEY oder TIKTOK_REDIRECT_URI fehlen");
  }
  const state = overrides.state || `${config.accountKey}-${Date.now()}`;
  const url = new URL(AUTHORIZE_ENDPOINT);
  url.searchParams.set("client_key", config.clientKey);
  url.searchParams.set("scope", config.scopes.join(","));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("state", state);
  return {
    accountKey: config.accountKey,
    state,
    scopes: config.scopes,
    url: url.toString()
  };
}

export async function exchangeTikTokCode(accountKey, code, overrides = {}) {
  const config = getAccountConfig(accountKey, overrides);
  if (!config.clientKey || !config.clientSecret || !config.redirectUri) {
    throw new Error("TikTok OAuth Konfiguration unvollstaendig");
  }
  if (!code) {
    throw new Error("OAuth Code fehlt");
  }
  const payload = await fetchToken("authorization_code", {
    client_key: config.clientKey,
    client_secret: config.clientSecret,
    code,
    redirect_uri: config.redirectUri
  });
  const bundle = extractTokenBundle(payload, config.refreshToken);
  persistAccountState(config.accountKey, {
    ...bundle,
    displayName: config.displayName,
    scopes: config.scopes
  });
  return bundle;
}

export async function refreshTikTokToken(accountKey, overrides = {}) {
  const { config, accountState } = mergeStoredAccount(accountKey, overrides);
  if (!config.clientKey || !config.clientSecret) {
    throw new Error("TIKTOK_CLIENT_KEY oder TIKTOK_CLIENT_SECRET fehlen");
  }
  const refreshToken = config.refreshToken || accountState.refreshToken || "";
  if (!refreshToken) {
    throw new Error("Kein Refresh Token fuer diesen Account vorhanden");
  }
  const payload = await fetchToken("refresh_token", {
    client_key: config.clientKey,
    client_secret: config.clientSecret,
    refresh_token: refreshToken
  });
  const bundle = extractTokenBundle(payload, refreshToken);
  persistAccountState(config.accountKey, {
    ...accountState,
    ...bundle,
    displayName: config.displayName,
    scopes: config.scopes
  });
  return bundle;
}

export async function resolveTikTokAccessToken(accountKey, overrides = {}) {
  const { config, accountState, storePath } = mergeStoredAccount(accountKey, overrides);
  const directAccessToken = config.accessToken.trim();
  if (directAccessToken) {
    return {
      accessToken: directAccessToken,
      source: "env-access-token",
      refreshed: false,
      accountKey: config.accountKey,
      displayName: config.displayName,
      diagnostics: `Direktes Env-Token (${config.accountKey})`,
      storePath
    };
  }

  if (isTokenFresh(accountState, config.nowEpoch) && !config.forceRefresh) {
    return {
      accessToken: accountState.accessToken,
      source: "token-store",
      refreshed: false,
      accountKey: config.accountKey,
      displayName: config.displayName,
      diagnostics: `Token Store bis ${accountState.expiresAt || "offen"}`,
      storePath
    };
  }

  if ((config.refreshToken || accountState.refreshToken) && config.clientKey && config.clientSecret) {
    const refreshedBundle = await refreshTikTokToken(config.accountKey, overrides);
    return {
      accessToken: refreshedBundle.accessToken,
      source: "refresh-token",
      refreshed: true,
      accountKey: config.accountKey,
      displayName: config.displayName,
      diagnostics: `Refresh erfolgreich (${config.accountKey})`,
      storePath
    };
  }

  return {
    accessToken: "",
    source: "missing",
    refreshed: false,
    accountKey: config.accountKey,
    displayName: config.displayName,
    diagnostics: "Kein Access-/Refresh-Token konfiguriert",
    storePath
  };
}

export function getTikTokTokenStatus(accountKey, overrides = {}) {
  const { config, accountState, storePath } = mergeStoredAccount(accountKey, overrides);
  return {
    accountKey: config.accountKey,
    displayName: config.displayName,
    storePath,
    hasDirectAccessToken: Boolean(config.accessToken),
    hasRefreshToken: Boolean(config.refreshToken || accountState.refreshToken),
    hasStoredAccessToken: Boolean(accountState.accessToken),
    expiresAt: accountState.expiresAt || null,
    refreshExpiresAt: accountState.refreshExpiresAt || null,
    scopes: accountState.scopes || config.scopes,
    updatedAt: accountState.updatedAt || null,
    tokenFresh: isTokenFresh(accountState, config.nowEpoch)
  };
}

function parseArgv(argv) {
  const result = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      result._.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      result[key] = "true";
      continue;
    }
    result[key] = next;
    index += 1;
  }
  return result;
}

async function main() {
  const argv = parseArgv(process.argv.slice(2));
  const command = argv._[0] || "status";
  const account = argv.account || argv._[1] || "dr";

  if (command === "auth-url") {
    console.log(JSON.stringify(buildTikTokAuthorizeUrl(account, { state: argv.state, scopes: argv.scopes }), null, 2));
    return;
  }

  if (command === "exchange-code") {
    const bundle = await exchangeTikTokCode(account, argv.code, {});
    console.log(JSON.stringify(bundle, null, 2));
    return;
  }

  if (command === "refresh") {
    const bundle = await refreshTikTokToken(account, {});
    console.log(JSON.stringify(bundle, null, 2));
    return;
  }

  if (command === "resolve") {
    const bundle = await resolveTikTokAccessToken(account, { forceRefresh: argv.force === "true" });
    console.log(JSON.stringify(bundle, null, 2));
    return;
  }

  console.log(JSON.stringify(getTikTokTokenStatus(account), null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
