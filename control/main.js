import { controlNav, dateRanges } from "./js/config.js";
import { ensureControlAccess, clearControlSession } from "./js/auth.js";
import {
  renderNav,
  renderRanges,
  renderModeBadge,
  renderVisualPulse,
  renderHermesChat,
  renderAgentsRoomSection,
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
} from "./js/render.js";

const LIVE_REFRESH_MS = 30000;

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
    let spoolCreated = true;
    try {
      downloadHermesSpoolFile(text, session);
    } catch {
      // Download ist ein Komfort-Fallback; Queue bleibt erhalten.
      spoolCreated = false;
    }
    input.value = "";
    renderHermesChat(document.querySelector("[data-hermes-chat]"), data);
    setHermesChatStatus(spoolCreated ? "Spool-Datei erzeugt" : "Spool-Download blockiert", spoolCreated ? "is-live" : "is-warn");
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

function setNetworkMode(workspace, mode) {
  if (!workspace) return;
  const nextMode = mode === "devices" ? "devices" : "agents";
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
}

function setupAgentsRoomControls() {
  document.addEventListener("click", (event) => {
    const modeButton = event.target.closest("[data-network-mode]");
    if (modeButton) {
      setNetworkMode(modeButton.closest("[data-network-workspace]"), modeButton.getAttribute("data-network-mode"));
      return;
    }

    const node = event.target.closest("[data-network-node]");
    if (node) {
      updateNetworkInspector(node.closest("[data-network-workspace]"), node);
    }
  });
}

function setupAppShell() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/control/sw.js").catch(() => {});
  });
}

function renderDashboardView(data) {
  renderModeBadge(document.querySelector("[data-mode-badge]"), data.metadata);
  renderVisualPulse(document.querySelector("[data-visual-pulse]"), data);
  renderSystemStatus(document.querySelector("[data-system-status]"), data.systemStatus);
  renderHermesChat(document.querySelector("[data-hermes-chat]"), data);
  renderKpis(document.querySelector("[data-kpis]"), data.overviewKpis);
  renderAgentsRoomSection(document.querySelector("[data-agentsroom-section]"), data.agentsRoom);
  renderWebsiteSection(document.querySelector("[data-website-section]"), data.websiteMetrics);
  renderShopSection(document.querySelector("[data-shop-section]"), data.shopMetrics);
  renderCatalogUploadSection(document.querySelector("[data-catalog-upload-section]"), data.shopMetrics);
  renderActivity(document.querySelector("[data-activity-feed]"), data.activityFeed, data.shopMetrics.timeline);
  renderPerformance(document.querySelector("[data-performance-section]"), data.performanceMetrics);
  renderContent(document.querySelector("[data-content-section]"), data.contentPerformance);
  renderSocial(document.querySelector("[data-social-section]"), data.socialMetrics);
  renderAlerts(document.querySelector("[data-alerts]"), data.alerts);
  renderQuickActions(document.querySelector("[data-quick-actions]"), data.quickActions);
  animateKpis();
  restoreAgentsRoomControls();
}

async function initControlDashboard() {
  if (!ensureControlAccess()) {
    return;
  }

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

  window.setInterval(async () => {
    if (refreshInFlight) {
      return;
    }
    refreshInFlight = true;
    try {
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
            <h3>Live-Daten nicht verfuegbar</h3>
            <p>Das Control UI konnte keine verifizierten Live-Daten laden. Bitte den Sync erneut ausfuehren.</p>
            <p class="muted-line">Befehl: <code>npm run sync:control-live</code></p>
          </div>
        </section>
      `;
    }
  });
});
