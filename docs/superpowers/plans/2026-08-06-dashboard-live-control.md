# Dashboard Live Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Das interne `/control`-Dashboard soll Home Assistant, lokale Control-Aktionen und die Routing-/Visual-Ansichten so anbinden, dass die wichtigsten Bedienpfade echte lokale Backend-Aktionen auslösen statt nur statisch oder Copy-only zu sein.

**Architecture:** Die bestehende statische Dashboard-Struktur bleibt erhalten und bekommt einen lokalen, optionalen `control-bridge`-Backendpfad als Adapter-Schicht. Home-Assistant-, Shop-, Website-, Content- und Operations-Aktionen laufen zuerst über eine klare lokale Command/API-Registry; Visual-Routing und HA-/Social-Panels werden darauf abgestimmt, damit UI-Zustand, Bedienung und Live-Snapshot dieselbe Quelle nutzen.

**Tech Stack:** Vanilla JS, Node.js built-ins (`http`, `fs`, `child_process`), bestehende Metrics-Sync-Skripte, bestehende `control/*.js`-Renderer, JSON-Artefakte.

## Global Constraints

- Bestehende Public-Site-Identität und Struktur erhalten.
- Kein Full-Redesign; konservative Upgrades.
- Dashboard-Route bleibt `/control`.
- Dashboard ist intern, keine Replacement-Public-Site.
- Mock-/Adapter-first beibehalten, aber echte lokale Steuerpfade ergänzen.
- Dark premium techno theme mit subtilen Neon-Gold-Akzenten beibehalten.
- Maintainability, low risk, deployment safety priorisieren.
- Unnötige Dependencies vermeiden.
- App muss unabhängig von einem einzelnen lokalen Rechner deploybar bleiben.
- Improve everything, replace nothing.

---

### Task 1: Bridge Command Registry fuer echte lokale Aktionen erweitern

**Files:**
- Modify: `scripts/control-bridge-server.mjs`
- Modify: `scripts/sync-control-live-metrics.mjs`
- Test: manuelle API-Pruefung ueber `curl`, Syntax-Check ueber `node --check`

**Interfaces:**
- Consumes:
  - `POST /api/control/command` mit `{ command: string, payload?: object }`
  - `POST /api/control/ha-queue` mit `{ room?: string, automation?: string, payload?: object }`
- Produces:
  - `GET /api/control/state` liefert persistierte Action-/Toggle-Zustaende
  - `POST /api/control/command` fuehrt allowlist-basierte lokale Aktionen aus
  - `POST /api/control/ha-queue` liefert Queue-Eintrag `{ id, createdAt, room, automation, payload }`

- [ ] **Step 1: Bestehende Action-Grenzen dokumentieren**

Pruefe in `scripts/control-bridge-server.mjs`, welche Commands schon allowlisted sind und welche Dashboard-Aktionen aktuell noch nur UI-/Copy-Fallback sind:

```js
const COMMANDS = {
  "sync-control-live": { ... },
  verify: { ... },
  "generate-upload-queue": { ... },
  "generate-upload-batches": { ... },
  "generate-shirtee-api-request": { ... }
};
```

- [ ] **Step 2: Failing runtime check definieren**

Run: `node --check scripts/control-bridge-server.mjs`

Expected: `exit 0`; wenn spätere neue Endpunkte syntaktisch fehlschlagen, ist der Task nicht valide.

- [ ] **Step 3: Bridge-Registry fuer echte Control-Aktionen ergänzen**

Erweitere die Bridge um eine lokale Action-Registry, die payload-basierte Befehle unterscheiden kann:

```js
const ACTIONS = {
  "ha.toggle-device": async ({ entityId, nextState }) => ({ ok: true, entityId, nextState, mode: "queued-local" }),
  "ha.run-scene": async ({ room, scene }) => ({ ok: true, room, scene, mode: "queued-local" }),
  "content.plan-entry": async ({ id, status, owner }) => ({ ok: true, id, status, owner }),
  "website.page-note": async ({ pageId, note }) => ({ ok: true, pageId, note }),
  "shop.prepare-draft": async ({ draftId, stage }) => ({ ok: true, draftId, stage }),
  "ops.run-subagent": async ({ agentId, mode }) => ({ ok: true, agentId, mode })
};
```

Und route diese in einem neuen Endpunkt:

```js
if (request.method === "POST" && url.pathname === "/api/control/action") {
  const body = await readJsonBody(request);
  const result = await runAction(body.action, body.payload || {});
  return json(response, result.ok ? 200 : 500, result);
}
```

