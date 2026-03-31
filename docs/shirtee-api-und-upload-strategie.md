# Shirtee API und Upload-Strategie (DJ-Website)

## Ziel
- Alle Katalogartikel aus `assets/data/merch-catalog.js` auf Shirtee ausrollen.
- Upload-Status transparent im Control UI fuehren (bereits umgesetzt).
- Mittelfristig Uploads teilautomatisieren.

## Was bereits umgesetzt ist
- Control UI hat einen neuen Reiter `Katalog & Uploads`:
  - zeigt alle Artikel mit Bildvorschau,
  - trennt in `Bereits hochgeladen`, `Uploadbereit`, `Noch offen`,
  - bietet `Upload Queue CSV` als Export fuer den DJ-Upload-Backlog.
- Daten kommen aus `scripts/sync-control-live-metrics.mjs` und werden nach `control/js/live-metrics.json` geschrieben.

## Technischer Befund zu Shirtee API
- In den oeffentlichen Shirtee.Cloud-Hilfeseiten gibt es Hinweise auf `Shirtee API Settings` im Dashboard, aber keine frei veroeffentlichte, vollstaendige Public-REST-Dokumentation mit Endpunktliste.
- Das spricht fuer einen accountgebundenen Integrationszugang statt offenem Public API Key Modell.

## Loesungsweg (empfohlen)
1. API-Zugang offiziell anfragen
- Ueber Shirtee Support/Integrationskanal explizit anfragen:
  - Gibt es eine dokumentierte API fuer Produktanlage/-update?
  - Authentifizierung (Token/OAuth), Limits, Sandbox, Rate Limits, Fehlercodes.
  - Welche Felder sind fuer POD-Produkte zwingend (Design-Datei, Varianten, Preise, Titel, Beschreibung)?

2. Parallel sofort operativ weiterarbeiten
- Mit `Upload Queue CSV` offene Artikel in Batches hochladen (zuerst `Uploadbereit`, dann `Noch offen`).
- Nach jedem Upload:
  - Produktlink in Katalog pflegen,
  - `npm run check:live-links && npm run sync:control-live` laufen lassen,
  - Status im Control UI verifizieren.

3. API-Automation sobald Zugang da ist
- Geplanter Flow:
  - Input: `merch-catalog.js` + Bilddateien.
  - Mapping: Katalogartikel -> Shirtee Produktpayload.
  - Create/Update-Mode mit Idempotenz (kein Duplikat bei erneuten Runs).
  - Link-Rueckschreiben in Katalog (Shirtee URL) + erneuter Live-Sync.
- Sicherheit:
  - API-Keys nur via `.env`/Secret Store,
  - Dry-Run und Rate-Limit-Retry.

## Praktische Reihenfolge fuer "alle Artikel hochladen"
1. `Bereits hochgeladen`: nur verifizieren.
2. `Uploadbereit`: komplett zuerst hochladen.
3. `Noch offen`: nach Prioritaet (Top-Linien/Spotlight zuerst).
4. Nach jeder Welle Links pruefen und Dashboard syncen.

## Relevante Quellen
- Shirtee Help Center (Integrationen): https://shirteecloud.zendesk.com/hc/de/sections/360005638480-Integrationen
- Hinweis auf `Shirtee API Settings` im Dashboard: https://shirteecloud.zendesk.com/hc/de/articles/360021612600-Kann-ich-meinen-bestehenden-Shirtee-Com-Account-mit-Shirtee-Cloud-verkn%C3%BCpfen
- Mehrere Shop-Integrationen moeglich: https://shirteecloud.zendesk.com/hc/de/articles/4402813424018-Kann-ich-mehrere-Shops-%C3%BCber-einen-Cloud-Account-verbinden
- Shopify-App-Integration (Beispiel): https://shirteecloud.zendesk.com/hc/en-us/articles/360019980899-How-do-I-connect-my-Shopify-shop-to-Shirtee-Cloud
- Technische Probleme/Bugreporting (Support-Kanal): https://shirteecloud.zendesk.com/hc/de/articles/4402736650130-Wie-melde-ich-technische-Probleme-einen-BUG
