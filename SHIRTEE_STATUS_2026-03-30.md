# Shirtee Status - 2026-03-30

## Technischer Check

Geprueft am 30.03.2026 (ca. 18:23 Uhr Europe/Berlin) per `curl -I -L`.

- `https://www.shirtee.com/de/store/drgray-mrsdrgray/` -> `200 OK`
- `https://www.shirtee.com/de/drgray-mrsdrgray/` -> live Produktseite
- `https://www.shirtee.com/de/gy1dj4cqvmh36/` -> live Produktseite
- `https://www.shirtee.com/de/dr-gray-kein-mainstream-hoodie-drop-2026/` -> `404 Not Found`
- `https://www.shirtee.com/de/mrs-dr-gray-zu-wild-fuer-leise-crop-2026/` -> `404 Not Found`
- `https://www.shirtee.com/de/verheiratet-mit-dem-beat-couple-hoodie-2026/` -> `404 Not Found`

## Beobachtung aus Store-HTML

Der oeffentliche Store listet aktuell nur 2 Produkte:

1. Mrs.Dr.Gray Unisex Hoodie
2. Mrs.Dr.Gray Croop Shirt

Die 3 neuen Kampagnen sind aktuell nicht in der oeffentlichen Store-Produktliste enthalten.

## Wahrscheinlichster Grund (Inference)

Die Kampagnen sind im Dashboard erstellt, aber noch nicht vollstaendig oeffentlich freigeschaltet/indexiert
oder sie sind nicht auf den Store synchronisiert (Shop-Visibility / Marketplace-Freigabe / finale Aktivierung).

## Naechste Schritte (ohne Umwege)

1. Im Shirtee-Dashboard je betroffene Kampagne auf finalen Status pruefen:
   - aktiv/published
   - im Shop sichtbar
   - URL final erzeugt
2. Doppelte Herren-Hoodie-Kampagnen bereinigen (nur eine finale Version live lassen).
3. Falls Status korrekt, aber 404 bleibt:
   - ueber `https://www.shirtee.com/de/shirteeshop-support/` -> "Frage zu Kampagnen" melden
   - betroffene URLs und Store-ID `137221` mitgeben.
4. Nach Freischaltung:
   - neue Live-URLs in `assets/data/merch-catalog.js` direkt von `shop.html#...` auf echte Shirtee-Links umstellen.
