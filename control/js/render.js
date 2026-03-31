import { formatNumber, formatValue, trendClass, levelClass } from "./formatters.js";

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
  node.textContent = `Datenquelle: ${String(metadata.mode || "live").toUpperCase()} • ${metadata.timezone}${range}`;
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
      <p class="pulse-copy">Stärkster Kanal: <strong>${dashboardData.socialMetrics.strongestPlatform || socialTop[0]?.platform || "n/a"}</strong></p>
    </article>
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
  container.innerHTML = `
    <article class="panel">
      <h3>Antwortzeit pro gepruefter Seite</h3>
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
  const ready = itemStates.filter((item) => item.uploadState === "ready");
  const pending = itemStates.filter((item) => item.uploadState === "pending");

  const renderCard = (item) => {
    const badgeClass = item.uploadState === "uploaded" ? "is-ok" : item.uploadState === "ready" ? "is-warn" : "is-info";
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
        <div><span>Noch offen</span><strong>${formatValue(catalog.pendingCount || pending.length)}</strong></div>
      </div>
      <div class="mini-grid three">
        <div><span>Uploadbereit</span><strong>${formatValue(catalog.readyCount || ready.length)}</strong></div>
        <div><span>Mit Bild</span><strong>${formatValue(itemStates.filter((item) => item.hasImage).length)}</strong></div>
        <div><span>Ohne Bild</span><strong>${formatValue(itemStates.filter((item) => !item.hasImage).length)}</strong></div>
      </div>
      <p class="muted-line">Logik: "Bereits hochgeladen" basiert auf Shirtee-Linkcheck (HTTP 200) oder Katalogstatus "Live im Store".</p>
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

  container.innerHTML = `
    <article class="panel">
      <h3>Social & Externe Ziele</h3>
      <table class="data-table">
        <thead><tr><th>Plattform</th><th>${hasLiveValues ? "Live-Wert" : "Klicks"}</th><th>${hasLiveValues ? "Status" : "CTR"}</th></tr></thead>
        <tbody>
          ${socialMetrics.links
            .map(
              (row) =>
                `<tr><td>${row.platform}</td><td>${row.valueLabel || row.clicks}</td><td>${row.statusLabel || row.ctr}</td></tr>${
                  row.sourceLabel ? `<tr><td colspan="3" class="muted-row">Quelle: ${row.sourceLabel}</td></tr>` : ""
                }`
            )
            .join("")}
        </tbody>
      </table>
    </article>
    <article class="panel">
      <h3>Profile & Vergleiche</h3>
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
