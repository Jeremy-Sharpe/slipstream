import asyncio
from datetime import UTC, datetime, timedelta
from email.utils import format_datetime

import httpx
import pytest

from app.services.origami import (
    OrigamiClient,
    _cell_value,
    _nonnegative_int,
    _retry_after_seconds,
    _seconds_until,
    map_rows_to_leads,
    poll_until_done,
)


@pytest.mark.asyncio
async def test_client_uses_v3_search_and_row_contract() -> None:
    requests: list[httpx.Request] = []

    def respond(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        if request.method == "POST":
            return httpx.Response(202, json={"id": "job-1", "status": "queued"})
        cursor = request.url.params.get("cursor")
        return httpx.Response(
            200,
            json={
                "object": "list",
                "items": [
                    {
                        "id": "row-2" if cursor else "row-1",
                        "cells": {
                            "company-name": {
                                "type": "scalar",
                                "value": "Dockside Dental" if cursor else "Northwind Legal",
                            }
                        },
                    },
                ],
                "next_cursor": None if cursor else "cursor-1",
                "url": "/leads/lists/list-1/rows",
            },
        )

    http = httpx.AsyncClient(transport=httpx.MockTransport(respond))
    client = OrigamiClient(http, "og_test", "https://origami.test")

    job = await client.create_search("Find practice managers.", 10, "accurate")
    rows = await client.read_rows("list-1", ["row-1", "row-2"])
    await client.aclose()

    assert job.status == "queued"
    assert requests[0].headers["Idempotency-Key"]
    assert requests[0].read() == (
        b'{"brief":"Find practice managers.","count":10,"quality":"accurate"}'
    )
    assert requests[1].url.params.get_list("ids") == ["row-1", "row-2"]
    assert requests[1].url.params["limit"] == "100"
    assert requests[2].url.params["cursor"] == "cursor-1"
    assert [row["id"] for row in rows] == ["row-1", "row-2"]


@pytest.mark.asyncio
async def test_client_forwards_a_stable_search_idempotency_key() -> None:
    request_seen: httpx.Request | None = None

    def respond(request: httpx.Request) -> httpx.Response:
        nonlocal request_seen
        request_seen = request
        return httpx.Response(202, json={"id": "job-1", "status": "queued"})

    client = OrigamiClient(
        httpx.AsyncClient(transport=httpx.MockTransport(respond)),
        "og_test",
        "https://origami.test",
    )
    await client.create_search(
        "Find practice managers.",
        10,
        idempotency_key="31b779b9-8ef5-451d-b72a-9400d6859d3d",
    )
    await client.aclose()

    assert request_seen is not None
    assert request_seen.headers["Idempotency-Key"] == (
        "31b779b9-8ef5-451d-b72a-9400d6859d3d"
    )


@pytest.mark.asyncio
async def test_read_rows_splits_more_than_one_hundred_ids() -> None:
    requests: list[httpx.Request] = []

    def respond(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        ids = request.url.params.get_list("ids")
        return httpx.Response(
            200,
            json={
                "object": "list",
                "items": [{"id": row_id, "cells": {}} for row_id in ids],
                "next_cursor": None,
                "url": "/leads/lists/list-1/rows",
            },
        )

    http = httpx.AsyncClient(transport=httpx.MockTransport(respond))
    client = OrigamiClient(http, "og_test", "https://origami.test")
    ids = [f"row-{index}" for index in range(101)]

    rows = await client.read_rows("list-1", ids)
    await client.aclose()

    assert len(requests) == 2
    assert len(requests[0].url.params.get_list("ids")) == 100
    assert requests[1].url.params.get_list("ids") == ["row-100"]
    assert [row["id"] for row in rows] == ids


@pytest.mark.asyncio
async def test_csv_export_is_scoped_to_requested_rows() -> None:
    requests: list[httpx.Request] = []

    def respond(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(200, text="id,company_name\nrow-1,Northwind Legal\n")

    http = httpx.AsyncClient(transport=httpx.MockTransport(respond))
    client = OrigamiClient(http, "og_test", "https://origami.test")

    await client.export_csv("list-1", ["row-1", "row-2"])
    await client.aclose()

    assert requests[0].url.params.get_list("ids") == ["row-1", "row-2"]
    assert requests[0].url.params["format"] == "csv"


def test_map_rows_to_leads_skips_excluded_and_uses_csv_fallback() -> None:
    rows = [
        {
            "id": "row-1",
            "relevance_score": 0,
            "cells": {
                "company-name": {"type": "scalar", "value": "Northwind Legal"},
                "full-name": {"type": "value", "value": "Ari Day"},
                "email": {"type": "value", "value": "ari@example.com"},
            },
        },
        {"id": "row-2", "is_excluded": True, "cells": {"company_name": "Skip Co"}},
        {"id": "row-3", "relevance_score": 0.4},
        {"id": "row-4", "cells": {"company_name": {"type": [], "value": "Wrong"}}},
        {"id": "row-5", "cells": {"company_name": {"type": "scalar", "value": ""}}},
        {"id": "row-6", "cells": {"company_name": {"type": "scalar", "value": "  "}}},
        {"id": "row-7", "cells": {"company": "Current Co"}},
        {"id": "row-8", "cells": [{"slug": "company_name", "value": "List Cell Co"}]},
        {"id": "row-9", "relevance_score": "NaN", "cells": {"company_name": "Finite Co"}},
    ]
    csv_text = (
        "id,company_name,full_name,title,email\n"
        "row-3,Dockside Dental,Lee Park,Practice Manager,lee@example.com\n"
        "row-4,Recovered Advisory,Sam Lee,CFO,sam@example.com\n"
        "row-5,Blank Recovery,Taylor Jay,COO,taylor@example.com\n"
        "row-6,Whitespace Recovery,Alex Kay,CTO,alex@example.com\n"
        "row-7,Stale CSV Co,Pat Dee,CEO,pat@example.com\n"
    )

    leads = map_rows_to_leads(rows, csv_text)

    assert [lead.origami_row_id for lead in leads] == [
        "row-1",
        "row-3",
        "row-4",
        "row-5",
        "row-6",
        "row-7",
        "row-8",
        "row-9",
    ]
    assert leads[1].company_name == "Dockside Dental"
    assert leads[2].company_name == "Recovered Advisory"
    assert leads[3].company_name == "Blank Recovery"
    assert leads[4].company_name == "Whitespace Recovery"
    assert leads[5].company_name == "Current Co"
    assert leads[6].company_name == "List Cell Co"
    assert leads[7].origami_relevance_score is None
    assert leads[0].metadata["origami_row"]["id"] == "row-1"
    assert leads[0].metadata["source"] == "origami"
    assert leads[0].origami_relevance_score == 0


def test_typed_cell_unwraps_only_one_recognised_envelope() -> None:
    structured = {"value": "Acme", "confidence": 0.8}

    assert _cell_value({"type": "value", "value": structured}) == structured
    assert _cell_value({"type": "sequence", "value": "do not use"}) is None
    assert _cell_value({"value": "not a typed envelope"}) is None


def test_numeric_api_alias_precedes_stale_csv_alias() -> None:
    rows = [
        {
            "id": "row-1",
            "cells": {
                "company_name": "Current Co",
                "employee_count": "10–20",
                "headcount": 25.0,
            },
        },
        {
            "id": "row-2",
            "cells": {"company_name": "Fallback Co", "employee_count": -5},
        },
        {
            "id": "row-3",
            "cells": {"company_name": "Malformed Grouping Co", "employee_count": "1,5"},
        },
        {
            "id": "row-4",
            "cells": {"company_name": "Oversized Co", "employee_count": "9" * 5000},
        },
        {
            "id": "row-5",
            "cells": {"company_name": "Integer Overflow Co", "employee_count": 1_000_000_000},
        },
        {
            "id": "row-6",
            "cells": {"company_name": "Float Overflow Co", "employee_count": 1e100},
        },
    ]
    csv_text = (
        "id,company_name,employee_count\n"
        "row-1,Old Co,10\n"
        "row-2,Old Fallback Co,12\n"
        "row-3,Old Grouping Co,13\n"
        "row-4,Old Oversized Co,14\n"
        "row-5,Old Integer Overflow Co,15\n"
        "row-6,Old Float Overflow Co,16\n"
    )

    leads = map_rows_to_leads(rows, csv_text)

    assert leads[0].company_name == "Current Co"
    assert leads[0].employee_count == 25
    assert leads[1].company_name == "Fallback Co"
    assert leads[1].employee_count == 12
    assert leads[2].company_name == "Malformed Grouping Co"
    assert leads[2].employee_count == 13
    assert leads[3].company_name == "Oversized Co"
    assert leads[3].employee_count == 14
    assert leads[4].company_name == "Integer Overflow Co"
    assert leads[4].employee_count == 15
    assert leads[5].company_name == "Float Overflow Co"
    assert leads[5].employee_count == 16
    assert _nonnegative_int(999_999_999) == 999_999_999


@pytest.mark.asyncio
async def test_read_rows_rejects_a_non_v3_envelope() -> None:
    def respond(_: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"rows": []})

    http = httpx.AsyncClient(transport=httpx.MockTransport(respond))
    client = OrigamiClient(http, "og_test", "https://origami.test")

    with pytest.raises(RuntimeError, match="malformed row-list"):
        await client.read_rows("list-1", ["row-1"])
    await client.aclose()


@pytest.mark.asyncio
async def test_read_rows_rejects_missing_cursor_metadata() -> None:
    def respond(_: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"object": "list", "items": []})

    http = httpx.AsyncClient(transport=httpx.MockTransport(respond))
    client = OrigamiClient(http, "og_test", "https://origami.test")

    with pytest.raises(RuntimeError, match="omitted its cursor"):
        await client.read_rows("list-1", ["row-1"])
    await client.aclose()


@pytest.mark.asyncio
async def test_read_rows_rejects_a_repeated_cursor() -> None:
    def respond(_: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "object": "list",
                "items": [],
                "next_cursor": "same-cursor",
                "url": "/leads/lists/list-1/rows",
            },
        )

    http = httpx.AsyncClient(transport=httpx.MockTransport(respond))
    client = OrigamiClient(http, "og_test", "https://origami.test")

    with pytest.raises(RuntimeError, match="repeated"):
        await client.read_rows("list-1", ["row-1"])
    await client.aclose()


