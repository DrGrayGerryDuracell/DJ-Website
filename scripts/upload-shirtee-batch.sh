#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <batch-csv> [start-row=1] [end-row=0] [sequence-start=1]"
  exit 1
fi

BATCH_CSV="$1"
START_ROW="${2:-1}"
END_ROW="${3:-0}"
SEQ="${4:-1}"

CLI="${HOME}/.codex/skills/playwright/scripts/playwright_cli.sh"
DASH_URL="https://www.shirtee.com/de/dashboard/index/index/"
SHOP_NAME="Dr. Gray & Mrs. Dr. Gray"
DATE_TAG="$(date +%Y%m%d)"

if [ ! -f "$BATCH_CSV" ]; then
  echo "Batch file not found: $BATCH_CSV"
  exit 1
fi

ITEMS="$(
  node - "$BATCH_CSV" "$START_ROW" "$END_ROW" <<'NODE'
const fs = require('fs');
const path = process.argv[2];
const start = Math.max(1, Number(process.argv[3] || 1));
const end = Math.max(0, Number(process.argv[4] || 0));
const lines = fs.readFileSync(path, 'utf8').trim().split('\n').slice(1);

function parseCsv(line) {
  const cols = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        q = !q;
      }
    } else if (c === ',' && !q) {
      cols.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  cols.push(cur);
  return cols;
}

const rows = lines.map(parseCsv);
const stop = end > 0 ? Math.min(end, rows.length) : rows.length;
for (let i = start - 1; i < stop; i += 1) {
  const r = rows[i];
  const out = [
    r[0] || '',
    r[1] || '',
    r[2] || '',
    r[3] || '',
    r[10] || '',
    r[11] || '',
    r[12] || ''
  ].join('\t');
  console.log(out);
}
NODE
)"

if [ -z "$ITEMS" ]; then
  echo "No rows selected in $BATCH_CSV"
  exit 0
fi

COUNT="$(printf "%s\n" "$ITEMS" | wc -l | tr -d ' ')"
echo "Uploading ${COUNT} entries from $BATCH_CSV"

while IFS= read -r row; do
  [ -z "$row" ] && continue
  IFS=$'\t' read -r batch id title line tags_raw slogan copy <<<"$row"
  if [ -z "${id}" ] || [ -z "${title}" ]; then
    continue
  fi

  slug="${id}-${DATE_TAG}-r${SEQ}"
  tags="$(echo "${tags_raw}" | sed 's/ | /, /g')"
  tags="${tags}, ${line}, DJ, Techno"
  desc="${slogan} ${copy} ${line} Kollektion von Dr. Gray & Mrs. Dr. Gray."
  desc="$(echo "$desc" | tr '\n' ' ' | sed 's/[[:space:]]\+/ /g')"
  desc="${desc:0:320}"

  echo "[$SEQ] ${id} -> ${slug}"

  "$CLI" goto "$DASH_URL" >/dev/null || true
  "$CLI" dialog-accept >/dev/null || true
  "$CLI" goto "$DASH_URL" >/dev/null
  "$CLI" click "Ähnliche Kampagne erstellen" >/dev/null
  "$CLI" click "zum nächsten schritt" >/dev/null
  "$CLI" click "zum nächsten schritt" >/dev/null
  "$CLI" fill "#sales_name" "$title" >/dev/null
  "$CLI" click ".fr-element.fr-view" >/dev/null
  "$CLI" press "Meta+A" >/dev/null
  "$CLI" type "$desc" >/dev/null
  "$CLI" fill "#tags-input" "$tags" >/dev/null
  "$CLI" select "#designers_categories_ids" "$SHOP_NAME" >/dev/null
  "$CLI" fill "#sales_url" "$slug" >/dev/null
  "$CLI" click "#pd_sales" >/dev/null

  SEQ=$((SEQ + 1))
done <<< "$ITEMS"

echo "DONE"
