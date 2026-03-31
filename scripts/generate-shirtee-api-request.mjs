#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = "/Users/martendr.gray/Documents/New project/DJ-Website";
const metricsPath = join(repoRoot, "control/js/live-metrics.json");
const outDir = join(repoRoot, "artifacts/requests");
const outPath = join(outDir, "shirtee-api-request.md");

const metrics = JSON.parse(readFileSync(metricsPath, "utf8"));
const catalog = metrics?.shopMetrics?.catalog || {};
const total = Number(catalog.totalItems || 0);
const uploaded = Number(catalog.uploadedCount || 0);
const ready = Number(catalog.readyCount || 0);
const pending = Number(catalog.pendingCount || 0);

mkdirSync(outDir, { recursive: true });

const dateLabel = new Date().toISOString().slice(0, 10);
const body = `# Shirtee API Access Request (${dateLabel})

Hallo Shirtee Team,

wir betreiben den Store **drgray-mrsdrgray** und moechten den Produkt-Upload aus unserem internen Katalog automatisieren.

## Aktueller Stand
- Katalogartikel gesamt: **${total}**
- Bereits live/hochgeladen: **${uploaded}**
- Uploadbereit: **${ready}**
- Noch offen: **${pending}**

## Ziel
Wir moechten Produkte (Design + Varianten + Texte + Preise) automatisiert in Shirtee anlegen/aktualisieren und den Status danach in unserem Dashboard zurueckspielen.

## Bitte um Rueckmeldung
1. Gibt es eine dokumentierte API fuer Produktanlage/-update (REST o.ae.)?
2. Welche Authentifizierung wird genutzt (API Key, OAuth, andere)?
3. Gibt es Sandbox/Testzugang?
4. Welche Pflichtfelder benoetigt ein Produkt-Create?
5. Gibt es Rate Limits und Retry-Empfehlungen?
6. Gibt es Webhooks oder einen Endpoint fuer Produktstatus/Sync?

Vielen Dank.
`;

writeFileSync(outPath, body, "utf8");
console.log(`Wrote ${outPath}`);
