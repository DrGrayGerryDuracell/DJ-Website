# Live-Link Sync (Shop Automation)

## Ziel
`Jetzt kaufen` wird nur angezeigt, wenn die Produkt-URL verifiziert `HTTP 200` liefert.

## Workflow
1. Sync-Skript ausfuehren:
   ```bash
   node scripts/sync-live-link-status.mjs
   ```
2. Das Skript erzeugt:
   - `assets/data/live-link-status.js`
3. Frontend-Logik:
   - `main.js` nutzt diese Datei bei externen Produktlinks.
   - Nur verifizierte Links bekommen `Jetzt kaufen`.
   - Nicht verifizierte Links fallen auf den Store-Link zurueck (`Store ansehen`).

## Hinweis
Nach neuen Shirtee-Freischaltungen das Sync-Skript erneut laufen lassen und deployen.

Das generierte `live-link-status.js` ist bewusst ohne Laufzeit-Timestamp gehalten, damit nur echte Link- oder Statusaenderungen neue Commits erzeugen.
