from datetime import UTC, datetime

import httpx
import pytest

from app.services.origami import OrigamiClient, map_rows_to_leads, poll_until_done


def test_map_rows_to_leads_skips_excluded_and_uses_csv_fallback() -> None:
    rows = [
        {
            "id": "row-1",
            "relevance_score": 88,
            "cells": {
                "company_name": "Northwind Legal",
                "full_name": "Ari Day",
                "email": "ari@example.com",
            },
        },
        {"id": "row-2", "is_excluded": True, "cells": {"company_name": "Skip Co"}},
        {"id": "row-3", "relevance_score": 0.4},
    ]
    csv_text = (
        "id,company_name,full_name,title,email\n"
        "row-3,Dockside Dental,Lee Park,Practice Manager,lee@example.com\n"
    )

    leads = map_rows_to_leads(rows, csv_text)

    assert [lead.origami_row_id for lead in leads] == ["row-1", "row-3"]
    assert leads[1].company_name == "Dockside Dental"
    assert leads[0].metadata["origami_row"]["id"] == "row-1"


@pytest.mark.asyncio
async def test_poll_until_done_uses_job_sequence(monkeypatch: pytest.MonkeyPatch) -> None:
    calls = 0

    def respond(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        payload = (
            {
                "id": "job-1",
                "status": "running",
                "phase": "searching",
                "next_poll_at": datetime.now(UTC).isoformat(),
            }
            if calls == 1
            else {
                "id": "job-1",
                "status": "succeeded",
                "result": {"list_id": "list-1", "row_ids": ["row-1"]},
            }
        )
        return httpx.Response(200, json=payload)

    async def no_sleep(_: float) -> None:
        return None

    monkeypatch.setattr("app.services.origami.asyncio.sleep", no_sleep)
    http = httpx.AsyncClient(transport=httpx.MockTransport(respond))
    client = OrigamiClient(http, "og_test", "https://origami.test")

    job = await poll_until_done(client, "job-1")

    assert job.status == "succeeded"
    assert calls == 2
