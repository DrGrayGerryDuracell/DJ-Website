# TikTok Live-Daten Strategie (Control UI)

## Ziel
- Echte TikTok-Live-Daten im Control UI (Follower, Likes, Videoanzahl) fuer beide Profile.

## Aktueller Stand
- `scripts/sync-control-live-metrics.mjs` nutzt jetzt:
  - bevorzugt TikTok API v2 per OAuth Access Token,
  - davor einen echten Token-Lifecycle mit Store + Refresh,
  - Fallback auf Profil-HTML, falls keine gueltigen Tokens vorliegen.
- Zustaendig dafuer:
  - `scripts/tiktok-oauth-manager.mjs`
- Relevante Umgebungsvariablen:
  - `TIKTOK_CLIENT_KEY`
  - `TIKTOK_CLIENT_SECRET`
  - `TIKTOK_REDIRECT_URI`
  - `TIKTOK_DR_REFRESH_TOKEN`
  - `TIKTOK_MRS_REFRESH_TOKEN`
  - optional `TIKTOK_TOKEN_STORE_PATH`
  - legacy fallback:
    - `TIKTOK_DR_ACCESS_TOKEN`
    - `TIKTOK_MRS_ACCESS_TOKEN`

## Umsetzungsweg
1. TikTok App auf developers.tiktok.com konfigurieren.
2. Login Kit / OAuth aktivieren und die benoetigten Scopes beantragen.
3. Redirect URI fest eintragen.
4. Fuer jeden Account die Authorize-URL erzeugen:
   - `npm run tiktok:oauth -- auth-url --account dr`
   - `npm run tiktok:oauth -- auth-url --account mrs`
5. Den erhaltenen `code` serverseitig tauschen:
   - `npm run tiktok:oauth -- exchange-code --account dr --code "..."`
   - `npm run tiktok:oauth -- exchange-code --account mrs --code "..."`
6. Danach `npm run sync:control-live` ausfuehren und Werte im Reiter `Social` pruefen.

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
3. Das Dashboard nutzt zuerst den Token Store, dann Refresh, erst danach HTML-Fallback.
4. Bei Refresh-Fehler:
   - auf HTML-Fallback gehen
   - Warnung im Control UI als `info/warn` markieren
   - Ursache in `Social` sichtbar halten

## Wichtige Hinweise
- Ohne App-Freigabe/Scopes liefert TikTok nur eingeschraenkte Daten.
- Wenn Token ablaufen, muessen Refresh-Flows eingebaut werden (naechster Schritt).
- Der HTML-Fallback ist nur ein Sicherheitsnetz und kein vollwertiger API-Ersatz.

## Quellen (offiziell)
- Login Kit Overview: https://developers.tiktok.com/doc/login-kit-overview
- Login Kit Token Management: https://developers.tiktok.com/doc/login-kit-manage-user-access-tokens
- OAuth Token Endpoint / Refresh: https://developers.tiktok.com/doc/oauth-user-access-token-management?enter_method=left_navigation
- Display API Overview: https://developers.tiktok.com/doc/display-api-overview/
- Content Posting Upload: https://developers.tiktok.com/doc/content-posting-api-reference-upload-video
