import { formatNumber, formatValue, trendClass, levelClass } from "./formatters.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildTrafficBars(series) {
  if (!Array.isArray(series) || !series.length) {
    return `<p class="muted-line">Keine Live-Daten vorhanden.</p>`;
  }
  const maxVisitors = Math.max(...series.map((item) => item.visitors), 1);
  return series
    .map((item) => {
      const width = Math.max(8, Math.round((item.visitors / maxVisitors) * 100));
      return `
        <div class="metric-bar-row">
          <span class="metric-bar-label">${item.label}</span>
          <div class="metric-bar-track"><span class="metric-bar-fill" style="width:${width}%"></span></div>
          <strong>${formatNumber(item.visitors)}</strong>
        </div>
      `;
    })
    .join("");
}

function buildSparkline(series, key) {
  const values = series.map((item) => Number(item[key] || 0));
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 90 - (((value - min) / range) * 70);
      return `${x},${y}`;
    })
    .join(" ");
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points="${points}" /></svg>`;
}

function buildMiniBars(list, key, labelKey) {
  if (!Array.isArray(list) || !list.length) {
    return `<p class="muted-line">Keine Live-Daten vorhanden.</p>`;
  }
  const max = Math.max(...list.map((item) => Number(item[key] || 0)), 1);
  return list
    .map((item) => {
      const value = Number(item[key] || 0);
      const width = Math.max(8, Math.round((value / max) * 100));
      const suffix = item.unit || "%";
      return `
        <div class="mini-bar-row">
          <span>${item[labelKey]}</span>
          <div class="mini-bar-track"><i style="width:${width}%"></i></div>
          <strong>${value}${suffix}</strong>
        </div>
      `;
    })
    .join("");
}

function toStatusCount(label, value, cls) {
  return `<span class="catalog-chip ${cls}">${label}: <strong>${value}</strong></span>`;
}

function buildTagPills(tags) {
  if (!Array.isArray(tags) || !tags.length) {
    return "";
  }
  return tags.map((tag) => `<span class="agentsroom-tag">${escapeHtml(tag)}</span>`).join("");
}

function statusClass(status) {
  if (status === "error" || status === "offline") return "is-error";
  if (status === "warn" || status === "check") return "is-warn";
  if (status === "live") return "is-live";
  if (status === "connected") return "is-connected";
  if (status === "support") return "is-support";
  if (status === "ready") return "is-ready";
  if (status === "active") return "is-active";
  if (status === "sync") return "is-sync";
  return "is-info";
}

const STATUS_GUIDE = [
  { cls: "is-live", label: "Gruen", meaning: "Live, aktiv oder fehlerfrei" },
  { cls: "is-connected", label: "Cyan", meaning: "Verbunden oder synchronisiert" },
  { cls: "is-ready", label: "Gelb", meaning: "Bereit, wartet auf Arbeit" },
  { cls: "is-warn", label: "Orange", meaning: "Pruefung oder Eingriff empfohlen" },
  { cls: "is-error", label: "Rot", meaning: "Fehler, offline oder blockiert" }
];

function buildStatusGuide(compact = false) {
  return `
    <div class="status-guide${compact ? " is-compact" : ""}" aria-label="Bedeutung der Statusfarben">
      ${STATUS_GUIDE.map((item) => `
        <div class="status-guide-item">
          <span class="status-dot ${item.cls}" aria-hidden="true"></span>
          <strong>${item.label}</strong>
          <span>${item.meaning}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function buildFlowItems(items) {
  if (!Array.isArray(items) || !items.length) {
    return `<p class="muted-line">Keine Routing-Daten vorhanden.</p>`;
  }
  return items
    .map(
      (item) => `
        <li class="agentsroom-flow-item">
          <div>
            <strong>${escapeHtml(item.from)}</strong>
            <span>${escapeHtml(item.channel)}</span>
          </div>
          <div class="agentsroom-flow-arrow">→</div>
          <div>
            <strong>${escapeHtml(item.to)}</strong>
            <span>${escapeHtml(item.purpose)}</span>
          </div>
          <small class="status-pill ${statusClass(item.status)}">${escapeHtml(item.statusLabel || item.status)}</small>
        </li>
      `
    )
    .join("");
}

function getDeviceRouteItems(devices) {
  const names = Array.isArray(devices) ? devices.map((device) => device.name) : [];
  const has = (name) => names.includes(name);
  return [
    has("Mac mini") && has("MacBook") ? { from: "MacBook", to: "Mac mini", channel: "SMB", state: "connected", note: "Arbeitsdaten / Mirror" } : null,
    has("Mac mini") && has("iMac") ? { from: "iMac", to: "Mac mini", channel: "SMB", state: "connected", note: "Operator Sync" } : null,
    has("Mac mini") && has("Home Assistant") ? { from: "Home Assistant", to: "Mac mini", channel: "SMB / Bridge", state: "live", note: "HA Backup" } : null,
    has("MacBook") && has("iMac") ? { from: "MacBook", to: "iMac", channel: "SMB", state: "connected", note: "Shared Work" } : null,
    has("iPhone") && has("Mac mini") ? { from: "iPhone", to: "Mac mini", channel: "Telegram / Hermes", state: "live", note: "Mobile Control" } : null,
    has("GitHub") ? { from: "GitHub", to: "Mac mini", channel: "Repo Sync", state: "connected", note: "Codebasis" } : null,
    has("Obsidian") ? { from: "Obsidian", to: "Mac mini", channel: "Vault Sync", state: "sync", note: "Jarvis Memory" } : null,
    has("StreamDeck") && has("iMac") ? { from: "StreamDeck", to: "iMac", channel: "Actions", state: "ready", note: "Operator Hotkeys" } : null,
    has("Rodecaster") && has("iMac") ? { from: "Rodecaster", to: "iMac", channel: "Audio", state: "ready", note: "Audio Routing" } : null,
    has("TikTok Live Studio") && has("iMac") ? { from: "iMac", to: "TikTok Live Studio", channel: "Live Publishing", state: "ready", note: "TikTok Produktion" } : null,
    has("SoundCloud") && has("Mac mini") ? { from: "Mac mini", to: "SoundCloud", channel: "Audio Publish", state: "live", note: "Music Publishing" } : null
  ].filter(Boolean);
}

function buildDeviceLinks(devices) {
  const items = getDeviceRouteItems(devices);

  if (!items.length) {
    return `<p class="muted-line">Keine Gerätepfade vorhanden.</p>`;
  }

  return items
    .map(
      (item) => `
        <li>
          <strong>${escapeHtml(item.from)} → ${escapeHtml(item.to)}</strong>
          <span>${escapeHtml(item.channel)}</span>
          <p>${escapeHtml(item.note)}</p>
          <em class="status-pill ${statusClass(item.state)}">${escapeHtml(item.state)}</em>
        </li>
      `
    )
    .join("");
}

function toGraphId(value) {
  return String(value || "node")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

const agentGraphPositions = new Map([
  ["Mensch", { x: 7, y: 48, tone: "human", label: "Du / Operator", detail: "oberste Steuerstufe" }],
  ["Hermes", { x: 23, y: 48, tone: "core", label: "Hermes", detail: "Primär-Controller" }],
  ["Jarvis", { x: 40, y: 48, tone: "core", label: "Jarvis", detail: "Orchestrierung" }],
  ["OpenClaw Gateway", { x: 40, y: 80, tone: "bridge", label: "OpenClaw", detail: "Queue / Bridge" }],
  ["Heimdall", { x: 60, y: 10, tone: "service", label: "Heimdall", detail: "Home Assistant" }],
  ["Forge", { x: 60, y: 25, tone: "service", label: "Forge", detail: "Infra / Skills" }],
  ["Sentinel", { x: 60, y: 40, tone: "service", label: "Sentinel", detail: "Health / Security" }],
  ["Oracle", { x: 60, y: 55, tone: "service", label: "Oracle", detail: "Briefings" }],
  ["Muse", { x: 60, y: 70, tone: "service", label: "Muse", detail: "Content / Audio" }],
  ["Friday", { x: 60, y: 85, tone: "service", label: "Friday", detail: "Deep Repair" }],
  ["Argus", { x: 79, y: 38, tone: "support", label: "Argus", detail: "Vorprüfung" }],
  ["Claude", { x: 94, y: 24, tone: "support", label: "Claude", detail: "komplexe Eskalation" }],
  ["Codex", { x: 94, y: 51, tone: "support", label: "Codex", detail: "Code-Eskalation" }]
]);

const deviceGraphPositions = new Map([
  ["Mac mini", { x: 50, y: 48, tone: "core", label: "Mac mini", detail: "Zentralserver / Hermes" }],
  ["MacBook", { x: 12, y: 20, tone: "device", label: "MacBook", detail: "Arbeits- und Mirror-Node" }],
  ["iMac", { x: 12, y: 50, tone: "device", label: "iMac", detail: "Operator-Station" }],
  ["iPhone", { x: 12, y: 80, tone: "device", label: "iPhone", detail: "Telegram Mobile" }],
  ["Home Assistant", { x: 35, y: 86, tone: "bridge", label: "Home Assistant", detail: "Backup / Automation" }],
  ["GitHub", { x: 70, y: 12, tone: "service", label: "GitHub", detail: "Repo Sync" }],
  ["Obsidian", { x: 70, y: 34, tone: "service", label: "Obsidian", detail: "Vault / Memory" }],
  ["StreamDeck", { x: 70, y: 76, tone: "device", label: "StreamDeck", detail: "Actions" }],
  ["Rodecaster", { x: 91, y: 23, tone: "device", label: "Rodecaster", detail: "Audio Routing" }],
  ["TikTok Live Studio", { x: 91, y: 52, tone: "service", label: "TikTok Live", detail: "Live Publishing" }],
  ["SoundCloud", { x: 91, y: 80, tone: "service", label: "SoundCloud", detail: "Music Publishing" }]
]);

function buildAgentGraphEdges(agentsRoom) {
  const routing = Array.isArray(agentsRoom?.routing) ? agentsRoom.routing : [];
  const agentNames = new Set((agentsRoom?.agents || []).map((agent) => agent.name));
  const inferred = [
    agentNames.has("Friday") ? { from: "Jarvis", to: "Friday", channel: "Deep Repair", purpose: "schwere Reparaturen", status: "ready", statusLabel: "Bereit" } : null,
    agentNames.has("Claude") ? { from: "Argus", to: "Claude", channel: "Paid Escalation", purpose: "nur bei hoher Komplexität", status: "support", statusLabel: "Fallback" } : null,
    agentNames.has("Codex") ? { from: "Argus", to: "Codex", channel: "Code Escalation", purpose: "nur bei Code-Umsetzung", status: "support", statusLabel: "Fallback" } : null
  ].filter(Boolean);
  return [...routing, ...inferred];
}

function buildGraphDataset(agentsRoom, mode) {
  const agents = Array.isArray(agentsRoom?.agents) ? agentsRoom.agents : [];
  const devices = Array.isArray(agentsRoom?.devices) ? agentsRoom.devices : [];
  const isDeviceMode = mode === "devices";
  const edges = isDeviceMode ? getDeviceRouteItems(devices) : buildAgentGraphEdges(agentsRoom);
  const positions = isDeviceMode ? deviceGraphPositions : agentGraphPositions;
  const records = new Map((isDeviceMode ? devices : agents).map((item) => [item.name, item]));
  if (!isDeviceMode) {
    records.set("Mensch", { name: "Mensch", role: "Eigentümer und oberste Steuerstufe", route: "Du -> Hermes", channel: "Telegram", status: "live", statusLabel: "Live" });
  }

  const usedNames = new Set();
  edges.forEach((edge) => {
    usedNames.add(edge.from);
    usedNames.add(edge.to);
  });

  const nodes = Array.from(usedNames)
    .map((name) => {
      const position = positions.get(name);
      if (!position) return null;
      const record = records.get(name) || {};
      const connections = edges
        .filter((edge) => edge.from === name || edge.to === name)
        .map((edge) => `${edge.from} → ${edge.to} · ${edge.channel}`);
      return {
        name,
        ...position,
        role: record.role || position.detail,
        route: record.route || connections[0] || "Keine Route",
        channel: record.channel || "Routing",
        status: record.status || "connected",
        statusLabel: record.statusLabel || record.state || "Verbunden",
        connections
      };
    })
    .filter(Boolean);

  return { edges, nodes };
}

function renderGraphView(agentsRoom, mode) {
  const { edges, nodes } = buildGraphDataset(agentsRoom, mode);
  if (!edges.length || !nodes.length) {
    return `<p class="muted-line">Keine Kommunikationsdaten vorhanden.</p>`;
  }

  const positions = mode === "devices" ? deviceGraphPositions : agentGraphPositions;
  const markerId = `agentsroom-arrow-${mode}`;
  const feedbackMarkerId = `agentsroom-feedback-arrow-${mode}`;
  const nodeNames = new Set(nodes.map((node) => node.name));

  const lineNodes = edges
    .filter((edge) => positions.has(edge.from) && positions.has(edge.to) && nodeNames.has(edge.from) && nodeNames.has(edge.to))
    .map((edge) => {
      const source = positions.get(edge.from);
      const target = positions.get(edge.to);
      const tone = statusClass(edge.status || edge.state);
      const x1 = source.x * 12;
      const y1 = source.y * 6.5;
      const x2 = target.x * 12;
      const y2 = target.y * 6.5;
      const ctrlX = (x1 + x2) / 2;
      const ctrlY = y1 === y2 ? y1 - 24 : (y1 + y2) / 2;
      return `
        <g class="agentsroom-network-edge ${tone}" data-edge-from="${toGraphId(edge.from)}" data-edge-to="${toGraphId(edge.to)}">
          <path d="M ${x1} ${y1} C ${ctrlX} ${ctrlY}, ${ctrlX} ${ctrlY}, ${x2} ${y2}" marker-end="url(#${markerId})" />
        </g>
      `;
    })
    .join("");

  const feedbackNodes = mode === "agents"
    ? edges
        .filter((edge) => edge.from !== "Mensch" && positions.has(edge.from) && positions.has(edge.to) && nodeNames.has(edge.from) && nodeNames.has(edge.to))
        .map((edge, index) => {
          const source = positions.get(edge.to);
          const target = positions.get(edge.from);
          const x1 = source.x * 12;
          const y1 = source.y * 6.5;
          const x2 = target.x * 12;
          const y2 = target.y * 6.5;
          const bend = index % 2 === 0 ? 34 : -34;
          const ctrlX = (x1 + x2) / 2;
          const ctrlY = (y1 + y2) / 2 + bend;
          return `
            <g class="agentsroom-network-edge is-feedback" data-edge-from="${toGraphId(edge.to)}" data-edge-to="${toGraphId(edge.from)}">
              <path d="M ${x1} ${y1} Q ${ctrlX} ${ctrlY}, ${x2} ${y2}" marker-end="url(#${feedbackMarkerId})" />
            </g>
          `;
        })
        .join("")
    : "";

  const defaultName = mode === "devices" ? "Mac mini" : "Hermes";
  const nodeCards = nodes
    .map((node) => {
      const nodeId = toGraphId(node.name);
      const isSelected = node.name === defaultName;
      return `
        <button type="button" class="agentsroom-network-node ${node.tone}${isSelected ? " is-selected" : ""}" style="left:${node.x}%; top:${node.y}%" data-network-node="${nodeId}" data-network-name="${escapeHtml(node.label)}" data-network-role="${escapeHtml(node.role)}" data-network-route="${escapeHtml(node.route)}" data-network-channel="${escapeHtml(node.channel)}" data-network-status="${escapeHtml(node.statusLabel)}" data-network-connections="${escapeHtml(node.connections.join(" • "))}" aria-pressed="${isSelected ? "true" : "false"}">
          <span class="agentsroom-network-node-status ${statusClass(node.status)}">${escapeHtml(node.statusLabel)}</span>
          <strong>${escapeHtml(node.label)}</strong>
          <span>${escapeHtml(node.detail)}</span>
        </button>
      `;
    })
    .join("");

  const legend = edges
    .map(
      (edge) => `
        <div class="agentsroom-network-legend-item" data-route-from="${toGraphId(edge.from)}" data-route-to="${toGraphId(edge.to)}">
          <span>${escapeHtml(edge.from)} → ${escapeHtml(edge.to)}</span>
          <strong>${escapeHtml(edge.channel)}${mode === "agents" && edge.from !== "Mensch" ? " · Rueckmeldung ↩" : ""}</strong>
          <small class="status-pill ${statusClass(edge.status || edge.state)}">${escapeHtml(edge.statusLabel || edge.state || edge.status)}</small>
        </div>
      `
    )
    .join("");

  return `
    <div class="agentsroom-network-view" data-network-view="${mode}"${mode === "devices" ? " hidden" : ""}>
      <div class="agentsroom-network-scroll" tabindex="0" aria-label="${mode === "devices" ? "Gerätenetz horizontal erkunden" : "Agentenfluss horizontal erkunden"}">
        <div class="agentsroom-network">
          <svg class="agentsroom-network-svg" viewBox="0 0 1200 650" role="img" aria-label="${mode === "devices" ? "Gerätenetz mit Mac mini als Zentralserver" : "Agenten-Orchestrierung von Operator über Hermes und Jarvis"}">
            <defs>
              <marker id="${markerId}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" />
              </marker>
              <marker id="${feedbackMarkerId}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" />
              </marker>
            </defs>
            ${lineNodes}
            ${feedbackNodes}
          </svg>
          <div class="agentsroom-network-nodes">${nodeCards}</div>
        </div>
      </div>
      <div class="agentsroom-network-legend">${legend}</div>
    </div>
  `;
}

function buildRoutingWorkspace(agentsRoom) {
  const agentData = buildGraphDataset(agentsRoom, "agents");
  const defaultNode = agentData.nodes.find((node) => node.name === "Hermes") || agentData.nodes[0] || {};
  return `
    <div class="agentsroom-network-workspace" data-network-workspace>
      <div class="agentsroom-network-toolbar" role="tablist" aria-label="Routing Ansicht">
        <button type="button" class="agentsroom-mode-btn is-active" role="tab" aria-selected="true" data-network-mode="agents">
          Agentenfluss <span>${agentData.edges.length} Routen</span>
        </button>
        <button type="button" class="agentsroom-mode-btn" role="tab" aria-selected="false" data-network-mode="devices">
          Gerätenetz <span>${getDeviceRouteItems(agentsRoom?.devices || []).length} Verbindungen</span>
        </button>
        <p><span class="agentsroom-live-dot" aria-hidden="true"></span> Live-Snapshot · Auswahl zeigt Details</p>
      </div>
      <div class="agentsroom-routing-key">
        <span><i class="route-sample is-forward"></i> Auftrag / Delegation</span>
        <span><i class="route-sample is-feedback"></i> Ergebnis / Rueckmeldung</span>
      </div>
      <div class="agentsroom-network-stage">
        ${renderGraphView(agentsRoom, "agents")}
        ${renderGraphView(agentsRoom, "devices")}
      </div>
      <aside class="agentsroom-network-inspector" data-network-inspector aria-live="polite">
        <p class="agentsroom-eyebrow">Ausgewählter Knoten</p>
        <h4 data-network-inspector-name>${escapeHtml(defaultNode.label || "Hermes")}</h4>
        <p data-network-inspector-role>${escapeHtml(defaultNode.role || "Primär-Controller")}</p>
        <dl>
          <div><dt>Status</dt><dd data-network-inspector-status>${escapeHtml(defaultNode.statusLabel || "Live")}</dd></div>
          <div><dt>Kanal</dt><dd data-network-inspector-channel>${escapeHtml(defaultNode.channel || "Routing")}</dd></div>
          <div><dt>Route</dt><dd data-network-inspector-route>${escapeHtml(defaultNode.route || "Mensch → Hermes")}</dd></div>
        </dl>
        <h5>Verbindungen</h5>
        <p data-network-inspector-connections>${escapeHtml(defaultNode.connections?.join(" • ") || "Mensch → Hermes · Telegram")}</p>
        <div class="agentsroom-inspector-actions">
          <button type="button" class="action-btn" data-network-copy>Diagnose kopieren</button>
          <button type="button" class="action-btn is-secondary" data-network-reset>Alle Routen zeigen</button>
        </div>
      </aside>
    </div>
  `;
}

function buildNodeCards(items, kind = "agent") {
  if (!Array.isArray(items) || !items.length) {
    return `<p class="muted-line">Keine Daten vorhanden.</p>`;
  }
  return items
    .map(
      (item) => `
        <article class="agentsroom-node ${kind}">
          <div class="agentsroom-node-head">
            <h4>${escapeHtml(item.name)}</h4>
            <span class="status-pill ${statusClass(item.status)}">${escapeHtml(item.statusLabel || item.status)}</span>
          </div>
          <p>${escapeHtml(item.role)}</p>
          <div class="agentsroom-node-meta">
            <strong>${escapeHtml(item.route)}</strong>
            <span>${escapeHtml(item.channel)}</span>
          </div>
          <div class="agentsroom-tags">${buildTagPills(item.tags)}</div>
        </article>
      `
    )
    .join("");
}

function buildLiveData(items) {
  if (!Array.isArray(items) || !items.length) {
    return `<p class="muted-line">Keine Live-Daten vorhanden.</p>`;
  }
  return items
    .map(
      (item) => `
        <article class="agentsroom-rail-card">
          <span class="agentsroom-rail-label">${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.value)}</strong>
          <small class="status-pill ${statusClass(item.status)}">${escapeHtml(item.statusLabel || item.status)}</small>
        </article>
      `
    )
    .join("");
}

function buildSourceCards(items) {
  if (!Array.isArray(items) || !items.length) {
    return `<p class="muted-line">Keine Quellen gefunden.</p>`;
  }
  return items
    .map(
      (item) => `
        <article class="agentsroom-source-card">
          <div class="agentsroom-node-head">
            <h4>${escapeHtml(item.name)}</h4>
            <span class="status-pill ${statusClass(item.state)}">${escapeHtml(item.kind || item.state)}</span>
          </div>
          <p>${escapeHtml(item.detail)}</p>
          <div class="agentsroom-node-meta">
            <strong>${escapeHtml(item.channel)}</strong>
            <span>${escapeHtml(item.route)}</span>
          </div>
        </article>
      `
    )
    .join("");
}

function buildSessionCards(items) {
  if (!Array.isArray(items) || !items.length) {
    return `<p class="muted-line">Keine Session-Daten gefunden.</p>`;
  }
  return items
    .map(
      (item) => `
        <article class="agentsroom-session-card">
          <div class="agentsroom-node-head">
            <h4>${escapeHtml(item.name)}</h4>
            <span class="status-pill ${statusClass(item.status)}">${escapeHtml(item.statusLabel || item.status)}</span>
          </div>
          <p>${escapeHtml(item.role)}</p>
          <div class="agentsroom-node-meta">
            <strong>${escapeHtml(item.channel)}</strong>
            <span>${escapeHtml(item.route)}</span>
          </div>
          <div class="agentsroom-tags">${buildTagPills(item.tags)}</div>
        </article>
      `
    )
    .join("");
}

function buildMessageCards(items) {
  if (!Array.isArray(items) || !items.length) {
    return `<p class="muted-line">Keine Nachrichten gefunden.</p>`;
  }
  return items
    .map(
      (item) => `
        <article class="agentsroom-message-card">
          <div class="agentsroom-conversation-head">
            <strong>${escapeHtml(item.topic)}</strong>
            <span>${escapeHtml(item.time)}</span>
          </div>
          <p>${escapeHtml(item.summary)}</p>
          <div class="agentsroom-conversation-meta">
            <span>${escapeHtml(item.from)} → ${escapeHtml(item.to)}</span>
            <span class="status-pill ${statusClass(item.status)}">${escapeHtml(item.statusLabel || item.status)}</span>
          </div>
        </article>
      `
    )
    .join("");
}

function buildDelegationCards(items) {
  if (!Array.isArray(items) || !items.length) {
    return `<p class="muted-line">Keine Delegationen vorhanden.</p>`;
  }
  return items
    .map(
      (item) => `
        <article class="agentsroom-task-card">
          <div class="agentsroom-task-head">
            <strong>${item.from} → ${item.to}</strong>
            <span class="status-pill ${statusClass(item.status)}">${item.statusLabel || item.status}</span>
          </div>
          <p>${item.task}</p>
          <div class="agentsroom-task-meta">
            <span>${item.channel}</span>
            <strong>${item.priority}</strong>
          </div>
        </article>
      `
    )
    .join("");
}

function buildConversationFeed(items) {
  if (!Array.isArray(items) || !items.length) {
    return `<p class="muted-line">Keine Gesprächseinträge vorhanden.</p>`;
  }
  return items
    .map(
      (item) => `
        <article class="agentsroom-conversation-card">
          <div class="agentsroom-conversation-head">
            <strong>${item.topic}</strong>
            <span>${item.time}</span>
          </div>
          <p>${item.summary}</p>
          <div class="agentsroom-conversation-meta">
            <span>${item.from} → ${item.to}</span>
            <span class="status-pill ${statusClass(item.status)}">${item.statusLabel || item.status}</span>
          </div>
        </article>
      `
    )
    .join("");
}

const HERMES_CHAT_STORAGE_PREFIX = "dg-control-hermes-chat-v1";

function getHermesChatKey(session) {
  const sessionKey = session?.session_key || session?.id || "default";
  return `${HERMES_CHAT_STORAGE_PREFIX}:${sessionKey}`;
}

function readHermesChatDrafts(session) {
  try {
    const raw = window.localStorage.getItem(getHermesChatKey(session));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function renderHermesChatMessages(messages) {
  if (!Array.isArray(messages) || !messages.length) {
    return `<p class="muted-line">Noch keine Chatdaten geladen.</p>`;
  }

  return messages
    .map((item) => {
      const side = item.from === "user" ? "is-user" : item.from === "assistant" ? "is-assistant" : "is-system";
      const label = item.from === "user" ? "Du" : item.from === "assistant" ? "Hermes" : "System";
      return `
        <article class="hermes-chat-message ${side}">
          <div class="hermes-chat-message-head">
            <strong>${label}</strong>
            <span>${escapeHtml(item.time || "")}</span>
          </div>
          <p>${escapeHtml(item.summary || item.text || "")}</p>
          ${item.statusLabel ? `<small>${escapeHtml(item.statusLabel)}</small>` : ""}
        </article>
      `;
    })
    .join("");
}

export function renderHermesChat(container, dashboardData) {
  if (!container) {
    return;
  }

  const runtime = dashboardData?.agentsRoom?.runtime || {};
  const session = runtime.activeTelegramSession || null;
  const liveMessages = Array.isArray(dashboardData?.agentsRoom?.recentMessages) ? dashboardData.agentsRoom.recentMessages : [];
  const conversation = liveMessages.slice(0, 6);
  const drafts = readHermesChatDrafts(session);
  const spoolPath = runtime.latestSpoolPath || "n/a";
  const spoolPreview = runtime.latestSpoolPreview || "Noch kein aktiver Spool.";
  const merged = [
    ...conversation.map((item) => ({ ...item, from: item.from === "user" ? "user" : item.from === "assistant" ? "assistant" : "system" })),
    ...drafts.map((item) => ({
      from: "user",
      time: item.time,
      summary: item.text,
      statusLabel: item.sent ? "Gesendet" : "Wartet auf Sync"
    }))
  ].slice(-10);

  container.innerHTML = `
    <article class="panel hermes-chat-panel">
      <div class="section-banner">
        <div>
          <p class="eyebrow">Hermes Chat</p>
          <h3>Direkter Thread mit Hermes</h3>
        </div>
        <div class="section-banner-chips">
          <span class="status-pill ${runtime.gatewayState?.platforms?.telegram?.state === "connected" ? "is-live" : "is-warn"}">Telegram: <strong>${escapeHtml(runtime.gatewayState?.platforms?.telegram?.state || "unbekannt")}</strong></span>
          <span class="status-pill is-info">Session: <strong>${escapeHtml(session?.title || "n/a")}</strong></span>
        </div>
      </div>
      <div class="hermes-chat-spool">
        <span class="status-pill is-info">Spool: <strong>${escapeHtml(spoolPath)}</strong></span>
        <p>${escapeHtml(spoolPreview)}</p>
      </div>
      <div class="hermes-chat-status-row">
        <span class="status-pill is-info" data-hermes-chat-status><strong>Bereit</strong></span>
        <span class="muted-line">Der Button legt die Nachricht als Spool-Datei an und startet den Download als Beleg.</span>
      </div>
      <div class="hermes-chat-thread">${renderHermesChatMessages(merged)}</div>
      <div class="hermes-chat-composer">
        <label for="hermes-chat-input">Nachricht an Hermes</label>
        <textarea id="hermes-chat-input" data-hermes-chat-input rows="4" placeholder="Kurz und direkt schreiben. Wird lokal im Thread gesichert und kann mit dem Hermes-Thread synchron bleiben, sobald der Telegram-Bridge-Flow greift."></textarea>
        <div class="hermes-chat-actions">
          <button type="button" class="action-btn" data-hermes-chat-send>Spool-Datei erzeugen</button>
          <button type="button" class="action-btn" data-hermes-chat-copy>Text kopieren</button>
        </div>
        <p class="muted-line">Live-Thread kommt aus Hermes. Eigene Nachrichten landen lokal in der Queue, werden als Spool-Datei vorbereitet und bleiben beim nächsten Sync sichtbar.</p>
      </div>
    </article>
  `;
}

export function renderNav(container, nav) {
  container.innerHTML = nav
    .map((item) => `<a href="#${item.id}" class="control-nav-link"><span>${item.label}</span>${item.hint ? `<small>${item.hint}</small>` : ""}</a>`)
    .join("");
}

export function renderRanges(container, ranges) {
  const activeIndex = ranges.length > 1 ? 1 : 0;
  container.innerHTML = ranges
    .map((range, index) => `<button class="range-btn${index === activeIndex ? " is-active" : ""}" data-range="${range.id}" aria-pressed="${index === activeIndex ? "true" : "false"}">${range.label}</button>`)
    .join("");
}

export function renderModeBadge(node, metadata) {
  const range = metadata.activeRange ? ` • ${metadata.activeRange}` : "";
  const lastSync = metadata.generatedAtLabel ? ` • ${metadata.generatedAtLabel}` : "";
  node.textContent = `Datenquelle: ${String(metadata.mode || "live").toUpperCase()} • ${metadata.timezone}${range}${lastSync}`;
}

export function renderVisualPulse(container, dashboardData) {
  if (!container) {
    return;
  }

  const trafficSeries = dashboardData.websiteMetrics.trafficSeries || [];
  const visitorsSparkline = buildSparkline(trafficSeries, "visitors");
  const pageviewsSparkline = buildSparkline(trafficSeries, "pageviews");
  const agentsRoom = dashboardData.agentsRoom || {};
  const agents = Array.isArray(agentsRoom.agents) ? agentsRoom.agents : [];
  const connectedAgents = agents.filter((agent) => ["live", "connected", "active", "sync"].includes(agent.status)).length;
  const agentScore = Math.round((connectedAgents / Math.max(agents.length, 1)) * 100);
  const scoreOffset = Math.round(251.2 * (1 - agentScore / 100));
  const gatewayState = agentsRoom.runtime?.gatewayState?.gateway_state || "unbekannt";
  const telegramState = agentsRoom.runtime?.gatewayState?.platforms?.telegram?.state || "unbekannt";
  const systemReady = gatewayState === "running" && telegramState === "connected";

  const catalog = dashboardData.shopMetrics.catalog;
  const live = catalog.liveItems;
  const upload = catalog.uploadWave;
  const concept = Math.max(catalog.totalItems - live - upload, 0);
  const liveDeg = Math.round((live / Math.max(catalog.totalItems, 1)) * 360);
  const uploadDeg = Math.round((upload / Math.max(catalog.totalItems, 1)) * 360);

  const socialTop = dashboardData.socialMetrics.links.slice(0, 4);
  const socialMax = Math.max(...socialTop.map((item) => Number(item.metricValue ?? item.clicks ?? 0)), 1);
  const socialBars = socialTop
    .map((item) => {
      const metricValue = Number(item.metricValue ?? item.clicks ?? 0);
      const h = metricValue > 0 ? Math.max(14, Math.round((metricValue / socialMax) * 72)) : 10;
      const dimClass = metricValue > 0 ? "" : " is-dim";
      return `<div class="social-bar${dimClass}"><i style="height:${h}%"></i><span>${item.platform}</span></div>`;
    })
    .join("");

  container.innerHTML = `
    <article class="pulse-command">
      <div class="pulse-command-copy">
        <p class="pulse-eyebrow">Zentralserver / Live Control</p>
        <h2>${systemReady ? "Hermes-Kern verbunden" : "Hermes-Kern prüfen"}</h2>
        <p>Der Mac mini führt das System. Telegram liefert den Operator-Eingang, Hermes steuert und Jarvis verteilt an Agenten, Vault und Geräte.</p>
        <div class="pulse-command-status">
          <span class="status-pill ${gatewayState === "running" ? "is-live" : "is-warn"}">Gateway: <strong>${escapeHtml(gatewayState)}</strong></span>
          <span class="status-pill ${telegramState === "connected" ? "is-connected" : "is-warn"}">Telegram: <strong>${escapeHtml(telegramState)}</strong></span>
          <span class="status-pill is-info">Stand: <strong>${escapeHtml(dashboardData.metadata?.generatedAtLabel || "n/a")}</strong></span>
        </div>
      </div>
      <div class="pulse-command-score ${agentScore >= 80 ? "is-healthy" : agentScore >= 60 ? "is-warning" : "is-critical"}" aria-label="${agentScore} Prozent der Agenten aktiv oder verbunden">
        <svg viewBox="0 0 100 100" role="img" aria-hidden="true">
          <circle class="score-track" cx="50" cy="50" r="40"></circle>
          <circle class="score-value" cx="50" cy="50" r="40" style="stroke-dashoffset:${scoreOffset}"></circle>
        </svg>
        <strong>${agentScore}%</strong>
        <span>Agenten online</span>
      </div>
      <div class="pulse-command-actions">
        <div><span>Agenten</span><strong>${formatNumber(agents.length)}</strong></div>
        <div><span>Routen</span><strong>${formatNumber(agentsRoom.metrics?.routeCount || 0)}</strong></div>
        <div><span>Geräte</span><strong>${formatNumber(agentsRoom.metrics?.deviceCount || 0)}</strong></div>
        <a class="action-btn" href="#agentsroom">Routing öffnen</a>
      </div>
    </article>
    <article class="pulse-card">
      <p class="pulse-eyebrow">Website</p>
      <h3>Live Signal</h3>
      <div class="sparkline-wrap signal-wave">${visitorsSparkline}${pageviewsSparkline}</div>
      <p class="pulse-copy">Seiten ok: <strong>${formatNumber(dashboardData.overviewKpis.find((kpi) => kpi.id === "pagesOk")?.value)}</strong> · Quelle: HTTP Snapshot</p>
    </article>
    <article class="pulse-card">
      <p class="pulse-eyebrow">Shop</p>
      <h3>Katalogstatus</h3>
      <div class="donut-wrap">
        <div class="catalog-donut" style="--live:${liveDeg}deg; --upload:${uploadDeg}deg;">
          <span>${catalog.totalItems}</span>
        </div>
        <div class="catalog-legend">
          ${toStatusCount("Live", live, "is-live")}
          ${toStatusCount("Upload", upload, "is-upload")}
          ${toStatusCount("Konzept", concept, "is-concept")}
        </div>
      </div>
    </article>
    <article class="pulse-card">
      <p class="pulse-eyebrow">Social</p>
      <h3>Plattformstatus</h3>
      <div class="social-mini">${socialBars}</div>
      <p class="pulse-copy">Stärkster Kanal: <strong>${dashboardData.socialMetrics.strongestPlatform || socialTop[0]?.platform || "nicht erfasst"}</strong></p>
    </article>
  `;
}

export function renderAgentsRoomSection(container, agentsRoom) {
  if (!container) {
    return;
  }

  const runtime = agentsRoom?.runtime || {};
  const routing = Array.isArray(agentsRoom?.routing) ? agentsRoom.routing : [];
  const agents = Array.isArray(agentsRoom?.agents) ? agentsRoom.agents : [];
  const devices = Array.isArray(agentsRoom?.devices) ? agentsRoom.devices : [];
  const delegations = Array.isArray(agentsRoom?.delegations) ? agentsRoom.delegations : [];
  const conversations = Array.isArray(agentsRoom?.conversations) ? agentsRoom.conversations : [];
  const liveData = Array.isArray(agentsRoom?.liveData) ? agentsRoom.liveData : [];
  const sourceRegistry = Array.isArray(agentsRoom?.sourceRegistry) ? agentsRoom.sourceRegistry : [];
  const sessions = Array.isArray(agentsRoom?.sessions) ? agentsRoom.sessions : [];
  const recentMessages = Array.isArray(agentsRoom?.recentMessages) ? agentsRoom.recentMessages : [];
  const recentDelegations = Array.isArray(agentsRoom?.recentDelegations) ? agentsRoom.recentDelegations : [];
  const recentObligations = Array.isArray(agentsRoom?.recentObligations) ? agentsRoom.recentObligations : [];
  const metrics = agentsRoom?.metrics || {};
  const runtimeLiveData = [
    { label: "Gateway", value: runtime.gatewayState?.gateway_state || "unbekannt", status: runtime.gatewayState?.gateway_state === "running" ? "live" : "warn", statusLabel: runtime.gatewayState?.gateway_state === "running" ? "Aktiv" : "Pruefen" },
    { label: "Telegram", value: runtime.gatewayState?.platforms?.telegram?.state || "unbekannt", status: runtime.gatewayState?.platforms?.telegram?.state === "connected" ? "connected" : "warn", statusLabel: runtime.gatewayState?.platforms?.telegram?.state === "connected" ? "Verbunden" : "Pruefen" },
    { label: "Lifecycle", value: runtime.gatewayLifecycle?.phase || "unbekannt", status: runtime.gatewayLifecycle?.phase === "running" ? "live" : "sync", statusLabel: runtime.gatewayLifecycle?.phase === "running" ? "Laufend" : "Sync" },
    { label: "Aktuelle Route", value: runtime.currentRouting?.displayName ? `${runtime.currentRouting.displayName} • ${String(runtime.currentRouting.sessionId || runtime.currentRouting.sessionKey || "").slice(-8)}` : "keine Route", status: runtime.currentRouting ? "connected" : "info", statusLabel: runtime.currentRouting ? "Route" : "Keine" },
    { label: "Aktive Sessions", value: String(runtime.counts?.sessions ?? 0), status: (runtime.counts?.sessions || 0) > 0 ? "live" : "info", statusLabel: "SQLite" },
    { label: "Nachrichten", value: String(runtime.counts?.messages ?? 0), status: (runtime.counts?.messages || 0) > 0 ? "live" : "info", statusLabel: "SQLite" },
    { label: "Delegationen", value: String(runtime.counts?.delegations ?? 0), status: (runtime.counts?.delegations || 0) > 0 ? "support" : "info", statusLabel: "SQLite" }
  ];

  container.innerHTML = `
    <article class="agentsroom-hero">
      <div>
        <p class="agentsroom-eyebrow">AgentsRoom / Hermes Mesh</p>
        <h3>Du steuerst Hermes. Hermes orchestriert das gesamte System.</h3>
        <p class="muted-line">Der Agentenfluss und das Gerätenetz sind getrennt lesbar. Jede Richtung, jeder Kanal und jede Eskalation bleibt sichtbar, während der Mac mini als Zentralserver den technischen Mittelpunkt bildet.</p>
      </div>
      <div class="agentsroom-hero-stats">
        <div><span>Agenten</span><strong>${formatValue(metrics.agentCount || agents.length)}</strong></div>
        <div><span>Routen</span><strong>${formatValue(metrics.routeCount || routing.length)}</strong></div>
        <div><span>Geräte</span><strong>${formatValue(metrics.deviceCount || devices.length)}</strong></div>
        <div><span>Live</span><strong>${formatValue(metrics.liveCount || liveData.length)}</strong></div>
        <div><span>Delegationen</span><strong>${formatValue(metrics.delegationCount || delegations.length)}</strong></div>
        <div><span>Gespräche</span><strong>${formatValue(metrics.conversationCount || conversations.length)}</strong></div>
        <div><span>Quellen</span><strong>${formatValue(metrics.sourceCount || sourceRegistry.length)}</strong></div>
      </div>
      ${buildStatusGuide(true)}
    </article>

    <article class="panel agentsroom-panel agentsroom-panel-wide">
      <div class="agentsroom-panel-head">
        <div>
          <h3>Live Routing Map</h3>
          <p class="muted-line">Agenten-Orchestrierung und Gerätenetz können einzeln untersucht werden. Klicke einen Knoten für Rolle, Status und direkte Verbindungen.</p>
        </div>
        <span class="status-pill is-live">30 s Snapshot</span>
      </div>
      ${buildRoutingWorkspace(agentsRoom)}
    </article>

    <div class="agentsroom-grid">
      <article class="panel agentsroom-panel agentsroom-panel-wide">
        <h3>Live Hermes Runtime</h3>
        <div class="agentsroom-runtime-grid">${buildLiveData(runtimeLiveData)}</div>
      </article>

      <article class="panel agentsroom-panel agentsroom-panel-wide">
        <h3>Routing</h3>
        <ul class="agentsroom-flow-list">${buildFlowItems(routing)}</ul>
      </article>

      <article class="panel agentsroom-panel agentsroom-panel-wide">
        <h3>Agenten</h3>
        <div class="agentsroom-node-grid">${buildNodeCards(agents, "agent")}</div>
      </article>

      <article class="panel agentsroom-panel agentsroom-panel-wide">
        <h3>Geräte & Live-Daten</h3>
        <div class="agentsroom-device-grid">${buildNodeCards(devices, "device")}</div>
        <h4>Direkte Gerätepfade</h4>
        <ul class="agentsroom-device-link-list">${buildDeviceLinks(devices)}</ul>
        <div class="agentsroom-rail">${buildLiveData(liveData)}</div>
      </article>

      <article class="panel agentsroom-panel agentsroom-panel-wide">
        <h3>Quellen & Vault</h3>
        <div class="agentsroom-source-grid">${buildSourceCards(sourceRegistry)}</div>
      </article>

      <article class="panel agentsroom-panel agentsroom-panel-wide">
        <h3>Sessions</h3>
        <div class="agentsroom-session-grid">${buildSessionCards(sessions)}</div>
      </article>

      <article class="panel agentsroom-panel agentsroom-panel-wide">
        <h3>Delegationen, Aufgaben und Gesprächslog</h3>
        <div class="agentsroom-delegation-wrap">
          <div>
            <h4>Delegationen</h4>
            <div class="agentsroom-task-grid">${buildDelegationCards(delegations)}</div>
          </div>
          <div>
            <h4>Live-Gesprächslog</h4>
            <div class="agentsroom-conversation-grid">${buildConversationFeed(conversations)}</div>
          </div>
        </div>
      </article>

      <article class="panel agentsroom-panel agentsroom-panel-wide">
        <h3>Hermes Live Nachrichten</h3>
        <div class="agentsroom-message-grid">${buildMessageCards(recentMessages)}</div>
        <div class="agentsroom-delegation-wrap">
          <div>
            <h4>Aktuelle Delegationen</h4>
            <div class="agentsroom-task-grid">${buildDelegationCards(recentDelegations)}</div>
          </div>
          <div>
            <h4>Delivery Obligations</h4>
            <div class="agentsroom-conversation-grid">${buildConversationFeed(recentObligations.map((item) => ({
              topic: item.label,
              time: "",
              from: "Hermes",
              to: item.label,
              summary: item.value,
              status: item.status,
              statusLabel: item.statusLabel
            })))}</div>
          </div>
        </div>
      </article>
    </div>
  `;
}

export function renderHomeAssistantSection(container, dashboardData) {
  if (!container) return;
  const agentsRoom = dashboardData?.agentsRoom || {};
  const haDevice = (agentsRoom.devices || []).find((item) => item.name === "Home Assistant") || {};
  const macMini = (agentsRoom.devices || []).find((item) => item.name === "Mac mini") || {};
  const heimdall = (agentsRoom.agents || []).find((item) => item.name === "Heimdall") || {};
  const haRoutes = (agentsRoom.routing || []).filter((item) => /Home Assistant|Heimdall/i.test(`${item.from} ${item.to} ${item.channel}`));
  const haTasks = (agentsRoom.delegations || []).filter((item) => /Home Assistant|Heimdall|HA-/i.test(`${item.from} ${item.to} ${item.channel} ${item.task}`));
  const backupRoute = getDeviceRouteItems(agentsRoom.devices || []).find((item) => item.from === "Home Assistant" && item.to === "Mac mini");
  const generatedAt = dashboardData?.metadata?.generatedAtLabel || "kein Zeitstempel";

  container.innerHTML = `
    <div class="ha-dashboard">
      <article class="panel ha-command-card ha-wide">
        <div>
          <p class="eyebrow">HA / Zentralserver</p>
          <h3>Home Assistant → Mac mini</h3>
          <p>Der Mac mini bleibt das Backup-Ziel. Heimdall uebernimmt die HA-Pruefung, Jarvis delegiert und Hermes bleibt die zentrale Steuerstufe.</p>
        </div>
        <div class="ha-command-status">
          <span class="status-pill ${statusClass(haDevice.status)}">HA: <strong>${escapeHtml(haDevice.statusLabel || "nicht gemeldet")}</strong></span>
          <span class="status-pill ${backupRoute ? "is-live" : "is-warn"}">Backup-Pfad: <strong>${backupRoute ? "vorhanden" : "fehlt"}</strong></span>
          <span class="status-pill ${statusClass(macMini.status)}">Mac mini: <strong>${escapeHtml(macMini.statusLabel || "nicht gemeldet")}</strong></span>
        </div>
        <div class="ha-actions">
          <a class="action-btn" href="#agentsroom">Im Routing anzeigen</a>
          <button type="button" class="action-btn is-secondary" data-ha-copy>HA-Diagnose kopieren</button>
          <a class="action-btn is-secondary" href="#alerts">Warnungen pruefen</a>
        </div>
      </article>

      <article class="panel">
        <h3>Zustaendigkeit & Datenfluss</h3>
        <ol class="ha-flow">
          <li><strong>Hermes</strong><span>zentrale Steuerung und Operator-Eingang</span></li>
          <li><strong>Jarvis</strong><span>delegiert HA-Aufgaben und Backup-Pruefung</span></li>
          <li><strong>${escapeHtml(heimdall.name || "Heimdall")}</strong><span>${escapeHtml(heimdall.role || "HA-Agent nicht gemeldet")}</span></li>
          <li><strong>Home Assistant</strong><span>${escapeHtml(haDevice.route || "Route nicht gemeldet")}</span></li>
          <li><strong>Mac mini</strong><span>zentrales Backup-Ziel ueber SMB / Bridge</span></li>
        </ol>
      </article>

      <article class="panel">
        <h3>Live Snapshot</h3>
        <div class="ha-kpi-grid">
          <div><span>HA-Routen</span><strong>${haRoutes.length}</strong><small>aus AgentsRoom</small></div>
          <div><span>HA-Aufgaben</span><strong>${haTasks.length}</strong><small>aktuelle Delegationen</small></div>
          <div><span>Backup-Ziel</span><strong>${backupRoute ? "Mac mini" : "offen"}</strong><small>${escapeHtml(backupRoute?.channel || "kein Pfad")}</small></div>
          <div><span>Datenstand</span><strong>${escapeHtml(generatedAt)}</strong><small>30-s-Dashboard-Snapshot</small></div>
        </div>
      </article>

      <article class="panel ha-wide">
        <div class="agentsroom-panel-head">
          <div><h3>HA-Routen und Aufgaben</h3><p class="muted-line">Nur vorhandene Eintraege aus dem aktuellen Dashboard-Snapshot.</p></div>
          <span class="status-pill ${backupRoute ? "is-live" : "is-warn"}">${backupRoute ? "Backup-Route vorhanden" : "Backup-Route pruefen"}</span>
        </div>
        <div class="ha-route-grid">
          ${haRoutes.map((route) => `<article><span class="status-pill ${statusClass(route.status)}">${escapeHtml(route.statusLabel || route.status)}</span><strong>${escapeHtml(route.from)} → ${escapeHtml(route.to)}</strong><p>${escapeHtml(route.channel)} · ${escapeHtml(route.purpose || "")}</p></article>`).join("") || `<p class="muted-line">Keine HA-Agentenroute gemeldet.</p>`}
          ${haTasks.map((task) => `<article><span class="status-pill ${statusClass(task.status)}">${escapeHtml(task.statusLabel || task.status)}</span><strong>${escapeHtml(task.from)} → ${escapeHtml(task.to)}</strong><p>${escapeHtml(task.task)}</p></article>`).join("") || `<p class="muted-line">Keine HA-Aufgabe gemeldet.</p>`}
        </div>
      </article>

      <article class="panel ha-wide">
        <h3>Statusfarben verstehen</h3>
        <p class="muted-line">Farbe zeigt Handlungsbedarf, der Text nennt den technischen Zustand. Cyan ist Information, nicht Fehler.</p>
        ${buildStatusGuide()}
      </article>
    </div>
  `;
}

export function renderSystemStatus(container, systemStatus) {
  container.innerHTML = Object.values(systemStatus)
    .map((item) => `<li><span>${item.label}</span><strong class="status-pill ${levelClass(item.level)}">${item.value}</strong></li>`)
    .join("");
}

export function renderKpis(container, kpis) {
  container.innerHTML = kpis
    .map((kpi) => {
      const value = formatValue(kpi.value, kpi.unit);
      const isNumeric = typeof kpi.value === "number" && Number.isFinite(kpi.value);
      return `
        <article class="kpi-card">
          <span class="kpi-label">${kpi.label}</span>
          <strong class="kpi-value" data-kpi-value="${isNumeric ? Number(kpi.value) : 0}" data-kpi-unit="${kpi.unit || ""}" data-kpi-animate="${isNumeric ? "true" : "false"}">${value}</strong>
          <span class="kpi-delta ${trendClass(kpi.trend)}">${kpi.delta}</span>
        </article>
      `;
    })
    .join("");
}

export function renderWebsiteSection(container, metrics) {
  const statusChips = [
    { label: "Erreichbar", value: metrics.audiences?.find((item) => item.label === "Erreichbar")?.value ?? 0, tone: "is-ok" },
    { label: "Fehler", value: metrics.audiences?.find((item) => item.label === "Fehler")?.value ?? 0, tone: "is-warn" },
    { label: "Antwortzeit", value: metrics.engagement?.avgSession || "0 ms", tone: "is-info" },
    { label: "Live Quellen", value: metrics.sources?.length ?? 0, tone: "is-connected" }
  ];

  container.innerHTML = `
    <article class="panel">
      <div class="section-banner">
        <div>
          <p class="eyebrow">Website Monitoring</p>
          <h3>Antwortzeit und Erreichbarkeit</h3>
        </div>
        <div class="section-banner-chips">
          ${statusChips.map((item) => `<span class="status-pill ${item.tone}">${item.label}: <strong>${escapeHtml(String(item.value))}</strong></span>`).join("")}
        </div>
      </div>
      <div class="metric-bars">${buildTrafficBars(metrics.trafficSeries)}</div>
      <div class="mini-split-grid">
        <div>
          <h4>Website-Status</h4>
          <div class="mini-bar-group">${buildMiniBars(metrics.audiences, "value", "label")}</div>
        </div>
        <div>
          <h4>HTTP Klassen</h4>
          <div class="mini-bar-group">${buildMiniBars(metrics.devices, "value", "label")}</div>
        </div>
      </div>
    </article>
    <article class="panel">
      <h3>Seiten nach Dateigroesse</h3>
      <table class="data-table">
        <thead><tr><th>Seite</th><th>KB</th><th>Status</th></tr></thead>
        <tbody>
          ${metrics.topPages
            .map((row) => `<tr><td>${row.page}</td><td>${formatNumber(row.views)}</td><td>${row.ctr}</td></tr>`)
            .join("")}
        </tbody>
      </table>
      <h4>Linkabdeckung im Inhalt</h4>
      <div class="mini-bar-group">${buildMiniBars(metrics.sources, "value", "label")}</div>
      <div class="mini-grid">
        <div><span>Ø Antwortzeit</span><strong>${metrics.engagement.avgSession}</strong></div>
        <div><span>Absprungrate</span><strong>${metrics.engagement.bounceRate}</strong></div>
        <div><span>Button-CTR</span><strong>${metrics.engagement.buttonCtr}</strong></div>
      </div>
    </article>
  `;
}

export function renderShopSection(container, shopMetrics) {
  const sectionSummary = shopMetrics.catalog.sections
    .map((row) => `<span>${row.label}: <strong>${row.items}</strong></span>`)
    .join("");
  const visibleProducts = Number(shopMetrics.catalog.storeVisibleProducts || 0);
  const visibleProductNames = Array.isArray(shopMetrics.catalog.storeVisibleProductNames) ? shopMetrics.catalog.storeVisibleProductNames : [];

  container.innerHTML = `
    <article class="panel">
      <h3>Shop Monitoring (nur Echt-Daten)</h3>
      <div class="mini-grid three">
        <div><span>Gepruefte Produktlinks</span><strong>${formatValue(shopMetrics.linkHealth.checkedLinks)}</strong></div>
        <div><span>Erreichbare Produktlinks</span><strong>${formatValue(shopMetrics.linkHealth.okLinks)}</strong></div>
        <div><span>Fehlerhafte Produktlinks</span><strong>${formatValue(shopMetrics.linkHealth.failLinks)}</strong></div>
      </div>
      <div class="mini-grid three">
        <div><span>Erreichbarkeitsquote</span><strong>${shopMetrics.linkHealth.reachabilityRate}</strong></div>
        <div><span>Katalogeintraege</span><strong>${formatValue(shopMetrics.catalog.totalItems)}</strong></div>
        <div><span>Live im Store</span><strong>${formatValue(shopMetrics.catalog.liveItems)}</strong></div>
      </div>
      <div class="mini-grid three">
        <div><span>Sichtbar im Shirtee Store</span><strong>${formatValue(visibleProducts)}</strong></div>
        <div><span>Uploadbereit</span><strong>${formatValue(shopMetrics.catalog.uploadWave)}</strong></div>
        <div><span>Konzept / Entwurf</span><strong>${formatValue(shopMetrics.catalog.conceptItems)}</strong></div>
      </div>
      <p class="muted-line">Letzter Check: <strong>${shopMetrics.linkHealth.checkedAtLabel}</strong></p>
      <p class="muted-line">${sectionSummary}</p>
      ${visibleProductNames.length ? `<p class="muted-line">Store live: ${visibleProductNames.join(" • ")}</p>` : ""}
      <h4>Linienmix im Katalog</h4>
      <div class="mini-bar-group">${buildMiniBars(shopMetrics.catalog.sections.map((item) => ({ label: item.label, value: item.items })), "value", "label")}</div>
    </article>
    <article class="panel">
      <h3>Gepruefte Produktlinks</h3>
      <table class="data-table">
        <thead><tr><th>Produkt</th><th>HTTP</th><th>Status</th><th>Link</th></tr></thead>
        <tbody>
          ${shopMetrics.topProducts
            .map((row) => `<tr><td>${row.name}</td><td>${formatValue(row.httpCode)}</td><td>${row.statusLabel || "-"}</td><td><a href="${row.href}" target="_blank" rel="noopener noreferrer">oeffnen</a></td></tr>${row.sourceLabel ? `<tr><td colspan="4" class="muted-row">Quelle: ${row.sourceLabel}</td></tr>` : ""}`)
            .join("")}
        </tbody>
      </table>
      <p class="muted-line">Hinweis: Umsatz- und Bestellzahlen werden erst angezeigt, sobald eine echte Shop-API angebunden ist.</p>
    </article>
  `;
}

export function renderCatalogUploadSection(container, shopMetrics) {
  const catalog = shopMetrics?.catalog || {};
  const itemStates = Array.isArray(catalog.itemStates) ? catalog.itemStates : [];
  const uploaded = itemStates.filter((item) => item.uploadState === "uploaded");
  const submitted = itemStates.filter((item) => item.uploadState === "submitted");
  const ready = itemStates.filter((item) => item.uploadState === "ready");
  const pending = itemStates.filter((item) => item.uploadState === "pending");
  const withImage = itemStates.filter((item) => item.hasImage);
  const withoutImage = itemStates.filter((item) => !item.hasImage);

  const renderCard = (item) => {
    const badgeClass = item.uploadState === "uploaded" ? "is-ok" : item.uploadState === "submitted" ? "is-info" : item.uploadState === "ready" ? "is-warn" : "is-info";
    return `
      <article class="catalog-item-card">
        <div class="catalog-item-media">
          ${item.imageSrc ? `<img src="${item.imageSrc}" alt="${item.title}">` : `<div class="catalog-item-placeholder">Kein Bild</div>`}
        </div>
        <div class="catalog-item-body">
          <div class="catalog-item-head">
            <h4>${item.title}</h4>
            <span class="status-pill ${badgeClass}">${item.uploadLabel}</span>
          </div>
          <p>${item.line} • ${item.sectionLabel}</p>
          <p class="muted-line">Katalogstatus: ${item.catalogStatus}</p>
          <a href="${item.href}" target="_blank" rel="noopener noreferrer">Produktlink oeffnen</a>
        </div>
      </article>
    `;
  };

  container.innerHTML = `
    <article class="panel">
      <h3>Upload-Stand Katalog</h3>
      <div class="mini-grid three">
        <div><span>Artikel gesamt</span><strong>${formatValue(catalog.totalItems || itemStates.length)}</strong></div>
        <div><span>Bereits auf Shirtee</span><strong>${formatValue(catalog.uploadedCount || uploaded.length)}</strong></div>
        <div><span>Eingereicht (Pruefung)</span><strong>${formatValue(catalog.submittedCount || submitted.length)}</strong></div>
      </div>
      <div class="mini-grid three">
        <div><span>Uploadbereit</span><strong>${formatValue(catalog.readyCount || ready.length)}</strong></div>
        <div><span>Mit Bild</span><strong>${formatValue(withImage.length)}</strong></div>
        <div><span>Noch offen</span><strong>${formatValue(catalog.pendingCount || pending.length)}</strong></div>
      </div>
      <p class="muted-line">Logik: "Bereits hochgeladen" basiert auf Shirtee-Linkcheck (HTTP 200) oder Katalogstatus "Live im Store".</p>
      <h4>Katalog mit Bild (Preview)</h4>
      <div class="catalog-list">${withImage.slice(0, 10).map(renderCard).join("") || `<p class="muted-line">Keine Katalogartikel mit Bild erkannt.</p>`}</div>
      <h4>Bereits auf Shirtee hochgeladen (Preview)</h4>
      <div class="catalog-list">${uploaded.slice(0, 10).map(renderCard).join("") || `<p class="muted-line">Noch keine bereits hochgeladenen Artikel erkannt.</p>`}</div>
    </article>
    <article class="panel">
      <h3>Upload-Reihenfolge (DJ)</h3>
      <p class="muted-line">Empfohlen: erst "Uploadbereit", danach offene Konzeptartikel in Prioritaetsreihenfolge hochladen.</p>
      <div class="catalog-group-grid">
        <div>
          <h4>Bereits hochgeladen</h4>
          <div class="catalog-list">${uploaded.slice(0, 24).map(renderCard).join("") || `<p class="muted-line">Noch keine Live-Artikel erkannt.</p>`}</div>
        </div>
        <div>
          <h4>Uploadbereit</h4>
          <div class="catalog-list">${ready.slice(0, 24).map(renderCard).join("") || `<p class="muted-line">Aktuell nichts als uploadbereit markiert.</p>`}</div>
        </div>
        <div>
          <h4>Eingereicht (Pruefung)</h4>
          <div class="catalog-list">${submitted.slice(0, 24).map(renderCard).join("") || `<p class="muted-line">Aktuell keine eingereichten Artikel erkannt.</p>`}</div>
        </div>
        <div>
          <h4>Noch offen</h4>
          <div class="catalog-list">${pending.slice(0, 24).map(renderCard).join("") || `<p class="muted-line">Keine offenen Artikel.</p>`}</div>
        </div>
      </div>
    </article>
  `;
}

export function renderActivity(container, activityFeed, timeline) {
  const merged = [...activityFeed, ...timeline.map((item, idx) => ({ id: `T-${idx}`, time: item.time, type: item.type, text: item.detail }))];
  container.innerHTML = merged
    .slice(0, 10)
    .map((item) => `<li><span>${item.time}</span><p>${item.text}</p><em class="status-pill ${item.type === "warn" || item.type === "warning" ? "is-warn" : "is-ok"}">${item.type}</em></li>`)
    .join("");
}

export function renderPerformance(container, performanceMetrics) {
  const stateCards = [
    {
      label: "Seitenchecks",
      value: performanceMetrics.webVitals.find((item) => item.metric === "HTTP Seitenchecks")?.value || "0/0",
      tone: performanceMetrics.webVitals.find((item) => item.metric === "HTTP Seitenchecks")?.state === "info" ? "is-info" : "is-warn"
    },
    {
      label: "Shop",
      value: performanceMetrics.webVitals.find((item) => item.metric === "Shirtee-Linkchecks")?.value || "0/0",
      tone: performanceMetrics.webVitals.find((item) => item.metric === "Shirtee-Linkchecks")?.state === "info" ? "is-info" : "is-ok"
    },
    {
      label: "SoundCloud",
      value: performanceMetrics.externalChecks.find((item) => item.label === "SoundCloud Profil")?.status || "n/a",
      tone: performanceMetrics.externalChecks.find((item) => item.label === "SoundCloud Profil")?.level === "info" ? "is-info" : "is-warn"
    }
  ];
  const overallState = performanceMetrics.webVitals.some((item) => item.state === "warn") || performanceMetrics.externalChecks.some((item) => item.level === "warn")
    ? "Eingeschränkt"
    : performanceMetrics.webVitals.some((item) => item.state === "info") || performanceMetrics.externalChecks.some((item) => item.level === "info")
      ? "Hinweis"
    : "Stabil";

  container.innerHTML = `
    <article class="panel">
      <div class="section-banner">
        <div>
          <p class="eyebrow">Technik</p>
          <h3>Checks, Uptime und Fehlerlog</h3>
        </div>
        <div class="section-banner-chips">
          ${stateCards.map((item) => `<span class="status-pill ${item.tone}">${item.label}: <strong>${escapeHtml(String(item.value))}</strong></span>`).join("")}
        </div>
      </div>
      <div class="mini-grid three">
        <div><span>Uptime</span><strong>${performanceMetrics.uptime}</strong></div>
        <div><span>Antwortzeit</span><strong>${performanceMetrics.responseTime}</strong></div>
        <div><span>Status</span><strong>${overallState}</strong></div>
      </div>
      <ul class="status-list compact">
        ${performanceMetrics.webVitals
          .map((item) => `<li><span>${item.metric}</span><strong class="status-pill ${item.state === "good" ? "is-ok" : item.state === "info" ? "is-info" : "is-warn"}">${item.value}</strong></li>`)
          .join("")}
      </ul>
    </article>
    <article class="panel">
      <h3>Checks & Fehlerlog</h3>
      <ul class="status-list compact">
        ${performanceMetrics.externalChecks
          .map((item) => `<li><span>${item.label}</span><strong class="status-pill ${levelClass(item.level)}">${item.status}</strong></li>`)
          .join("")}
      </ul>
      <ul class="log-list">
        ${performanceMetrics.errorLog
          .map((entry) => `<li><strong>${entry.id}</strong> <span>${entry.scope}</span><p>${entry.message}</p></li>`)
          .join("")}
      </ul>
    </article>
  `;
}

export function renderContent(container, contentPerformance) {
  const strongest = contentPerformance.strongestSections[0] || null;
  container.innerHTML = `
    <article class="panel">
      <div class="section-banner">
        <div>
          <p class="eyebrow">Inhalte</p>
          <h3>Section-Priorität und CTA-Signale</h3>
        </div>
        <div class="section-banner-chips">
          ${strongest ? `<span class="status-pill is-live">Stärkste Section: <strong>${escapeHtml(strongest.section)}</strong></span>` : ""}
          <span class="status-pill is-info">Live CTAs: <strong>${contentPerformance.ctas.length}</strong></span>
        </div>
      </div>
      <div class="metric-bars">
        ${contentPerformance.strongestSections
          .map((item) => `<div class="metric-bar-row"><span class="metric-bar-label">${item.section}</span><div class="metric-bar-track"><span class="metric-bar-fill" style="width:${item.score}%"></span></div><strong>${item.score}</strong></div>`)
          .join("")}
      </div>
    </article>
    <article class="panel">
      <h3>CTA Auswertung</h3>
      <table class="data-table">
        <thead><tr><th>CTA</th><th>Klicks</th><th>Rate</th></tr></thead>
        <tbody>
          ${contentPerformance.ctas
            .map((row) => `<tr><td>${row.name}</td><td>${row.clicks}</td><td>${row.rate}</td></tr>`)
            .join("")}
        </tbody>
      </table>
      <ul class="log-list">
        ${contentPerformance.weakSpots.map((item) => `<li><strong>${item.item}</strong><p>${item.note}</p></li>`).join("")}
      </ul>
    </article>
  `;
}

export function renderSocial(container, socialMetrics) {
  const hasLiveValues = socialMetrics.links.some((row) => row.valueLabel || row.statusLabel || row.sourceLabel);
  const pickSocialStatusClass = (row) => {
    const status = String(row.status || "").toLowerCase();
    const statusLabel = String(row.statusLabel || "").toLowerCase();
    if (status === "live" || /live|verbunden/.test(statusLabel)) return "is-live";
    if (status === "check" || /pruef|prüf|signal/.test(statusLabel)) return "is-warn";
    if (status === "connected") return "is-connected";
    return "is-info";
  };
  const strongest = socialMetrics.strongestPlatform || socialMetrics.links.find((row) => Number(row.metricValue ?? row.clicks ?? 0) > 0)?.platform || "nicht erfasst";
  const routes = Array.isArray(socialMetrics.routes) ? socialMetrics.routes : [];

  container.innerHTML = `
    <article class="panel">
      <div class="section-banner">
        <div>
          <p class="eyebrow">Social</p>
          <h3>Profile, Signale und Quellenlage</h3>
        </div>
        <div class="section-banner-chips">
          <span class="status-pill is-live">Stärkster Kanal: <strong>${escapeHtml(strongest)}</strong></span>
          <span class="status-pill is-warn">Signal geprüft</span>
        </div>
      </div>
      <div class="social-network">
        ${socialMetrics.links
          .map((row) => {
            const value = row.valueLabel || row.metricValue || row.clicks || 0;
            return `
              <article class="social-node">
                <div class="social-node-head">
                  <strong>${escapeHtml(row.platform)}</strong>
                  <span class="status-pill ${pickSocialStatusClass(row)}">${escapeHtml(row.statusLabel || row.status || "check")}</span>
                </div>
                <p>${escapeHtml(row.sourceLabel || "Live-Check")}</p>
                <div class="social-node-value">${escapeHtml(String(value))}</div>
                <small>${escapeHtml(row.url || "")}</small>
              </article>
            `;
          })
          .join("")}
      </div>
      <div class="social-route-grid">
        ${routes
          .map(
            (route) => `
              <article class="social-route-card">
                <span class="status-pill ${route.status === "live" ? "is-live" : route.status === "check" ? "is-warn" : "is-info"}">${escapeHtml(route.status || "info")}</span>
                <strong>${escapeHtml(route.from)} → ${escapeHtml(route.to)}</strong>
                <p>${escapeHtml(route.channel)}</p>
              </article>
            `
          )
          .join("")}
      </div>
      <table class="data-table">
        <thead><tr><th>Plattform</th><th>${hasLiveValues ? "Live-Wert" : "Klicks"}</th><th>${hasLiveValues ? "Status" : "CTR"}</th></tr></thead>
        <tbody>
          ${socialMetrics.links
            .map(
              (row) =>
                `<tr><td>${row.platform}</td><td>${row.valueLabel || row.metricValue || row.clicks || "n/a"}</td><td>${row.statusLabel || row.ctr || "n/a"}</td></tr>${
                  row.sourceLabel ? `<tr><td colspan="3" class="muted-row">Quelle: ${row.sourceLabel}</td></tr>` : ""
                }`
            )
            .join("")}
        </tbody>
      </table>
    </article>
    <article class="panel">
      <div class="section-banner">
        <div>
          <p class="eyebrow">Profile</p>
          <h3>Verifizierte Accounts und Vergleich</h3>
        </div>
      </div>
      <ul class="account-list">
        ${socialMetrics.officialAccounts
          .map(
            (item) =>
              `<li><span>${item.label}</span><a href="${item.url}" target="_blank" rel="noopener noreferrer">${item.url}</a><em class="status-pill ${item.status === "live" ? "is-ok" : item.status === "check" ? "is-warn" : "is-info"}">${item.status === "live" ? "Verbunden" : item.status === "check" ? "Pruefen" : item.status}</em></li>`
          )
          .join("")}
      </ul>
      <ul class="status-list compact">
        ${socialMetrics.comparisons.map((item) => `<li><span>${item.label}</span><strong>${item.value}</strong></li>`).join("")}
      </ul>
      <p class="muted-line">SoundCloud bleibt als Quelle sichtbar, auch wenn das Profil aktuell kein Live-Signal liefert.</p>
    </article>
  `;
}

export function renderAlerts(container, alerts) {
  const summary = {
    warn: alerts.filter((item) => item.level === "warn").length,
    ok: alerts.filter((item) => item.level === "ok").length,
    info: alerts.filter((item) => item.level === "info").length
  };

  container.innerHTML = `
    <article class="panel">
      <div class="section-banner">
        <div>
          <p class="eyebrow">Warnungen</p>
          <h3>Priorisierte Live-Auffälligkeiten</h3>
        </div>
        <div class="section-banner-chips">
          <span class="status-pill is-warn">Warnungen: <strong>${summary.warn}</strong></span>
          <span class="status-pill is-ok">OK: <strong>${summary.ok}</strong></span>
          <span class="status-pill is-info">Info: <strong>${summary.info}</strong></span>
        </div>
      </div>
      <div class="alert-grid">
        ${alerts
          .map((alert) => {
            const cls = alert.level === "warn" ? "is-warn" : alert.level === "ok" ? "is-ok" : "is-info";
            return `<article class="alert-card ${cls}"><h4>${alert.title}</h4><p>${alert.description}</p><span>${alert.source}</span></article>`;
          })
          .join("")}
      </div>
    </article>
  `;
}

export function renderQuickActions(container, actions) {
  const validActions = Array.isArray(actions)
    ? actions.filter((item) => item && typeof item.href === "string" && item.href.trim() && typeof item.label === "string" && item.label.trim())
    : [];
  const grouped = {
    live: validActions.slice(0, 4),
    social: validActions.slice(4, 7),
    admin: validActions.slice(7)
  };

  const renderGroup = (title, items) => `
    <div class="quick-action-group">
      <h4>${title}</h4>
      <div class="action-grid compact">
        ${items
          .map((item) => `<a class="action-btn" href="${item.href}" ${item.external ? 'target="_blank" rel="noopener noreferrer"' : ""}>${item.label}</a>`)
          .join("")}
      </div>
    </div>
  `;

  container.innerHTML = `
    <article class="panel">
      <div class="section-banner">
        <div>
          <p class="eyebrow">Aktionen</p>
          <h3>Schnellzugriffe für Live-Betrieb</h3>
        </div>
      </div>
      ${renderGroup("Direkt", grouped.live)}
      ${renderGroup("Social", grouped.social)}
      ${renderGroup("Administration", grouped.admin)}
    </article>
  `;
}