- [ ] **Step 4: HA-Queue mit bedienbaren Statusfeldern statt Blindablage erweitern**

Ergänze Queue-Einträge um `kind`, `requestedState`, `source` und `status`, damit das Dashboard damit sinnvoll arbeiten kann:

```js
queue.queue.push({
  id: `ha-${Date.now()}`,
  createdAt: new Date().toISOString(),
  kind: body.automation ? "automation" : "room",
  room: body.room || null,
  automation: body.automation || null,
  requestedState: body.payload?.state || null,
  source: "control-dashboard",
  status: "queued",
  payload: body.payload || null
});
```

- [ ] **Step 5: Live-Metrik-Sync um Bridge-/Queue-Status erweitern**

In `scripts/sync-control-live-metrics.mjs` lese `artifacts/control-bridge/state.json` und `artifacts/control-bridge/ha-command-queue.json` ein und expose sie im Datenmodell:

```js
const controlBridgeStatePath = `${repoRoot}/artifacts/control-bridge/state.json`;
const controlHaQueuePath = `${repoRoot}/artifacts/control-bridge/ha-command-queue.json`;

const bridgeState = readJsonFile(controlBridgeStatePath, { updatedAt: null, controls: {} });
const haQueue = readJsonFile(controlHaQueuePath, { updatedAt: null, queue: [] });
```

Fuege daraus z. B. in `homeAssistantWorkbench` und `operationsWorkbench` sichtbare Queue-/Action-Summaries ein.

- [ ] **Step 6: Runtime-Checks ausfuehren**

Run:

```bash
node --check scripts/control-bridge-server.mjs
node --check scripts/sync-control-live-metrics.mjs
npm run sync:control-live
```

Expected:
- alle `node --check` mit `exit 0`
- `npm run sync:control-live` schreibt `control/js/live-metrics.json`

- [ ] **Step 7: Commit**

```bash
git add scripts/control-bridge-server.mjs scripts/sync-control-live-metrics.mjs control/js/live-metrics.json
git commit -m "feat: extend bridge actions and HA queue state"
```

### Task 2: Home Assistant Bedienpfade auf echte Dashboard-Aktionen umstellen

**Files:**
- Modify: `control/main.js`
- Modify: `control/js/render.js`
- Modify: `control/control.css`
- Test: `node --check control/main.js`, `node --check control/js/render.js`, manuelle Klickpfade

**Interfaces:**
- Consumes:
  - `POST /api/control/action` mit `ha.toggle-device`, `ha.run-scene`
  - `POST /api/control/ha-queue`
  - `window.__CONTROL_DATA__.homeAssistantWorkbench`
- Produces:
  - bedienbare Raum-/Geräte-/Automation-Dialoge
  - sichtbare Action-Statusmeldungen im HA-Bereich

- [ ] **Step 1: Failing interaction scope festlegen**

Pruefe in `control/main.js`, dass `ha-room` und `ha-automation` aktuell nur Queue/Copy nutzen:

```js
if (kind === "ha-room") { ... }
if (kind === "ha-automation") { ... }
```

Expected: Es fehlt noch ein direkter `action`-Pfad fuer einzelne Geraete/Szenen.

- [ ] **Step 2: Room-Dialoge auf granulare HA-Actions erweitern**

Erweitere `buildDialogPayload()` fuer `ha-room` so, dass einzelne Szenen und Geraete direkte Actions bekommen:

```js
actions: [
  { type: "ha-action", label: "Szene Abend", action: "ha.run-scene", payload: { room: room.id, scene: "abend" } },
  { type: "ha-action", label: "Alle Lichter aus", action: "ha.toggle-device", payload: { room: room.id, entityId: "group.lights", nextState: "off" } }
]
```

- [ ] **Step 3: Automation-Dialoge um Start/Pause/Resume erweitern**

Füge Action-Buttons mit klaren Payloads hinzu:

```js
actions: [
  { type: "ha-action", label: "Jetzt starten", action: "ha.run-automation", payload: { automation: item.id, mode: "run-now" } },
  { type: "ha-action", label: "Pausieren", action: "ha.run-automation", payload: { automation: item.id, mode: "pause" } }
]
```

- [ ] **Step 4: Dialog-Renderer und Klick-Handler fuer `ha-action` implementieren**

In `renderControlDialog()` und `setupControlDialogActions()`:

```js
if (action.type === "ha-action") {
  return `<button type="button" class="action-btn is-secondary" data-control-action="${escapeHtml(action.action)}" data-control-payload='${escapeHtml(JSON.stringify(action.payload || {}))}'>${escapeHtml(action.label)}</button>`;
}
```

