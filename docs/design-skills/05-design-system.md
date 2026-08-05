# Design System — auditieren, dokumentieren, erweitern

Leitsatz: **Konsistenz schlaegt Kreativitaet.** Das System existiert, damit
nicht jede Sektion das Rad neu erfindet. Flexibilitaet ja — aber innerhalb
der Grenzen. Was nicht dokumentiert ist, existiert nicht.

## Token-Kategorien (alle in DESIGN.md pflegen)

Farben (Marke, Semantik, Neutral) · Typo (Skala, Gewichte, Zeilenhoehen) ·
Abstaende (4/8-px-Rhythmus) · Radien · Schatten/Glow · Motion (Dauern, Easing).

## Audit (regelmaessig, besonders vor groesseren Umbauten)

- Benennung: gleiche Dinge heissen gleich (Klassen, Tokens, Sektionen)?
- Token-Abdeckung: hartcodierte Hexwerte, wilde font-sizes, krumme Abstaende
  zaehlen und auf die Skala ziehen (in control.css bereits geschehen:
  25 Streuwerte -> 8 Stufen).
- Komponenten-Vollstaendigkeit: hat jede Komponente ihre Zustaende
  (default/hover/active/disabled/loading/error/empty)?
- Ergebnis als Tabelle mit den 3 wirkungsvollsten Massnahmen zuerst.

## Neue Komponente nur, wenn noetig

Vor jedem neuen Pattern: Welche bestehende Komponente ist aehnlich, und warum
reicht sie nicht? Neue Komponenten definieren Varianten, Zustaende, genutzte
Tokens und Tastatur-/Screenreader-Verhalten — sonst sind sie nicht fertig.
