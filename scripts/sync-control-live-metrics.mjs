#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import vm from "node:vm";

const repoRoot = "/Users/martendr.gray/Documents/New project/DJ-Website";
const outPath = `${repoRoot}/control/js/live-metrics.json`;
const linkStatusPath = `${repoRoot}/assets/data/live-link-status.js`;

const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": USER_AGENT
    },
    redirect: "follow"
  });
  return response.text();
}

function findTikTokPayload(html) {
  const match = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) {
    return null;
  }
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function deepFindObjectWithKeys(node, requiredKeys) {
  if (!node || typeof node !== "object") {
    return null;
  }
  const hasAll = requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(node, key));
  if (hasAll) {
    return node;
  }

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

async function getTikTokSignal(uniqueId) {
  const profileUrl = `https://www.tiktok.com/@${uniqueId}`;
  const html = await fetchText(profileUrl);
  const payload = findTikTokPayload(html);

  const defaultResult = {
    profile: profileUrl,
    reachable: html.includes(`@${uniqueId}`),
    statusCode: null,
    canonical: null,
    followers: null,
    likes: null,
    videos: null,
    source: "public-html"
  };

  if (!payload || !payload.__DEFAULT_SCOPE__) {
    return defaultResult;
  }

  const scope = payload.__DEFAULT_SCOPE__;
  const detail = scope["webapp.user-detail"] || {};
  const seo = scope["seo.abtest"] || {};
  const stats = deepFindObjectWithKeys(scope, ["followerCount", "heartCount", "videoCount"]);

  return {
    ...defaultResult,
    statusCode: typeof detail.statusCode === "number" ? detail.statusCode : null,
    canonical: typeof seo.canonical === "string" ? seo.canonical : null,
    followers: typeof stats?.followerCount === "number" ? stats.followerCount : null,
    likes: typeof stats?.heartCount === "number" ? stats.heartCount : null,
    videos: typeof stats?.videoCount === "number" ? stats.videoCount : null
  };
}

