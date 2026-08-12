#!/usr/bin/env node
// Takes a finished (done/archived) Hermes kanban task on the Mac mini and
// appends it as a dated entry to the Brain Vault, so the outcome survives
// past archiving instead of just disappearing from the board.
import { execFileSync } from "node:child_process";

const idArg = process.argv.find((arg) => arg.startsWith("--id="));
const id = idArg ? idArg.slice("--id=".length).trim() : "";

if (!/^[A-Za-z0-9_]+$/.test(id)) {
  console.error("Missing/invalid --id");
  process.exit(1);
}

const KANBAN_DB = "/Users/jarvisgray/.hermes/kanban.db";
const VAULT_FILE = "/Users/jarvisgray/ObsidianVault/JARVIS-Brain/wiki/geloeste-probleme.md";

function sshExec(remoteCmd) {
  return execFileSync("ssh", ["-o", "ConnectTimeout=6", "-o", "BatchMode=yes", "mini", remoteCmd], {
    encoding: "utf8",
    timeout: 20000
  });
}

const query =
  `SELECT id, title, body, status, completed_at, ` +
  `(SELECT r.summary FROM task_runs r WHERE r.task_id = t.id AND r.summary IS NOT NULL ORDER BY r.id DESC LIMIT 1) AS last_summary ` +
  `FROM tasks t WHERE t.id = '${id}'`;
const raw = sshExec(`sqlite3 -json ${KANBAN_DB} "${query.replace(/"/g, '\\"')}"`);
const rows = JSON.parse(raw || "[]");
if (!rows.length) {
  console.error(`Task ${id} nicht gefunden`);
  process.exit(1);
}
const task = rows[0];

const date = task.completed_at
  ? new Date(task.completed_at * 1000).toISOString().slice(0, 10)
  : new Date().toISOString().slice(0, 10);

const lines = [
  "",
  `## ${task.title}`,
  `- Task-ID: \`${task.id}\``,
  `- Abgeschlossen: ${date}`,
  task.body ? `- Aufgabe: ${task.body}` : null,
  task.last_summary ? `- Lösung: ${task.last_summary}` : "- Lösung: (keine Zusammenfassung protokolliert, siehe Task-ID im Kanban-Archiv)",
  ""
].filter((line) => line !== null);
const markdown = lines.join("\n");

const b64 = Buffer.from(markdown, "utf8").toString("base64");
const remoteAppend =
  `mkdir -p "$(dirname '${VAULT_FILE}')" && ` +
  `[ -f '${VAULT_FILE}' ] || printf '# Gelöste Probleme (aus Kanban übernommen)\\n' > '${VAULT_FILE}'; ` +
  `echo '${b64}' | base64 -d >> '${VAULT_FILE}'`;
sshExec(remoteAppend);

console.log(`Übernommen nach ${VAULT_FILE} (${task.id})`);
