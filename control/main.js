import { controlNav, dateRanges } from "./js/config.js";
import { ensureControlAccess, clearControlSession } from "./js/auth.js";
import {
  renderNav,
  renderRanges,
  renderModeBadge,
  renderVisualPulse,
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

async function loadLiveMetrics() {
  try {
    const response = await fetch("/control/js/live-metrics.json", {
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
  renderKpis(document.querySelector("[data-kpis]"), data.overviewKpis);
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

  renderNav(document.querySelector("[data-control-nav]"), controlNav);
  renderRanges(document.querySelector("[data-date-ranges]"), dateRanges);
  renderDashboardView(applyRangeToData(seedData, dateRanges[0]?.id || "live"));

  setupNavigation();
  setupRangeButtons((rangeId) => {
    renderDashboardView(applyRangeToData(seedData, rangeId));
  });
  setupExportAction();
  setupUploadQueueExportAction();
  setupLogoutAction();
  setupReloadAction(async () => {
    const nextLiveMetrics = await loadLiveMetrics();
    if (!nextLiveMetrics || !nextLiveMetrics.metadata) {
      return;
    }
    seedData = nextLiveMetrics;
    window.__CONTROL_DATA__ = seedData;
    renderDashboardView(applyRangeToData(seedData, "live"));
  });
  setupAppShell();
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
