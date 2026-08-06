#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const artifactsDir = join(repoRoot, "artifacts", "content-suggestions");
const outPath = join(artifactsDir, "latest.json");
const policyPath = join(repoRoot, "assets", "data", "content-production-policy.json");
const tracksPath = join(repoRoot, "assets", "data", "tracks.json");
const homeDir = process.env.HOME || "/Users/jarvisgray";
const contentRoot = join(homeDir, "TikTok-DJ-Content");
const generatedDir = join(contentRoot, "analytics", "generated");
const editBriefDir = join(generatedDir, "edit_briefs");
const referencesManifestPath = join(contentRoot, "references", "reference-manifest.json");

function readJson(filePath, fallback) {
  try {
    if (!existsSync(filePath)) return fallback;
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function latestFile(dirPath, pattern) {
  if (!existsSync(dirPath)) return null;
  return readdirSync(dirPath)
    .filter((name) => pattern.test(name))
    .map((name) => ({ filePath: join(dirPath, name), mtimeMs: statSync(join(dirPath, name)).mtimeMs }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs)[0]?.filePath || null;
}

function listFiles(dirPath, pattern) {
  if (!existsSync(dirPath)) return [];
  return readdirSync(dirPath)
    .filter((name) => pattern.test(name))
    .map((name) => join(dirPath, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
}

function normalizeSlot(slot, fallback) {
  return String(slot || fallback || "").trim() || fallback;
}

function statusFromReferences(referenceState) {
  return referenceState.ready ? { status: "ready", statusLabel: "Referenzen komplett" } : { status: "warn", statusLabel: "Referenzen fehlen" };
}

function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean))];
}

function publicPath(filePath) {
  if (!filePath) return null;
  const normalized = String(filePath);
  if (normalized.startsWith(contentRoot)) {
    return `~/${relative(homeDir, normalized)}`;
  }
  if (normalized.startsWith(repoRoot)) {
    return `./${relative(repoRoot, normalized)}`;
  }
  return normalized;
}

function main() {
  const policy = readJson(policyPath, {});
  const trackData = readJson(tracksPath, {});
  const latestPlanPath = latestFile(generatedDir, /^content_plan_.*\.json$/i);
  const latestPlan = latestPlanPath ? readJson(latestPlanPath, {}) : {};
  const latestEditBriefs = listFiles(editBriefDir, /\.json$/i)
    .slice(0, 8)
    .map((filePath) => readJson(filePath, {}))
    .filter((entry) => entry && typeof entry === "object");
  const references = readJson(referencesManifestPath, {});
  const pairPortraits = Array.isArray(references.pairPortraits) ? references.pairPortraits : [];
  const sourceClips = Array.isArray(references.sourceClips) ? references.sourceClips : [];
  const sourcePhotos = Array.isArray(references.sourcePhotos) ? references.sourcePhotos : [];
  const brandGraphics = Array.isArray(references.brandGraphics) ? references.brandGraphics : [];
  const approvedSongs = Array.isArray(references.approvedSongs) ? references.approvedSongs : [];
  const tracks = Array.isArray(trackData.tracks) ? trackData.tracks : [];
  const captions = Array.isArray(latestPlan.daily_captions) ? latestPlan.daily_captions : [];
  const ideas = Array.isArray(latestPlan.set_ideas) ? latestPlan.set_ideas : [];
  const calendar = Array.isArray(latestPlan.content_calendar) ? latestPlan.content_calendar : [];
  const slots = Array.isArray(policy?.scheduling?.defaultSlots) ? policy.scheduling.defaultSlots : [];
  const sortedTracks = [...tracks].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  const latestTracks = sortedTracks.slice(0, 3);
  const strongestTrack = [...tracks]
    .sort((a, b) => Number(b.plays || 0) - Number(a.plays || 0))[0] || null;
  const topGenres = uniqueStrings(tracks.flatMap((track) => Array.isArray(track.genres) ? track.genres : [])).slice(0, 5);
  const contentDirection = {
    currentAngle: "Couple-Techno mit Driving-, Emotional- und Afterhours-Linie",
    pillars: [
      "Driving Techno",
      "Emotional B2B",
      "Couple Identity",
      "Afterhours / Neon",
      "Peak Time / Dark Hypnotic"
    ],
    recentHooks: ideas.slice(0, 5),
    recurringHashtags: uniqueStrings(captions.flatMap((entry) => Array.isArray(entry.hashtags) ? entry.hashtags : [])).slice(0, 8),
    genres: topGenres
  };

  const referenceState = {
    ready: pairPortraits.length > 0 && Boolean(references.martinFaceReference) && Boolean(references.mrsFaceReference),
    pairPortraitCount: pairPortraits.length,
    sourceClipCount: sourceClips.length,
    sourcePhotoCount: sourcePhotos.length,
    brandGraphicsCount: brandGraphics.length,
    approvedSongCount: approvedSongs.length
  };
  const baseStatus = statusFromReferences(referenceState);

  const suggestions = (ideas.length ? ideas : ["Performance Clip", "Afterhours Teaser", "Couple Hook", "Studio POV"])
    .slice(0, 6)
    .map((idea, index) => {
      const caption = captions[index] || captions[0] || {};
      const brief = latestEditBriefs[index] || {};
      const plan = brief.plan && typeof brief.plan === "object" ? brief.plan : brief;
      const calendarRow = calendar[index] || {};
      return {
        id: `auto-draft-${index + 1}`,
        title: String(idea || `Auto Draft ${index + 1}`),
        channel: index % 3 === 1 ? "TikTok Backup" : index % 3 === 2 ? "SoundCloud" : "TikTok Hauptseite",
        scheduledFor: normalizeSlot(slots[index] || calendarRow.day ? `${calendarRow.day || ""} ${calendarRow.asset || ""}` : "", slots[index] || "Open"),
        status: baseStatus.status,
        statusLabel: baseStatus.statusLabel,
        hook: String(idea || ""),
        caption: String(caption.text || ""),
        hashtags: Array.isArray(caption.hashtags) ? caption.hashtags : [],
        videoRequired: true,
        realismRule: "Ultra-realistisch, kein KI-Look, Gesichtsstruktur bleibt fix.",
        audioSource: approvedSongs[index]?.title || (policy?.audio?.preferOwnSound ? "own-sound" : "trending-techno"),
        sourceAssetHint: publicPath(sourceClips[index] || sourcePhotos[index] || null),
        editHint: plan.notes?.[0] || "Mit Effekten, Schnitten, Uebergaengen und On-Video-Text ausarbeiten.",
        approvalPath: "telegram+dashboard",
        policyVersion: policy.version || null
      };
    });

  const payload = {
    generatedAt: new Date().toISOString(),
    policyVersion: policy.version || null,
    latestPlanPath: publicPath(latestPlanPath),
    referenceState,
    brandAssets: brandGraphics.map((path, index) => ({
      id: `brand-${index + 1}`,
      path: publicPath(path),
      label: /mrs/i.test(path) ? "Mrs. Dr. Gray Logo" : "Dr. Gray Logo"
    })),
    soundcloudSnapshot: {
      totalTracks: Number(trackData.totalTracks || tracks.length || 0),
      lastUpdated: trackData.lastUpdated || null,
      latestTracks: latestTracks.map((track) => ({
        title: track.title,
        date: track.date,
        plays: Number(track.plays || 0),
        likes: Number(track.likes || 0),
        comments: Number(track.comments || 0),
        type: track.type || null,
        genres: Array.isArray(track.genres) ? track.genres : [],
        url: track.url || null
      })),
      strongestTrack: strongestTrack
        ? {
            title: strongestTrack.title,
            plays: Number(strongestTrack.plays || 0),
            likes: Number(strongestTrack.likes || 0),
            date: strongestTrack.date || null,
            url: strongestTrack.url || null
          }
        : null
    },
    contentDirection,
    suggestions,
    constraints: {
      pairRequired: Boolean(policy?.identity?.pairRequired),
      faceLock: Boolean(policy?.identity?.faceLock?.enabled),
      videoOnly: Boolean(policy?.video?.required),
      ultraRealistic: String(policy?.video?.style || "") === "ultra-realistic"
    }
  };

  mkdirSync(artifactsDir, { recursive: true });
  writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Wrote ${outPath}`);
}

main();