@pytest.mark.asyncio
async def test_poll_until_done_uses_job_sequence(monkeypatch: pytest.MonkeyPatch) -> None:
    calls = 0
    waits: list[float] = []

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
        headers = {"Retry-After": "2.5"} if calls == 1 else {}
        return httpx.Response(200, json=payload, headers=headers)

    async def no_sleep(seconds: float) -> None:
        waits.append(seconds)

    monkeypatch.setattr("app.services.origami.asyncio.sleep", no_sleep)
    http = httpx.AsyncClient(transport=httpx.MockTransport(respond))
    client = OrigamiClient(http, "og_test", "https://origami.test")

    job = await poll_until_done(client, "job-1")

    assert job.status == "succeeded"
    assert calls == 2
    assert waits == [2.5]


@pytest.mark.asyncio
async def test_poll_until_done_retries_a_rate_limit(monkeypatch: pytest.MonkeyPatch) -> None:
    calls = 0
    waits: list[float] = []

    def respond(_: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        if calls == 1:
            return httpx.Response(429, headers={"Retry-After": "3"})
        return httpx.Response(200, json={"id": "job-1", "status": "succeeded"})

    async def no_sleep(seconds: float) -> None:
        waits.append(seconds)

    monkeypatch.setattr("app.services.origami.asyncio.sleep", no_sleep)
    http = httpx.AsyncClient(transport=httpx.MockTransport(respond))
    client = OrigamiClient(http, "og_test", "https://origami.test")

    job = await poll_until_done(client, "job-1")
    await client.aclose()

    assert job.status == "succeeded"
    assert waits == [3.0]


@pytest.mark.asyncio
async def test_retryable_job_response_respects_overall_deadline(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls = 0

    def respond(_: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        return httpx.Response(503, headers={"Retry-After": "10"})

    moments = iter([0.0, 0.0, 1.0])
    monkeypatch.setattr("app.services.origami._monotonic", lambda: next(moments))
    http = httpx.AsyncClient(transport=httpx.MockTransport(respond))
    client = OrigamiClient(http, "og_test", "https://origami.test")

    with pytest.raises(TimeoutError, match="polling deadline"):
        await poll_until_done(client, "job-1", max_wait_seconds=5)
    await client.aclose()
    assert calls == 1


@pytest.mark.asyncio
async def test_poll_until_done_cancels_an_overdue_request() -> None:
    class HangingOrigami:
        async def get_job(self, _: str) -> None:
            await asyncio.Event().wait()

    with pytest.raises(TimeoutError, match="polling deadline"):
        await poll_until_done(HangingOrigami(), "job-1", max_wait_seconds=0.01)  # type: ignore[arg-type]


def test_retry_after_supports_http_dates_and_rejects_non_finite_values() -> None:
    now = datetime(2026, 9, 13, 0, 0, tzinfo=UTC)

    assert _retry_after_seconds(format_datetime(now + timedelta(seconds=30)), now=now) == 30
    assert _retry_after_seconds(format_datetime(now - timedelta(seconds=30)), now=now) == 0
    assert _retry_after_seconds("NaN", now=now) is None
    assert _retry_after_seconds("Infinity", now=now) is None
    assert _retry_after_seconds("-1", now=now) is None
    assert _seconds_until("not-a-date") == 15.0
    assert _seconds_until(datetime(2026, 9, 13)) == 15.0


@pytest.mark.asyncio
async def test_poll_until_done_fails_fast_when_job_needs_input() -> None:
    def respond(_: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "id": "job-1",
                "status": "needs_input",
                "needs_input": {"prompt": "Choose a target geography"},
            },
        )

    http = httpx.AsyncClient(transport=httpx.MockTransport(respond))
    client = OrigamiClient(http, "og_test", "https://origami.test")

    with pytest.raises(RuntimeError, match="operator input") as error:
        await poll_until_done(client, "job-1")
    await client.aclose()
    assert "target geography" not in str(error.value)