async function getSoundCloudClientId() {
  const html = await fetchText("https://soundcloud.com");
  const jsUrls = [...html.matchAll(/https:\/\/a-v2\.sndcdn\.com\/assets\/[^" ]+\.js/g)].map((m) => m[0]).slice(0, 20);

  for (const url of jsUrls) {
    try {
      const code = await fetchText(url);
      const match = code.match(/client_id:"([a-zA-Z0-9]{20,})/);
      if (match) {
        return match[1];
      }
    } catch {
      // ignore single bundle errors
    }
  }
  return null;
}

async function getSoundCloudSignal() {
  const clientId = await getSoundCloudClientId();
  if (!clientId) {
    return { available: false, source: "soundcloud-public-api", error: "no_client_id" };
  }

  const resolveUrl = `https://api-v2.soundcloud.com/resolve?url=${encodeURIComponent("https://soundcloud.com/drgray_sic")}&client_id=${clientId}`;
  const resolveRes = await fetch(resolveUrl, { headers: { "user-agent": USER_AGENT } });
  if (!resolveRes.ok) {
    return { available: false, source: "soundcloud-public-api", clientId, error: `resolve_${resolveRes.status}` };
  }

  const user = await resolveRes.json();
  if (user.kind !== "user" || !user.id) {
    return { available: false, source: "soundcloud-public-api", clientId, error: "invalid_user_payload" };
  }

  const tracksUrl = `https://api-v2.soundcloud.com/users/${user.id}/tracks?limit=3&client_id=${clientId}&linked_partitioning=1`;
  const tracksRes = await fetch(tracksUrl, { headers: { "user-agent": USER_AGENT } });
  let latestTracks = [];
  if (tracksRes.ok) {
    const trackPayload = await tracksRes.json();
    latestTracks = (trackPayload.collection || []).slice(0, 3).map((track) => ({
      title: track.title,
      permalink_url: track.permalink_url,
      playback_count: track.playback_count || 0,
      likes_count: track.likes_count || 0
    }));
  }

  return {
    available: true,
    source: "soundcloud-public-api",
    clientId,
    user: {
      id: user.id,
      username: user.username,
      permalink: user.permalink,
      permalink_url: user.permalink_url,
      followers_count: user.followers_count || 0,
      followings_count: user.followings_count || 0,
      track_count: user.track_count || 0,
      playlist_count: user.playlist_count || 0
    },
    latestTracks
  };
}

function getShopSignal() {
  try {
    const code = readFileSync(linkStatusPath, "utf8");
    const context = { window: {} };
    vm.createContext(context);
    vm.runInContext(code, context);
    const data = context.window.LIVE_LINK_STATUS;
    const values = Object.values(data?.items || {});
    const total = values.length;
    const verified = values.filter((item) => item.verified === true).length;
    return {
      available: total > 0,
      source: "local-link-check",
      total,
      verified,
      failed: Math.max(total - verified, 0)
    };
  } catch {
    return {
      available: false,
      source: "local-link-check",
      total: 0,
      verified: 0,
      failed: 0
    };
  }
}

async function getWebsiteSignal() {
  const pages = ["/", "/shop.html", "/musik.html", "/videos.html", "/bio.html", "/kontakt.html"];
  const checks = await Promise.all(
    pages.map(async (path) => {
      const url = `https://drgray-mrsdrgray.com${path}`;
      try {
        const response = await fetch(url, { method: "GET", redirect: "follow", headers: { "user-agent": USER_AGENT } });
        return { path, status: response.status, ok: response.status === 200 };
      } catch {
        return { path, status: 0, ok: false };
      }
    })
  );

  return {
    source: "public-http-check",
    ok: checks.filter((c) => c.ok).length,
    total: checks.length,
    checks
  };
}

function toSocialRows(live) {
  const tiktokDr = live.tiktok.drGray;
  const tiktokMrs = live.tiktok.mrs;
  const soundcloud = live.soundcloud;
  const shop = live.shop;

  const rows = [
    {
      platform: "TikTok Dr. Gray",
      metricValue: tiktokDr.followers,
      valueLabel: tiktokDr.followers != null ? `${tiktokDr.followers.toLocaleString("de-DE")} Follower` : "Follower nicht oeffentlich abrufbar",
      statusLabel: tiktokDr.canonical ? "Profil live" : "Profilsignal unklar",
      sourceLabel: `tiktok-html${tiktokDr.statusCode != null ? ` • code ${tiktokDr.statusCode}` : ""}`
    },
    {
      platform: "TikTok Mrs. Dr. Gray",
      metricValue: tiktokMrs.followers,
      valueLabel: tiktokMrs.followers != null ? `${tiktokMrs.followers.toLocaleString("de-DE")} Follower` : "Follower nicht oeffentlich abrufbar",
      statusLabel: tiktokMrs.canonical ? "Profil live" : "Profilsignal unklar",
      sourceLabel: `tiktok-html${tiktokMrs.statusCode != null ? ` • code ${tiktokMrs.statusCode}` : ""}`
    },
    {
      platform: "SoundCloud",
      metricValue: soundcloud.available ? soundcloud.user.followers_count : null,
      valueLabel: soundcloud.available ? `${soundcloud.user.followers_count.toLocaleString("de-DE")} Follower` : "API aktuell nicht abrufbar",
      statusLabel: soundcloud.available ? `${soundcloud.user.track_count} Tracks live` : "Kein Live-Wert",
      sourceLabel: soundcloud.source
    },
    {
      platform: "Shop",
      metricValue: shop.verified,
      valueLabel: `${shop.verified}/${shop.total} Produktlinks OK`,
      statusLabel: shop.failed > 0 ? `${shop.failed} Links mit Fehler` : "Alle geprueften Links OK",
      sourceLabel: shop.source
    }
  ];

  const strongest = [...rows]
    .filter((row) => typeof row.metricValue === "number")
    .sort((a, b) => b.metricValue - a.metricValue)[0];

  return {
    rows,
    strongestPlatform: strongest?.platform || "n/a"
  };
}

async function main() {
  const [tiktokDr, tiktokMrs, soundcloud, website] = await Promise.all([
    getTikTokSignal("dr.gray.sic"),
    getTikTokSignal("ktina1986"),
    getSoundCloudSignal(),
    getWebsiteSignal()
  ]);
  const shop = getShopSignal();

  const social = toSocialRows({
    tiktok: { drGray: tiktokDr, mrs: tiktokMrs },
    soundcloud,
    shop
  });

  const payload = {
    generatedAt: new Date().toISOString(),
    sourceMode: "mixed-live",
    social,
    sources: {
      tiktok: { drGray: tiktokDr, mrs: tiktokMrs },
      soundcloud,
      shop,
      website
    }
  };

  writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Wrote ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

