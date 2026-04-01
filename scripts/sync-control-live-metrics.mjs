#!/usr/bin/env node
import { performance } from "node:perf_hooks";
import { readFileSync, writeFileSync } from "node:fs";
import vm from "node:vm";

const repoRoot = "/Users/martendr.gray/Documents/New project/DJ-Website";
const outPath = `${repoRoot}/control/js/live-metrics.json`;
const catalogPath = `${repoRoot}/assets/data/merch-catalog.js`;
const linkStatusPath = `${repoRoot}/assets/data/live-link-status.js`;
const uploadProgressPath = `${repoRoot}/artifacts/upload-queue/upload-progress-2026-04-01.md`;

const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
const websiteBase = "https://drgray-mrsdrgray.com";
const corePages = [
  "/",
  "/index.html",
  "/bio.html",
  "/musik.html",
  "/videos.html",
  "/shop.html",
  "/kontakt.html",
  "/control"
];

function safeNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toPercent(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function loadWindowData(filePath, key) {
  const code = readFileSync(filePath, "utf8");
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(code, context);
  return context.window[key];
}

function loadSubmittedIdsFromProgress() {
  try {
    const raw = readFileSync(uploadProgressPath, "utf8");
    const ids = [...raw.matchAll(/`([a-z0-9-]+)`/gi)].map((match) => match[1]);
    return new Set(ids);
  } catch {
    return new Set();
  }
}

async function fetchText(url) {
  const response = await fetch(url, {
    method: "GET",
    redirect: "follow",
    headers: { "user-agent": USER_AGENT }
  });
  return response.text();
}

async function checkPage(path) {
  const url = `${websiteBase}${path}`;
  const start = performance.now();
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { "user-agent": USER_AGENT }
    });
    const end = performance.now();
    const timingMs = Math.max(1, Math.round(end - start));
    const contentLengthHeader = response.headers.get("content-length");
    const contentLength = contentLengthHeader ? Number(contentLengthHeader) : null;
    const ok = response.status === 200;
    return {
      path,
      url,
      status: response.status,
      ok,
      timingMs,
      contentLength
    };
  } catch {
    return {
      path,
      url,
      status: 0,
      ok: false,
      timingMs: null,
      contentLength: null
    };
  }
}

function findTikTokPayload(html) {
  const match = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function deepFindObjectWithKeys(node, requiredKeys) {
  if (!node || typeof node !== "object") return null;
  const ok = requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(node, key));
  if (ok) return node;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = deepFindObjectWithKeys(item, requiredKeys);
      if (found) return found;
    }
    return null;
  }
  for (const value of Object.values(node)) {
    const found = deepFindObjectWithKeys(value, requiredKeys);
    if (found) return found;
  }
  return null;
}

async function getTikTokProfileFallback(uniqueId) {
  const profileUrl = `https://www.tiktok.com/@${uniqueId}`;
  const html = await fetchText(profileUrl);
  const payload = findTikTokPayload(html);
  const scope = payload?.__DEFAULT_SCOPE__ || {};
  const detail = scope["webapp.user-detail"] || {};
  const seo = scope["seo.abtest"] || {};
  const stats = deepFindObjectWithKeys(scope, ["followerCount", "heartCount", "videoCount"]);
  return {
    profileUrl,
    source: "tiktok-public-html-fallback",
    canonical: typeof seo.canonical === "string" ? seo.canonical : null,
    statusCode: typeof detail.statusCode === "number" ? detail.statusCode : null,
    followers: safeNumber(stats?.followerCount),
    likes: safeNumber(stats?.heartCount),
    videos: safeNumber(stats?.videoCount)
  };
}

