#!/usr/bin/env bash
set -euo pipefail

SRC_DIR="${1:-/Users/martendr.gray/Documents/websitedatenupload}"
ROOT="/Users/martendr.gray/Documents/New project/DJ-Website/assets/uploads/reports"
STAMP="$(date +%Y-%m-%d)"
OUT_DIR="$ROOT/previews-$STAMP"
REPORT="$ROOT/media-curation-$STAMP.md"

mkdir -p "$OUT_DIR/images" "$OUT_DIR/videos"

shopt -s nullglob

images=("$SRC_DIR"/*.{jpg,JPG,jpeg,JPEG,heic,HEIC})
videos=("$SRC_DIR"/*.{mp4,MP4,mov,MOV,m4v,M4V})

{
  echo "# Media Curation Report"
  echo
  echo "Generated: $(date '+%Y-%m-%d %H:%M:%S %Z')"
  echo "Source: $SRC_DIR"
  echo
  echo "## Summary"
  echo "- Images found: ${#images[@]}"
  echo "- Videos found: ${#videos[@]}"
  echo
  echo "## Images"
  echo
  echo "| Preview | File | Resolution | Size MB | Orientation | Suggested use |"
  echo "|---|---|---:|---:|---|---|"

  i=0
  for f in "${images[@]}"; do
    i=$((i + 1))
    base="$(basename "$f")"
    preview="img-${i}.jpg"
    preview_abs="$OUT_DIR/images/$preview"

    sips -s format jpeg -Z 720 "$f" --out "$preview_abs" >/dev/null 2>&1 || continue

    w="$(sips -g pixelWidth "$f" | awk '/pixelWidth/{print $2}')"
    h="$(sips -g pixelHeight "$f" | awk '/pixelHeight/{print $2}')"
    size_bytes="$(stat -f '%z' "$f")"
    size_mb="$(awk -v s="$size_bytes" 'BEGIN{printf "%.2f", s/1048576}')"

    orientation="landscape"
    suggested="Shop hero/cover"
    if [ "$h" -gt "$w" ]; then
      orientation="portrait"
      suggested="Vertical reels/posters"
    fi

    rel_preview="assets/uploads/reports/previews-$STAMP/images/$preview"
    echo "| ![]($rel_preview) | $base | ${w}x${h} | $size_mb | $orientation | $suggested |"
  done

  echo
  echo "## Videos"
  echo
  echo "| Preview | File | Resolution | Duration s | Size MB | Orientation | Suggested use |"
  echo "|---|---|---:|---:|---:|---|---|"

  v=0
  for f in "${videos[@]}"; do
    v=$((v + 1))
    base="$(basename "$f")"
    preview="vid-${v}.jpg"
    preview_abs="$OUT_DIR/videos/$preview"

    w="$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$f" | head -n1 | tr -cd '0-9')"
    h="$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$f" | head -n1 | tr -cd '0-9')"
    dur_raw="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f" | head -n1)"
    size_bytes="$(ffprobe -v error -show_entries format=size -of csv=p=0 "$f" | head -n1)"

    [ -n "$dur_raw" ] || dur_raw="0"
    [ -n "$size_bytes" ] || size_bytes="0"

    ss="$(awk -v d="$dur_raw" 'BEGIN{t=d/3; if (t<1) t=1; printf "%.2f", t}')"
    ffmpeg -y -ss "$ss" -i "$f" -frames:v 1 -q:v 4 "$preview_abs" >/dev/null 2>&1 || true

    dur="$(awk -v d="$dur_raw" 'BEGIN{printf "%.2f", d}')"
    size_mb="$(awk -v s="$size_bytes" 'BEGIN{printf "%.2f", s/1048576}')"

    orientation="landscape"
    suggested="Website background/section clip"
    if [ "${h:-0}" -gt "${w:-0}" ]; then
      orientation="portrait"
      suggested="Reels/TikTok teaser"
    fi

    rel_preview="assets/uploads/reports/previews-$STAMP/videos/$preview"
    echo "| ![]($rel_preview) | $base | ${w}x${h} | $dur | $size_mb | $orientation | $suggested |"
  done

  echo
  echo "## Curation Rules Applied"
  echo "- Portrait media -> Reels, short social cuts, mobile-first blocks."
  echo "- Landscape media -> section visuals, desktop-friendly clips, website cover candidates."
  echo "- Files above ~30 MB should be transcoded before website embedding."
} > "$REPORT"

echo "Report written: $REPORT"
echo "Previews written: $OUT_DIR"
