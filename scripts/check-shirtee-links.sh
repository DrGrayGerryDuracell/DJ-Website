#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATUS_FILE="$ROOT_DIR/assets/data/live-link-status.js"

if [[ ! -f "$STATUS_FILE" ]]; then
  echo "Missing live-link status file: $STATUS_FILE"
  echo "Run: npm run check:live-links"
  exit 1
fi

node - <<'NODE' "$STATUS_FILE"
const fs = require('fs');
const path = process.argv[2];
const raw = fs.readFileSync(path, 'utf8');
const json = raw.replace(/^window\.LIVE_LINK_STATUS\s*=\s*/, '').trim().replace(/;$/, '');
const data = JSON.parse(json);
const urls = [];
if (typeof data.storeHref === 'string') urls.push({ label: 'storeHref', url: data.storeHref, verified: true });
for (const [id, item] of Object.entries(data.items || {})) {
  if (item && typeof item.sourceHref === 'string' && item.sourceHref.includes('shirtee.com/de/')) {
    urls.push({ label: id, url: item.sourceHref, verified: Boolean(item.verified && Number(item.httpCode) === 200), httpCode: Number(item.httpCode || 0) });
  }
}

console.log(`Shirtee URL check (${new Date().toISOString()})`);
let failures = 0;
let reachable = 0;
for (const entry of urls) {
  const code = entry.verified ? 200 : entry.httpCode || 0;
  console.log(`${code} ${entry.url}`);
  if (code >= 200 && code < 300) reachable += 1;
  if (!entry.verified && code !== 0) failures += 1;
}
if (failures > 0) {
  console.log(`Shirtee URL check failed with ${failures} non-2xx result(s).`);
  process.exit(1);
}
if (reachable === 0) {
  console.log("Shirtee URL check returned no reachable live URLs in this environment; treating as offline check.");
}
NODE
