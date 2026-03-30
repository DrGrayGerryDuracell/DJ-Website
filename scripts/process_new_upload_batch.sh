#!/usr/bin/env bash
set -euo pipefail

SRC_DIR="${1:-/Users/martendr.gray/Documents/websitedatenupload}"
BASE="/Users/martendr.gray/Documents/New project/DJ-Website/assets/uploads"

mkdir -p "$BASE/raw-images" "$BASE/raw-videos" "$BASE/web-images" "$BASE/web-videos" "$BASE/posters" "$BASE/reports"

echo "[1/4] Copy raw files"
find "$SRC_DIR" -maxdepth 1 -type f | rg -i '\.(jpg|jpeg|heic)$' | while IFS= read -r f; do cp -n "$f" "$BASE/raw-images/" || true; done
find "$SRC_DIR" -maxdepth 1 -type f | rg -i '\.(mp4|mov|m4v)$' | while IFS= read -r f; do cp -n "$f" "$BASE/raw-videos/" || true; done

echo "[2/4] Convert HEIC to JPG"
for f in "$BASE/raw-images"/*.{HEIC,heic}; do
  [ -e "$f" ] || continue
  out="$BASE/raw-images/$(basename "${f%.*}").jpg"
  sips -s format jpeg "$f" --out "$out" >/dev/null
  echo "  converted: $(basename "$f") -> $(basename "$out")"
done

echo "[3/4] Build metadata reports"
{
  echo 'file,width,height,size_mb,orientation'
  for f in "$BASE/raw-images"/*; do
    w=$(sips -g pixelWidth "$f" | awk '/pixelWidth/{print $2}')
    h=$(sips -g pixelHeight "$f" | awk '/pixelHeight/{print $2}')
    s=$(stat -f '%z' "$f")
    o='landscape'; [ "$h" -gt "$w" ] && o='portrait'
    awk -v n="$(basename "$f")" -v w="$w" -v h="$h" -v s="$s" -v o="$o" 'BEGIN{printf "%s,%s,%s,%.2f,%s\n",n,w,h,s/1048576,o}'
  done
} > "$BASE/reports/image-metadata.csv"

{
  echo 'file,width,height,duration_s,size_mb,orientation'
  for f in "$BASE/raw-videos"/*; do
    w=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$f" | head -n1 | tr -cd '0-9')
    h=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$f" | head -n1 | tr -cd '0-9')
    d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f" | head -n1)
    s=$(ffprobe -v error -show_entries format=size -of csv=p=0 "$f" | head -n1)
    o='landscape'; [ "$h" -gt "$w" ] && o='portrait'
    awk -v n="$(basename "$f")" -v w="$w" -v h="$h" -v d="$d" -v s="$s" -v o="$o" 'BEGIN{printf "%s,%s,%s,%.2f,%.2f,%s\n",n,w,h,d,s/1048576,o}'
  done
} > "$BASE/reports/video-metadata.csv"

echo "[4/4] Done"
echo "Reports: $BASE/reports/image-metadata.csv and $BASE/reports/video-metadata.csv"
