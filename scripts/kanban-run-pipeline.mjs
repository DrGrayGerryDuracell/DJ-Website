#!/usr/bin/env node
// Manually runs the kanban triage->todo->ready promotion pass on the Mac
// mini right now, instead of waiting for its 10-minute launchd interval.
import { execFileSync } from "node:child_process";

try {
  const out = execFileSync(
    "ssh",
    ["-o", "ConnectTimeout=6", "-o", "BatchMode=yes", "mini", "bash /Users/jarvisgray/.hermes/profiles/zentralserver/scripts/kanban_pipeline_promote.sh"],
    { encoding: "utf8", timeout: 60000 }
  );
  console.log(out.trim() || "Pipeline-Lauf gestartet.");
} catch (error) {
  console.error(`kanban-run-pipeline failed: ${error.message}`);
  process.exit(1);
}
