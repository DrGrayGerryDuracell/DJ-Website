import { controlNav, dateRanges } from "./js/config.js";
import { ensureControlAccess, clearControlSession } from "./js/auth.js";
import {
  renderNav,
  renderRanges,
  renderModeBadge,
  renderVisualPulse,
  renderHermesChat,
  renderAgentsRoomSection,
  renderHomeAssistantSection,
  renderSystemStatus,
  renderKpis,
  renderWebsiteSection,
  renderShopSection,
  renderCatalogUploadSection,
  renderActivity,
  renderPerformance,
  renderContent,
  renderSocial,
  renderAlerts,
  renderQuickActions
} from "./js/render.js?v=20260806d";

const LIVE_REFRESH_MS = 30000;
const NETWORK_ZOOM_MIN = 0.7;
const NETWORK_ZOOM_MAX = 1.45;
const NETWORK_ZOOM_STEP = 0.15;
const CONTROL_DIALOG_STATE_KEY = "dg-control-dialog-state-v1";
const CONTROL_API_BASE = "/api/control";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function loadLiveMetrics() {
  try {
    const url = new URL("/control/js/live-metrics.json", window.location.origin);
    url.searchParams.set("t", String(Date.now()));
    const response = await fetch(url, {
      cache: "no-store"
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function controlApi(path, options = {}) {
  const response = await fetch(`${CONTROL_API_BASE}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || payload?.stderr || `API Fehler ${response.status}`);
  }
  return payload;
}

async function loadControlBridge() {
  try {
    const [health, state] = await Promise.all([
      controlApi("/health", { method: "GET", headers: {} }),
      controlApi("/state", { method: "GET", headers: {} })
    ]);
    window.__CONTROL_BRIDGE__ = health;
    window.__CONTROL_SERVER_STATE__ = state;
    return { health, state };
  } catch {
    window.__CONTROL_BRIDGE__ = null;
    window.__CONTROL_SERVER_STATE__ = null;
    return null;
  }
}

function hasControlBridge() {
  return Boolean(window.__CONTROL_BRIDGE__?.ok);
}

function applyBridgeStateToData(data) {
  if (!data || typeof data !== "object") {
    return data;
  }

  const nextData = structuredClone(data);
  const bridgeOnline = hasControlBridge();
  const bridgeStatus = bridgeOnline ? "connected" : "warn";
  const bridgeLabel = bridgeOnline ? "Lokale Bridge aktiv" : "Lokale Bridge fehlt";
  const bridgeDetail = bridgeOnline
    ? `${window.__CONTROL_BRIDGE__?.mode || "local-bridge"} · ${window.__CONTROL_BRIDGE__?.availableCommands?.length || 0} Befehle`
    : "Dashboard läuft im statischen Modus";

  nextData.metadata = nextData.metadata || {};
  nextData.metadata.bridge = {
    state: bridgeStatus,
    label: bridgeLabel,
    detail: bridgeDetail,
    updatedAt: window.__CONTROL_BRIDGE__?.updatedAt || null
  };

  nextData.systemStatus = Array.isArray(nextData.systemStatus) ? nextData.systemStatus : [];
  const bridgeIndex = nextData.systemStatus.findIndex((item) => item.id === "control-bridge");
  const bridgeEntry = {
    id: "control-bridge",
    label: "Control Bridge",
    value: bridgeLabel,
    detail: bridgeDetail,
    status: bridgeStatus
  };

  if (bridgeIndex >= 0) {
    nextData.systemStatus[bridgeIndex] = bridgeEntry;
  } else {
    nextData.systemStatus.unshift(bridgeEntry);
  }

  return nextData;
}

async function runBridgeCommand(command) {
  return controlApi("/command", {
    method: "POST",
    body: JSON.stringify({ command })
  });
}

async function queueHaAction(payload) {
  return controlApi("/ha-queue", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

async function writeHermesSpool(message, chatId) {
  return controlApi("/hermes-spool", {
    method: "POST",
    body: JSON.stringify({ message, chatId })
  });
}

function formatAnimatedValue(value, unit) {
  if (unit === "EUR") {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
  }
  if (unit === "%") {
    return `${value.toFixed(1)}%`;
  }
  return new Intl.NumberFormat("de-DE").format(Math.round(value));
}

function animateKpis() {
  const nodes = document.querySelectorAll('[data-kpi-animate="true"]');
  if (!nodes.length) {
    return;
  }
  const duration = 420;
  const start = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    nodes.forEach((node) => {
      const target = Number(node.getAttribute("data-kpi-value") || "0");
      const unit = node.getAttribute("data-kpi-unit") || "";
      const current = target * progress;
      node.textContent = formatAnimatedValue(current, unit);
    });

    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  }

  requestAnimationFrame(tick);
}

function applyRangeToData(baseData, rangeId) {
  const data = JSON.parse(JSON.stringify(baseData));
  data.metadata.activeRange = rangeId === "live" ? "Live-Daten" : "Live-Daten";
  return data;
}

function setupNavigation() {
  const toggle = document.querySelector("[data-control-nav-toggle]");
  const layout = document.querySelector(".control-layout");
  if (!toggle || !layout) return;

  const closeNav = () => {
    layout.classList.remove("nav-open");
  };

  toggle.addEventListener("click", function () {
    layout.classList.toggle("nav-open");
  });

  document.querySelectorAll(".control-nav-link").forEach((link) => {
    link.addEventListener("click", () => {
      closeNav();
    });
    link.addEventListener("touchend", () => {
      closeNav();
    });
  });

  window.addEventListener("hashchange", () => {
    closeNav();
  });

  document.addEventListener("click", (event) => {
    if (!layout.classList.contains("nav-open")) return;
    if (window.matchMedia("(min-width: 921px)").matches) return;
    if (layout.contains(event.target) && !event.target.closest(".control-sidebar") && !event.target.closest("[data-control-nav-toggle]")) {
      closeNav();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeNav();
    }
  });
}

function activateSection(sectionId) {
  const sections = document.querySelectorAll(".control-section");
  const links = document.querySelectorAll(".control-nav-link");
  const pulse = document.querySelector("[data-control-pulse]");
  const targetId = typeof sectionId === "string" && sectionId.length > 0 ? sectionId : "overview";

  sections.forEach((section) => {
    const isTarget = section.id === targetId;
    section.classList.toggle("is-active-section", isTarget);
    section.classList.toggle("is-hidden-section", !isTarget);
    section.setAttribute("aria-hidden", isTarget ? "false" : "true");
  });

  links.forEach((link) => {
    const href = link.getAttribute("href") || "";
    const isTarget = href === `#${targetId}`;
    link.classList.toggle("is-active", isTarget);
    link.setAttribute("aria-current", isTarget ? "page" : "false");
  });

  if (pulse) {
    const showPulse = targetId === "overview";
    pulse.classList.toggle("is-hidden-section", !showPulse);
    pulse.setAttribute("aria-hidden", showPulse ? "false" : "true");
  }
}

function setupSectionVisibilityRouting() {
  const visibleSections = new Set(Array.from(document.querySelectorAll(".control-section")).map((section) => section.id));

  const resolveHashTarget = () => {
    const hash = String(window.location.hash || "").replace(/^#/, "");
    if (hash && visibleSections.has(hash)) {
      return hash;
    }
    return "overview";
  };

  activateSection(resolveHashTarget());
  window.scrollTo(0, 0);

  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const id = String(link.getAttribute("href") || "").replace(/^#/, "");
    if (!visibleSections.has(id)) return;
    event.preventDefault();
    window.history.pushState({ controlSection: id }, "", `#${id}`);
    activateSection(id);
    window.scrollTo(0, 0);
  });

  window.addEventListener("hashchange", () => {
    activateSection(resolveHashTarget());
    window.scrollTo(0, 0);
  });

  window.addEventListener("popstate", () => {
    activateSection(resolveHashTarget());
    window.scrollTo(0, 0);
  });
}

function setupSectionScrollSpy() {
  const sections = Array.from(document.querySelectorAll(".control-section"));
  const visibleSections = new Set(sections.map((section) => section.id));
  if (!sections.length || !("IntersectionObserver" in window)) {
    return;
  }

  let currentSectionId = document.querySelector(".control-section.is-active-section")?.id || "overview";
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting && visibleSections.has(entry.target.id))
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio || a.boundingClientRect.top - b.boundingClientRect.top);

      if (!visible.length) {
        return;
      }

      const nextId = visible[0].target.id;
      if (nextId !== currentSectionId) {
        currentSectionId = nextId;
        activateSection(nextId);
      }
    },
    {
      root: null,
      threshold: [0.15, 0.3, 0.5, 0.7],
      rootMargin: "-18% 0px -55% 0px"
    }
  );

  sections.forEach((section) => observer.observe(section));
}

