#!/usr/bin/env bash
set -euo pipefail

URLS=(
  "https://www.shirtee.com/de/store/drgray-mrsdrgray/"
  "https://www.shirtee.com/de/drgray-mrsdrgray/"
  "https://www.shirtee.com/de/gy1dj4cqvmh36/"
  "https://www.shirtee.com/de/dr-gray-kein-mainstream-hoodie-drop-2026/"
  "https://www.shirtee.com/de/mrs-dr-gray-zu-wild-fuer-leise-crop-2026/"
  "https://www.shirtee.com/de/verheiratet-mit-dem-beat-couple-hoodie-2026/"
)

echo "Shirtee URL check ($(date '+%Y-%m-%d %H:%M:%S %Z'))"
for url in "${URLS[@]}"; do
  code="$(curl -L -s -o /dev/null -w '%{http_code}' "$url")"
  echo "$code $url"
done