```js
const actionTrigger = event.target.closest("[data-control-action]");
if (actionTrigger) {
  await controlApi("/action", {
    method: "POST",
    body: JSON.stringify({
      action: actionTrigger.getAttribute("data-control-action"),
      payload: JSON.parse(actionTrigger.getAttribute("data-control-payload") || "{}")
    })
  });
}
```

- [ ] **Step 5: HA-Panel um Queue-/Action-Statusleisten erweitern**

In `control/js/render.js` zeige im HA-Bereich:
- letzte Queue-Eintraege
- letzter Action-Status
- lesbare Text-Status statt nur Farbchips

Nutze dafuer Daten aus `homeAssistantWorkbench.queueSummary`.

- [ ] **Step 6: HA-CSS fuer Popup-/Grid-Bedienung nachziehen**

In `control/control.css` sicherstellen:

```css
.control-toggle-grid,
.action-grid.compact,
.ha-queue-list { ... }
```

Ziel:
- keine gequetschten Buttons auf iPad
- Raum-/Geräteaktionen klar lesbar
- Status nicht nur farblich, sondern textlich sichtbar

- [ ] **Step 7: Checks ausfuehren**

Run:

```bash
node --check control/main.js
node --check control/js/render.js
npm run verify
```

Expected:
- alle Checks `exit 0`
- keine neuen Build-Safety-Fehler

- [ ] **Step 8: Commit**

```bash
git add control/main.js control/js/render.js control/control.css control/js/live-metrics.json
git commit -m "feat: add live home assistant dashboard actions"
```

### Task 3: Website-, Shop-, Content- und Operations-Panels auf echte lokale Aktionen heben

**Files:**
- Modify: `control/main.js`
- Modify: `control/js/render.js`
- Modify: `scripts/control-bridge-server.mjs`
- Modify: `scripts/sync-control-live-metrics.mjs`
- Test: API-Calls via `curl`, `node --check`, `npm run verify`

**Interfaces:**
- Consumes:
  - `POST /api/control/action`
  - `window.__CONTROL_DATA__.websiteMetrics`
  - `window.__CONTROL_DATA__.shopMetrics`
  - `window.__CONTROL_DATA__.contentPerformance`
  - `window.__CONTROL_DATA__.operationsWorkbench`
- Produces:
  - echte lokale Buttons fuer Website/Shop/Content/Ops
  - sichtbare Rueckmeldung im UI

- [ ] **Step 1: UI-only Aktionen katalogisieren**

Pruefe in `control/main.js` folgende Dialogtypen:
- `website-page`
- `shop-draft`
- `planner-entry`
- `cron-job`
- `subagent`
- `vault-node`

Expected: mehrere Aktionen sind noch `copy` oder reine `link`-/`bridge-command`-Pfade.

- [ ] **Step 2: Einheitlichen `control action`-Typ fuer nicht-HA-Pfade einfuehren**

Nutze dieselbe Rendering-/Handling-Logik wie fuer HA:

```js
{ type: "control-action", label: "Entwurf sperren", action: "website.page-note", payload: { pageId: page.id, note: "locked-from-dashboard" } }
```

Füge konkrete Aktionen hinzu fuer:
- Website-Seitenstatus / Notiz / Draft-Lock
- Shop-Draft-Status / Batch-Vorbereitung
- Content-Planer-Freigabe / Statuswechsel
- Subagent-Modus / Cloud-first / Argus-first
- Vault-Writeback / Summary-only

- [ ] **Step 3: Quick Actions vom statischen Linkraster zur gemischten Action-Leiste erweitern**

In `renderQuickActions()` erlaube Action-Objekte mit `command` oder `action`:

```js
{ id: "qa-sync", label: "Live Sync", command: "sync-control-live" }
{ id: "qa-ha", label: "HA Queue", href: "#home-assistant" }
{ id: "qa-queue", label: "Upload Queue bauen", command: "generate-upload-queue" }
```

Und rendere sie entsprechend als Button statt nur als Link.

- [ ] **Step 4: Bridge-Actions in Live-Metriken rueckspiegeln**

In `scripts/sync-control-live-metrics.mjs` erzeuge aus dem Bridge-State kurze Zusammenfassungen fuer:
- letzte ausgefuehrte Actions
- letzte Queue-Aktionen
- Scheduler-/Cron-Live-Zustand

Diese Summaries sollen im Dashboard direkt sichtbar sein.

- [ ] **Step 5: End-to-end Checks fahren**

Run:

```bash
node --check control/main.js
node --check control/js/render.js
node --check scripts/control-bridge-server.mjs
npm run sync:control-live
npm run verify
```