function setupRangeButtons(onChange) {
  document.querySelectorAll(".range-btn").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".range-btn").forEach((node) => {
        node.classList.remove("is-active");
        node.setAttribute("aria-pressed", "false");
      });
      button.classList.add("is-active");
      button.setAttribute("aria-pressed", "true");
      if (typeof onChange === "function") {
        onChange(button.getAttribute("data-range") || "week");
      }
    });
  });
}

function setupExportAction() {
  const exportLink = document.querySelector('[href="#export"]');
  if (!exportLink) {
    return;
  }

  exportLink.addEventListener("click", function (event) {
    event.preventDefault();

    const payload = {
      exportedAt: new Date().toISOString(),
      source: "control-live-snapshot"
    };

    const state = window.__CONTROL_DATA__ || null;
    if (state) {
      payload.data = state;
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `control-report-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  });
}

function setupUploadQueueExportAction() {
  const trigger = document.querySelector('[href="#export-upload-queue"]');
  if (!trigger) {
    return;
  }

  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    const state = window.__CONTROL_DATA__;
    const items = state?.shopMetrics?.catalog?.itemStates || [];
    const pending = items.filter((item) => item.uploadState !== "uploaded");

    const rows = [
      ["id", "title", "line", "section", "catalogStatus", "uploadState", "uploadLabel", "hasImage", "imageSrc", "href", "verifiedLink", "httpCode"],
      ...pending.map((item) => [
        item.id,
        item.title,
        item.line,
        item.sectionLabel,
        item.catalogStatus,
        item.uploadState,
        item.uploadLabel,
        String(Boolean(item.hasImage)),
        item.imageSrc || "",
        item.href || "",
        String(Boolean(item.verifiedLink)),
        String(item.httpCode ?? 0)
      ])
    ];

    const escapeCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = rows.map((row) => row.map(escapeCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `shirtee-upload-queue-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  });
}

function setupLogoutAction() {
  const logoutLink = document.querySelector('[href="#logout"]');
  if (!logoutLink) {
    return;
  }

  logoutLink.addEventListener("click", (event) => {
    event.preventDefault();
    clearControlSession();
    window.location.replace("/control-login.html");
  });
}

function setupReloadAction(onReload) {
  const reloadLink = document.querySelector('[href="#reload"]');
  if (!reloadLink) {
    return;
  }

  reloadLink.addEventListener("click", async (event) => {
    event.preventDefault();
    if (typeof onReload === "function") {
      await onReload();
    }
  });
}

function getHermesChatStorageKey(session) {
  const sessionKey = session?.session_key || session?.id || "default";
  return `dg-control-hermes-chat-v1:${sessionKey}`;
}

function readHermesChatQueue(session) {
  try {
    const raw = window.localStorage.getItem(getHermesChatStorageKey(session));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeHermesChatQueue(session, items) {
  window.localStorage.setItem(getHermesChatStorageKey(session), JSON.stringify(items));
}

function formatHermesSpoolText(text, session) {
  const target = session?.display_name || "Operator";
  return `An ${target} über Telegram:\n${text}\n`;
}

function downloadHermesSpoolFile(text, session) {
  const payload = formatHermesSpoolText(text, session);
  const blob = new Blob([payload], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `hermes-last-message-to-send-${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function setHermesChatStatus(message, tone = "is-info") {
  const node = document.querySelector("[data-hermes-chat-status]");
  if (!node) {
    return;
  }

  node.className = `status-pill ${tone}`;
  node.innerHTML = `<strong>${message}</strong>`;
}

function setupHermesChatActions() {
  document.addEventListener("click", async (event) => {
    const sendButton = event.target.closest("[data-hermes-chat-send]");
    const copyButton = event.target.closest("[data-hermes-chat-copy]");

    if (!sendButton && !copyButton) {
      return;
    }

    const input = document.querySelector("[data-hermes-chat-input]");
    if (!input) {
      return;
    }

    const data = window.__CONTROL_DATA__ || null;
    const session = data?.agentsRoom?.runtime?.activeTelegramSession || null;

    if (copyButton) {
      const text = String(input.value || "").trim();
      if (!text) {
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        input.select();
      }
      return;
    }

    if (!sendButton) {
      return;
    }

    const text = String(input.value || "").trim();
    if (!text) {
      return;
    }

    const queue = readHermesChatQueue(session);
    queue.push({
      id: `draft-${Date.now()}`,
      time: new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
      text,
      sent: false
    });
    writeHermesChatQueue(session, queue.slice(-20));
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard ist nur ein Komfort-Fallback.
    }
    let sendStatus = "download";
    try {
      if (hasControlBridge()) {
        const chatId = session?.chat_id || session?.chatId || session?.id || null;
        await writeHermesSpool(text, chatId);
        sendStatus = "bridge";
      } else {
        downloadHermesSpoolFile(text, session);
      }
    } catch {
      try {
        downloadHermesSpoolFile(text, session);
        sendStatus = "download";
      } catch {
        sendStatus = "failed";
      }
    }
    input.value = "";
    renderHermesChat(document.querySelector("[data-hermes-chat]"), data);
    setHermesChatStatus(
      sendStatus === "bridge"
        ? "An Hermes-Bridge übergeben"
        : sendStatus === "download"
          ? "Spool-Datei erzeugt"
          : "Spool-Weitergabe blockiert",
      sendStatus === "failed" ? "is-warn" : "is-live"
    );
  });
}

function readControlDialogState() {
  if (window.__CONTROL_SERVER_STATE__?.controls) {
    return window.__CONTROL_SERVER_STATE__.controls;
  }
  try {
    return JSON.parse(window.localStorage.getItem(CONTROL_DIALOG_STATE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeControlDialogState(nextState) {
  window.localStorage.setItem(CONTROL_DIALOG_STATE_KEY, JSON.stringify(nextState));
}

function getControlToggleValue(kind, id, controlId, fallback = false) {
  const state = readControlDialogState();
  return Boolean(state?.[kind]?.[id]?.[controlId] ?? fallback);
}

const ALERT_ACK_STORAGE_KEY = "control-alert-acknowledged";

function readAcknowledgedAlertIds() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(ALERT_ACK_STORAGE_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function writeAcknowledgedAlertIds(ids) {
  window.localStorage.setItem(ALERT_ACK_STORAGE_KEY, JSON.stringify(ids));
}

function acknowledgeAlert(id) {
  const ids = new Set(readAcknowledgedAlertIds());
  ids.add(id);
  writeAcknowledgedAlertIds([...ids]);
}

function acknowledgeAllAlerts(alertIds) {
  const ids = new Set(readAcknowledgedAlertIds());
  alertIds.forEach((id) => ids.add(id));
  writeAcknowledgedAlertIds([...ids]);
}

function rerenderAlerts() {
  const container = document.querySelector("[data-alerts]");
  if (!container) return;
  renderAlerts(container, window.__CONTROL_DATA__?.alerts || [], window.__CONTROL_DATA__?.metadata);
}

async function setControlToggleValue(kind, id, controlId, value) {
  const serverState = window.__CONTROL_SERVER_STATE__?.controls ? structuredClone(window.__CONTROL_SERVER_STATE__.controls) : null;
  const state = serverState || readControlDialogState();
  state[kind] = state[kind] || {};
  state[kind][id] = state[kind][id] || {};
  state[kind][id][controlId] = Boolean(value);
  writeControlDialogState(state);
  if (hasControlBridge()) {
    const response = await controlApi("/state", {
      method: "POST",
      body: JSON.stringify({ kind, id, controlId, value: Boolean(value) })
    });
    window.__CONTROL_SERVER_STATE__ = response.state;
  }
}

function buildDialogPayload(data, kind, id) {
  const websitePages = data?.websiteMetrics?.workbench?.pages || [];
  const shopDrafts = data?.shopMetrics?.workbench?.drafts || [];
  const plannerCalendar = data?.contentPerformance?.planner?.calendar || [];
  const plannerChannels = data?.contentPerformance?.planner?.channels || [];
  const haRooms = data?.homeAssistantWorkbench?.rooms || [];
  const haAutomations = data?.homeAssistantWorkbench?.automations || [];
  const cronJobs = data?.operationsWorkbench?.cronJobs || [];
  const subagents = data?.operationsWorkbench?.subagents || [];
  const vaultNodes = data?.operationsWorkbench?.vaultNodes || [];

  if (kind === "ha-room") {
    const room = haRooms.find((item) => item.id === id);
    if (!room) return null;
    return {
      title: room.title,
      subtitle: "Home-Assistant Raumsteuerung",
      badges: [{ label: room.statusLabel, tone: room.status }],
      paragraphs: [`${room.devices.length} Geräte und ${room.scenes.length} Szenen. Aktionen laufen derzeit über einen lokalen Adapterpfad, bis echte HA-Servicecalls direkt angebunden sind.`],
      lists: [
        { title: "Szenen", items: room.scenes },
        { title: "Geräte", items: room.devices.map((device) => `${device.name} • ${device.type} • ${device.stateLabel}`) }
      ],
      actions: [
        {
          type: "ha-queue",
          label: "Raumaktion einreihen",
          payload: {
            room: room.id,
            scenes: room.scenes,
            devices: room.devices.map((device) => ({ id: device.id, name: device.name, type: device.type }))
          }
        },
        {
          type: "copy",
          label: "HA-Servicecall kopieren",
          value: JSON.stringify({
            room: room.id,
            scenes: room.scenes,
            devices: room.devices.map((device) => ({ id: device.id, name: device.name, type: device.type }))
          }, null, 2)
        }
      ],
      toggles: room.devices
        .filter((device) => ["Light", "Switch", "Media"].includes(device.type))
        .map((device) => ({
          id: device.id,
          label: device.name,
          value: getControlToggleValue(kind, id, device.id, device.state === "on"),
          onLabel: "An",
          offLabel: "Aus"
        }))
    };
  }

  if (kind === "ha-automation") {
    const item = haAutomations.find((entry) => entry.id === id);
    if (!item) return null;
    return {
      title: item.label,
      subtitle: "Automation / Cron / Adapter",
      badges: [{ label: item.stateLabel, tone: item.state }],
      paragraphs: [`Zeitplan: ${item.cron}`, "Die UI ist vorbereitet für Start, Pause, Resume und manuelles Triggern."],
      actions: [
        {
          type: "ha-queue",
          label: "Automation einreihen",
          payload: { automation: item.id, label: item.label, cron: item.cron }
        },
        {
          type: "copy",
          label: "Trigger-Kommando kopieren",
          value: `# HA Adapter Trigger\n${item.label}\nZeitplan: ${item.cron}`
        }
      ],
      toggles: [{ id: "enabled", label: "Automation aktiv", value: getControlToggleValue(kind, id, "enabled", item.state === "live"), onLabel: "Aktiv", offLabel: "Pausiert" }]
    };
  }

  if (kind === "website-page") {
    const page = websitePages.find((entry) => entry.id === id);
    if (!page) return null;
    return {
      title: page.title,
      subtitle: page.path,
      badges: [{ label: page.statusLabel, tone: page.status }],
      paragraphs: [page.note, `Editor-Fokus: ${page.editor}`],
      lists: [{ title: "Bearbeitungsfelder", items: page.editor.split(",").map((item) => item.trim()) }],
      actions: [
        { type: "link", label: "Seite öffnen", href: page.path },
        { type: "link", label: "Abschnitt im Dashboard", href: "#website" },
        { type: "copy", label: "Editor-Notiz kopieren", value: `${page.title}\n${page.path}\n${page.editor}\n${page.note}` }
      ],
      toggles: [{ id: "draft-lock", label: "Bearbeitungsmodus", value: getControlToggleValue(kind, id, "draft-lock", true), onLabel: "Entwurf", offLabel: "Nur Lesen" }]
    };
  }

  if (kind === "shop-draft") {
    const draft = shopDrafts.find((entry) => entry.id === id);
    if (!draft) return null;
    return {
      title: draft.title,
      subtitle: draft.line,
      badges: [{ label: draft.stateLabel, tone: draft.state }],
      paragraphs: [draft.task, `Priorität: ${draft.priority}`],
      actions: [
        { type: "link", label: "Upload Queue CSV", href: "/artifacts/upload-queue/shirtee-upload-queue.csv" },
        { type: "link", label: "Batch Manifest", href: "/artifacts/upload-batches/manifest.json" },
        { type: "bridge-command", label: "Queue erzeugen", command: "generate-upload-queue" },
        { type: "bridge-command", label: "Batches erzeugen", command: "generate-upload-batches" },
        { type: "bridge-command", label: "API-Request bauen", command: "generate-shirtee-api-request" },
        { type: "copy", label: "Queue-Befehl kopieren", value: "npm run generate:upload-queue\nnpm run generate:upload-batches\nnpm run generate:shirtee-api-request" }
      ],
      toggles: [
        { id: "copy-ready", label: "Copy fertig", value: getControlToggleValue(kind, id, "copy-ready", draft.state !== "draft"), onLabel: "Ja", offLabel: "Nein" },
        { id: "upload-ready", label: "Upload bereit", value: getControlToggleValue(kind, id, "upload-ready", draft.state === "ready"), onLabel: "Ja", offLabel: "Nein" }
      ]
    };
  }

  if (kind === "planner-entry") {
    const entry = plannerCalendar.find((item) => item.id === id);
    if (!entry) return null;
    const channel = plannerChannels.find((item) => item.label === entry.channel);
    return {
      title: entry.title,
      subtitle: `${entry.day} • ${entry.slot} • ${entry.channel}`,
      badges: [{ label: entry.statusLabel, tone: entry.status }],
      paragraphs: [channel ? `Kanal: ${channel.handle} • ${channel.cadence}` : "Kanalinfo nicht gefunden."],
      actions: [
        {
          type: "link",
          label: "Social Bereich öffnen",
          href: "#social"
        },
        {
          type: "copy",
          label: "Content-Brief kopieren",
          value: `${entry.title}\nKanal: ${entry.channel}\nSlot: ${entry.day} ${entry.slot}\nStatus: ${entry.statusLabel}`
        }
      ],
      toggles: [
        { id: "script", label: "Script fertig", value: getControlToggleValue(kind, id, "script", entry.status !== "draft"), onLabel: "Fertig", offLabel: "Offen" },
        { id: "upload", label: "Upload freigegeben", value: getControlToggleValue(kind, id, "upload", false), onLabel: "Freigegeben", offLabel: "Blockiert" }
      ]
    };
  }

  if (kind === "cron-job") {
    const job = cronJobs.find((entry) => entry.id === id);
    if (!job) return null;
    return {
      title: job.name,
      subtitle: `Cronjob • ${job.schedule}`,
      badges: [{ label: job.stateLabel, tone: job.state }],
      paragraphs: [`Owner: ${job.owner}`, "Vorbereitung für Run-now, Pause, Resume und Schedule-Editing im Dashboard."],
      actions: [
        {
          type: "bridge-command",
          label: "Jetzt ausführen",
          command: job.name === "sync-control-live"
            ? "sync-control-live"
            : job.name === "check-shirtee-links"
              ? "check-links"
              : "generate-upload-queue"
        },
        {
          type: "copy",
          label: "Cron-Kommando kopieren",
          value: job.name === "sync-control-live"
            ? "npm run sync:control-live"
            : job.name === "check-shirtee-links"
              ? "npm run check:links"
              : "npm run generate:upload-queue"
        }
      ],
      toggles: [{ id: "enabled", label: "Cronjob aktiv", value: getControlToggleValue(kind, id, "enabled", job.state === "live"), onLabel: "Aktiv", offLabel: "Pausiert" }]
    };
  }

  if (kind === "subagent") {
    const agent = subagents.find((entry) => entry.id === id);
    if (!agent) return null;
    return {
      title: agent.name,
      subtitle: agent.mode,
      badges: [{ label: agent.state, tone: agent.state }],
      paragraphs: [`Primärstrategie: ${agent.llm}`, `Fallback: ${agent.fallback}`],
      actions: [
        {
          type: "copy",
          label: "Agent-Regel kopieren",
          value: `${agent.name}\nMode: ${agent.mode}\nPrimary: ${agent.llm}\nFallback: ${agent.fallback}\nRule: erst Cloud LLM, dann Escalation.`
        }
      ],
      toggles: [
        { id: "cloud-first", label: "Cloud LLM zuerst", value: getControlToggleValue(kind, id, "cloud-first", true), onLabel: "Aktiv", offLabel: "Aus" },
        { id: "argus-first", label: "Argus Review zuerst", value: getControlToggleValue(kind, id, "argus-first", true), onLabel: "Aktiv", offLabel: "Aus" }
      ]
    };
  }

  if (kind === "vault-node") {
    const node = vaultNodes.find((entry) => entry.id === id);
    if (!node) return null;
    return {
      title: node.name,
      subtitle: node.role,
      badges: [{ label: node.stateLabel, tone: node.state }],
      paragraphs: [`Steward: ${node.steward}`, "Vorbereitung für Pflege, Writeback und Lernregeln mit Cloud-LLM-sparendem Pfad."],
      actions: [
        { type: "link", label: "AgentsRoom öffnen", href: "#agentsroom" },
        {
          type: "copy",
          label: "Vault-Notiz kopieren",
          value: `${node.name}\nRolle: ${node.role}\nSteward: ${node.steward}\nStatus: ${node.stateLabel}`
        }
      ],
      toggles: [
        { id: "writeback", label: "Writeback aktiv", value: getControlToggleValue(kind, id, "writeback", node.id !== "vault-learning"), onLabel: "Aktiv", offLabel: "Aus" },
        { id: "summary-only", label: "Nur verdichtet speichern", value: getControlToggleValue(kind, id, "summary-only", true), onLabel: "Ja", offLabel: "Nein" }
      ]
    };
  }

  return null;
}