async function getTikTokProfileFromApi(accessToken) {
  const headers = {
    authorization: `Bearer ${accessToken}`,
    "content-type": "application/json; charset=UTF-8",
    "user-agent": USER_AGENT
  };

  const userResponse = await fetch(
    "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,username,avatar_url,profile_deep_link,is_verified,follower_count,following_count,likes_count,video_count",
    {
      method: "GET",
      headers
    }
  );

  if (!userResponse.ok) {
    return {
      source: "tiktok-api-v2",
      available: false,
      error: `user_info_${userResponse.status}`
    };
  }

  const userPayload = await userResponse.json();
  const user = userPayload?.data?.user || {};
  const username = typeof user.username === "string" ? user.username : null;
  const deepLink = typeof user.profile_deep_link === "string" ? user.profile_deep_link : null;
  const canonical = username ? `https://www.tiktok.com/@${username}` : deepLink;

  let videos = safeNumber(user.video_count);
  let recentVideoCount = null;
  let videoListAvailable = false;

  const videoResponse = await fetch("https://open.tiktokapis.com/v2/video/list/?fields=id,title,create_time,duration,view_count,like_count,comment_count,share_count", {
    method: "POST",
    headers,
    body: JSON.stringify({ max_count: 20 })
  });

  if (videoResponse.ok) {
    const videoPayload = await videoResponse.json();
    const list = Array.isArray(videoPayload?.data?.videos) ? videoPayload.data.videos : [];
    recentVideoCount = list.length;
    videoListAvailable = true;
    if (videos == null && recentVideoCount != null) {
      videos = recentVideoCount;
    }
  }

  return {
    source: "tiktok-api-v2",
    available: true,
    canonical,
    statusCode: 200,
    followers: safeNumber(user.follower_count),
    likes: safeNumber(user.likes_count),
    videos,
    following: safeNumber(user.following_count),
    recentVideoCount,
    videoListAvailable,
    isVerified: Boolean(user.is_verified),
    username
  };
}

async function getTikTokProfile(uniqueId, accessToken) {
  if (typeof accessToken === "string" && accessToken.trim().length > 0) {
    const apiProfile = await getTikTokProfileFromApi(accessToken.trim());
    if (apiProfile.available) {
      return apiProfile;
    }
  }

  return getTikTokProfileFallback(uniqueId);
}

