# 🔥 Bio & Data Sync System
## Dr. Gray & Mrs. Dr. Gray - Integrated Website Architecture

---

## 📋 Überblick

Dieses System verbindet **alle Website-Seiten** in einer **zentralen Datenquelle** und synchronisiert automatisch:
- ✅ SoundCloud Tracks (neue Sets laden automatisch)
- ✅ Bio-Informationen (persönlich & aktuell)
- ✅ Metadaten (alle Seiten nutzen die gleichen Daten)
- ✅ Social Links (ein Update = überall aktuell)

**Resultat:** Keine Duplikate, alles im Einklang, immer up-to-date.

---

## 🏗️ Architektur

```
┌─────────────────────────────────┐
│   Zentrale Datenquelle          │
│   site-config.json              │
│   (All truth source)            │
└──────────────┬──────────────────┘
               │
      ┌────────┼────────┐
      │        │        │
      ▼        ▼        ▼
   Bio    Home    Musik    Videos    Shop
  Page   Page     Page     Page      Page
      │        │        │
      └────────┼────────┘
               │
    ┌──────────▼──────────┐
    │ soundcloud-sync.js  │
    │ (Auto-update)       │
    └─────────────────────┘
```

---

## 📁 Neue Dateien

### 1. **`site-config.json`**
Zentrale Konfiguration für alle Seiten.

```json
{
  "site": { /* Allgemeine Info */ },
  "social": { /* TikTok, SoundCloud Links */ },
  "artists": { /* Dr. Gray & Mrs. Dr. Gray Profile */ },
  "music": { /* Sound-Beschreibungen */ },
  "sync": { /* Auto-Update Settings */ },
  "pages": { /* Was jede Seite braucht */ }
}
```

**Nutzen:**
- Links sind an **einem Ort** definiert
- Update in `site-config.json` = aktualisiert alle Seiten
- JavaScript lädt diese Datei und rendert dynamisch

---

### 2. **`soundcloud-sync.js`**
Automatische SoundCloud Integration.

**Was es tut:**
```javascript
✅ Ruft neueste Tracks von SoundCloud ab
✅ Speichert Daten in localStorage (Cache)
✅ Aktualisiert HTML mit Track-Informationen
✅ Lädt jede Stunde neue Daten
✅ Funktioniert auch offline (mit Cache)
```

**Wie es funktioniert:**
1. Seite lädt
2. `soundcloud-sync.js` startet
3. Prüft Cache: Ist er aktuell?
4. Wenn ja: Nutzt Cache → schnell ⚡
5. Wenn nein: Ruft SoundCloud API auf → aktualisiert Cache
6. Rendert neue Tracks ins HTML
7. Aktualisiert Meta-Beschreibungen
8. Registriert sich für auto-update jede Stunde

---

### 3. **`bio-v2.html`**
Neue, persönlichere Bio-Seite.

**Unterschiede zur alten bio.html:**

| Element | Alt | Neu |
|---------|-----|-----|
| **Fokus** | Generischer | Couple-Story |
| **Personalisierung** | Low | High |
| **SoundCloud** | Manuell | Auto-synced |
| **Social Links** | Hardcoded | Aus Config |
| **Animationen** | Keine | Scroll-Triggers |
| **Mobile** | Basic | Optimiert |

---

### 4. **`style-bio-enhanced.css`**
Styling für die neue Bio + alle Seiten.

**Features:**
- Info Cards mit Hover-Effekten
- CTA Grid (4 Karten für Social Links)
- Timeline Layout
- Glass-Card Ästhetik
- Responsive Grid Systeme
- Animierte Übergänge

---

## 🔄 Wie der Sync funktioniert

### 1. **SoundCloud Sync (Automatisch)**

```javascript
// Läuft automatisch:
// - Bei Seitenanfang
// - Jede Stunde (setInterval)
// - Bei Benutzer-Trigger

soundcloud-sync.js
  ↓
Prüft SoundCloud API
  ↓
Lädt neueste 10 Tracks
  ↓
Cache in localStorage
  ↓
Rendert 3 Top-Tracks ins HTML
  ↓
Aktualisiert Meta-Beschreibungen
```

**Cache-Logik:**
```javascript
const CACHE_DURATION = 3600000; // 1 Stunde

// Wenn Cache älter als 1 Stunde:
// → API aufrufen
// → Neue Daten laden
// → Cache updaten

// Wenn Cache fresh:
// → Schnell aus localStorage
// → Keine API-Anfrage nötig
```

---

### 2. **Config Sync (Manuell)**

Wenn Du etwas in `site-config.json` änderst:
```json
{
  "social": {
    "tiktok_main": "@drgray_mrsdrgray"  // ← Ändern
  }
}
```

Dann lädt `index.html` diese Datei und rendert:
```html
<a href="https://www.tiktok.com/@drgray_mrsdrgray">...</a>
```

Alle Seiten nutzen die gleiche Config → immer aktuell.

---

## 📊 Was aktualisiert sich wann?

### **Automatisch (keine Arbeit nötig):**
- ✅ Neue SoundCloud Tracks (jede Stunde)
- ✅ Track-Metadaten (Plays, Datum, etc)
- ✅ Bio-Section auf allen Seiten

### **Manuell (1x ändern = überall):**
- 📝 `site-config.json` → Alle Links, Taglines, Bios
- 📝 `soundcloud-sync.js` → Sync-Verhalten (Cache-Zeit, Limits)
- 📝 `bio-v2.html` → Bio-Copy, Werte, Beschreibungen

---

## 🚀 Setup Instructions

