import { controlAuthConfig } from "./config.js";

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256(text) {
  const encoded = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return toHex(digest);
}

export async function createAuthDigest(passphrase) {
  const value = `${controlAuthConfig.salt}:${passphrase}`;
  return sha256(value);
}

function getSessionData() {
  try {
    const raw = localStorage.getItem(controlAuthConfig.storageKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isSessionValid(session) {
  if (!session || !session.digest || !session.expiresAt) {
    return false;
  }
  if (session.digest !== controlAuthConfig.passphraseHash) {
    return false;
  }
  return Date.now() < Number(session.expiresAt);
}

export function clearControlSession() {
  localStorage.removeItem(controlAuthConfig.storageKey);
}

export async function establishControlSession(passphrase) {
  const digest = await createAuthDigest(passphrase);
  if (digest !== controlAuthConfig.passphraseHash) {
    return false;
  }
  const expiresAt = Date.now() + (controlAuthConfig.sessionHours * 60 * 60 * 1000);
  const payload = JSON.stringify({ digest, expiresAt });
  localStorage.setItem(controlAuthConfig.storageKey, payload);
  return true;
}

export function hasValidControlSession() {
  if (!controlAuthConfig.enabled) {
    return true;
  }
  return isSessionValid(getSessionData());
}

export function ensureControlAccess() {
  if (hasValidControlSession()) {
    return true;
  }
  const next = encodeURIComponent(window.location.pathname + window.location.search + window.location.hash);
  window.location.replace(`/control-login.html?next=${next}`);
  return false;
}

