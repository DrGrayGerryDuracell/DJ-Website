# Dr. Gray & Mrs. Dr. Gray — Website + Control Center

Diese Codebasis enthaelt:
- die **oeffentliche Website** (bestehende Markenpraesenz, konservativ veredelt)
- das **interne Dashboard** unter **`/control`** (Premium Control UI, mockbasiert, deploybar ohne lokale Laufzeit)

Ziel: bestehende Identitaet erhalten, Qualitaet erhoehen, sauber auf GitHub + Vercel produktionsfaehig betreiben.

## Architekturueberblick
- Public Site: statische Multi-Page-Website (`index.html`, `bio.html`, `musik.html`, `videos.html`, `shop.html`, `kontakt.html`)
- Control UI: statische Route unter `control/index.html` (Pfad: `/control`)
- Datenbasis:
  - Laufzeit-Mockdaten: `control/js/mock-data.js`
  - Zukunftsfeste Typen/Adapter: `src/types`, `src/data`, `src/config`, `src/utils`
- Shop-Katalog: `assets/data/merch-catalog.js`

## Tech Stack (Projektrealitaet + Zielausrichtung)
- Bestehende Laufzeitbasis: **statisches HTML/CSS/JS** (bewusst konservativ, geringes Risiko)
- Dashboard-Datenvertraege: **TypeScript-Struktur** in `src/*`
- Deployment: **GitHub (Source of Truth)** + **Vercel (Hosting)**
- Optional spaeter: React/Vite/Tailwind als schrittweise Erweiterung fuer interne Module (ohne Public-Relaunch)

## Lokaler Start
### Voraussetzungen
- Node.js >= 20
- npm

### Installation
```bash
npm install
```

### Development Preview
```bash
npm run dev
```
Dann im Browser:
- Public Site: `http://localhost:4173/index.html`
- Control Center: `http://localhost:4173/control`

## Build / Checks
### Produktionscheck (deploy-sicher)
```bash
npm run build
```
`build` fuehrt aktuell einen Sicherheitscheck aus (Dateien + JS-Syntax), damit Deploys stabil bleiben.

### Weitere Checks
```bash
npm run verify
npm run check:links
npm run check:live-links
```

## Deployment (GitHub + Vercel)
1. Repo auf GitHub als Hauptquelle pflegen (`main` als stabile Produktionslinie).
2. In Vercel: **New Project** -> GitHub-Repo importieren.
3. Framework Preset: **Other** (statische Site).
4. Build Command (optional): `npm run build`
5. Output Directory: leer lassen (Root als statische Ausgabe).
6. Deploy.

### Domain Setup (Vercel als Primärhosting)
1. In Vercel Projekt -> **Settings -> Domains**:
   - Hauptdomain setzen: z. B. `drgray-mrsdrgray.com` **oder** `www.drgray-mrsdrgray.com`
2. Die zweite Variante als Redirect auf die Hauptdomain konfigurieren.
3. DNS beim Domain-Provider gemaess Vercel-Hinweisen setzen.
4. Nach DNS-Propagation pruefen:
   - `/index.html`
   - `/shop.html`
   - `/control`

## Wichtige Projektstruktur
```text
control/
  index.html
  control.css
  main.js
  js/
assets/
  data/
  images/
  videos/
src/
  types/dashboard.ts
  data/mockData.ts
  data/adapters.ts
  config/dashboardConfig.ts
  utils/formatters.ts
scripts/
  verify-build-safety.mjs
  check-shirtee-links.sh
```

## Internes Dashboard (`/control`)
Module:
- Overview
- Website
- Shop
- Live Activity
- Performance
- Content
- Social
- Alerts
- Settings / Quick Actions

Der Dashboard-Stand ist absichtlich **mock-first**, damit alles ohne lokale oder externe Runtime-Abhaengigkeit laeuft.

### Zugangsschutz fuer `/control`
- Zugriff laeuft ueber einen vorgeschalteten Lock-Screen: `/control-login.html`
- Sessiondauer: 12 Stunden (lokal im Browser gespeichert)
- Hash-Konfiguration: `control/js/config.js` -> `controlAuthConfig.passphraseHash`
- Login-Logik: `control/js/auth.js` und `control/login.js`

Passphrase rotieren:
1. Neue Passphrase waehlen (lang + zufaellig).
2. Hash mit SHA-256 fuer `salt:passphrase` erzeugen.
3. Hash in `control/js/config.js` ersetzen.
4. Deployen.

Beispiel (lokal):
```bash
python3 - <<'PY'
import hashlib
salt='drgray-control-salt-v1'
passphrase='DEINE_NEUE_PASSPHRASE'
print(hashlib.sha256(f'{salt}:{passphrase}'.encode()).hexdigest())
PY
```

## Umgebungsvariablen
Beispielwerte stehen in `.env.example`.

Aktuell werden keine Secrets benoetigt. Fuer spaetere Integrationen koennen Endpoints und Flags dort zentral gepflegt werden.

## Wartung / Erweiterung
- Neue KPI-Karten: Daten in `control/js/mock-data.js` (Laufzeit) + `src/types/dashboard.ts` (Vertrag) erweitern.
- Neue Datenquellen: in `src/data/adapters.ts` Live-Loader schrittweise aktivieren.
- Public Site nur konservativ anpassen (veredeln, nicht neu erfinden).

## Hinweise zu Alt-Konfigurationen
- `CNAME` ist aus frueherer GitHub-Pages-Nutzung vorhanden.
- Fuer Vercel ist die Domainfuehrung in Vercel selbst massgeblich.
- Alte Pages-Hinweise wurden in die neue Vercel-Strategie ueberfuehrt.
