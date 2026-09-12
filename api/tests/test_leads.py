from pathlib import Path

import pytest

from app.core.config import Settings
from app.schemas.icp import IcpProfile
from app.schemas.origami import Job
from app.services.fixture_history import load_fixture_history
from app.services.icp import derive_icp
from app.services.icp_leads_store import InMemoryIcpLeadsStore
from app.services.leads import complete_search

FIXTURES_DIR = Path(__file__).resolve().parents[2] / "fixtures"


def fake_embed(texts: list[str]) -> list[list[float]]:
    vectors = []
    for text in texts:
        if "Best Fit" in text:
            vectors.append([10.0, 0.0, 0.0])
        elif "Lower Fit" in text:
            vectors.append([1.0, 10.0, 0.0])
        else:
            vectors.append([10.0, 0.0, 0.0])
    return vectors


def fake_structured(**_: object) -> IcpProfile:
    return IcpProfile(
        summary="Managed IT buyers.",
        industries=["Professional services"],
        headcount_band="25-80",
        roles=["Practice Manager"],
        triggers=["Compliance"],
        disqualifiers=["No trigger"],
        evidence=[],
        confidence=0.8,
        origami_brief="Find fit.",
    )


class FakeOrigami:
    async def read_rows(self, list_id: str, ids: list[str]) -> list[dict[str, object]]:
        assert list_id == "list-1"
        assert ids == ["row-1", "row-2", "row-3"]
        return [
            {"id": "row-1", "relevance_score": 95, "cells": {"company_name": "Best Fit Advisory"}},
            {"id": "row-2", "relevance_score": 45, "cells": {"company_name": "Lower Fit Studio"}},
            {"id": "row-3", "is_excluded": True, "cells": {"company_name": "Excluded Co"}},
        ]

    async def export_csv(self, list_id: str) -> str:
        return ""


@pytest.mark.asyncio
async def test_complete_search_orders_by_similarity_and_skips_excluded(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    store = InMemoryIcpLeadsStore()
    load_fixture_history(store, FIXTURES_DIR)
    profile = derive_icp(store, fake_structured, fake_embed, Settings(_env_file=None))

    async def done(*_: object, **__: object) -> Job:
        return Job(
            id="job-1",
            status="succeeded",
            result={"list_id": "list-1", "row_ids": ["row-1", "row-2", "row-3"]},
        )

    monkeypatch.setattr("app.services.leads.poll_until_done", done)

    await complete_search(
        store,
        FakeOrigami(),  # type: ignore[arg-type]
        fake_embed,
        Settings(_env_file=None),
        icp_profile_id=str(profile.id),
        job_id="job-1",
    )

    leads = store.list_leads(icp_profile_id=str(profile.id))
    assert [lead.company_name for lead in leads] == ["Best Fit Advisory", "Lower Fit Studio"]
    assert leads[0].origami_relevance_score == 0.95
