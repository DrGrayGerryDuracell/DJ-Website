#!/usr/bin/env node
// Creates a new Hermes kanban task on the Mac mini ("zentralserver") over
// SSH, since the board itself lives there (~/.hermes/kanban.db).
import { execFileSync } from "node:child_process";

const titleArg = process.argv.find((arg) => arg.startsWith("--title="));
const title = titleArg ? titleArg.slice("--title=".length).trim() : "";

if (!title) {
  console.error("Missing --title=<text>");
  process.exit(1);
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

const remoteCmd = `/Users/jarvisgray/.hermes/hermes-agent/venv/bin/hermes --profile zentralserver kanban create ${shellQuote(title)}`;

try {
  const out = execFileSync("ssh", ["-o", "ConnectTimeout=6", "-o", "BatchMode=yes", "mini", remoteCmd], {
    encoding: "utf8",
    timeout: 15000
  });
  console.log(out.trim());
} catch (error) {
  console.error(`kanban-create failed: ${error.message}`);
  process.exit(1);
}
