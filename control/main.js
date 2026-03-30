import { dashboardData } from "./js/mock-data.js";
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

function mergeLiveMetrics(baseData, liveMetrics) {
  if (!liveMetrics?.social?.rows) {
    return baseData;
  }

  const data = JSON.parse(JSON.stringify(baseData));
  data.metadata.mode = liveMetrics.sourceMode || "mixed-live";
  data.metadata.generatedAt = liveMetrics.generatedAt || data.metadata.generatedAt;
  data.socialMetrics.links = liveMetrics.social.rows;
  data.socialMetrics.strongestPlatform = liveMetrics.social.strongestPlatform || data.socialMetrics.strongestPlatform;
  return data;
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
  const nodes = document.querySelectorAll("[data-kpi-value]");
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
  const profile = {
    today: { factor: 0.24, traffic: 0.7, pctShift: -0.4, label: "Heute" },
    week: { factor: 1, traffic: 1, pctShift: 0, label: "7 Tage" },
    month: { factor: 3.8, traffic: 1.35, pctShift: 0.6, label: "30 Tage" }
  }[rangeId] || { factor: 1, traffic: 1, pctShift: 0, label: "7 Tage" };

  data.metadata.activeRange = profile.label;

  data.overviewKpis = data.overviewKpis.map((kpi) => {
    const next = { ...kpi };
    if (next.unit === "%") {
      next.value = Number((Number(next.value || 0) + profile.pctShift).toFixed(1));
      return next;
    }
    next.value = Math.max(0, Math.round(Number(next.value || 0) * profile.factor));
    return next;
  });

  data.websiteMetrics.trafficSeries = data.websiteMetrics.trafficSeries.map((point) => ({
    ...point,
    visitors: Math.max(1, Math.round(Number(point.visitors || 0) * profile.traffic)),
    pageviews: Math.max(1, Math.round(Number(point.pageviews || 0) * profile.traffic))
  }));

  data.shopMetrics.topProducts = data.shopMetrics.topProducts.map((item) => ({
    ...item,
    clicks: Math.max(1, Math.round(Number(item.clicks || 0) * profile.factor)),
    orders: Math.max(1, Math.round(Number(item.orders || 0) * Math.max(profile.factor * 0.9, 0.4))),
    revenue: Math.max(1, Math.round(Number(item.revenue || 0) * profile.factor))
  }));

  data.socialMetrics.links = data.socialMetrics.links.map((item) => {
    const next = { ...item };
    if (typeof next.metricValue === "number") {
      next.metricValue = Math.max(0, Math.round(next.metricValue * profile.factor));
      return next;
    }
    if (typeof next.clicks === "number") {
      next.clicks = Math.max(0, Math.round(next.clicks * profile.factor));
    }
    return next;
  });

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
      source: "control-mock-snapshot",
      data: dashboardData
    };

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
  const seedData = mergeLiveMetrics(dashboardData, liveMetrics);

  renderNav(document.querySelector("[data-control-nav]"), controlNav);
  renderRanges(document.querySelector("[data-date-ranges]"), dateRanges);
  renderDashboardView(applyRangeToData(seedData, "week"));

  setupNavigation();
  setupRangeButtons((rangeId) => {
    renderDashboardView(applyRangeToData(seedData, rangeId));
  });
  setupExportAction();
  setupLogoutAction();
  setupAppShell();
}

document.addEventListener("DOMContentLoaded", initControlDashboard);
