from __future__ import annotations

import asyncio
import copy
from collections import deque
from datetime import UTC, datetime, timedelta


class CoachStore:
    def __init__(self, client):
        self.client = client
        self.rows: dict[str, dict] = {}
        self.locks = [asyncio.Lock() for _ in range(32)]
        self.connected: set[str] = set()
        self.created = deque()
        self.model_tasks: dict[str, asyncio.Task] = {}

    def lock(self, session_id: str):
        return self.locks[int(session_id.replace("-", "")[:8], 16) % len(self.locks)]

    async def read(self, session_id: str) -> dict | None:
        if self.client is None:
            return copy.deepcopy(self.rows.get(session_id))

        def read():
            rows = (
                self.client.table("coach_sessions")
                .select("payload")
                .eq("id", session_id)
                .execute()
                .data
            )
            return rows[0]["payload"] if rows else None

        return await asyncio.to_thread(read)

    async def save(self, row: dict, event: str) -> None:
        previous_version = row.get("version", 0)
        row["version"] = previous_version + 1
        row["updated_at"] = datetime.now(UTC).isoformat()
        if self.client is None:
            existing = self.rows.get(row["id"])
            if (existing or {}).get("version", 0) != previous_version:
                raise ValueError("Session changed; retry with the latest snapshot")
            cutoff = datetime.now(UTC) - timedelta(days=1)
            self.rows = {
                k: v
                for k, v in self.rows.items()
                if datetime.fromisoformat(v["updated_at"]) > cutoff
            }
            if len(self.rows) >= 100 and row["id"] not in self.rows:
                raise ValueError("Session capacity reached")
            self.rows[row["id"]] = copy.deepcopy(row)
            return

        def write():
            self.client.rpc(
                "save_coach_session",
                {
                    "session_id": row["id"],
                    "expected_version": previous_version,
                    "session_payload": row,
                    "event_kind": event,
                },
            ).execute()

        await asyncio.to_thread(write)


def public_session(row: dict) -> dict:
    return {
        k: row.get(k)
        for k in (
            "id",
            "status",
            "created_at",
            "updated_at",
            "context",
            "state",
            "audio_mode",
            "conversation_id",
            "recording_status",
            "version",
            "model",
            "last_analysis_ms",
        )
    }
