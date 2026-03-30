# Media Analyse und Sortierung - 2026-03-30

Quelle: `/Users/martendr.gray/Documents/websitedatenupload`
Ziel: saubere, webtaugliche Struktur mit klarer Zuordnung fuer Website und Social-Content.

## Ergebnisstruktur

- Rohmaterial Bilder: `assets/uploads/raw-images/`
- Rohmaterial Videos: `assets/uploads/raw-videos/`
- Web-Bilder (optimiert): `assets/uploads/web-images/`
- Web-Videos (optimiert, H.264 + faststart): `assets/uploads/web-videos/`
- Poster/Thumbs: `assets/uploads/posters/`
- Reports: `assets/uploads/reports/`

## Technische Bearbeitung

1. HEIC in JPG konvertiert (`IMG_7165`, `IMG_9245`).
2. Curated Bilder auf max 1600 px Kante skaliert und als JPG exportiert.
3. Curated Videos als MP4 (H.264, AAC, 30fps, max 1280 Breite) exportiert.
4. Pro Video 18s Preview erstellt (webfreundlich fuer Autoplay/Loop).
5. Pro Video Poster-Frame erstellt.

## Kuratierte Web-Bilder

- `duo-couple-daylight.jpg` -> Duo, nahbar, fuer Home/Videos/Bio
- `duo-couple-rain-neon.jpg` -> Neon/Club-Vibe, starker Hero- oder Teaser-Shot
- `duo-couple-neon-kiss.jpg` -> Couple-Story, emotional + clubnah
- `duo-couple-bw-home.jpg` -> intime B/W-Stimmung, Story/Community
- `duo-couple-kiss-bw.jpg` -> Couple-Closeup, softer Einstieg
- `mrs-portrait-rain-bw.jpg` -> starke Damen-Linien-Aussage, Mrs.-Fokus
- `duo-couple-fun-couch.jpg` -> lockerer BTS-Look, eher Social als Hero

## Kuratierte Web-Videos

- `live-dj-controller-neon.mp4` -> Deck/Controller, technische Dr.-Gray-Kante
- `duo-live-collage.mp4` -> Duo-Collage, Community und Couple-Charakter
- `club-night-thanks.mp4` -> Crowd/Club-Nacht, Eventproof
- `club-red-stage.mp4` -> dunkler Stage-Moment, Peak-Time-Stimmung
- `live-koeln-announcement.mp4` -> Ankuendigung + Stadtbezug, Promo-Clip
- `mrs-erinnerung.mp4` -> Mrs.-zentrierter Clip, Damenfokus

## Nicht als Hauptmotiv priorisiert

- `66e3b660-...JPG`: App-UI im Bild, wirkt unfertig fuer Hero/Card.
- `IMG_9428.MOV`: inhaltlich nicht markenkonsistent (Pony-Szene).
- sehr lange alte Session-Clips (`5dd2...mov`, `e849...mov`, `IMG_7840.MOV`) aktuell nicht als Front-Assets genutzt, aber im Raw-Archiv behalten.

## Website-Integration (done)

- `videos.html`: Reel-Videos auf neue Web-Previews umgestellt + Content-Looks mit neuen Upload-Bildern.
- `index.html`: Community-Bildreihe auf echte neue Upload-Fotos umgestellt.

