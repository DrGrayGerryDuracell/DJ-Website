# Algorithmic Art — generative Visuals (p5.js)

Fuer lebendige Visuals: Hintergrund-Atmosphaeren, Visualizer, Loops fuer
Streams und Social.

## Methode

1. **Algorithmische Philosophie** (kurzes Manifest): Welches System erzeugt
   das Bild? Beispiele als Denkmuster: Flow Fields aus geschichtetem
   Perlin-Noise; Partikel, deren Spuren sich zu Dichtekarten aufaddieren;
   Interferenz aus Phasen; rekursive Verzweigung; Voronoi/Circle-Packing,
   das sich in Ordnung entspannt.
2. **Umsetzung in Code**: Schoenheit entsteht im Prozess, nicht im Einzelbild.
   Jeder Lauf ist einzigartig.

## Regeln

- **Seeded Randomness**: jeder Zufall haengt an einem Seed. Gleicher Seed =
  gleiches Bild (reproduzierbar fuer Rendering und Abnahme).
- Parameter (Dichte, Geschwindigkeit, Farbe-aus-Velocity, Noise-Skala) als
  benannte Regler herausfuehren, nicht hart verdrahten.
- Farbe aus Systemzustand ableiten (schnell = hell/Gold, langsam = Schatten),
  Palette bleibt die Markenpalette.
- Das Konzept des Anlasses subtil in die Parameter legen (z. B. BPM eines
  Tracks als Frequenz), ohne es zu plakatieren.
- Fuer die Website gilt zusaetzlich DESIGN.md: eine dauerhafte Bewegung pro
  Ansicht, prefers-reduced-motion liefert ein statisches Standbild.