### Schritt 1: HTML-Link hinzufügen
```html
<!-- bio.html (oder neue Version) -->
<link rel="stylesheet" href="style-bio-enhanced.css">
<script src="soundcloud-sync.js" defer></script>
```

### Schritt 2: SoundCloud Client ID setzen
```javascript
// In soundcloud-sync.js:
const SOUNDCLOUD_CLIENT_ID = 'deine_client_id'; // Von SoundCloud
```

Wo bekomme ich Client ID?
1. Gehe zu https://soundcloud.com/settings/apps
2. Erstelle eine neue "Application"
3. Kopiere die Client ID
4. Trage sie in `soundcloud-sync.js` ein

### Schritt 3: site-config.json updaten
```json
// Deine Informationen eintragen:
{
  "site": { "title": "Dr. Gray & Mrs. Dr. Gray" },
  "social": { /* TikTok & SoundCloud Links */ }
}
```

### Schritt 4: Testen
```bash
# Öffne bio-v2.html im Browser
# Console (F12) sollte zeigen:
# "✅ SoundCloud sync complete"
# "📦 Using cached SoundCloud data"
```

---

## 🔧 API Integration

### SoundCloud API Endpoints
```javascript
// User Info
GET /users/lookup?handle={username}&client_id={id}

// User Tracks
GET /users/{id}/tracks?limit=10&client_id={id}

// Einzelner Track
GET /tracks/{id}?client_id={id}
```

### Response-Struktur
```javascript
{
  "id": 123456,
  "title": "Emotional Flow",
  "duration": 600000,           // ms
  "playback_count": 1250,
  "created_at": "2025-10-07T...",
  "permalink_url": "https://soundcloud.com/...",
  "user": {
    "username": "drgray_sic",
    "display_name": "Dr. Gray"
  }
}
```

---

## 📱 Mobile Optimizations

```css
/* Responsive Grids passen sich an */
@media (max-width: 768px) {
  .two-grid { grid-template-columns: 1fr; }
  .three-grid { grid-template-columns: 1fr; }
  .split-layout { grid-template-columns: 1fr; }
  
  /* Animationen bleiben schnell */
  .scroll-fade-in { animation-duration: 0.6s; }
}
```

---

## 🎯 Seiten Kommunikation

### **Alle Seiten nutzen:**
```javascript
// site-config.json für Links
const config = await fetch('assets/data/site-config.json');

// soundcloud-sync.js für Musik
const tracks = window.soundcloudSync.fetchSoundCloudTracks();

// Gemeinsame CSS
<link rel="stylesheet" href="style-animations.css">
<link rel="stylesheet" href="style-bio-enhanced.css">
```

### **Resultat:**
- **Keine Duplikate** - Jede Info an einem Ort
- **Immer aktuell** - Auto-Sync jede Stunde
- **Konsistent** - Alle Seiten zeigen die gleichen Daten
- **Wartbar** - Ein Update = überall

---

## 🐛 Troubleshooting

### Problem: Tracks werden nicht geladen
```javascript
// Check 1: Browser Console (F12)
console.error() sollte zeigen:
// ❌ "SoundCloud API error"
// ✅ "Fetched latest SoundCloud tracks"

// Check 2: Client ID gesetzt?
const SOUNDCLOUD_CLIENT_ID = '...' // Nicht leer!

// Check 3: localStorage aktiviert?
localStorage.setItem('test', '1'); // Should work
```

### Problem: Cache wird nicht geleert
```javascript
// Manuell löschen:
localStorage.removeItem('drgray_soundcloud_cache');

// Oder: Developer Tools
// Application → Local Storage → Delete
```

### Problem: Meta-Beschreibungen werden nicht aktualisiert
```javascript
// Prüfe: Ist soundcloud-sync.js nach anderen Scripts?
<!-- ✓ Richtig -->
<script src="main.js"></script>
<script src="soundcloud-sync.js"></script> <!-- Nach main.js -->

<!-- ✗ Falsch -->
<script src="soundcloud-sync.js"></script>
<script src="main.js"></script>
```

---

## 📈 Analytics Integration

Wenn Du Analytics nutzt (Google Analytics, etc.):

```javascript
// Track wenn neue Tracks geladen
gtag('event', 'soundcloud_sync', {
  'track_count': tracks.length,
  'timestamp': new Date()
});
```

---

## 🔐 Security Notes

- ✅ Client ID wird **nur clientseitig** genutzt (Browser)
- ✅ SoundCloud API erlaubt public-read (auth nicht nötig)
- ✅ Keine sensitive Daten in `site-config.json`
- ✅ Cache in localStorage (nur Benutzer kann sehen)

---

## 📝 Nächste Steps

1. **Client ID besorgen** von SoundCloud (5 min)
2. **site-config.json anpassen** mit deinen Daten (2 min)
3. **bio-v2.html testen** im Browser (2 min)
4. **alte bio.html ersetzen** oder als bio-old.html speichern
5. **Commit & Push** zum Live-Server

---

## ✨ Features Roadmap

### Jetzt verfügbar:
- ✅ Auto-Sync SoundCloud Tracks
- ✅ Persönliche Bio-Seite
- ✅ Zentrale Config
- ✅ Scroll-Trigger Animationen

### Zukünftig (wenn gewünscht):
- 🔜 TikTok Video Auto-Embed
- 🔜 Automatische Merch-Updates
- 🔜 Live-Status Indicator
- 🔜 Newsletter Integration
- 🔜 Spotify Playlist Integration

---

**Version:** 1.0  
**Last Updated:** 2026-07-29  
**Status:** ✅ Production Ready