function renderControlDialog(payload) {
  const badges = Array.isArray(payload.badges) ? payload.badges : [];
  const paragraphs = Array.isArray(payload.paragraphs) ? payload.paragraphs : [];
  const lists = Array.isArray(payload.lists) ? payload.lists : [];
  const toggles = Array.isArray(payload.toggles) ? payload.toggles : [];
  const actions = Array.isArray(payload.actions) ? payload.actions : [];
  return `
    <div class="control-dialog-head">
      <p class="eyebrow">${escapeHtml(payload.subtitle || "Workbench")}</p>
      <h3 id="control-dialog-title">${escapeHtml(payload.title || "Detail")}</h3>
      <div class="section-banner-chips">
        ${badges.map((badge) => `<span class="status-pill ${badge.tone ? `is-${badge.tone}` : "is-info"}">${escapeHtml(badge.label)}</span>`).join("")}
      </div>
    </div>
    <div class="control-dialog-content">
      ${paragraphs.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
      ${lists.map((list) => `
        <div class="control-dialog-section">
          <h4>${escapeHtml(list.title)}</h4>
          <ul class="log-list">
            ${(list.items || []).map((item) => `<li><p>${escapeHtml(item)}</p></li>`).join("")}
          </ul>
        </div>
      `).join("")}
      ${actions.length ? `
        <div class="control-dialog-section">
          <h4>Aktionen</h4>
          <div class="action-grid compact">
            ${actions.map((action) => {
              if (action.type === "link") {
                return `<a class="action-btn is-secondary" href="${escapeHtml(action.href)}">${escapeHtml(action.label)}</a>`;
              }
              if (action.type === "bridge-command") {
                return `<button type="button" class="action-btn is-secondary" data-control-command="${escapeHtml(action.command || "")}">${escapeHtml(action.label)}</button>`;
              }
              if (action.type === "ha-queue") {
                return `<button type="button" class="action-btn is-secondary" data-control-ha='${escapeHtml(JSON.stringify(action.payload || {}))}'>${escapeHtml(action.label)}</button>`;
              }
              return `<button type="button" class="action-btn is-secondary" data-control-copy="${escapeHtml(action.value || "")}">${escapeHtml(action.label)}</button>`;
            }).join("")}
          </div>
        </div>
      ` : ""}
      ${toggles.length ? `
        <div class="control-dialog-section">
          <h4>Steuerung</h4>
          <div class="control-toggle-grid">
            ${toggles.map((toggle) => `
              <button type="button" class="control-toggle-card${toggle.value ? " is-active" : ""}" data-control-toggle="${escapeHtml(toggle.id)}">
                <strong>${escapeHtml(toggle.label)}</strong>
                <span>${escapeHtml(toggle.value ? toggle.onLabel : toggle.offLabel)}</span>
              </button>
            `).join("")}
          </div>
        </div>
      ` : ""}
    </div>
  `;
}

