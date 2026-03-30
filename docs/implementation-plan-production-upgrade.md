# Umsetzungsplan (konservativ, produktionssicher)

1. Public-Website veredeln
- gezielte CSS/UX-Feinschliffe (Spacing, Fokuszustände, mobile CTA-Touch-Ziele, Lesbarkeit)
- semantische/SEO/A11y-Mikroverbesserungen ohne Strukturbruch

2. `/control` Premium-Control-UI bauen
- interne Route als statische, deploybare MPA-Unterseite (`/control/index.html`)
- modulare Dashboard-UI mit Sidebar, Topbar, KPI-Karten, Charts, Tabellen, Activity Feed, Alerts, Quick Actions

3. Datenarchitektur vorbereiten
- Runtime-Mockdaten fuer `/control` in JS-Modulen
- parallele TypeScript-Vertragsstruktur fuer spaetere Integrationen (`src/types`, `src/data`, `src/config`, `src/utils`)

4. Deploy-/Hosting-Sicherheit herstellen
- Vercel-kompatible statische Struktur + optionales Redirect-Setup
- Projekt-Scripts fuer Checks und lokale Preview
- keine lokale Runtime-Abhängigkeit

5. Doku und Teamregeln finalisieren
- README (Deutsch, produktionsreif)
- AGENTS.md (konservative Regeln)
- .env.example (nur sinnvolle Platzhalter)
