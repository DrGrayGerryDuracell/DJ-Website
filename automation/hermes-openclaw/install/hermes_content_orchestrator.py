#!/usr/bin/env python3
"""Prepare recurring ultra-realistic content draft packages for Hermes."""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from hermes_content_helpers import (
    ANALYTICS_DIR,
    GENERATED_DIR,
    ensure_content_dirs,
    load_tiktok_config,
    now_iso,
    read_json,
    write_json,
    append_jsonl,
)

CONTENT_ROOT = Path("~/TikTok-DJ-Content").expanduser()
REFERENCE_MANIFEST = CONTENT_ROOT / "references" / "reference-manifest.json"
DRAFT_DIR = CONTENT_ROOT / "drafts"
POLICY_PATH = Path("~/TikTok-DJ-Content/references/content-policy.json").expanduser()


def _read(path: Path, default):
    return read_json(path, default=default)


class HermesContentOrchestrator:
    def __init__(self):
        ensure_content_dirs()
        DRAFT_DIR.mkdir(parents=True, exist_ok=True)
        self.config = load_tiktok_config()
        self.references = _read(REFERENCE_MANIFEST, {})
        self.policy = _read(POLICY_PATH, {})
        self.latest_plan = self._latest_plan()

    def _latest_plan(self) -> dict:
        files = sorted(GENERATED_DIR.glob("content_plan_*.json"), key=lambda item: item.stat().st_mtime, reverse=True)
        if not files:
            return {}
        return _read(files[0], {})

    def _reference_ready(self) -> bool:
        return bool(self.references.get("martinFaceReference")) and bool(self.references.get("mrsFaceReference"))

    def build_drafts(self) -> list[dict]:
        captions = self.latest_plan.get("daily_captions", []) if isinstance(self.latest_plan, dict) else []
        ideas = self.latest_plan.get("set_ideas", []) if isinstance(self.latest_plan, dict) else []
        channels = [
            ("TikTok Hauptseite", "@drgray_mrsdrgray", "Mon 19:00"),
            ("TikTok Backup", "@gray.afterhours", "Wed 21:00"),
            ("TikTok Hauptseite", "@drgray_mrsdrgray", "Fri 18:00"),
            ("SoundCloud", "@drgray_sic", "Sun 20:00"),
        ]
        drafts = []
        for index, channel in enumerate(channels, start=1):
            title = ideas[index - 1] if index - 1 < len(ideas) else f"Hermes Auto Draft {index}"
            caption = captions[index - 1] if index - 1 < len(captions) else {}
            drafts.append(
                {
                    "id": f"auto-{datetime.now().strftime('%Y%m%d')}-{index:02d}",
                    "created_at": now_iso(),
                    "title": title,
                    "channel": channel[0],
                    "handle": channel[1],
                    "scheduled_for": channel[2],
                    "status": "ready" if self._reference_ready() else "warn",
                    "status_label": "Referenzen komplett" if self._reference_ready() else "Face-Referenzen fehlen",
                    "hook": title,
                    "caption": caption.get("text", ""),
                    "hashtags": caption.get("hashtags", []),
                    "video_required": True,
                    "audio_source": "own-sound",
                    "editing": {
                        "transitions": True,
                        "effects": ["speed-ramp", "light-leak", "overlay-text"],
                        "overlay_text": [title, "Dr. Gray & Mrs. Dr. Gray"],
                    },
                    "identity_lock": {
                        "pair_required": True,
                        "face_lock": True,
                    },
                    "approval_state": "pending",
                }
            )
        return drafts

    def run(self) -> dict:
        drafts = self.build_drafts()
        stamp = datetime.now().strftime("%Y-%m-%d")
        out_path = DRAFT_DIR / f"content_drafts_{stamp}.json"
        payload = {
            "generated_at": now_iso(),
            "reference_ready": self._reference_ready(),
            "draft_count": len(drafts),
            "drafts": drafts,
        }
        write_json(out_path, payload)
        append_jsonl(ANALYTICS_DIR / "content_orchestrator.log.jsonl", payload)
        return {"success": True, "draft_path": str(out_path), "draft_count": len(drafts)}


if __name__ == "__main__":
    result = HermesContentOrchestrator().run()
    print(json.dumps(result, ensure_ascii=False, indent=2))