async function getSoundCloudClientId() {
  const html = await fetchText("https://soundcloud.com");
  const jsUrls = [...html.matchAll(/https:\/\/a-v2\.sndcdn\.com\/assets\/[^" ]+\.js/g)].map((m) => m[0]).slice(0, 24);
  for (const jsUrl of jsUrls) {
    try {
      const code = await fetchText(jsUrl);
      const match = code.match(/client_id:"([a-zA-Z0-9]{20,})/);
      if (match) return match[1];
    } catch {
      // continue
    }
  }
  return null;
}

async function getSoundCloudProfile() {
  const clientId = await getSoundCloudClientId();
  if (!clientId) {
    return { available: false, source: "soundcloud-public-api", error: "client_id_nicht_gefunden" };
  }

  const resolveUrl = `https://api-v2.soundcloud.com/resolve?url=${encodeURIComponent("https://soundcloud.com/drgray_sic")}&client_id=${clientId}`;
  const response = await fetch(resolveUrl, { headers: { "user-agent": USER_AGENT } });
  if (!response.ok) {
    return { available: false, source: "soundcloud-public-api", error: `resolve_${response.status}` };
  }

  const profile = await response.json();
  if (profile.kind !== "user") {
    return { available: false, source: "soundcloud-public-api", error: "ungueltiges_profil" };
  }

  return {
    available: true,
    source: "soundcloud-public-api",
    user: {
      id: profile.id,
      username: profile.username,
      permalink_url: profile.permalink_url,
      followers_count: safeNumber(profile.followers_count),
      followings_count: safeNumber(profile.followings_count),
      track_count: safeNumber(profile.track_count),
      playlist_count: safeNumber(profile.playlist_count)
    }
  };
}

function parseHrefCounts() {
  const files = ["index.html", "bio.html", "musik.html", "videos.html", "shop.html", "kontakt.html"];
  const counters = {
    tiktok: 0,
    tiktokDr: 0,
    tiktokMrs: 0,
    soundcloud: 0,
    shop: 0,
    contact: 0
  };

  for (const file of files) {
    const html = readFileSync(`${repoRoot}/${file}`, "utf8");
    counters.tiktok += (html.match(/tiktok\.com\//g) || []).length;
    counters.tiktokDr += (html.match(/tiktok\.com\/@dr\.gray\.sic/g) || []).length;
    counters.tiktokMrs += (html.match(/tiktok\.com\/@ktina1986/g) || []).length;
    counters.soundcloud += (html.match(/soundcloud\.com\//g) || []).length;
    counters.shop += (html.match(/shirtee\.com\//g) || []).length;
    counters.contact += (html.match(/kontakt\.html|mailto:/g) || []).length;
  }
  return counters;
}

async function getShirteeStoreOverview() {
  const url = "https://www.shirtee.com/de/store/drgray-mrsdrgray/";
  const html = await fetchText(url);
  const names = [...html.matchAll(/<h2 class="product-name">\s*<a[^>]*>\s*([^<]+?)\s*<\/a>/g)]
    .map((match) => match[1].trim())
    .filter(Boolean);

  return {
    url,
    productCount: names.length,
    productNames: names.slice(0, 8)
  };
}

function mapSectionLabel(section) {
  const lookup = {
    men: "Herren",
    women: "Damen",
    couple: "Couple",
    unisex: "Unisex",
    accessories: "Accessoires",
    special: "Special"
  };
  return lookup[section] || String(section || "Sonstiges");
}

async function main() {
  const catalog = loadWindowData(catalogPath, "MERCH_CATALOG");
  const liveLinkStatus = loadWindowData(linkStatusPath, "LIVE_LINK_STATUS");
  const submittedIds = loadSubmittedIdsFromProgress();

  const [pageChecks, soundcloud, tiktokDr, tiktokMrs, shirteeStore] = await Promise.all([
    Promise.all(corePages.map((path) => checkPage(path))),
    getSoundCloudProfile(),
    getTikTokProfile("dr.gray.sic", process.env.TIKTOK_DR_ACCESS_TOKEN),
    getTikTokProfile("ktina1986", process.env.TIKTOK_MRS_ACCESS_TOKEN),
    getShirteeStoreOverview()
  ]);

  const now = new Date();
  const generatedAtIso = now.toISOString();
  const generatedAtLabel = new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Berlin"
  }).format(now);

  const pageOk = pageChecks.filter((item) => item.ok).length;
  const pageFail = pageChecks.length - pageOk;
  const avgResponse = Math.round(
    pageChecks.filter((item) => typeof item.timingMs === "number").reduce((sum, item) => sum + item.timingMs, 0) /
      Math.max(pageChecks.filter((item) => typeof item.timingMs === "number").length, 1)
  );

  const items = Array.isArray(catalog?.items) ? catalog.items : [];
  const statusCount = {};
  const sectionCount = {};
  for (const item of items) {
    statusCount[item.status] = (statusCount[item.status] || 0) + 1;
    sectionCount[item.section] = (sectionCount[item.section] || 0) + 1;
  }

  const externalResults = Object.values(liveLinkStatus?.items || {});
  const shopChecked = externalResults.length;
  const shopLive = externalResults.filter((result) => result.verified && Number(result.httpCode) === 200).length;
  const shopFail = shopChecked - shopLive;

  const sectionRows = Object.entries(sectionCount)
    .map(([section, count]) => ({ label: mapSectionLabel(section), items: count }))
    .sort((a, b) => b.items - a.items);

  const externalByHref = new Map(
    externalResults
      .filter((entry) => typeof entry?.sourceHref === "string" && entry.sourceHref.length > 0)
      .map((entry) => [entry.sourceHref, entry])
  );

  const catalogItemStates = items.map((item, index) => {
    const rawHref = typeof item?.href === "string" && item.href.length > 0 ? item.href : liveLinkStatus?.storeHref || "https://www.shirtee.com/de/store/drgray-mrsdrgray/";
    const href = rawHref.startsWith("http") ? rawHref : rawHref.startsWith("/") ? rawHref : `/${rawHref.replace(/^\.?\//, "")}`;
    const linked = externalByHref.get(href);
    const catalogStatus = String(item?.status || "Unbekannt");
    const loweredStatus = catalogStatus.toLowerCase();
    const hasImage = typeof item?.image === "string" && item.image.trim().length > 0;
    const imageSrc = hasImage ? (item.image.startsWith("http") ? item.image : item.image.startsWith("/") ? item.image : `/${item.image}`) : "";
    const verified = Boolean(linked?.verified) && Number(linked?.httpCode) === 200;
    const isUploaded = verified || loweredStatus.includes("live im store");
    const isSubmitted = !isUploaded && submittedIds.has(item?.id || `catalog-${index + 1}`);
    const isReady = !isUploaded && (loweredStatus.includes("uploadbereit") || loweredStatus.includes("top upload"));
    const uploadState = isUploaded ? "uploaded" : isSubmitted ? "submitted" : isReady ? "ready" : "pending";
    const uploadLabel = isUploaded ? "Bereits hochgeladen" : isSubmitted ? "Eingereicht (in Pruefung)" : isReady ? "Uploadbereit" : "Noch offen";

    return {
      id: item?.id || `catalog-${index + 1}`,
      title: item?.title || `Artikel ${index + 1}`,
      line: item?.line || "Unbekannt",
      section: item?.section || "other",
      sectionLabel: mapSectionLabel(item?.section),
      catalogStatus,
      href,
      hasImage,
      imageSrc,
      uploadState,
      uploadLabel,
      verifiedLink: verified,
      httpCode: Number(linked?.httpCode) || 0
    };
  });

  const uploadedCount = catalogItemStates.filter((item) => item.uploadState === "uploaded").length;
  const submittedCount = catalogItemStates.filter((item) => item.uploadState === "submitted").length;
  const readyCount = catalogItemStates.filter((item) => item.uploadState === "ready").length;
  const pendingCount = catalogItemStates.filter((item) => item.uploadState === "pending").length;

  const topProducts = externalResults
    .slice(0, 6)
    .map((entry, index) => {
      const linkedItem = items.find((item) => item.href === entry.sourceHref);
      return {
        name: linkedItem?.title || `Produktlink ${index + 1}`,
        httpCode: Number(entry.httpCode) || 0,
        href: entry.sourceHref || linkedItem?.href || (liveLinkStatus?.storeHref || "https://www.shirtee.com/de/store/drgray-mrsdrgray/"),
        statusLabel: entry.verified ? "erreichbar" : "Fehler",
        sourceLabel: "Shirtee-Linkcheck"
      };
    });

  const hrefCounts = parseHrefCounts();
  const storeVisibleProducts = shirteeStore.productCount > 0 ? shirteeStore.productCount : shopLive;
  const storeVisibleProductNames = shirteeStore.productNames.length ? shirteeStore.productNames : topProducts.map((row) => row.name).slice(0, 6);

  const socialRows = [
    {
      platform: "TikTok Dr. Gray",
      metricValue: hrefCounts.tiktokDr,
      valueLabel:
        tiktokDr.followers != null
          ? `${tiktokDr.followers.toLocaleString("de-DE")} Follower • ${tiktokDr.videos != null ? `${tiktokDr.videos} Videos` : `${hrefCounts.tiktokDr} Linksignale`}`
          : `${hrefCounts.tiktokDr} Linksignale im Seiteninhalt`,
      statusLabel: tiktokDr.canonical ? "Profil erreichbar" : "Profil nicht bestaetigt",
      sourceLabel: `${tiktokDr.source === "tiktok-api-v2" ? "TikTok API v2 OAuth" : "TikTok Profil-HTML"}${tiktokDr.statusCode != null ? ` • Code ${tiktokDr.statusCode}` : ""}${tiktokDr.likes != null ? ` • Likes ${tiktokDr.likes.toLocaleString("de-DE")}` : ""}`
    },
    {
      platform: "TikTok Mrs. Dr. Gray",
      metricValue: hrefCounts.tiktokMrs,
      valueLabel:
        tiktokMrs.followers != null
          ? `${tiktokMrs.followers.toLocaleString("de-DE")} Follower • ${tiktokMrs.videos != null ? `${tiktokMrs.videos} Videos` : `${hrefCounts.tiktokMrs} Linksignale`}`
          : `${hrefCounts.tiktokMrs} Linksignale im Seiteninhalt`,
      statusLabel: tiktokMrs.canonical ? "Profil erreichbar" : "Profil nicht bestaetigt",
      sourceLabel: `${tiktokMrs.source === "tiktok-api-v2" ? "TikTok API v2 OAuth" : "TikTok Profil-HTML"}${tiktokMrs.statusCode != null ? ` • Code ${tiktokMrs.statusCode}` : ""}${tiktokMrs.likes != null ? ` • Likes ${tiktokMrs.likes.toLocaleString("de-DE")}` : ""}`
    },
    {
      platform: "SoundCloud",
      metricValue: hrefCounts.soundcloud,
      valueLabel: soundcloud.available ? `${soundcloud.user.followers_count.toLocaleString("de-DE")} Follower • ${hrefCounts.soundcloud} Linksignale` : `${hrefCounts.soundcloud} Linksignale im Seiteninhalt`,
      statusLabel: soundcloud.available ? `${soundcloud.user.track_count} Tracks` : "Kein Live-Profilsignal",
      sourceLabel: "SoundCloud Public API"
    },
    {
      platform: "Shop",
      metricValue: storeVisibleProducts,
      valueLabel: `${storeVisibleProducts} Produkte sichtbar • ${shopLive}/${shopChecked} gepruefte Produktlinks`,
      statusLabel: shopFail > 0 ? `${shopFail} Links fehlerhaft` : "Alle geprueften Links erreichbar",
      sourceLabel: "Shirtee-Linkcheck"
    }
  ];

  const socialStrongest = [...socialRows]
    .filter((row) => typeof row.metricValue === "number")
    .sort((a, b) => b.metricValue - a.metricValue)[0];

  const warningCount = pageFail + Math.max(shopFail, 0) + (soundcloud.available ? 0 : 1);

  const data = {
    metadata: {
      mode: "live",
      generatedAt: generatedAtIso,
      generatedAtLabel,
      timezone: "Europe/Berlin",
      activeRange: "Live-Check"
    },
    systemStatus: {
      website: { label: "Website", value: pageFail === 0 ? "Erreichbar" : `${pageFail} Fehler`, level: pageFail === 0 ? "ok" : "warn" },
      storeLinks: { label: "Shop-Links", value: `${shopLive}/${shopChecked} erreichbar`, level: shopFail === 0 ? "ok" : "warn" },
      social: {
        label: "Social-Profile",
        value: `${[tiktokDr, tiktokMrs].filter((entry) => entry.canonical).length}/2 TikTok erreichbar`,
        level: [tiktokDr, tiktokMrs].filter((entry) => entry.canonical).length === 2 ? "ok" : "warn"
      },
      deployment: { label: "Datenstand", value: generatedAtLabel, level: "info" }
    },
    overviewKpis: [
      { id: "pagesChecked", label: "Gepruefte Seiten", value: pageChecks.length, delta: "Live", trend: "neutral" },
      { id: "pagesOk", label: "Seiten OK", value: pageOk, delta: "Live", trend: pageFail === 0 ? "up" : "neutral" },
      { id: "pagesFail", label: "Seiten mit Fehler", value: pageFail, delta: "Live", trend: pageFail > 0 ? "down" : "neutral" },
      { id: "responseAvg", label: "Ø Antwortzeit (ms)", value: avgResponse, delta: "Live", trend: "neutral" },
      { id: "merchItems", label: "Merch Artikel gesamt", value: items.length, delta: "Katalog", trend: "neutral" },
      { id: "shopLinks", label: "Shop-Links geprueft", value: shopChecked, delta: "Shirtee", trend: "neutral" },
      { id: "shopLinksOk", label: "Shop-Links OK", value: shopLive, delta: "Shirtee", trend: shopFail === 0 ? "up" : "neutral" },
      { id: "soundcloudFollowers", label: "SoundCloud Follower", value: soundcloud.available ? soundcloud.user.followers_count : null, delta: "Live", trend: "neutral" },
      { id: "tiktokProfiles", label: "TikTok Profile erreichbar", value: [tiktokDr, tiktokMrs].filter((entry) => entry.canonical).length, delta: "Live", trend: "neutral" },
      { id: "siteTiktokLinks", label: "TikTok Links auf Website", value: hrefCounts.tiktok, delta: "Inhalt", trend: "neutral" },
      { id: "siteShopLinks", label: "Shop Links auf Website", value: hrefCounts.shop, delta: "Inhalt", trend: "neutral" },
      { id: "warnings", label: "Offene Warnungen", value: warningCount, delta: "Pruefstatus", trend: warningCount > 0 ? "down" : "neutral" }
    ],
    websiteMetrics: {
      trafficSeries: pageChecks.map((item) => ({
        label: item.path === "/" ? "Start" : item.path.replace("/", "").replace(".html", ""),
        visitors: item.timingMs || 0,
        pageviews: item.contentLength ? Math.round(item.contentLength / 1024) : 0
      })),
      topPages: pageChecks
        .slice()
        .sort((a, b) => (b.contentLength || 0) - (a.contentLength || 0))
        .slice(0, 5)
        .map((item) => ({
          page: item.path,
          views: item.contentLength ? Math.round(item.contentLength / 1024) : 0,
          ctr: item.ok ? "200" : String(item.status || 0)
        })),
      audiences: [
        { label: "Erreichbar", value: toPercent(pageOk, pageChecks.length) },
        { label: "Fehler", value: toPercent(pageFail, pageChecks.length) }
      ],
      sources: [
        { label: "TikTok Links", value: hrefCounts.tiktok },
        { label: "SoundCloud Links", value: hrefCounts.soundcloud },
        { label: "Shop Links", value: hrefCounts.shop },
        { label: "Kontakt Links", value: hrefCounts.contact }
      ],
      devices: [
        { label: "2xx", value: toPercent(pageChecks.filter((item) => item.status >= 200 && item.status < 300).length, pageChecks.length) },
        { label: "3xx", value: toPercent(pageChecks.filter((item) => item.status >= 300 && item.status < 400).length, pageChecks.length) },
        { label: "4xx/5xx", value: toPercent(pageChecks.filter((item) => item.status >= 400 || item.status === 0).length, pageChecks.length) }
      ],
      regions: [],
      engagement: {
        avgSession: `${avgResponse} ms`,
        bounceRate: "nicht gemessen",
        buttonCtr: "nicht gemessen"
      }
    },
    shopMetrics: {
      linkHealth: {
        checkedLinks: shopChecked,
        okLinks: shopLive,
        failLinks: shopFail,
        reachabilityRate: shopChecked ? `${toPercent(shopLive, shopChecked)}%` : "0%",
        checkedAt: generatedAtIso,
        checkedAtLabel: generatedAtLabel
      },
      catalog: {
        totalItems: items.length,
        liveItems: statusCount["Live im Store"] || shopLive,
        uploadWave: (statusCount.Uploadbereit || 0) + (statusCount["Top Upload"] || 0),
        conceptItems: Math.max(items.length - ((statusCount["Live im Store"] || shopLive) + (statusCount.Uploadbereit || 0) + (statusCount["Top Upload"] || 0)), 0),
        sections: sectionRows,
        storeVisibleProducts,
        storeVisibleProductNames,
        uploadedCount,
        submittedCount,
        readyCount,
        pendingCount,
        itemStates: catalogItemStates
      },
      topProducts,
      timeline: externalResults.slice(0, 8).map((entry, index) => ({
        time: generatedAtLabel,
        type: entry.verified ? "ok" : "warning",
        detail: `Shop-Link ${index + 1}: HTTP ${entry.httpCode}`
      }))
    },
    socialMetrics: {
      links: socialRows,
      strongestPlatform: socialStrongest?.platform || "nicht verfuegbar",
      comparisons: [
        { label: "TikTok Links im Seiteninhalt", value: String(hrefCounts.tiktok) },
        { label: "SoundCloud Links im Seiteninhalt", value: String(hrefCounts.soundcloud) },
        { label: "Shop Links im Seiteninhalt", value: String(hrefCounts.shop) }
      ],
      officialAccounts: [
        { label: "Website", url: websiteBase, status: "live" },
        { label: "Shirtee Store", url: liveLinkStatus?.storeHref || "https://www.shirtee.com/de/store/drgray-mrsdrgray/", status: shopFail === 0 ? "live" : "check" },
        { label: "SoundCloud", url: "https://soundcloud.com/drgray_sic", status: soundcloud.available ? "live" : "check" },
        { label: "TikTok Dr. Gray", url: "https://www.tiktok.com/@dr.gray.sic", status: tiktokDr.canonical ? "live" : "check" },
        { label: "TikTok Mrs. Dr. Gray", url: "https://www.tiktok.com/@ktina1986", status: tiktokMrs.canonical ? "live" : "check" }
      ]
    },
    performanceMetrics: {
      webVitals: [
        { metric: "Core Web Vitals", value: "nicht verbunden", state: "warn" },
        { metric: "HTTP Seitenchecks", value: `${pageOk}/${pageChecks.length} OK`, state: pageFail === 0 ? "good" : "warn" },
        { metric: "Shirtee-Linkchecks", value: `${shopLive}/${shopChecked} OK`, state: shopFail === 0 ? "good" : "warn" }
      ],
      responseTime: `${avgResponse} ms`,
      uptime: `${toPercent(pageOk, pageChecks.length)}% (Seitencheck)`,
      externalChecks: [
        { label: "Website Core-Pfade", status: `${pageOk}/${pageChecks.length} erreichbar`, level: pageFail === 0 ? "ok" : "warn" },
        { label: "Shop Produktlinks", status: `${shopLive}/${shopChecked} erreichbar`, level: shopFail === 0 ? "ok" : "warn" },
        { label: "SoundCloud Profil", status: soundcloud.available ? "OK" : "Nicht abrufbar", level: soundcloud.available ? "ok" : "warn" }
      ],
      errorLog: [
        ...(pageFail > 0 ? [{ id: "WEB-001", scope: "website", message: `${pageFail} Seiten liefern keinen HTTP 200 Status`, level: "warn" }] : []),
        ...(shopFail > 0 ? [{ id: "SHOP-001", scope: "shop", message: `${shopFail} gepruefte Shop-Links sind nicht erreichbar`, level: "warn" }] : []),
        ...(!soundcloud.available ? [{ id: "SOC-001", scope: "soundcloud", message: "SoundCloud API aktuell nicht auslesbar", level: "warn" }] : [])
      ]
    },
    contentPerformance: {
      strongestSections: sectionRows.slice(0, 3).map((row) => ({
        section: row.label,
        score: toPercent(row.items, Math.max(items.length, 1))
      })),
      ctas: [
        { name: "TikTok Links", clicks: hrefCounts.tiktok, rate: "Live-Linkcount" },
        { name: "Shop Links", clicks: hrefCounts.shop, rate: "Live-Linkcount" },
        { name: "SoundCloud Links", clicks: hrefCounts.soundcloud, rate: "Live-Linkcount" }
      ],
      weakSpots: [
        ...(pageFail > 0 ? [{ item: "Seitenverfuegbarkeit", note: "Mindestens ein Seitenpfad antwortet nicht mit HTTP 200." }] : []),
        ...(shopFail > 0 ? [{ item: "Produktlink-Verfuegbarkeit", note: "Nicht alle geprueften Shop-Links sind erreichbar." }] : []),
        ...(hrefCounts.contact === 0 ? [{ item: "Kontakt-CTA", note: "Keine Kontakt-Links im Seiteninhalt erkannt." }] : [])
      ]
    },
    activityFeed: [
      { id: "EVT-1", time: generatedAtLabel, type: "check", text: `Live-Pruefung abgeschlossen: ${pageChecks.length} Seitenchecks` },
      { id: "EVT-2", time: generatedAtLabel, type: "check", text: `Shop-Linkcheck: ${shopLive}/${shopChecked} erreichbar` },
      { id: "EVT-3", time: generatedAtLabel, type: "check", text: `SoundCloud: ${soundcloud.available ? "Profilsignal abrufbar" : "kein Profilsignal"}` },
      { id: "EVT-4", time: generatedAtLabel, type: "check", text: `TikTok Profile: ${[tiktokDr, tiktokMrs].filter((entry) => entry.canonical).length}/2 erreichbar` }
    ],
    alerts: [
      ...(pageFail > 0 ? [{ id: "AL-WEB", level: "warn", title: "Seitenchecks mit Fehler", description: `${pageFail} von ${pageChecks.length} geprueften Seiten sind nicht auf HTTP 200.`, source: "Website Monitoring" }] : [{ id: "AL-WEB", level: "ok", title: "Alle Seiten erreichbar", description: "Alle geprueften Kernseiten antworten mit HTTP 200.", source: "Website Monitoring" }]),
      ...(shopFail > 0 ? [{ id: "AL-SHOP", level: "warn", title: "Shop-Link Problem", description: `${shopFail} gepruefte Produktlinks liefern keinen OK-Status.`, source: "Shop Monitoring" }] : [{ id: "AL-SHOP", level: "ok", title: "Shop-Links erreichbar", description: "Alle geprueften Produktlinks sind erreichbar.", source: "Shop Monitoring" }]),
      {
        id: "AL-SOC",
        level: soundcloud.available ? "ok" : "info",
        title: soundcloud.available ? "SoundCloud Live-Profil erkannt" : "SoundCloud eingeschraenkt",
        description: soundcloud.available ? `${soundcloud.user.followers_count} Follower und ${soundcloud.user.track_count} Tracks verifiziert.` : "Aktuell keine stabilen SoundCloud-Metriken abrufbar.",
        source: "Social Monitoring"
      }
    ],
    quickActions: [
      { id: "qa-1", label: "Website oeffnen", href: websiteBase, external: true },
      { id: "qa-2", label: "Shop Seite oeffnen", href: `${websiteBase}/shop.html`, external: true },
      { id: "qa-3", label: "Shirtee Store", href: liveLinkStatus?.storeHref || "https://www.shirtee.com/de/store/drgray-mrsdrgray/", external: true },
      { id: "qa-4", label: "SoundCloud Profil", href: "https://soundcloud.com/drgray_sic", external: true },
      { id: "qa-5", label: "TikTok Dr. Gray", href: "https://www.tiktok.com/@dr.gray.sic", external: true },
      { id: "qa-6", label: "TikTok Mrs. Dr. Gray", href: "https://www.tiktok.com/@ktina1986", external: true },
      { id: "qa-7", label: "Kontakt testen", href: `${websiteBase}/kontakt.html`, external: true },
      { id: "qa-8", label: "Upload Queue CSV", href: "#export-upload-queue", external: false },
      { id: "qa-9", label: "Live-Daten neu laden", href: "#reload", external: false },
      { id: "qa-10", label: "Abmelden", href: "#logout", external: false }
    ]
  };

  writeFileSync(outPath, JSON.stringify(data, null, 2), "utf8");
  console.log(`Wrote ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
