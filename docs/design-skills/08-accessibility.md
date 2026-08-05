# Accessibility Review — WCAG 2.1 AA

Vor jedem Merge pruefen. Dunkle UIs mit Gold auf Schwarz bestehen Kontrast
oft knapper als gedacht — messen, nicht schaetzen.

## Kernkriterien

- **Kontrast**: Text >= 4.5:1, grosser Text und UI-Elemente/Grafik >= 3:1 —
  gegen die ECHTE Flaeche gemessen (Panels, nicht #000).
- **Tastatur**: alles ohne Maus erreichbar, logische Fokus-Reihenfolge,
  sichtbarer Fokusindikator (hier: 2 px --section-accent + --glow-sm),
  keine Fokusfallen in Overlays.
- **Zielgroessen**: Touch-Ziele >= 44x44 px.
- **Semantik**: Struktur ueber echte Elemente/Landmarks, Formularfelder mit
  Label, Alt-Text fuer bedeutungstragende Bilder, Name/Rolle/Wert fuer alle
  Controls.
- **Fehler benennen**: was falsch ist, direkt am Feld.
- Nichts Unerwartetes bei Fokus; keine Autoplay-Medien ohne Steuerung.

## Testablauf

1. Automatischer Scan (findet nur ~30 %)
2. Nur mit Tastatur durch die Seite
3. Screenreader-Stichprobe (VoiceOver)
4. Kontrastwerte messen (Tabelle: Element / Vorder / Hinter / Ratio / Soll)
5. Zoom auf 200 % — bricht das Layout?

Befunde nach Schwere ordnen; zuerst fixen, was Nutzer blockiert.
Farbe ist nie der einzige Informationstraeger (Pink/Cyan-Bereiche brauchen
zusaetzlich Text/Icon).
