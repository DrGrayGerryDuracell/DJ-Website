# Design Handoff — Spezifikation statt Raten

Leitsatz: **Was nicht spezifiziert ist, wird geraten.** Jede Uebergabe
(auch zwischen Claude und Codex) dokumentiert vollstaendig:

- **Visuell**: exakte Masse, Token-Referenzen statt Rohwerte
  ("--space-3", nicht "24px"), Breakpoints und was sich dort aendert
  (hier pruefen: 1440 px und 390 px).
- **Interaktion**: Klick-/Hover-/Fokus-Verhalten, Uebergaenge mit Dauer und
  Easing (hier: 120–200 ms, ease-out).
- **Alle Zustaende**: default, hover, active, disabled, loading, error, empty.
- **Inhalt & Grenzfaelle**: Zeichenlimits, Truncation, sehr lange Namen,
  fehlende Daten, langsame Verbindung.
- **A11y**: Fokusreihenfolge, Labels, Tastaturverhalten.
- **Das Warum** mitgeben ("Cyan = Live-Daten, damit man den Bereich am Rand
  erkennt") — dann trifft der Umsetzende gute Detailentscheidungen.

Format: Tabellen je Abschnitt (Tokens / Komponenten / Zustaende /
Breakpoints / Motion). README-UEBERGABE.md in diesem Zip ist nach diesem
Muster gebaut.
