# Deploy Ready - 2026-03-30

## Scope abgeschlossen

1. Neue Medienlinie auf `index.html`, `videos.html`, `bio.html`, `shop.html` eingezogen.
2. Web-Medien sauber verarbeitet und sortiert unter `assets/uploads/`.
3. Finaler Video-Performance-Pass ausgefuehrt (H.264, 720x1280, 24fps, ohne Audiospur fuer stummes Autoplay).
4. Upload-Workflow skriptbar gemacht (`scripts/process_new_upload_batch.sh`).

## Performance Ergebnis

Vorher (web-videos): ca. **42 MB**
Nachher (web-videos): ca. **13 MB**
Ersparnis: ca. **69%**

Details: `assets/uploads/reports/video-optimized.csv`

## Preflight Checks

- JS Syntax: `node --check main.js` -> OK
- Upload-Asset-Referenzen in Seiten vorhanden -> OK
- Medien-Reports vorhanden:
  - `assets/uploads/reports/image-metadata.csv`
  - `assets/uploads/reports/video-metadata.csv`
  - `assets/uploads/reports/video-optimized.csv`
  - `assets/uploads/reports/media-analysis-2026-03-30.md`

## Deployment-Befehlskette (GitHub Pages / Cloudflare)

```bash
cd '/Users/martendr.gray/Documents/New project/DJ-Website'

# 1) Status pruefen
git status --short

# 2) Alles Relevante stagen
git add \
  index.html bio.html videos.html shop.html \
  style.css main.js kontakt.html musik.html \
  .gitignore \
  SHIRTEE_STATUS_2026-03-30.md \
  assets/uploads/web-images \
  assets/uploads/web-videos \
  assets/uploads/posters \
  assets/uploads/reports \
  scripts/check_shirtee_links.sh \
  scripts/process_new_upload_batch.sh

# 3) Commit
git commit -m "Integrate curated media pipeline and optimize website assets"

# 4) Push
git push origin main
```

## Hinweis

- `assets/uploads/raw-images/` und `assets/uploads/raw-videos/` bleiben lokal (via `.gitignore`) und werden nicht deployt.
- Falls Cloudflare oder Browser-Cache alten Stand zeigt: Hard-Refresh + Cache Purge.

