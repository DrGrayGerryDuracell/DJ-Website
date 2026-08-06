#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { execSync } from "node:child_process";

const required = [
  "index.html",
  "shop.html",
  "style.css",
  "main.js",
  "control/index.html",
  "control/main.js",
  "control/control.css",
  "assets/data/merch-catalog.js"
];

async function verifyFiles() {
  for (const file of required) {
    await access(file, constants.R_OK);
  }
}

function verifyJsSyntax() {
  const files = [
    "main.js",
    "control/main.js",
    "control/js/config.js",
    "control/js/formatters.js",
    "control/js/render.js"
  ];

  for (const file of files) {
    execSync(`node --check ${JSON.stringify(file)}`, { stdio: "inherit" });
  }
}

async function verifyControlMetricsPrivacy() {
  const raw = await readFile("control/js/live-metrics.json", "utf8");
  const data = JSON.parse(raw);
  const agentsRoom = data?.agentsRoom || {};
  const forbiddenRuntimeFields = ["argv", "chat_id", "thread_id", "content", "result_json", "task_json", "entry_json", "processed_files"];
  const forbiddenPaths = ["/Users/", "\\\\Users\\\\"];

  for (const marker of forbiddenPaths) {
    if (raw.includes(marker)) {
      throw new Error(`Control metrics contain a local absolute path marker: ${marker}`);
    }
  }

  const visit = (value, path = "agentsRoom") => {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      if (forbiddenRuntimeFields.includes(key)) {
        throw new Error(`Control metrics expose forbidden runtime field: ${path}.${key}`);
      }
      visit(child, `${path}.${key}`);
    }
  };

  visit(agentsRoom);

  const credentialValue = /\b(password|passphrase|kennwort|api[-_ ]?key|client[-_ ]?secret|authorization|bearer)\b.{0,20}(?::|=|→|->|lautet|ist)\s*(?!\[redacted\])\S+/i;
  if (credentialValue.test(raw)) {
    throw new Error("Control metrics contain a credential-like value.");
  }
}

async function run() {
  await verifyFiles();
  verifyJsSyntax();
  await verifyControlMetricsPrivacy();
  console.log("Build-safety checks passed.");
}

run().catch((error) => {
  console.error("Build-safety check failed:", error.message);
  process.exit(1);
});
