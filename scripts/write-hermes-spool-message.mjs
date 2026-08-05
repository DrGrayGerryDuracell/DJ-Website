#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const profileRoot = process.env.HERMES_PROFILE_ROOT || join(process.env.HOME || "/Users/jarvisgray", ".hermes", "profiles", "zentralserver");

function findLatestSpoolFile(rootDir) {
  const cronOutputDir = join(rootDir, "cron", "output");
  if (!existsSync(cronOutputDir)) {
    return null;
  }

  let latestPath = null;
  let latestMtime = 0;
  for (const entry of readdirSync(cronOutputDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const candidate = join(cronOutputDir, entry.name, "last_message_to_send.txt");
    if (!existsSync(candidate)) continue;
    const mtime = statSync(candidate).mtimeMs;
    if (mtime > latestMtime) {
      latestMtime = mtime;
      latestPath = candidate;
    }
  }

  return latestPath;
}

function normalizeMessage(value) {
  return String(value || "").trim().replace(/\r\n/g, "\n");
}

function formatSpoolMessage(message, targetChatId) {
  const text = normalizeMessage(message);
  const chatId = String(targetChatId || "8720180667");
  return `An Marten über Telegram (${chatId}):\n${text}\n`;
}

function readInputMessage() {
  const cliArg = process.argv.slice(2).find((part) => part.startsWith("--message="));
  if (cliArg) {
    return cliArg.slice("--message=".length);
  }

  const messageIndex = process.argv.indexOf("--message");
  if (messageIndex >= 0 && process.argv[messageIndex + 1]) {
    return process.argv[messageIndex + 1];
  }

  if (!process.stdin.isTTY) {
    try {
      return readFileSync(0, "utf8");
    } catch {
      return "";
    }
  }

  return "";
}

const spoolPath = findLatestSpoolFile(profileRoot);
if (!spoolPath) {
  console.error(`Kein Hermes-Spool gefunden unter ${join(profileRoot, "cron", "output")}`);
  process.exit(1);
}

const message = readInputMessage();
if (!normalizeMessage(message)) {
  console.error("Keine Nachricht uebergeben. Nutze --message oder stdin.");
  process.exit(1);
}

const targetChatId = process.argv.find((part) => part.startsWith("--chat-id="))?.slice("--chat-id=".length) || "8720180667";
const payload = formatSpoolMessage(message, targetChatId);
mkdirSync(dirname(spoolPath), { recursive: true });
writeFileSync(spoolPath, payload, "utf8");

console.log(spoolPath);
