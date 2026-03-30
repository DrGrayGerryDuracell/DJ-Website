# Technische Übersicht (Stand 30.03.2026)

## Aktueller Zustand
- Stack: statische Multi-Page-Website (`index.html`, `bio.html`, `musik.html`, `videos.html`, `shop.html`, `kontakt.html`) mit gemeinsamem `style.css` und `main.js`.
- Daten: Shop-Katalog und Link-Status über `assets/data/merch-catalog.js` und `assets/data/live-link-status.js`.
- Routing: dateibasiert, ohne Build-Framework; `/control` existiert noch nicht.
- Deploy-Historie: GitHub Pages + Cloudflare-Spuren (u. a. `CNAME`), aktuell ohne Vercel-Projektkonfiguration im Repo.

## Stärken
- Starke Markenidentität bereits vorhanden und konsistent in Public-Seiten.
- Gute Content-Basis inkl. Videos/Bildern und ausgebautem Merch-Katalog.
- Keine lokale Runtime-Abhängigkeit fuer den öffentlichen Betrieb (rein statisch).

## Probleme / Risiken
- Kein internes Dashboard/Control-UI vorhanden.
- Keine saubere produktionsreife Projekt-Dokumentation fuer GitHub+Vercel-Flow.
- Kein standardisierter Projekt-Entry fuer Checks/Scripts/Build-Sicherheit.
- Historische GitHub-Pages-Hinweise in README, nicht auf Vercel ausgerichtet.

## Was erhalten bleibt
- Öffentliche Seitenstruktur, Inhalte, Reihenfolge, Markensprache und Dark-Premium-Look.
- Bestehende statische Deployment-Sicherheit (kein lokaler Server notwendig).
- Bestehende Shop-/Media-/Link-Strukturen.

## Was verbessert wird
- Konservative UI/UX-Feinschliffe auf der bestehenden Public-Site.
- Neues internes Premium-Control-UI unter `/control` mit realistischen Mock-Daten.
- Modulare Daten-/Typ-/Config-Struktur fuer spaetere Live-Integrationen.
- Produktionsdokumentation und Deploy-Setup fuer GitHub als Source of Truth + Vercel als Primärhosting.