function openControlDialog(payload, context) {
  const dialog = document.querySelector("[data-control-dialog]");
  const body = document.querySelector("[data-control-dialog-body]");
  if (!dialog || !body || !payload) return;
  window.__CONTROL_DIALOG_CONTEXT__ = context || null;
  body.innerHTML = renderControlDialog(payload);
  dialog.hidden = false;
  dialog.setAttribute("aria-hidden", "false");
  document.body.classList.add("dialog-open");
}

function closeControlDialog() {
  const dialog = document.querySelector("[data-control-dialog]");
  const body = document.querySelector("[data-control-dialog-body]");
  if (!dialog || !body) return;
  dialog.hidden = true;
  dialog.setAttribute("aria-hidden", "true");
  body.innerHTML = "";
  document.body.classList.remove("dialog-open");
  window.__CONTROL_DIALOG_CONTEXT__ = null;
}

function reopenCurrentDialog() {
  const context = window.__CONTROL_DIALOG_CONTEXT__;
  if (!context) return;
  const payload = buildDialogPayload(window.__CONTROL_DATA__ || {}, context.kind, context.id);
  if (!payload) {
    closeControlDialog();
    return;
  }
  openControlDialog(payload, context);
}

function setupControlDialogActions() {
  document.addEventListener("click", async (event) => {
    const ackAlertTrigger = event.target.closest("[data-ack-alert]");
    if (ackAlertTrigger) {
      acknowledgeAlert(ackAlertTrigger.getAttribute("data-ack-alert"));
      rerenderAlerts();
      return;
    }

    const ackAllTrigger = event.target.closest("[data-ack-all-alerts]");
    if (ackAllTrigger) {
      const warnIds = (window.__CONTROL_DATA__?.alerts || []).filter((item) => item.level === "warn").map((item) => item.id);
      acknowledgeAllAlerts(warnIds);
      rerenderAlerts();
      return;
    }

    const closeTrigger = event.target.closest("[data-control-dialog-close]");
    if (closeTrigger) {
      closeControlDialog();
      return;
    }

    const openTrigger = event.target.closest("[data-control-dialog-kind][data-control-dialog-id]");
    if (openTrigger) {
      const kind = openTrigger.getAttribute("data-control-dialog-kind");
      const id = openTrigger.getAttribute("data-control-dialog-id");
      const payload = buildDialogPayload(window.__CONTROL_DATA__ || {}, kind, id);
      if (payload) {
        openControlDialog(payload, { kind, id });
      }
      return;
    }

    const toggleTrigger = event.target.closest("[data-control-toggle]");
    if (toggleTrigger && window.__CONTROL_DIALOG_CONTEXT__) {
      const { kind, id } = window.__CONTROL_DIALOG_CONTEXT__;
      const controlId = toggleTrigger.getAttribute("data-control-toggle");
      const nextValue = !toggleTrigger.classList.contains("is-active");
      await setControlToggleValue(kind, id, controlId, nextValue);
      reopenCurrentDialog();
      return;
    }

    const commandTrigger = event.target.closest("[data-control-command]");
    if (commandTrigger) {
      const command = commandTrigger.getAttribute("data-control-command");
      const previous = commandTrigger.textContent;
      commandTrigger.textContent = "Läuft...";
      try {
        if (hasControlBridge()) {
          await runBridgeCommand(command);
          if (command === "sync-control-live") {
            const nextLiveMetrics = await loadLiveMetrics();
            if (nextLiveMetrics?.metadata) {
              window.__CONTROL_DATA__ = nextLiveMetrics;
              renderDashboardView(applyRangeToData(nextLiveMetrics, "live"));
            }
          }
          commandTrigger.textContent = "Erledigt";
        } else {
          commandTrigger.textContent = "Bridge fehlt";
        }
      } catch {
        commandTrigger.textContent = "Fehler";
      }
      window.setTimeout(() => {
        commandTrigger.textContent = previous;
      }, 1600);
      return;
    }

    const haTrigger = event.target.closest("[data-control-ha]");
    if (haTrigger) {
      const previous = haTrigger.textContent;
      haTrigger.textContent = "Eingereiht...";
      try {
        if (hasControlBridge()) {
          const payload = JSON.parse(haTrigger.getAttribute("data-control-ha") || "{}");
          await queueHaAction(payload);
          haTrigger.textContent = "In Queue";
        } else {
          haTrigger.textContent = "Bridge fehlt";
        }
      } catch {
        haTrigger.textContent = "Fehler";
      }
      window.setTimeout(() => {
        haTrigger.textContent = previous;
      }, 1600);
      return;
    }

    const copyTrigger = event.target.closest("[data-control-copy]");
    if (copyTrigger) {
      const value = copyTrigger.getAttribute("data-control-copy") || "";
      navigator.clipboard.writeText(value).then(() => {
        const previous = copyTrigger.textContent;
        copyTrigger.textContent = "Kopiert";
        window.setTimeout(() => {
          copyTrigger.textContent = previous;
        }, 1400);
      }).catch(() => {});
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeControlDialog();
    }
  });
}

