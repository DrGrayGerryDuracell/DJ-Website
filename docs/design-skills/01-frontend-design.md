# Design-Skills — Arbeitsregeln fuer alle weiteren UI-Aenderungen

Destillat der Design-Richtlinien, mit denen dieses v2-Paket gebaut wurde.
Fuer Codex oder jeden anderen Agenten, der an DJ-Website weiterarbeitet.
Gilt zusaetzlich zu AGENTS.md und DESIGN.md — bei Konflikt gewinnt DESIGN.md.

## Haltung

Jede Aenderung ist eine Entscheidung fuer genau diese Marke, kein Template.
Schwarz-Gold-Techno ist die Identitaet; wer etwas hinzufuegt, muss begruenden
koennen, warum es aus dieser Welt kommt (Buehne, Pult, Signal, Puls) und nicht
aus einem beliebigen Dashboard-Kit.

## Der Prozess: erst Plan, dann Code

1. **Brainstorm** — kompaktes Token-Set skizzieren: 4–6 benannte Farben,
   Schriftrollen, Layout-Idee als Satz oder ASCII-Wireframe, und EIN
   Signature-Element, an dem man die Seite wiedererkennt.
2. **Selbstkritik vor dem Bauen** — wuerde derselbe Entwurf auch fuer ein
   beliebiges anderes Projekt entstehen? Dann ist er Default, nicht
   Entscheidung: den Teil ueberarbeiten und die Aenderung benennen.
3. **Bauen** — exakt nach dem Plan. Jede Farbe, jede Schriftgroesse kommt aus
   den Tokens, nie inline erfunden.
4. **Kritik danach** — Screenshot ansehen, ein Element entfernen, das nichts
   traegt (Chanel-Regel: vor dem Rausgehen ein Accessoire ablegen).

## Bekannte KI-Defaults — vermeiden

Drei Looks, die generierte Designs verraten, weil sie unabhaengig vom Thema
auftauchen: (1) Creme-Hintergrund + Serifen-Display + Terracotta-Akzent,
(2) Fast-Schwarz + ein einzelner Acid-Gruen- oder Zinnober-Akzent,
(3) Zeitungslayout mit Haarlinien und 0 border-radius. Keiner davon passt zu
dieser Marke. Ebenso tabu: Inter als Schrift, Lila-Verlaeufe, Glassmorphism
als Deko, nummerierte 01/02/03-Marker ohne echte Reihenfolge.

## Token-Disziplin

- Kein Hex-Wert und kein Schriftname ausserhalb der `:root`-Bloecke bzw.
  der DESIGN.md-Tabellen. Neue Farbe = erst Tabelle aktualisieren.
- `--section-accent` ist die einzige Stelle, aus der Bereichsfarben gelesen
  werden. Komponenten kennen `--accent-pink`/`--accent-cyan` nicht direkt.
- Glow ist immer `box-shadow`/`text-shadow` aus `color-mix` mit
  `--section-accent` — nie `background`, nie eine feste Farbe.
- Groessen nur aus der 8-Stufen-Skala (0.72/0.8/0.86/0.9/1/1.15/1.5/1.75 rem),
  Radien nur 3/12/14/999 px, Abstaende im 4/8-px-Rhythmus.

## Bewegung

- Nur transform, opacity, color, border-color, box-shadow animieren.
- Hover 120–200 ms ease-out, kein Layout-Shift, kein Scale, kein Anheben.
- Glow signalisiert Zustand (Fokus, aktiv, Hover, Live), nie Grundzustand.
- Genau eine dauerhafte Bewegung pro Ansicht (hier: der Live-Puls). Alles
  andere reagiert nur auf Interaktion.
- `prefers-reduced-motion: reduce` wird immer bedient.

## Sprache im Interface

Woerter sind Designmaterial. Deutsch, aktiv, konkret: der Button sagt, was
passiert ("Scan starten", nicht "Absenden"), und heisst im Toast danach
genauso. Fehler nennen Ursache und Ausweg, entschuldigen sich nicht.
Leere Zustaende sind eine Einladung zu handeln, kein "Keine Daten".
Ein Begriff behaelt ueberall dieselbe Bedeutung.

## Qualitaetsboden (ohne Ankuendigung einbauen)

Responsiv bis 390 px. Sichtbarer Tastaturfokus (2 px `--section-accent` +
`--glow-sm`). Kontrast gegen die echten Panel-Toene MESSEN, nicht schaetzen —
Ziel 4.5:1 fuer Text, 3:1 fuer grosse Akzente. Farbe ist nie der einzige
Informationstraeger. Vorsicht bei CSS-Spezifitaet: Section- und
Element-Selektoren heben sich gern gegenseitig auf, besonders bei
Paddings/Margins.
