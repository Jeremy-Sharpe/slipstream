from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from app.schemas.scorecard import Scorecard
from app.services.score import transcript_from_segments


class ScorecardNotFoundError(LookupError):
    pass


class ScorecardStaleError(RuntimeError):
    pass


def store_scorecard(
    client: Any,
    scorecard: Scorecard,
    source_revision: str,
) -> Scorecard:
    """Persist a scorecard without allowing an older concurrent result to win."""
    rows = (
        client.rpc(
            "store_conversation_scorecard",
            {
                "p_call_id": scorecard.call_id,
                "p_scorecard": scorecard.model_dump(mode="json"),
                "p_source_revision": source_revision,
            },
        )
        .execute()
        .data
    )
    if not rows:
        if read_conversation_revision(client, scorecard.call_id) is None:
            raise ScorecardNotFoundError(scorecard.call_id)
        raise ScorecardStaleError(scorecard.call_id)
    payload = rows[0].get("scorecard") if isinstance(rows, list) else None
    if not payload:
        raise RuntimeError("Scorecard persistence returned no scorecard")
    return Scorecard.model_validate(payload)


def read_conversation_revision(client: Any, call_id: str) -> datetime | None:
    row = _read_conversation_field(client, call_id, "updated_at")
    if row is None:
        return None
    return datetime.fromisoformat(str(row["updated_at"]).replace("Z", "+00:00"))


def read_scorecard(client: Any, call_id: str) -> Scorecard | None:
    row = _read_conversation_field(client, call_id, "scorecard")
    if row is None or not row.get("scorecard"):
        return None
    return Scorecard.model_validate(row["scorecard"])


def read_scorecards(client: Any, call_ids: list[str]) -> list[tuple[str, Scorecard] | None]:
    rows = (
        client.table("conversations")
        .select("id,source_external_id,scorecard")
        .eq("channel", "call")
        .in_("source_external_id", call_ids)
        .execute()
        .data
    )
    uuid_ids = []
    for call_id in call_ids:
        try:
            uuid_ids.append(str(UUID(call_id)))
        except ValueError:
            pass
    if uuid_ids:
        rows.extend(
            client.table("conversations")
            .select("id,source_external_id,scorecard")
            .eq("channel", "call")
            .in_("id", uuid_ids)
            .execute()
            .data
        )
    result: list[tuple[str, Scorecard] | None] = []
    for call_id in call_ids:
        matching_row = next((row for row in rows if str(row["id"]) == call_id), None)
        if matching_row is None:
            matching_row = next(
                (row for row in rows if row.get("source_external_id") == call_id),
                None,
            )
        payload = matching_row.get("scorecard") if matching_row else None
        result.append(
            (str(matching_row["id"]), Scorecard.model_validate(payload))
            if matching_row and payload
            else None
        )
    return result


def load_scorecard_source(client: Any, call_id: str):
    payload = client.rpc("read_scorecard_source", {"p_call_id": call_id}).execute().data
    if isinstance(payload, list):
        payload = payload[0] if payload else None
    if (
        not isinstance(payload, dict)
        or payload.get("processing_status") != "ready"
        or not payload.get("rep")
        or not payload.get("segments")
        or not payload.get("source_revision")
    ):
        raise ScorecardNotFoundError(call_id)
    transcript = transcript_from_segments(
        str(payload["id"]),
        str(payload["rep"]),
        payload.get("outcome"),
        payload["segments"],
    )
    return transcript, str(payload["source_revision"])


def _read_conversation_field(client: Any, call_id: str, field: str) -> dict[str, Any] | None:
    try:
        conversation_id = str(UUID(call_id))
    except ValueError:
        conversation_id = None
    rows = []
    if conversation_id is not None:
        rows = (
            client.table("conversations")
            .select(field)
            .eq("channel", "call")
            .eq("id", conversation_id)
            .limit(1)
            .execute()
            .data
        )
    if not rows:
        rows = (
            client.table("conversations")
            .select(field)
            .eq("channel", "call")
            .eq("source_external_id", call_id)
            .limit(1)
            .execute()
            .data
        )
    return rows[0] if rows else None
