# TikTok Live-Daten Strategie (Control UI)

## Ziel
- Echte TikTok-Live-Daten im Control UI (Follower, Likes, Videoanzahl) fuer beide Profile.

## Aktueller Stand
- `scripts/sync-control-live-metrics.mjs` nutzt jetzt:
  - bevorzugt TikTok API v2 per OAuth Access Token,
  - Fallback auf Profil-HTML, falls keine Tokens gesetzt sind.
- Umgebungsvariablen:
  - `TIKTOK_DR_ACCESS_TOKEN`
  - `TIKTOK_MRS_ACCESS_TOKEN`

## Umsetzungsweg
1. TikTok App auf developers.tiktok.com konfigurieren.
2. Login Kit / OAuth aktivieren und die benoetigten Scopes beantragen.
3. Fuer beide Profile einmal autorisieren und Access Tokens erzeugen.
4. Tokens lokal oder im Deployment als Secrets setzen.
5. `npm run sync:control-live` ausfuehren und Werte im Reiter `Social` pruefen.

## Vollumfang (reale Live-Daten)
- Mindestziel fuer den Productive-Mode:
  - `follower_count`
  - `likes_count`
  - `video_count`
  - optional `video/list` fuer Aktivitaetsfenster
- Dafuer wird API v2 + gueltiges OAuth Token benoetigt.
- Empfohlene Variablen:
  - `TIKTOK_DR_ACCESS_TOKEN`
  - `TIKTOK_MRS_ACCESS_TOKEN`
  - optional zusaetzlich getrennte Refresh-Token pro Account.

## Token-Lifecycle (empfohlen)
1. Access-Token kurzlebig behandeln.
2. Refresh-Token sicher speichern (nur Secret Store, nie Git).
3. Vor jedem geplanten Sync pruefen:
   - Token gueltig -> normaler Lauf
   - Token abgelaufen -> Refresh ausfuehren, dann Sync
4. Bei Refresh-Fehler:
   - auf HTML-Fallback gehen
   - Warnung im Control UI als `info/warn` markieren

## Wichtige Hinweise
- Ohne App-Freigabe/Scopes liefert TikTok nur eingeschraenkte Daten.
- Wenn Token ablaufen, muessen Refresh-Flows eingebaut werden (naechster Schritt).
- Der HTML-Fallback ist nur ein Sicherheitsnetz und kein vollwertiger API-Ersatz.

## Quellen (offiziell)
- Login Kit Overview: https://developers.tiktok.com/doc/login-kit-overview
- TikTok API v1 User Info (mit Hinweis auf v2): https://developers.tiktok.com/doc/tiktok-api-v1-user-info/?from_seo_redirect=1
- TikTok for Developers Start: https://developers.tiktok.com/
