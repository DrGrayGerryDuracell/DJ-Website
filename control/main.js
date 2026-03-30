import { dashboardData } from "./js/mock-data.js";
import { controlNav, dateRanges } from "./js/config.js";
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

function setupNavigation() {
  const toggle = document.querySelector("[data-control-nav-toggle]");
  const layout = document.querySelector(".control-layout");
  if (!toggle || !layout) return;

  toggle.addEventListener("click", function () {
    layout.classList.toggle("nav-open");
  });
}

function setupRangeButtons() {
  document.querySelectorAll(".range-btn").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".range-btn").forEach((node) => node.classList.remove("is-active"));
      button.classList.add("is-active");
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

function setupAppShell() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

function initControlDashboard() {
  renderNav(document.querySelector("[data-control-nav]"), controlNav);
  renderRanges(document.querySelector("[data-date-ranges]"), dateRanges);
  renderModeBadge(document.querySelector("[data-mode-badge]"), dashboardData.metadata);
  renderVisualPulse(document.querySelector("[data-visual-pulse]"), dashboardData);
  renderSystemStatus(document.querySelector("[data-system-status]"), dashboardData.systemStatus);
  renderKpis(document.querySelector("[data-kpis]"), dashboardData.overviewKpis);
  renderWebsiteSection(document.querySelector("[data-website-section]"), dashboardData.websiteMetrics);
  renderShopSection(document.querySelector("[data-shop-section]"), dashboardData.shopMetrics);
  renderActivity(document.querySelector("[data-activity-feed]"), dashboardData.activityFeed, dashboardData.shopMetrics.timeline);
  renderPerformance(document.querySelector("[data-performance-section]"), dashboardData.performanceMetrics);
  renderContent(document.querySelector("[data-content-section]"), dashboardData.contentPerformance);
  renderSocial(document.querySelector("[data-social-section]"), dashboardData.socialMetrics);
  renderAlerts(document.querySelector("[data-alerts]"), dashboardData.alerts);
  renderQuickActions(document.querySelector("[data-quick-actions]"), dashboardData.quickActions);

  setupNavigation();
  setupRangeButtons();
  setupExportAction();
  setupAppShell();
}

document.addEventListener("DOMContentLoaded", initControlDashboard);