function updateNetworkInspector(workspace, node) {
  if (!workspace || !node) return;

  const view = node.closest("[data-network-view]");
  const selectedId = node.getAttribute("data-network-node") || "";
  view?.querySelectorAll("[data-network-node]").forEach((item) => {
    const isSelected = item === node;
    item.classList.toggle("is-selected", isSelected);
    item.setAttribute("aria-pressed", isSelected ? "true" : "false");
  });

  view?.querySelectorAll("[data-edge-from]").forEach((edge) => {
    const connected = edge.getAttribute("data-edge-from") === selectedId || edge.getAttribute("data-edge-to") === selectedId;
    edge.classList.toggle("is-highlighted", connected);
    edge.classList.toggle("is-muted", !connected);
  });

  view?.querySelectorAll("[data-route-from]").forEach((route) => {
    const connected = route.getAttribute("data-route-from") === selectedId || route.getAttribute("data-route-to") === selectedId;
    route.classList.toggle("is-highlighted", connected);
    route.classList.toggle("is-muted", !connected);
  });

  const setText = (selector, value) => {
    const target = workspace.querySelector(selector);
    if (target) target.textContent = value || "n/a";
  };

  setText("[data-network-inspector-name]", node.dataset.networkName);
  setText("[data-network-inspector-role]", node.dataset.networkRole);
  setText("[data-network-inspector-status]", node.dataset.networkStatus);
  setText("[data-network-inspector-channel]", node.dataset.networkChannel);
  setText("[data-network-inspector-route]", node.dataset.networkRoute);
  setText("[data-network-inspector-connections]", node.dataset.networkConnections || "Keine direkte Verbindung im aktuellen Snapshot.");
}

