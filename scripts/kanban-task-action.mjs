#!/usr/bin/env node
// Runs a control action (retry / archive / complete) on a single Hermes
// kanban task on the Mac mini over SSH.
import { execFileSync } from "node:child_process";

const idArg = process.argv.find((arg) => arg.startsWith("--id="));
const actionArg = process.argv.find((arg) => arg.startsWith("--action="));
const id = idArg ? idArg.slice("--id=".length).trim() : "";
const action = actionArg ? actionArg.slice("--action=".length).trim() : "";

const HERMES = "/Users/jarvisgray/.hermes/hermes-agent/venv/bin/hermes --profile zentralserver";

if (!id || !["retry", "archive", "complete"].includes(action)) {
  console.error("Missing/invalid --id or --action (retry|archive|complete)");
  process.exit(1);
}

function runRemote(remoteCmd) {
  try {
    const out = execFileSync("ssh", ["-o", "ConnectTimeout=6", "-o", "BatchMode=yes", "mini", remoteCmd], {
      encoding: "utf8",
      timeout: 20000
    });
    return { ok: true, out: out.trim() };
  } catch (error) {
    const out = String(error.stdout || error.stderr || error.message || "").trim();
    return { ok: false, out };
  }
}

if (action === "archive") {
  const result = runRemote(`${HERMES} kanban archive ${id}`);
  console.log(result.out);
  if (!result.ok) process.exit(1);
} else if (action === "complete") {
  const result = runRemote(`${HERMES} kanban complete ${id}`);
  console.log(result.out);
  if (!result.ok) process.exit(1);
} else if (action === "retry") {
  // The task may have already self-recovered (dispatcher retries on its own),
  // so "not blocked/scheduled" from unblock is not a real failure here.
  const unblockResult = runRemote(`${HERMES} kanban unblock ${id}`);
  const promoteResult = runRemote(`${HERMES} kanban promote ${id}`);
  const combined = [unblockResult.out, promoteResult.out].filter(Boolean).join("\n");
  console.log(combined);
  const unblockOk = unblockResult.ok || /not blocked\/scheduled/i.test(unblockResult.out);
  const promoteOk = promoteResult.ok || /not (a )?todo\/blocked/i.test(promoteResult.out);
  if (!unblockOk && !promoteOk) {
    process.exit(1);
  }
}
