#!/usr/bin/env bash
set -euo pipefail

ROOT_URL="https://www.shirtee.com/de/store/drgray-mrsdrgray/"
EXTRA_URLS=(
  "https://www.shirtee.com/de/drgray-mrsdrgray/"
  "https://www.shirtee.com/de/gy1dj4cqvmh36/"
  "https://www.shirtee.com/de/dr-gray-kein-mainstream-hoodie-drop-2026/"
  "https://www.shirtee.com/de/mrs-dr-gray-zu-wild-fuer-leise-crop-2026/"
  "https://www.shirtee.com/de/verheiratet-mit-dem-beat-couple-hoodie-2026/"
)

check_url() {
  local url="$1"
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' -L "$url")
  printf '%-4s %s\n' "$code" "$url"
}

echo "Shirtee Link Check ($(date '+%Y-%m-%d %H:%M:%S %Z'))"
check_url "$ROOT_URL"

while IFS= read -r url; do
  [ -n "$url" ] && check_url "$url"
done < <(
  {
    printf '%s\n' "${EXTRA_URLS[@]}"
    curl -s "$ROOT_URL" | perl -nE 'while (/<a href="(https:\/\/www\.shirtee\.com\/de\/[A-Za-z0-9\-]+\/)" title="[^"]+" class="product-image"/g) { say $1 }'
  } | sort -u
)
