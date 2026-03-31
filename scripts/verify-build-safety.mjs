#!/usr/bin/env node
import { access } from "node:fs/promises";
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

async function run() {
  await verifyFiles();
  verifyJsSyntax();
  console.log("Build-safety checks passed.");
}

run().catch((error) => {
  console.error("Build-safety check failed:", error.message);
  process.exit(1);
});
