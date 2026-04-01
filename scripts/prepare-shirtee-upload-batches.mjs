#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import vm from "node:vm";

const repoRoot = "/Users/martendr.gray/Documents/New project/DJ-Website";
const queuePath = join(repoRoot, "artifacts/upload-queue/shirtee-upload-queue.json");
const catalogPath = join(repoRoot, "assets/data/merch-catalog.js");
const outDir = join(repoRoot, "artifacts/upload-batches");
const batchSize = 20;

function loadWindowData(filePath, key) {
  const code = readFileSync(filePath, "utf8");
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(code, context);
  return context.window[key];
}

function toCsvCell(value) {
  return `"${String(value ?? "").replace(/"/g, "\"\"")}"`;
}

function chunk(items, size) {
  const result = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

mkdirSync(dirname(outDir), { recursive: true });
mkdirSync(outDir, { recursive: true });

const queueDoc = JSON.parse(readFileSync(queuePath, "utf8"));
const queue = Array.isArray(queueDoc.queue) ? queueDoc.queue : [];
const catalog = loadWindowData(catalogPath, "MERCH_CATALOG");
const catalogItems = Array.isArray(catalog?.items) ? catalog.items : [];
const catalogById = new Map(catalogItems.map((item) => [item.id, item]));

const ready = queue.filter((item) => item.uploadState === "ready");
const pending = queue.filter((item) => item.uploadState === "pending");

const groups = [
  { name: "ready", items: ready },
  { name: "pending", items: pending }
];

const manifest = {
  generatedAt: new Date().toISOString(),
  batchSize,
  totals: {
    queue: queue.length,
    ready: ready.length,
    pending: pending.length
  },
  batches: []
};

for (const group of groups) {
  const chunks = chunk(group.items, batchSize);
  chunks.forEach((batchItems, batchIndex) => {
    const batchName = `${group.name}-batch-${String(batchIndex + 1).padStart(2, "0")}`;
    const outCsv = join(outDir, `${batchName}.csv`);

    const rows = [
      [
        "batch",
        "id",
        "title",
        "line",
        "section",
        "catalog_status",
        "upload_state",
        "image_repo_path",
        "image_absolute_path",
        "products",
        "tags",
        "slogan",
        "copy",
        "target_href"
      ]
    ];

    for (const queueItem of batchItems) {
      const source = catalogById.get(queueItem.id) || {};
      const imageRepoPath = source.image || queueItem.imageSrc || "";
      const imageAbsolutePath = imageRepoPath
        ? imageRepoPath.startsWith("/")
          ? join(repoRoot, imageRepoPath.slice(1))
          : join(repoRoot, imageRepoPath)
        : "";

      rows.push([
        batchName,
        queueItem.id,
        source.title || queueItem.title || "",
        source.line || queueItem.line || "",
        queueItem.sectionLabel || "",
        queueItem.catalogStatus || source.status || "",
        queueItem.uploadState || "",
        imageRepoPath,
        imageAbsolutePath,
        Array.isArray(source.products) ? source.products.join(" | ") : "",
        Array.isArray(source.tags) ? source.tags.join(" | ") : "",
        source.slogan || "",
        source.copy || "",
        queueItem.href || source.href || ""
      ]);
    }

    writeFileSync(outCsv, rows.map((row) => row.map(toCsvCell).join(",")).join("\n"), "utf8");
    manifest.batches.push({
      name: batchName,
      type: group.name,
      itemCount: batchItems.length,
      csvPath: outCsv
    });
  });
}

const manifestPath = join(outDir, "manifest.json");
const summaryPath = join(outDir, "README.md");

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
writeFileSync(
  summaryPath,
  `# Shirtee Upload Batches\n\n` +
    `Generated: ${manifest.generatedAt}\n\n` +
    `- Queue: ${manifest.totals.queue}\n` +
    `- Ready: ${manifest.totals.ready}\n` +
    `- Pending: ${manifest.totals.pending}\n` +
    `- Batch size: ${batchSize}\n\n` +
    manifest.batches.map((b) => `- ${b.name} (${b.type}): ${b.itemCount} items`).join("\n") +
    `\n`,
  "utf8"
);

console.log(`Wrote ${manifestPath}`);
console.log(`Wrote ${summaryPath}`);
console.log(`Created ${manifest.batches.length} batch CSV files in ${outDir}`);
