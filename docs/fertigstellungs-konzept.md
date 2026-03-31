# Fertigstellungs-Konzept (Ausfuehrbar)

## Zielbild
- Website + Control UI laufen stabil in Produktion.
- Upload-Status fuer alle Katalogartikel ist transparent.
- Upload-Backlog ist maschinenlesbar exportiert.
- TikTok ist auf echten Live-Daten vorbereitet (OAuth Tokens).
- Shirtee API-Zugang ist offiziell angefragt.

## Phase 1: Technischer Basislauf (automatisiert)
- Befehl: `npm run finish:all`
- Enthalten:
  1. Syntax/Sicherheitscheck
  2. Live-Linkcheck
  3. Control-Live-Sync
  4. Upload-Queue Export (`artifacts/upload-queue/*`)
  5. Shirtee API Anfragevorlage (`artifacts/requests/shirtee-api-request.md`)

## Phase 2: Operative Upload-Abarbeitung
- Quelle: `artifacts/upload-queue/shirtee-upload-queue.csv`
- Reihenfolge:
  1. `ready`
  2. `pending`
- Nach jeder Upload-Welle:
  1. Produktlinks in Katalogdaten pflegen
  2. `npm run check:live-links && npm run sync:control-live`
  3. Control UI Reiter `Katalog & Uploads` gegenpruefen

## Phase 3: TikTok Vollumfang-Live
- Tokens setzen:
  - `TIKTOK_DR_ACCESS_TOKEN`
  - `TIKTOK_MRS_ACCESS_TOKEN`
- Danach `npm run sync:control-live`.
- Ergebnis: Social-Reiter zeigt echte TikTok API-Werte statt nur Fallback-Signale.

## Definition of Done
- `npm run finish:all` ohne Fehler.
- Upload-Queue Artefakte neu geschrieben.
- API-Anfragevorlage erstellt und versandbereit.
- Deployment aktualisiert.
