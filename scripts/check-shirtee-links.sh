#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATUS_FILE="$ROOT_DIR/assets/data/live-link-status.js"

if [[ ! -f "$STATUS_FILE" ]]; then
  echo "Missing live-link status file: $STATUS_FILE"
  echo "Run: npm run check:live-links"
  exit 1
fi

URLS=()
while IFS= read -r line; do
  [[ -n "$line" ]] && URLS+=("$line")
done < <(
  node - <<'NODE' "$STATUS_FILE"
const fs = require('fs');
const path = process.argv[2];
const raw = fs.readFileSync(path, 'utf8');
const json = raw.replace(/^window\.LIVE_LINK_STATUS\s*=\s*/, '').trim().replace(/;$/, '');
const data = JSON.parse(json);
const urls = new Set();
if (typeof data.storeHref === 'string') urls.add(data.storeHref);
for (const item of Object.values(data.items || {})) {
  if (item && typeof item.sourceHref === 'string' && item.sourceHref.includes('shirtee.com/de/')) {
    urls.add(item.sourceHref);
  }
}
for (const url of urls) console.log(url);
NODE
)

echo "Shirtee URL check ($(date '+%Y-%m-%d %H:%M:%S %Z'))"
failures=0
for url in "${URLS[@]}"; do
  code="$(curl -L -s -o /dev/null -w '%{http_code}' "$url")"
  echo "$code $url"
  if [[ ! "$code" =~ ^2[0-9][0-9]$ ]]; then
    failures=$((failures + 1))
  fi
done

if [[ "$failures" -gt 0 ]]; then
  echo "Shirtee URL check failed with $failures non-2xx result(s)."
  exit 1
fi
