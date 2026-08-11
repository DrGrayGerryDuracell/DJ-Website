#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(repoRoot, "artifacts/shop-master/latest");

const steps = [
  ["sync-live-link-status", "scripts/sync-live-link-status.mjs"],
  ["sync-control-live-metrics", "scripts/sync-control-live-metrics.mjs"],
  ["build-merch-content-bundle", "scripts/build-merch-content-bundle.mjs"],
  ["sync-control-live-metrics", "scripts/sync-control-live-metrics.mjs"],
  ["generate-upload-queue", "scripts/generate-upload-queue.mjs"],
  ["prepare-shirtee-upload-batches", "scripts/prepare-shirtee-upload-batches.mjs"],
  ["generate-shirtee-api-request", "scripts/generate-shirtee-api-request.mjs"]
];

mkdirSync(outDir, { recursive: true });

const results = [];

for (const [name, script] of steps) {
  const startedAt = Date.now();
  const result = spawnSync(process.execPath, [join(repoRoot, script)], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  results.push({
    name,
    script,
    ok: result.status === 0,
    code: result.status ?? 1,
    durationMs: Date.now() - startedAt,
    stdout: String(result.stdout || "").trim(),
    stderr: String(result.stderr || "").trim()
  });
  if (result.status !== 0) break;
}

const manifest = {
  generatedAt: new Date().toISOString(),
  repoRoot,
  steps: results,
  ok: results.every((step) => step.ok)
};

writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
writeFileSync(
  join(outDir, "README.md"),
  `# Shop Sync Paket\n\n` +
    `Generated: ${manifest.generatedAt}\n\n` +
    results.map((step) => `- ${step.ok ? "OK" : "FAIL"} ${step.name} (${step.durationMs}ms)`).join("\n") +
    `\n`,
  "utf8"
);

console.log(`Wrote ${join(outDir, "manifest.json")}`);
console.log(`Wrote ${join(outDir, "README.md")}`);
console.log(`Shop sync packet ${manifest.ok ? "completed" : "failed"}`);
process.exit(manifest.ok ? 0 : 1);