Expected:
- alle Checks `exit 0`
- aktualisierte Live-Metriken vorhanden

- [ ] **Step 6: Commit**

```bash
git add control/main.js control/js/render.js scripts/control-bridge-server.mjs scripts/sync-control-live-metrics.mjs control/js/live-metrics.json
git commit -m "feat: wire dashboard control actions to live bridge flows"
```

### Task 4: Routing-, Vault-, Social- und HA-Ansichten visuell und funktional entwirren

**Files:**
- Modify: `control/js/render.js`
- Modify: `control/control.css`
- Modify: `control/index.html` (nur falls neue Container benoetigt werden)
- Modify: `control/js/live-metrics.json`
- Test: `node --check control/js/render.js`, `npm run verify`, manuelle visuelle QA auf Desktop/iPad-Breiten

**Interfaces:**
- Consumes:
  - `agentsRoom.routing`, `agentsRoom.devices`, `agentsRoom.sourceRegistry`
  - `socialMetrics.links`, `socialMetrics.officialAccounts`
  - `homeAssistantWorkbench`
- Produces:
  - graphisch besser lesbare Agenten-, Geräte- und Vault-Fluesse
  - weniger Ueberlappung
  - bessere iPad-/Tablet-Belegung

- [ ] **Step 1: Graph-Kollisionen an den Datenpositionen identifizieren**

Pruefe in `control/js/render.js`:
- `agentGraphPositions`
- `deviceGraphPositions`
- `vaultGraphPositions`
- `buildForwardPath()`
- `buildFeedbackPath()`

Expected: Knoten und Rueckpfade nutzen noch statische Raster, die bei kleineren Viewports schnell dicht werden.

- [ ] **Step 2: Device- und Vault-Graphen weiter auseinanderziehen**

Passe Positionen an und trenne Rueckmeldelinien staerker:

```js
["Mac mini", { x: 48, y: 48, ... }]
["Home Assistant", { x: 28, y: 84, ... }]
["Obsidian", { x: 82, y: 34, ... }]
```

und erhoehe die Lane-/Lift-Werte:

```js
const lift = 84 + index * 22;
const verticalShift = (index % 2 === 0 ? 1 : -1) * (28 + Math.floor(index / 2) * 18);
```

- [ ] **Step 3: Social-Seite auf Profilkarten mit echten Live-Infos umstellen**

Im Social-Renderer:
- Profilbild oben
- Name/Handle getrennt
- Status als Text + Chip
- Metrikblock kompakt statt verschoben

Nutze vorhandene `profileImage`- oder offizielle Asset-Pfade und fallbacke sauber auf Plattform-Icons.

- [ ] **Step 4: HA-Seite als echte Control-Ansicht verdichten**

Baue den HA-Bereich in 3 Zonen:
- Systemstatus
- Räume / Geräte
- Queue / letzte Actions

Vermeide lange vertikale Listen, wenn derselbe Inhalt als Grid/Deck lesbarer ist.

- [ ] **Step 5: Bedienelemente klarer machen**

In `control/control.css`:
- aktiven Sidebar-Reiter weniger grell
- Statusleisten logisch von gruen → cyan → gelb → orange → rot
- Buttons/disabled-Zustände klar textlich markieren

Beispiel:

```css
.control-nav-link.is-active { ... }
.status-pill.is-warn { ... }
.status-pill.is-error { ... }
.action-btn[disabled]::after { content: "Nicht verfuegbar"; }
```

- [ ] **Step 6: Checks und visuelle QA**

Run:

```bash
node --check control/js/render.js
npm run verify
```

Dann manuell pruefen:
- Desktop-Breite
- iPad-/Tablet-Breite
- Social-Reiter
- AgentsRoom / Vault Graph / Device Graph
- HA-Ansicht

- [ ] **Step 7: Commit**

```bash
git add control/js/render.js control/control.css control/index.html control/js/live-metrics.json
git commit -m "feat: refine control visuals and routing readability"
```

## Self-Review

- **Spec coverage:** Der Plan deckt die drei freigegebenen Bloecke ab: `Home Assistant live`, `Control actions live`, `Visual routing`.
- **Placeholder scan:** Keine `TODO`-/`TBD`-Platzhalter im Taskfluss; alle Aufgaben enthalten konkrete Dateien, Interfaces und Kommandos.
- **Type consistency:** Der Plan verwendet konsistent `action`, `payload`, `command`, `ha-queue`, `control-action` und die bestehenden `window.__CONTROL_DATA__`-Strukturen.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-06-dashboard-live-control.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