function highlightNetworkRoute(workspace, fromId, toId) {
  if (!workspace || !fromId || !toId) return;
  const activeView = workspace.querySelector("[data-network-view]:not([hidden])");
  if (!activeView) return;

  activeView.querySelectorAll("[data-edge-from]").forEach((edge) => {
    const match = edge.getAttribute("data-edge-from") === fromId && edge.getAttribute("data-edge-to") === toId;
    edge.classList.toggle("is-highlighted", match);
    edge.classList.toggle("is-muted", !match);
  });

  activeView.querySelectorAll("[data-route-from]").forEach((route) => {
    const match = route.getAttribute("data-route-from") === fromId && route.getAttribute("data-route-to") === toId;
    route.classList.toggle("is-highlighted", match);
    route.classList.toggle("is-muted", !match);
  });

  const targetNode = activeView.querySelector(`[data-network-node="${toId}"]`) || activeView.querySelector(`[data-network-node="${fromId}"]`);
  if (targetNode) {
    updateNetworkInspector(workspace, targetNode);
  }
}

function setDeckPanel(deck, panelId) {
  if (!deck || !panelId) return;
  const deckId = deck.getAttribute("data-control-deck") || "default";
  window.__CONTROL_DECK_STATE__ = window.__CONTROL_DECK_STATE__ || {};
  window.__CONTROL_DECK_STATE__[deckId] = panelId;

  deck.querySelectorAll("[data-deck-panel]").forEach((button) => {
    const isActive = button.getAttribute("data-deck-panel") === panelId;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  deck.querySelectorAll("[data-deck-panel-content]").forEach((panel) => {
    const isActive = panel.getAttribute("data-deck-panel-content") === panelId;
    panel.classList.toggle("is-active", isActive);
    panel.hidden = !isActive;
  });
}

function restoreControlDecks() {
  document.querySelectorAll("[data-control-deck]").forEach((deck) => {
    const deckId = deck.getAttribute("data-control-deck") || "default";
    const defaultPanel = deck.getAttribute("data-default-panel") || deck.querySelector("[data-deck-panel]")?.getAttribute("data-deck-panel");
    const savedPanel = window.__CONTROL_DECK_STATE__?.[deckId] || defaultPanel;
    setDeckPanel(deck, savedPanel);
  });
}

function setNetworkZoom(workspace, nextZoom) {
  if (!workspace) return;
  const zoom = Math.min(NETWORK_ZOOM_MAX, Math.max(NETWORK_ZOOM_MIN, Number(nextZoom) || 1));
  window.__CONTROL_NETWORK_ZOOM__ = zoom;

  workspace.querySelectorAll("[data-network-zoom-shell]").forEach((shell) => {
    shell.style.setProperty("--network-zoom", String(zoom));
  });

  workspace.querySelectorAll("[data-network-zoom-reset]").forEach((button) => {
    button.textContent = `${Math.round(zoom * 100)}%`;
  });

  workspace.querySelectorAll("[data-network-zoom-out]").forEach((button) => {
    button.disabled = zoom <= NETWORK_ZOOM_MIN;
  });

  workspace.querySelectorAll("[data-network-zoom-in]").forEach((button) => {
    button.disabled = zoom >= NETWORK_ZOOM_MAX;
  });
}

function focusNetworkNode(workspace, mode, name) {
  if (!workspace || !name) return;
  const targetMode = ["agents", "devices", "vault"].includes(mode) ? mode : "agents";
  setNetworkMode(workspace, targetMode);
  const nodeId = String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const view = workspace.querySelector(`[data-network-view="${targetMode}"]`);
  const node = view?.querySelector(`[data-network-node="${nodeId}"]`);
  if (!node) return;
  updateNetworkInspector(workspace, node);
  node.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
}

function setNetworkMode(workspace, mode) {
  if (!workspace) return;
  const nextMode = ["agents", "devices", "vault"].includes(mode) ? mode : "agents";
  window.__CONTROL_NETWORK_MODE__ = nextMode;

  workspace.querySelectorAll("[data-network-mode]").forEach((button) => {
    const isActive = button.getAttribute("data-network-mode") === nextMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  workspace.querySelectorAll("[data-network-view]").forEach((view) => {
    view.hidden = view.getAttribute("data-network-view") !== nextMode;
  });

  const activeView = workspace.querySelector(`[data-network-view="${nextMode}"]`);
  const selectedNode = activeView?.querySelector("[data-network-node].is-selected") || activeView?.querySelector("[data-network-node]");
  updateNetworkInspector(workspace, selectedNode);
}

function restoreAgentsRoomControls() {
  const workspace = document.querySelector("[data-network-workspace]");
  setNetworkMode(workspace, window.__CONTROL_NETWORK_MODE__ || "agents");
  setNetworkZoom(workspace, window.__CONTROL_NETWORK_ZOOM__ || 1);
}

function setupAgentsRoomControls() {
  document.addEventListener("click", async (event) => {
    const copyButton = event.target.closest("[data-network-copy]");
    if (copyButton) {
      const workspace = copyButton.closest("[data-network-workspace]");
      const inspector = workspace?.querySelector("[data-network-inspector]");
      const diagnostic = {
        name: inspector?.querySelector("[data-network-inspector-name]")?.textContent || "n/a",
        status: inspector?.querySelector("[data-network-inspector-status]")?.textContent || "n/a",
        channel: inspector?.querySelector("[data-network-inspector-channel]")?.textContent || "n/a",
        route: inspector?.querySelector("[data-network-inspector-route]")?.textContent || "n/a",
        connections: inspector?.querySelector("[data-network-inspector-connections]")?.textContent || "n/a"
      };
      let copied = false;
      try {
        await navigator.clipboard.writeText(JSON.stringify(diagnostic, null, 2));
        copied = true;
      } catch {
        copied = false;
      }
      copyButton.textContent = copied ? "Diagnose kopiert" : "Kopieren blockiert";
      window.setTimeout(() => { copyButton.textContent = "Diagnose kopieren"; }, 1800);
      return;
    }

    const resetButton = event.target.closest("[data-network-reset]");
    if (resetButton) {
      const workspace = resetButton.closest("[data-network-workspace]");
      const activeView = workspace?.querySelector("[data-network-view]:not([hidden])");
      activeView?.querySelectorAll(".is-muted, .is-highlighted").forEach((item) => item.classList.remove("is-muted", "is-highlighted"));
      return;
    }

    const routeCard = event.target.closest("[data-route-from][data-route-to]");
    if (routeCard) {
      const workspace = routeCard.closest("[data-network-workspace]");
      highlightNetworkRoute(workspace, routeCard.getAttribute("data-route-from"), routeCard.getAttribute("data-route-to"));
      return;
    }

    const haCopyButton = event.target.closest("[data-ha-copy]");
    if (haCopyButton) {
      const snapshot = window.__CONTROL_DATA__?.agentsRoom || {};
      const haData = {
        generatedAt: window.__CONTROL_DATA__?.metadata?.generatedAt || null,
        device: snapshot.devices?.find((item) => item.name === "Home Assistant") || null,
        agent: snapshot.agents?.find((item) => item.name === "Heimdall") || null,
        routes: snapshot.routing?.filter((item) => /Home Assistant|Heimdall/i.test(`${item.from} ${item.to} ${item.channel}`)) || [],
        delegations: snapshot.delegations?.filter((item) => /Home Assistant|Heimdall|HA-/i.test(`${item.from} ${item.to} ${item.channel} ${item.task}`)) || []
      };
      let copied = false;
      try {
        await navigator.clipboard.writeText(JSON.stringify(haData, null, 2));
        copied = true;
      } catch {
        copied = false;
      }
      haCopyButton.textContent = copied ? "HA-Diagnose kopiert" : "Kopieren blockiert";
      window.setTimeout(() => { haCopyButton.textContent = "HA-Diagnose kopieren"; }, 1800);
      return;
    }

    const modeButton = event.target.closest("[data-network-mode]");
    if (modeButton) {
      setNetworkMode(modeButton.closest("[data-network-workspace]"), modeButton.getAttribute("data-network-mode"));
      return;
    }

    const zoomOutButton = event.target.closest("[data-network-zoom-out]");
    if (zoomOutButton) {
      setNetworkZoom(zoomOutButton.closest("[data-network-workspace]"), (window.__CONTROL_NETWORK_ZOOM__ || 1) - NETWORK_ZOOM_STEP);
      return;
    }

    const zoomInButton = event.target.closest("[data-network-zoom-in]");
    if (zoomInButton) {
      setNetworkZoom(zoomInButton.closest("[data-network-workspace]"), (window.__CONTROL_NETWORK_ZOOM__ || 1) + NETWORK_ZOOM_STEP);
      return;
    }

    const zoomResetButton = event.target.closest("[data-network-zoom-reset]");
    if (zoomResetButton) {
      setNetworkZoom(zoomResetButton.closest("[data-network-workspace]"), 1);
      return;
    }

    const targetModeButton = event.target.closest("[data-network-target-mode]");
    if (targetModeButton) {
      const deck = document.querySelector('[data-control-deck="agentsroom"]');
      setDeckPanel(deck, "topology");
      const workspace = targetModeButton.closest(".control-deck")?.querySelector("[data-network-workspace]") || document.querySelector("[data-network-workspace]");
      setNetworkMode(workspace, targetModeButton.getAttribute("data-network-target-mode"));
      window.location.hash = "#agentsroom";
      return;
    }

    const deckButton = event.target.closest("[data-deck-panel]");
    if (deckButton) {
      const deck = deckButton.closest("[data-control-deck]");
      setDeckPanel(deck, deckButton.getAttribute("data-deck-panel"));
      return;
    }

    const focusCard = event.target.closest("[data-focus-mode][data-focus-name]");
    if (focusCard) {
      const deck = document.querySelector('[data-control-deck="agentsroom"]');
      setDeckPanel(deck, "topology");
      const workspace = document.querySelector("[data-network-workspace]");
      focusNetworkNode(workspace, focusCard.getAttribute("data-focus-mode"), focusCard.getAttribute("data-focus-name"));
      window.location.hash = "#agentsroom";
      return;
    }

    const node = event.target.closest("[data-network-node]");
    if (node) {
      updateNetworkInspector(node.closest("[data-network-workspace]"), node);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const focusCard = event.target.closest("[data-focus-mode][data-focus-name]");
    if (!focusCard) return;
    event.preventDefault();
    const deck = document.querySelector('[data-control-deck="agentsroom"]');
    setDeckPanel(deck, "topology");
    const workspace = document.querySelector("[data-network-workspace]");
    focusNetworkNode(workspace, focusCard.getAttribute("data-focus-mode"), focusCard.getAttribute("data-focus-name"));
    window.location.hash = "#agentsroom";
  });
}

function setupAppShell() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  const url = new URL(window.location.href);
  const isQaMode = url.searchParams.has("qa");

  if (isQaMode) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations
        .filter((registration) => String(registration.scope || "").includes("/control/"))
        .forEach((registration) => {
          registration.unregister().catch(() => {});
        });
    }).catch(() => {});
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/control/sw.js").catch(() => {});
  });
}

