#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const repoRoot = "/Users/martendr.gray/Documents/New project/DJ-Website";
const metricsPath = join(repoRoot, "control/js/live-metrics.json");
const outDir = join(repoRoot, "artifacts/upload-queue");
const outCsv = join(outDir, "shirtee-upload-queue.csv");
const outJson = join(outDir, "shirtee-upload-queue.json");

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, "\"\"")}"`;
}

mkdirSync(dirname(outCsv), { recursive: true });

const metrics = JSON.parse(readFileSync(metricsPath, "utf8"));
const itemStates = metrics?.shopMetrics?.catalog?.itemStates || [];
const queue = itemStates.filter((item) => item.uploadState !== "uploaded");

const rows = [
  ["id", "title", "line", "section", "catalogStatus", "uploadState", "uploadLabel", "hasImage", "imageSrc", "href"],
  ...queue.map((item) => [
    item.id,
    item.title,
    item.line,
    item.sectionLabel,
    item.catalogStatus,
    item.uploadState,
    item.uploadLabel,
    item.hasImage ? "true" : "false",
    item.imageSrc || "",
    item.href || ""
  ])
];

const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
writeFileSync(outCsv, csv, "utf8");

const grouped = {
  ready: queue.filter((item) => item.uploadState === "ready"),
  pending: queue.filter((item) => item.uploadState === "pending")
};

writeFileSync(
  outJson,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      totals: {
        all: itemStates.length,
        uploaded: itemStates.length - queue.length,
        queue: queue.length,
        ready: grouped.ready.length,
        pending: grouped.pending.length
      },
      queue
    },
    null,
    2
  ),
  "utf8"
);

console.log(`Wrote ${outCsv}`);
console.log(`Wrote ${outJson}`);
console.log(`Queue total: ${queue.length} (ready: ${grouped.ready.length}, pending: ${grouped.pending.length})`);
