#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const artifactsDir = join(repoRoot, "artifacts", "content-suggestions");
const outPath = join(artifactsDir, "latest.json");
const policyPath = join(repoRoot, "assets", "data", "content-production-policy.json");
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

function main() {
  const policy = readJson(policyPath, {});
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
  const approvedSongs = Array.isArray(references.approvedSongs) ? references.approvedSongs : [];
  const captions = Array.isArray(latestPlan.daily_captions) ? latestPlan.daily_captions : [];
  const ideas = Array.isArray(latestPlan.set_ideas) ? latestPlan.set_ideas : [];
  const calendar = Array.isArray(latestPlan.content_calendar) ? latestPlan.content_calendar : [];
  const slots = Array.isArray(policy?.scheduling?.defaultSlots) ? policy.scheduling.defaultSlots : [];

  const referenceState = {
    ready: pairPortraits.length > 0 && Boolean(references.martinFaceReference) && Boolean(references.mrsFaceReference),
    pairPortraitCount: pairPortraits.length,
    sourceClipCount: sourceClips.length,
    sourcePhotoCount: sourcePhotos.length,
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
        sourceAssetHint: sourceClips[index] || sourcePhotos[index] || null,
        editHint: plan.notes?.[0] || "Mit Effekten, Schnitten, Uebergaengen und On-Video-Text ausarbeiten.",
        approvalPath: "telegram+dashboard",
        policyVersion: policy.version || null
      };
    });

  const payload = {
    generatedAt: new Date().toISOString(),
    policyVersion: policy.version || null,
    latestPlanPath,
    referenceState,
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
