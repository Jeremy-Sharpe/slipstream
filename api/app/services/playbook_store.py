from __future__ import annotations

from typing import Any

from pydantic import ValidationError

from app.schemas.scorecard import Playbook


class PlaybookStaleError(RuntimeError):
    pass


def store_playbook(client: Any, playbook: Playbook) -> Playbook:
    payload = (
        client.rpc(
            "store_playbook_if_current",
            {"p_playbook": playbook.model_dump(mode="json")},
        )
        .execute()
        .data
    )
    if payload is None:
        raise PlaybookStaleError("Playbook cohort changed before persistence")
    if not payload:
        raise RuntimeError("Playbook persistence returned no playbook")
    try:
        return Playbook.model_validate(payload)
    except ValidationError as error:
        raise RuntimeError("Playbook persistence returned an invalid playbook") from error


def read_latest_playbooks(client: Any, limit: int) -> list[Playbook]:
    rows = (
        client.table("playbooks")
        .select("playbook")
        .order("generated_at", desc=True)
        .limit(limit)
        .execute()
        .data
    )
    playbooks: list[Playbook] = []
    for row in rows or []:
        try:
            playbooks.append(Playbook.model_validate(row.get("playbook")))
        except ValidationError as error:
            raise RuntimeError("Playbook persistence returned an invalid playbook") from error
    return playbooks
