import { formatNumber, formatValue, trendClass, levelClass } from "./formatters.js";

function buildTrafficBars(series) {
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

export function renderNav(container, nav) {
  container.innerHTML = nav
    .map((item) => `<a href="#${item.id}" class="control-nav-link">${item.label}</a>`)
    .join("");
}

export function renderRanges(container, ranges) {
  container.innerHTML = ranges
    .map((range, index) => `<button class="range-btn${index === 1 ? " is-active" : ""}" data-range="${range.id}">${range.label}</button>`)
    .join("");
}

export function renderModeBadge(node, metadata) {
  node.textContent = `Data Mode: ${String(metadata.mode || "mock").toUpperCase()} • ${metadata.timezone}`;
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
      return `
        <article class="kpi-card">
          <span class="kpi-label">${kpi.label}</span>
          <strong class="kpi-value">${value}</strong>
          <span class="kpi-delta ${trendClass(kpi.trend)}">${kpi.delta}</span>
        </article>
      `;
    })
    .join("");
}

export function renderWebsiteSection(container, metrics) {
  container.innerHTML = `
    <article class="panel">
      <h3>Traffic Verlauf</h3>
      <div class="metric-bars">${buildTrafficBars(metrics.trafficSeries)}</div>
    </article>
    <article class="panel">
      <h3>Top-Seiten</h3>
      <table class="data-table">
        <thead><tr><th>Seite</th><th>Views</th><th>CTR</th></tr></thead>
        <tbody>
          ${metrics.topPages
            .map((row) => `<tr><td>${row.page}</td><td>${formatNumber(row.views)}</td><td>${row.ctr}</td></tr>`)
            .join("")}
        </tbody>
      </table>
      <div class="mini-grid">
        <div><span>Ø Session</span><strong>${metrics.engagement.avgSession}</strong></div>
        <div><span>Absprungrate</span><strong>${metrics.engagement.bounceRate}</strong></div>
        <div><span>Button CTR</span><strong>${metrics.engagement.buttonCtr}</strong></div>
      </div>
    </article>
  `;
}

export function renderShopSection(container, shopMetrics) {
  container.innerHTML = `
    <article class="panel">
      <h3>Shop Kennzahlen</h3>
      <div class="mini-grid three">
        <div><span>Bestellungen heute</span><strong>${shopMetrics.period.today.orders}</strong></div>
        <div><span>Umsatz heute</span><strong>${formatValue(shopMetrics.period.today.revenue, "EUR")}</strong></div>
        <div><span>Conversion</span><strong>${shopMetrics.period.today.conversion}</strong></div>
      </div>
      <div class="mini-grid three">
        <div><span>Bestellungen Woche</span><strong>${shopMetrics.period.week.orders}</strong></div>
        <div><span>Umsatz Woche</span><strong>${formatValue(shopMetrics.period.week.revenue, "EUR")}</strong></div>
        <div><span>AOV</span><strong>${shopMetrics.averageOrderValue}</strong></div>
      </div>
    </article>
    <article class="panel">
      <h3>Top-Produkte</h3>
      <table class="data-table">
        <thead><tr><th>Produkt</th><th>Klicks</th><th>Orders</th><th>Umsatz</th></tr></thead>
        <tbody>
          ${shopMetrics.topProducts
            .map((row) => `<tr><td>${row.name}</td><td>${row.clicks}</td><td>${row.orders}</td><td>${formatValue(row.revenue, "EUR")}</td></tr>`)
            .join("")}
        </tbody>
      </table>
      <p class="muted-line">Warenkorb-Abbruch: <strong>${shopMetrics.cartAbandonment}</strong> • Neue Kunden: <strong>${shopMetrics.customerSplit.newCustomers}%</strong></p>
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
  container.innerHTML = `
    <article class="panel">
      <h3>Performance & Technik</h3>
      <div class="mini-grid three">
        <div><span>Uptime</span><strong>${performanceMetrics.uptime}</strong></div>
        <div><span>Antwortzeit</span><strong>${performanceMetrics.responseTime}</strong></div>
        <div><span>Status</span><strong>Online</strong></div>
      </div>
      <ul class="status-list compact">
        ${performanceMetrics.webVitals
          .map((item) => `<li><span>${item.metric}</span><strong class="status-pill ${item.state === "good" ? "is-ok" : "is-warn"}">${item.value}</strong></li>`)
          .join("")}
      </ul>
    </article>
    <article class="panel">
      <h3>Checks & Error Log</h3>
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
  container.innerHTML = `
    <article class="panel">
      <h3>Starke Sections</h3>
      <div class="metric-bars">
        ${contentPerformance.strongestSections
          .map((item) => `<div class="metric-bar-row"><span class="metric-bar-label">${item.section}</span><div class="metric-bar-track"><span class="metric-bar-fill" style="width:${item.score}%"></span></div><strong>${item.score}</strong></div>`)
          .join("")}
      </div>
    </article>
    <article class="panel">
      <h3>CTA Performance</h3>
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
  container.innerHTML = `
    <article class="panel">
      <h3>Social & Externe Ziele</h3>
      <table class="data-table">
        <thead><tr><th>Plattform</th><th>Klicks</th><th>CTR</th></tr></thead>
        <tbody>
          ${socialMetrics.links.map((row) => `<tr><td>${row.platform}</td><td>${row.clicks}</td><td>${row.ctr}</td></tr>`).join("")}
        </tbody>
      </table>
    </article>
    <article class="panel">
      <h3>Live Ziele & Vergleiche</h3>
      <ul class="account-list">
        ${socialMetrics.officialAccounts
          .map(
            (item) =>
              `<li><span>${item.label}</span><a href="${item.url}" target="_blank" rel="noopener noreferrer">${item.url}</a><em class="status-pill ${item.status === "live" ? "is-ok" : "is-warn"}">${item.status}</em></li>`
          )
          .join("")}
      </ul>
      <ul class="status-list compact">
        ${socialMetrics.comparisons.map((item) => `<li><span>${item.label}</span><strong>${item.value}</strong></li>`).join("")}
      </ul>
    </article>
  `;
}

export function renderAlerts(container, alerts) {
  container.innerHTML = alerts
    .map((alert) => {
      const cls = alert.level === "warn" ? "is-warn" : alert.level === "ok" ? "is-ok" : "is-info";
      return `<article class="alert-card ${cls}"><h4>${alert.title}</h4><p>${alert.description}</p><span>${alert.source}</span></article>`;
    })
    .join("");
}

export function renderQuickActions(container, actions) {
  container.innerHTML = actions
    .map((item) => `<a class="action-btn" href="${item.href}" ${item.external ? 'target="_blank" rel="noopener noreferrer"' : ""}>${item.label}</a>`)
    .join("");
}
