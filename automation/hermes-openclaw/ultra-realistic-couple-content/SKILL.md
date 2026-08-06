---
name: ultra-realistic-couple-content
description: Orchestrate ultra-realistic short-form couple content for Dr. Gray & Mrs. Dr. Gray without identity drift.
category: autonomous-ai-agents
---

# Ultra Realistic Couple Content

## Purpose
Generate, prepare, review and schedule short-form content packages for Dr. Gray & Mrs. Dr. Gray.

This skill is for Hermes/OpenClaw subagents that prepare content before Martin approves publishing.

## Hard Rules

1. Always prepare **video-first** outputs.
2. Never allow an obvious AI look.
3. Never alter the core facial structure of Martin or Mrs. Dr. Gray.
4. Expression, pose, camera angle, styling and gesture changes are allowed.
5. Every content package must include:
   - hook
   - caption
   - hashtags
   - edit brief
   - audio direction
   - schedule suggestion
   - approval state
6. Use user-provided source files first.
7. If generating supporting visuals, keep them photorealistic and identity-safe.
8. Do not auto-publish. Prepare and wait for explicit approval.

## Asset Priority

1. `~/TikTok-DJ-Content/references/reference-manifest.json`
2. user-provided pair portraits
3. approved source clips
4. approved source photos
5. approved songs / own audio

## Required Outputs

For every draft package, produce:

```json
{
  "title": "Content title",
  "channel": "TikTok Hauptseite",
  "hook": "First-line hook",
  "caption": "Full caption",
  "hashtags": ["#techno", "#afterhours"],
  "video_required": true,
  "audio_source": "own-sound or trending-techno",
  "editing": {
    "transitions": true,
    "effects": ["speed-ramp", "light-leak"],
    "overlay_text": ["hook line", "cta line"]
  },
  "identity_lock": {
    "pair_required": true,
    "face_lock": true
  },
  "approval_state": "pending",
  "scheduled_for": "Wed 21:00"
}
```

## Tooling

Prefer:

1. reference assets from `~/TikTok-DJ-Content`
2. CapCut draft generation via the local CapCut API vendor
3. Hermes logs, content plans and edit briefs
4. dashboard queue + Telegram approval

## Operational Flow

1. Inspect reference manifest and approved sources.
2. Build 3-6 video draft packages.
3. Create edit brief for each package.
4. Assign target channel and schedule suggestion.
5. Mark approval state as `pending`.
6. Hand off to Hermes dashboard + Telegram.

## Refusal Conditions

Stop and flag the package if:

- no face references are available
- the output would look synthetic
- only still-image collage is possible without convincing motion treatment
- caption or audio source is missing
- approval path is bypassed