function renderDashboardView(data) {
  const viewData = applyBridgeStateToData(data);
  renderModeBadge(document.querySelector("[data-mode-badge]"), viewData.metadata);
  renderVisualPulse(document.querySelector("[data-visual-pulse]"), viewData);
  renderSystemStatus(document.querySelector("[data-system-status]"), viewData.systemStatus);
  renderHermesChat(document.querySelector("[data-hermes-chat]"), viewData);
  renderKpis(document.querySelector("[data-kpis]"), viewData.overviewKpis);
  renderAgentsRoomSection(document.querySelector("[data-agentsroom-section]"), viewData.agentsRoom);
  renderHomeAssistantSection(document.querySelector("[data-home-assistant-section]"), viewData);
  renderWebsiteSection(document.querySelector("[data-website-section]"), viewData.websiteMetrics);
  renderShopSection(document.querySelector("[data-shop-section]"), viewData.shopMetrics);
  renderCatalogUploadSection(document.querySelector("[data-catalog-upload-section]"), viewData.shopMetrics);
  renderActivity(document.querySelector("[data-activity-feed]"), viewData.activityFeed, viewData.shopMetrics.timeline);
  renderPerformance(document.querySelector("[data-performance-section]"), viewData.performanceMetrics);
  renderContent(document.querySelector("[data-content-section]"), viewData.contentPerformance);
  renderSocial(document.querySelector("[data-social-section]"), viewData.socialMetrics);
  renderAlerts(document.querySelector("[data-alerts]"), viewData.alerts, viewData.metadata);
  renderQuickActions(document.querySelector("[data-quick-actions]"), viewData);
  animateKpis();
  restoreControlDecks();
  restoreAgentsRoomControls();
  if (!document.querySelector("[data-control-dialog]")?.hidden) {
    reopenCurrentDialog();
  }
}

