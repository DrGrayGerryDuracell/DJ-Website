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
  if (status === "live") return "is-live";
  if (status === "connected") return "is-connected";
  if (status === "support") return "is-support";
  if (status === "ready") return "is-ready";
  if (status === "active") return "is-active";
  if (status === "sync") return "is-sync";
  return "is-info";
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

function buildDeviceLinks(devices) {
  const names = Array.isArray(devices) ? devices.map((device) => device.name) : [];
  const has = (name) => names.includes(name);
  const items = [
    has("Mac mini") && has("MacBook") ? { from: "Mac mini", to: "MacBook", channel: "SMB", state: "connected", note: "Mirror / Backup" } : null,
    has("Mac mini") && has("iMac") ? { from: "Mac mini", to: "iMac", channel: "SMB", state: "connected", note: "Operator Sync" } : null,
    has("Mac mini") && has("Home Assistant") ? { from: "Home Assistant", to: "Mac mini", channel: "SMB / Bridge", state: "live", note: "HA Backup" } : null,
    has("MacBook") && has("iMac") ? { from: "MacBook", to: "iMac", channel: "SMB", state: "connected", note: "Shared Work" } : null,
    has("iPhone") ? { from: "iPhone", to: "Hermes", channel: "Telegram", state: "live", note: "Mobile Control" } : null,
    has("GitHub") ? { from: "GitHub", to: "Mac mini", channel: "Repo Sync", state: "connected", note: "Codebasis" } : null,
    has("Obsidian") ? { from: "Obsidian", to: "Jarvis", channel: "Memory", state: "sync", note: "Vault Graph" } : null
  ].filter(Boolean);

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

function buildRoutingGraph(agentsRoom) {
  const routing = Array.isArray(agentsRoom?.routing) ? agentsRoom.routing : [];
  const devices = Array.isArray(agentsRoom?.devices) ? agentsRoom.devices : [];
  if (!routing.length && !devices.length) {
    return `<p class="muted-line">Keine Kommunikationsdaten vorhanden.</p>`;
  }

  const statusToTone = {
    live: "is-live",
    connected: "is-connected",
    support: "is-support",
    ready: "is-ready",
    active: "is-active",
    sync: "is-sync"
  };

  const nodeMeta = new Map([
    ["Mensch", { x: 6, y: 44, tone: "human", label: "Mensch", detail: "Telegram Input" }],
    ["Hermes", { x: 20, y: 24, tone: "core", label: "Hermes", detail: "Primär-Controller" }],
    ["Jarvis", { x: 38, y: 30, tone: "core", label: "Jarvis", detail: "Verteiler" }],
    ["Argus", { x: 56, y: 18, tone: "support", label: "Argus", detail: "Vorprüfung" }],
    ["OpenClaw Gateway", { x: 34, y: 50, tone: "bridge", label: "OpenClaw", detail: "Broker / Queue" }],
    ["Forge", { x: 56, y: 38, tone: "service", label: "Forge", detail: "Infra / Skills" }],
    ["Sentinel", { x: 56, y: 58, tone: "service", label: "Sentinel", detail: "Logs / Security" }],
    ["Oracle", { x: 74, y: 16, tone: "service", label: "Oracle", detail: "Briefings" }],
    ["Muse", { x: 74, y: 34, tone: "service", label: "Muse", detail: "Content / Audio" }],
    ["Heimdall", { x: 74, y: 52, tone: "device", label: "Heimdall", detail: "Home Assistant" }],
    ["Friday", { x: 74, y: 70, tone: "service", label: "Friday", detail: "Deep Repair" }],
    ["Claude", { x: 90, y: 24, tone: "support", label: "Claude", detail: "Escalation" }],
    ["Codex", { x: 90, y: 42, tone: "support", label: "Codex", detail: "Implementation" }],
    ["Mac mini", { x: 20, y: 70, tone: "device", label: "Mac mini", detail: "Zentralserver" }],
    ["MacBook", { x: 6, y: 68, tone: "device", label: "MacBook", detail: "Mirror-Node" }],
    ["iMac", { x: 6, y: 82, tone: "device", label: "iMac", detail: "Operator" }],
    ["iPhone", { x: 18, y: 84, tone: "device", label: "iPhone", detail: "Telegram Mobile" }],
    ["Home Assistant", { x: 38, y: 76, tone: "device", label: "Home Assistant", detail: "Automation" }],
    ["GitHub", { x: 38, y: 86, tone: "device", label: "GitHub", detail: "Repo Sync" }],
    ["Obsidian", { x: 56, y: 84, tone: "device", label: "Obsidian", detail: "Vault" }],
    ["StreamDeck", { x: 74, y: 86, tone: "device", label: "StreamDeck", detail: "Hotkeys" }],
    ["Rodecaster", { x: 90, y: 80, tone: "device", label: "Rodecaster", detail: "Audio" }],
    ["TikTok Live Studio", { x: 90, y: 62, tone: "device", label: "TikTok Live", detail: "Publishing" }],
    ["SoundCloud", { x: 90, y: 52, tone: "device", label: "SoundCloud", detail: "Music" }]
  ]);

  const usedNodes = new Map();
  const deviceTargets = {
    "Mac mini": "Hermes",
    MacBook: "Hermes",
    iMac: "Hermes",
    iPhone: "Hermes",
    "Home Assistant": "Mac mini",
    GitHub: "Jarvis",
    Obsidian: "Jarvis",
    StreamDeck: "Jarvis",
    Rodecaster: "Muse",
    "TikTok Live Studio": "Muse",
    SoundCloud: "Muse"
  };

  const deviceEdges = devices
    .map((device) => {
      const targetName = deviceTargets[device.name];
      const source = nodeMeta.get(device.name);
      const target = targetName ? nodeMeta.get(targetName) : null;
      if (!source || !target) {
        return null;
      }
      return {
        from: device.name,
        to: targetName,
        channel: device.channel || "Device Link",
        purpose: device.role || "Gerätepfad",
        status: device.status || "connected",
        statusLabel: device.statusLabel || "Verbunden"
      };
    })
    .filter(Boolean);

  const combinedEdges = [...routing, ...deviceEdges];

  const edges = combinedEdges.map((item) => {
    const source = nodeMeta.get(item.from) || nodeMeta.get(String(item.from).replace(/\s+/g, " "));
    const target = nodeMeta.get(item.to) || nodeMeta.get(String(item.to).replace(/\s+/g, " "));
    if (source) usedNodes.set(item.from, source);
    if (target) usedNodes.set(item.to, target);
    return { ...item, source, target };
  });

  const visibleNodes = Array.from(usedNodes.entries()).map(([name, meta]) => ({ name, ...meta }));

  const lineNodes = edges
    .filter((edge) => edge.source && edge.target)
    .map((edge) => {
      const tone = statusToTone[edge.status] || "is-info";
      const x1 = edge.source.x * 10;
      const y1 = edge.source.y * 5.6;
      const x2 = edge.target.x * 10;
      const y2 = edge.target.y * 5.6;
      const ctrlX = (x1 + x2) / 2;
      const ctrlY = Math.min(y1, y2) - Math.max(18, Math.abs(x1 - x2) * 0.08);
      return `
        <g class="agentsroom-network-edge ${tone}">
          <path d="M ${x1} ${y1} C ${ctrlX} ${ctrlY}, ${ctrlX} ${ctrlY}, ${x2} ${y2}" />
          <circle cx="${x2}" cy="${y2}" r="4" />
        </g>
      `;
    })
    .join("");

  const nodeCards = visibleNodes
    .map((node) => `
      <div class="agentsroom-network-node ${node.tone}" style="left:${node.x}%; top:${node.y}%">
        <strong>${escapeHtml(node.label)}</strong>
        <span>${escapeHtml(node.detail)}</span>
      </div>
    `)
    .join("");

  const legend = edges
    .slice(0, 6)
    .map(
      (edge) => `
        <div class="agentsroom-network-legend-item">
          <span>${escapeHtml(edge.from)} → ${escapeHtml(edge.to)}</span>
          <strong>${escapeHtml(edge.channel)}</strong>
        </div>
      `
    )
    .join("");

  return `
    <div class="agentsroom-network">
      <svg class="agentsroom-network-svg" viewBox="0 0 1000 560" role="img" aria-label="Kommunikationsgraph der Agenten und Geräte">
        <defs>
          <linearGradient id="agentsroom-line-live" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="rgba(52, 228, 255, 0.95)" />
            <stop offset="100%" stop-color="rgba(245, 200, 76, 0.95)" />
          </linearGradient>
          <linearGradient id="agentsroom-line-support" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="rgba(255, 79, 216, 0.95)" />
            <stop offset="100%" stop-color="rgba(245, 200, 76, 0.75)" />
          </linearGradient>
        </defs>
        ${lineNodes}
      </svg>
      <div class="agentsroom-network-nodes">${nodeCards}</div>
    </div>
    <div class="agentsroom-network-legend">${legend}</div>
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
    <article class="pulse-card">
      <p class="pulse-eyebrow">Website</p>
      <h3>Antwortzeiten im Blick</h3>
      <div class="sparkline-wrap">${visitorsSparkline}</div>
      <p class="pulse-copy">Seiten ok: <strong>${formatNumber(dashboardData.overviewKpis.find((kpi) => kpi.id === "pagesOk")?.value)}</strong></p>
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
    { label: "Gateway", value: runtime.gatewayState?.gateway_state || "unbekannt", status: runtime.gatewayState?.gateway_state === "running" ? "live" : "support", statusLabel: runtime.gatewayState?.gateway_state === "running" ? "Aktiv" : "Pruefen" },
    { label: "Telegram", value: runtime.gatewayState?.platforms?.telegram?.state || "unbekannt", status: runtime.gatewayState?.platforms?.telegram?.state === "connected" ? "connected" : "support", statusLabel: runtime.gatewayState?.platforms?.telegram?.state === "connected" ? "Verbunden" : "Pruefen" },
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
        <h3>Routing, Kommunikation und Geräte als eigene Kontrollansicht</h3>
        <p class="muted-line">Mensch → Hermes per Telegram, Hermes → Jarvis zur Verteilung, Jarvis → Argus zur Vorprüfung. Zusätzlich sind die Geräte- und Servicepfade live sichtbar.</p>
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
    </article>

    <article class="panel agentsroom-panel agentsroom-panel-wide">
      <div class="agentsroom-panel-head">
        <div>
          <h3>Kommunikationskarte</h3>
          <p class="muted-line">Live-Pfade mit Richtung, Kanal und Eskalation. Hermes bleibt der zentrale Eingang, Jarvis verteilt, Argus prüft nach.</p>
        </div>
        <span class="status-pill is-live">Live Graph</span>
      </div>
      ${buildRoutingGraph(agentsRoom)}
    </article>

    <div class="agentsroom-grid">
      <article class="panel agentsroom-panel agentsroom-panel-wide">
        <h3>Live Hermes Runtime</h3>
        <div class="agentsroom-runtime-grid">${buildLiveData(runtimeLiveData)}</div>
      </article>

      <article class="panel agentsroom-panel">
        <h3>Routing</h3>
        <ul class="agentsroom-flow-list">${buildFlowItems(routing)}</ul>
      </article>

      <article class="panel agentsroom-panel">
        <h3>Agenten</h3>
        <div class="agentsroom-node-grid">${buildNodeCards(agents, "agent")}</div>
      </article>

      <article class="panel agentsroom-panel">
        <h3>Geräte & Live-Daten</h3>
        <div class="agentsroom-device-grid">${buildNodeCards(devices, "device")}</div>
        <h4>Direkte Gerätepfade</h4>
        <ul class="agentsroom-device-link-list">${buildDeviceLinks(devices)}</ul>
        <div class="agentsroom-rail">${buildLiveData(liveData)}</div>
      </article>

      <article class="panel agentsroom-panel">
        <h3>Quellen & Vault</h3>
        <div class="agentsroom-source-grid">${buildSourceCards(sourceRegistry)}</div>
      </article>

      <article class="panel agentsroom-panel">
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
    { label: "Seitenchecks", value: performanceMetrics.webVitals.find((item) => item.metric === "HTTP Seitenchecks")?.value || "0/0", tone: "is-warn" },
    { label: "Shop", value: performanceMetrics.webVitals.find((item) => item.metric === "Shirtee-Linkchecks")?.value || "0/0", tone: "is-ok" },
    { label: "SoundCloud", value: performanceMetrics.externalChecks.find((item) => item.label === "SoundCloud Profil")?.status || "n/a", tone: "is-warn" }
  ];
  const overallState = performanceMetrics.webVitals.some((item) => item.state === "warn") || performanceMetrics.externalChecks.some((item) => item.level === "warn")
    ? "Eingeschränkt"
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
          .map((item) => `<li><span>${item.metric}</span><strong class="status-pill ${item.state === "good" ? "is-ok" : "is-warn"}">${item.value}</strong></li>`)
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
