"""Row parsing for the Supabase-backed ICP and leads store."""

import pytest

from app.services.icp_leads_store import _deal_from_row, _lead_from_row, _vector

DEAL_ROW = {
    "id": "153002a1-792f-426f-8fe1-a7c744ea45eb",
    "name": "Fixture deal",
    "stage": "evaluation",
    "outcome": "won",
    "companies": {"name": "Acme", "domain": "acme.com"},
    "contacts": {"first_name": "Ada", "last_name": "Lovelace", "title": "COO"},
}

LEAD_ROW = {
    "id": "6a6cd1a2-1f2f-4c1b-9d7f-3d1d4f1c2b3a",
    "company_name": "Acme",
    "origami_row_id": "row_1",
    "status": "new",
}


def test_vector_parses_postgrest_text_literal() -> None:
    assert _vector("[-0.5,0.25,1]") == [-0.5, 0.25, 1.0]


def test_vector_passes_lists_and_none_through() -> None:
    assert _vector([0.1, 0.2]) == [0.1, 0.2]
    assert _vector(None) is None


def test_vector_rejects_non_vector_values() -> None:
    with pytest.raises(ValueError):
        _vector('{"not": "a vector"}')


def test_deal_row_with_text_embedding_becomes_list() -> None:
    deal = _deal_from_row({**DEAL_ROW, "embedding": "[0.1,0.2]", "embedding_model": "m"})
    assert deal.embedding == [0.1, 0.2]
    assert deal.contact_name == "Ada Lovelace"


def test_lead_row_with_text_embedding_becomes_list() -> None:
    lead = _lead_from_row({**LEAD_ROW, "embedding": "[0.3,0.4]"})
    assert lead.embedding == [0.3, 0.4]
