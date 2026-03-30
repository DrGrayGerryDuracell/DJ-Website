# Vercel Domain Runbook

## Ziel
- GitHub = Source of Truth
- Vercel = Hosting
- Hauptdomain eindeutig festlegen (apex oder www)
- alternative Domain per Redirect auf Hauptdomain

## Schritte
1. Vercel-Projekt mit diesem Repo verbinden.
2. Build-Command optional auf `npm run build` setzen.
3. Domains im Projekt hinterlegen.
4. DNS-Eintraege beim Provider gemaess Vercel setzen.
5. Redirect-Regel fuer zweite Domain aktivieren.
6. Endpunkte testen:
   - `/index.html`
   - `/shop.html`
   - `/control`

## Hinweis
Das Projekt ist statisch deploybar und benoetigt keine lokale Runtime fuer den Live-Betrieb.