async function initControlDashboard() {
  if (!ensureControlAccess()) {
    return;
  }

  await loadControlBridge();
  const liveMetrics = await loadLiveMetrics();
  if (!liveMetrics || !liveMetrics.metadata) {
    throw new Error("Live-Daten konnten nicht geladen werden.");
  }
  let seedData = liveMetrics;
  window.__CONTROL_DATA__ = seedData;
  let refreshInFlight = false;

  renderNav(document.querySelector("[data-control-nav]"), controlNav);
  renderRanges(document.querySelector("[data-date-ranges]"), dateRanges);
  renderDashboardView(applyRangeToData(seedData, dateRanges[0]?.id || "live"));

  setupNavigation();
  setupSectionVisibilityRouting();
  setupSectionScrollSpy();
  setupRangeButtons((rangeId) => {
    renderDashboardView(applyRangeToData(seedData, rangeId));
  });
  setupExportAction();
  setupUploadQueueExportAction();
  setupLogoutAction();
  setupReloadAction(async () => {
    if (refreshInFlight) {
      return;
    }
    refreshInFlight = true;
    try {
      if (hasControlBridge()) {
        try {
          await runBridgeCommand("sync-control-live");
        } catch (error) {
          console.warn("sync-control-live fehlgeschlagen", error);
        }
      }
      const nextLiveMetrics = await loadLiveMetrics();
      if (!nextLiveMetrics || !nextLiveMetrics.metadata) {
        return;
      }
      seedData = nextLiveMetrics;
      window.__CONTROL_DATA__ = seedData;
      renderDashboardView(applyRangeToData(seedData, "live"));
    } finally {
      refreshInFlight = false;
    }
  });
  setupAppShell();
  setupHermesChatActions();
  setupAgentsRoomControls();
  setupControlDialogActions();

  window.setInterval(async () => {
    if (refreshInFlight) {
      return;
    }
    refreshInFlight = true;
    try {
      if (hasControlBridge()) {
        try {
          await runBridgeCommand("sync-control-live");
        } catch {
          // Polling bleibt best-effort, auch wenn der Bridge-Sync ausfällt.
        }
      }
      const nextLiveMetrics = await loadLiveMetrics();
      if (nextLiveMetrics && nextLiveMetrics.metadata) {
        seedData = nextLiveMetrics;
        window.__CONTROL_DATA__ = seedData;
        renderDashboardView(applyRangeToData(seedData, "live"));
      }
    } finally {
      refreshInFlight = false;
    }
  }, LIVE_REFRESH_MS);
}

document.addEventListener("DOMContentLoaded", () => {
  initControlDashboard().catch((error) => {
    console.error(error);
    const root = document.querySelector(".control-main");
    if (root) {
      root.innerHTML = `
        <section class="control-section">
          <div class="panel">
            <h3>Live-Daten nicht verfügbar</h3>
            <p>Das Control UI konnte keine verifizierten Live-Daten laden. Bitte den Sync erneut ausführen.</p>
            <p class="muted-line">Befehl: <code>npm run sync:control-live</code></p>
          </div>
        </section>
      `;
    }
  });
});
