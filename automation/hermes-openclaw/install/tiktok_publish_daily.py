#!/usr/bin/env python3
"""Publish only approved and due TikTok items, polling final status before archiving."""

from __future__ import annotations

import json
import time
from datetime import datetime
from pathlib import Path

import requests

from hermes_content_helpers import (
    ANALYTICS_DIR,
    PROCESSED_DIR,
    SCHEDULED_DIR,
    ensure_content_dirs,
    load_metadata,
    load_secrets,
    load_tiktok_credentials,
    append_jsonl,
    safe_move,
    telegram_send,
)
from telegram_approval_gate import _parse_schedule


class TikTokPublisher:
    def __init__(self, config_path: str = "~/.hermes/config"):
        ensure_content_dirs()
        self.base_path = Path("~/TikTok-DJ-Content").expanduser()
        self.scheduled_dir = SCHEDULED_DIR
        self.processed_dir = PROCESSED_DIR
        self.analytics_dir = ANALYTICS_DIR
        self.secrets = load_secrets()
        self.tiktok = self.secrets.get("tiktok_api", {}) if isinstance(self.secrets, dict) else {}
        self.credentials = load_tiktok_credentials()
        self.enabled = bool(self.tiktok.get("enabled", False))

    def get_scheduled_content(self):
        if not self.scheduled_dir.exists():
            return []
        return sorted(self.scheduled_dir.glob("*.mp4"))

    def _is_due(self, file_path: Path, metadata: dict) -> bool:
        scheduled_for = metadata.get("scheduled_for")
        if not scheduled_for:
            return True
        due = _parse_schedule(str(scheduled_for))
        if due is None:
            return True
        if due.tzinfo is None:
            return True
        return due <= datetime.now(due.tzinfo)

    def publish_to_tiktok(self, file_path: Path, metadata: dict) -> dict:
        access_token = self.credentials.get("access_token", "")
        if not access_token:
            return {
                "success": False,
                "status": "blocked_missing_token",
                "error": "TikTok-Zugriffstoken fehlt",
            }

        size = file_path.stat().st_size
        init_url = "https://open.tiktokapis.com/v2/post/publish/inbox/video/init/"
        init_payload = {
            "source_info": {
                "source": "FILE_UPLOAD",
                "video_size": size,
                "chunk_size": size,
                "total_chunk_count": 1,
            }
        }
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json; charset=UTF-8",
        }
        init_resp = requests.post(init_url, headers=headers, json=init_payload, timeout=30)
        init_data = init_resp.json()
        if init_resp.status_code != 200 or "data" not in init_data:
            return {
                "success": False,
                "status": "init_failed",
                "http_status": init_resp.status_code,
                "error": init_data.get("error", init_data),
            }

        upload_url = init_data["data"].get("upload_url")
        publish_id = init_data["data"].get("publish_id")
        if not upload_url or not publish_id:
            return {
                "success": False,
                "status": "missing_publish_data",
                "error": init_data,
            }

        with file_path.open("rb") as f:
            upload_resp = requests.put(
                upload_url,
                headers={
                    "Content-Type": "video/mp4",
                    "Content-Length": str(size),
                    "Content-Range": f"bytes 0-{size - 1}/{size}",
                },
                data=f,
                timeout=300,
            )

        if upload_resp.status_code not in (200, 201, 204):
            return {
                "success": False,
                "status": "upload_failed",
                "publish_id": publish_id,
                "http_status": upload_resp.status_code,
                "error": upload_resp.text[:500],
            }

        return self.fetch_publish_status(publish_id, access_token)

    def fetch_publish_status(self, publish_id: str, access_token: str) -> dict:
        status_url = "https://open.tiktokapis.com/v2/post/publish/status/fetch/"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json; charset=UTF-8",
        }
        for _ in range(8):
            response = requests.post(status_url, headers=headers, json={"publish_id": publish_id}, timeout=30)
            data = response.json()
            current = ((data.get("data") or {}).get("status") or "").upper()
            if response.status_code != 200:
                return {"success": False, "status": "status_failed", "http_status": response.status_code, "error": data}
            if current in {"PUBLISH_COMPLETE", "PUBLISHED", "SUCCESS"}:
                return {"success": True, "status": "published", "publish_id": publish_id, "response": data}
            if current in {"FAILED", "CANCELLED"}:
                return {"success": False, "status": "publish_failed", "publish_id": publish_id, "error": data}
            time.sleep(10)
        return {"success": False, "status": "publish_pending", "publish_id": publish_id}

    def archive_published_item(self, video_file: Path) -> dict:
        moved_video = safe_move(video_file, self.processed_dir)
        meta = video_file.with_suffix(".json")
        moved_meta = None
        if meta.exists():
            moved_meta = safe_move(meta, self.processed_dir)
        return {"video": str(moved_video), "metadata": str(moved_meta) if moved_meta else None}

    def run_daily_publish(self) -> dict:
        scheduled = self.get_scheduled_content()
        if not scheduled:
            summary = {"status": "no_content", "count": 0}
            append_jsonl(self.analytics_dir / "publish.log.jsonl", {"ts": datetime.now().isoformat(timespec="seconds"), **summary})
            return summary

        due_items = []
        for item in scheduled:
            metadata = load_metadata(item)
            if metadata.get("approval_state") not in {"approved", "scheduled"}:
                continue
            if self._is_due(item, metadata):
                due_items.append((item, metadata))
        if not due_items:
            summary = {"status": "waiting_for_schedule", "count": len(scheduled)}
            append_jsonl(self.analytics_dir / "publish.log.jsonl", {"ts": datetime.now().isoformat(timespec="seconds"), **summary})
            return summary

        content, metadata = due_items[0]
        publish_result = self.publish_to_tiktok(content, metadata)
        if not publish_result.get("success"):
            append_jsonl(self.analytics_dir / "publish.log.jsonl", {
                "ts": datetime.now().isoformat(timespec="seconds"),
                "status": publish_result.get("status", "failed"),
                "file": content.name,
                "publish_result": publish_result,
            })
            telegram_send(
                f"TikTok-Veröffentlichung für {content.name} nicht abgeschlossen: {publish_result.get('status', 'unbekannt')}",
                parse_mode="Markdown",
            )
            return {"success": False, "error": publish_result}

        archive_result = self.archive_published_item(content)
        payload = {
            "ts": datetime.now().isoformat(timespec="seconds"),
            "status": publish_result.get("status", "published"),
            "file": content.name,
            "metadata": metadata,
            "archive": archive_result,
        }
        append_jsonl(self.analytics_dir / "publish.log.jsonl", payload)
        telegram_send(
            f"TikTok-Veröffentlichung produktiv abgeschlossen ({publish_result.get('status', 'published')}).",
            parse_mode="Markdown",
        )
        return {"success": True, "published": content.name, "archive": archive_result, "metadata": metadata}


if __name__ == "__main__":
    result = TikTokPublisher().run_daily_publish()
    print(json.dumps(result, ensure_ascii=False, indent=2))
