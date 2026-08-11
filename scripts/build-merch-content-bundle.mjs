#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = join(repoRoot, "assets/data/merch-catalog.js");
const metricsPath = join(repoRoot, "control/js/live-metrics.json");
const outDir = join(repoRoot, "artifacts/merch-bundle/latest");
const itemDir = join(outDir, "items");

function loadWindowData(filePath, key) {
  const code = readFileSync(filePath, "utf8");
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(code, context);
  return context.window[key];
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, "\"\"")}"`;
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function toAbsoluteImagePath(image) {
  if (!image || typeof image !== "string") return "";
  if (/^https?:\/\//i.test(image)) return "";
  return image.startsWith("/") ? join(repoRoot, image.slice(1)) : join(repoRoot, image);
}

function classifyBundle(item) {
  const tags = ensureArray(item.tags).map((tag) => String(tag).toLowerCase());
  const products = ensureArray(item.products).map((product) => String(product).toLowerCase());
  const title = String(item.title || "").toLowerCase();

  if (tags.some((tag) => tag.includes("sticker")) || products.some((product) => product.includes("sticker"))) {
    return "sticker";
  }
  if (tags.some((tag) => tag.includes("bundle")) || products.some((product) => product.includes("bundle"))) {
    return "bundle";
  }
  if (tags.some((tag) => tag.includes("print")) || title.includes("print")) {
    return "print";
  }
  if (tags.some((tag) => tag.includes("accessoire")) || products.some((product) => product.includes("cap") || product.includes("mug") || product.includes("case"))) {
    return "accessory";
  }
  return "apparel";
}

function getPriority(status, spotlight) {
  if (status === "Live im Store") return "P0";
  if (status === "Uploadbereit" || spotlight) return "P1";
  if (status === "In Vorbereitung") return "P2";
  return "P3";
}

mkdirSync(outDir, { recursive: true });
mkdirSync(itemDir, { recursive: true });

const catalog = loadWindowData(catalogPath, "MERCH_CATALOG") || { items: [], spotlight: [] };
const metrics = readFileSafe(metricsPath);
const itemStates = metrics?.shopMetrics?.catalog?.itemStates || [];
const itemStateById = new Map(itemStates.map((entry) => [entry.id, entry]));
const spotlight = new Set(ensureArray(catalog.spotlight));
const items = ensureArray(catalog.items);

function readFileSafe(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

const bundleItems = items.map((item, index) => {
  const state = itemStateById.get(item.id) || {};
  const image = String(item.image || "");
  const imageAbsolutePath = toAbsoluteImagePath(image);
  const imageExists = imageAbsolutePath ? existsSync(imageAbsolutePath) : false;
  const imageIsRemote = /^https?:\/\//i.test(image);
  const issues = [];

  if (!image) {
    issues.push("missing_image");
  } else if (!imageIsRemote && !imageExists) {
    issues.push("missing_local_image");
  } else if (imageIsRemote) {
    issues.push("remote_image");
  }

  if (!ensureArray(item.products).length) {
    issues.push("missing_products");
  }
  if (!ensureArray(item.tags).length) {
    issues.push("missing_tags");
  }
  if (!item.title) {
    issues.push("missing_title");
  }

  const bundleType = classifyBundle(item);
  const bundleId = `${bundleType}-${slugify(item.id || item.title || `item-${index + 1}`)}`;
  const title = String(item.title || `Artikel ${index + 1}`);
  const normalized = {
    id: item.id || `catalog-${index + 1}`,
    bundleId,
    bundleType,
    title,
    line: item.line || "",
    section: item.section || "other",
    status: item.status || "Unbekannt",
    priority: getPriority(item.status, spotlight.has(item.id)),
    spotlight: spotlight.has(item.id),
    uploadState: state.uploadState || "pending",
    uploadLabel: state.uploadLabel || "Noch offen",
    href: item.href || state.href || "",
    slogan: item.slogan || "",
    copy: item.copy || "",
    products: ensureArray(item.products),
    tags: ensureArray(item.tags),
    image,
    imageAbsolutePath,
    imageKind: imageIsRemote ? "remote" : imageExists ? "local" : "missing",
    issueCodes: issues,
    hasImage: Boolean(image),
    sourceIndex: index
  };

  writeFileSync(join(itemDir, `${normalized.id}.json`), JSON.stringify(normalized, null, 2), "utf8");
  return normalized;
});

const issues = bundleItems.flatMap((item) =>
  item.issueCodes.map((code) => ({
    id: item.id,
    title: item.title,
    bundleId: item.bundleId,
    code,
    imageKind: item.imageKind,
    uploadState: item.uploadState,
    section: item.section
  }))
);

const byType = bundleItems.reduce((acc, item) => {
  acc[item.bundleType] = acc[item.bundleType] || [];
  acc[item.bundleType].push(item);
  return acc;
}, {});

const bySection = bundleItems.reduce((acc, item) => {
  acc[item.section] = acc[item.section] || [];
  acc[item.section].push(item);
  return acc;
}, {});

const byLine = bundleItems.reduce((acc, item) => {
  const key = item.line || "Unbekannt";
  acc[key] = acc[key] || [];
  acc[key].push(item);
  return acc;
}, {});

const byState = bundleItems.reduce((acc, item) => {
  acc[item.uploadState] = acc[item.uploadState] || [];
  acc[item.uploadState].push(item);
  return acc;
}, {});

const families = Object.entries(byLine)
  .map(([line, familyItems]) => {
    const sectionCounts = familyItems.reduce((acc, item) => {
      acc[item.section] = (acc[item.section] || 0) + 1;
      return acc;
    }, {});
    const stateCounts = familyItems.reduce((acc, item) => {
      acc[item.uploadState] = (acc[item.uploadState] || 0) + 1;
      return acc;
    }, {});
    const imageCounts = familyItems.reduce((acc, item) => {
      acc[item.imageKind] = (acc[item.imageKind] || 0) + 1;
      return acc;
    }, {});
    return {
      line,
      total: familyItems.length,
      sections: sectionCounts,
      states: stateCounts,
      images: imageCounts,
      spotlight: familyItems.filter((item) => item.spotlight).length,
      issues: familyItems.filter((item) => item.issueCodes.length > 0).length,
      topTitles: familyItems.slice(0, 4).map((item) => item.title)
    };
  })
  .sort((a, b) => b.total - a.total || a.line.localeCompare(b.line, "de"));

const summary = {
  generatedAt: new Date().toISOString(),
  sourceCatalog: "assets/data/merch-catalog.js",
  totals: {
    items: bundleItems.length,
    spotlight: bundleItems.filter((item) => item.spotlight).length,
    localImages: bundleItems.filter((item) => item.imageKind === "local").length,
    remoteImages: bundleItems.filter((item) => item.imageKind === "remote").length,
    missingImages: bundleItems.filter((item) => item.imageKind === "missing").length,
    ready: bundleItems.filter((item) => item.uploadState === "ready").length,
    pending: bundleItems.filter((item) => item.uploadState === "pending").length,
    submitted: bundleItems.filter((item) => item.uploadState === "submitted").length,
    uploaded: bundleItems.filter((item) => item.uploadState === "uploaded").length,
    issues: issues.length
  },
  byType: Object.fromEntries(Object.entries(byType).map(([key, value]) => [key, value.length])),
  bySection: Object.fromEntries(Object.entries(bySection).map(([key, value]) => [key, value.length])),
  byLine: Object.fromEntries(Object.entries(byLine).map(([key, value]) => [key, value.length])),
  byState: Object.fromEntries(Object.entries(byState).map(([key, value]) => [key, value.length])),
  issueSummary: issues.reduce((acc, issue) => {
    acc[issue.code] = (acc[issue.code] || 0) + 1;
    return acc;
  }, {}),
  families,
  bundleItems
};

const manifestPath = join(outDir, "manifest.json");
const issuesPath = join(outDir, "issues.csv");
const itemsCsvPath = join(outDir, "items.csv");
const summaryPath = join(outDir, "README.md");

writeFileSync(manifestPath, JSON.stringify(summary, null, 2), "utf8");
writeFileSync(
  itemsCsvPath,
  [
    ["id", "bundleId", "bundleType", "title", "line", "section", "status", "priority", "uploadState", "imageKind", "href", "products", "tags", "issueCodes"],
    ...bundleItems.map((item) => [
      item.id,
      item.bundleId,
      item.bundleType,
      item.title,
      item.line,
      item.section,
      item.status,
      item.priority,
      item.uploadState,
      item.imageKind,
      item.href,
      item.products.join(" | "),
      item.tags.join(" | "),
      item.issueCodes.join(" | ")
    ])
  ].map((row) => row.map(csvCell).join(",")).join("\n"),
  "utf8"
);
writeFileSync(
  issuesPath,
  [
    ["id", "title", "bundleId", "code", "imageKind", "uploadState", "section"],
    ...issues.map((issue) => [issue.id, issue.title, issue.bundleId, issue.code, issue.imageKind, issue.uploadState, issue.section])
  ].map((row) => row.map(csvCell).join(",")).join("\n"),
  "utf8"
);
writeFileSync(
  summaryPath,
  `# Merch Content Bundle\n\n` +
    `Generated: ${summary.generatedAt}\n\n` +
    `- Items: ${summary.totals.items}\n` +
    `- Spotlight: ${summary.totals.spotlight}\n` +
    `- Local images: ${summary.totals.localImages}\n` +
    `- Remote images: ${summary.totals.remoteImages}\n` +
    `- Missing images: ${summary.totals.missingImages}\n` +
    `- Ready: ${summary.totals.ready}\n` +
    `- Pending: ${summary.totals.pending}\n` +
    `- Submitted: ${summary.totals.submitted}\n` +
    `- Uploaded: ${summary.totals.uploaded}\n` +
    `- Issues: ${summary.totals.issues}\n\n` +
    `## Use\n\n` +
    `- Manifest: \`manifest.json\`\n` +
    `- Items CSV: \`items.csv\`\n` +
    `- Issues CSV: \`issues.csv\`\n` +
    `- Per item: \`items/<id>.json\`\n`,
  "utf8"
);

console.log(`Wrote ${manifestPath}`);
console.log(`Wrote ${itemsCsvPath}`);
console.log(`Wrote ${issuesPath}`);
console.log(`Wrote ${summaryPath}`);
console.log(`Bundle items: ${bundleItems.length} | issues: ${issues.length}`);
