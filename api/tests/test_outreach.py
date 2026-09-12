from app.core.config import Settings
from app.schemas.icp import IcpProfile
from app.schemas.leads import LeadIn, OutreachDraftContent
from app.services.icp_leads_store import InMemoryIcpLeadsStore
from app.services.outreach import approve_outreach, draft_outreach


def fake_structured(**_: object) -> OutreachDraftContent:
    return OutreachDraftContent(
        subject="Cyber insurance evidence",
        body=(
            "Hi Maya,\n\nNoticed the insurance evidence work. We help teams keep managed IT "
            "and cyber controls tidy. Open to a quick chat?\n\nSam"
        ),
    )


def test_outreach_approve_sets_lifecycle_fields_and_refuses_second_approve() -> None:
    store = InMemoryIcpLeadsStore()
    profile = IcpProfile(
        summary="Fit",
        industries=["Professional services"],
        headcount_band="25-80",
        roles=["Practice Manager"],
        triggers=["Compliance"],
        disqualifiers=[],
        evidence=[],
        confidence=0.8,
        origami_brief="Find fit.",
    )
    store.insert_icp_profile(
        version=1,
        profile=profile,
        model="claude-opus-5",
        embedding_model="text-embedding-3-small",
    )
    lead = store.upsert_lead(
        LeadIn(
            company_name="Northstar Labs",
            person_name="Maya Chen",
            email="maya@example.com",
            origami_row_id="row-1",
        )
    )

    draft = draft_outreach(
        store,
        fake_structured,
        Settings(_env_file=None),
        lead_id=str(lead.id),
        rep_name="Sam",
    )
    approved = approve_outreach(store, draft_id=str(draft.id), actor="anna")

    assert approved.status == "approved"
    assert approved.approved_by == "anna"
    assert approved.approved_at is not None
    assert approved.sent_at is None
    assert store.get_lead(str(lead.id)).status == "approved"  # type: ignore[union-attr]
    try:
        approve_outreach(store, draft_id=str(draft.id), actor="anna")
    except ValueError as error:
        assert "Only draft outreach" in str(error)
    else:
        raise AssertionError("Second approve should fail")


def test_outreach_approval_preserves_an_already_contacted_lead() -> None:
    store = InMemoryIcpLeadsStore()
    lead = store.upsert_lead(
        LeadIn(
            company_name="Existing Customer",
            email="customer@example.com",
            origami_row_id="already-contacted",
        )
    )
    store.update_lead_status(str(lead.id), "contacted")
    draft = store.insert_draft(
        {
            "lead_id": str(lead.id),
            "kind": "outreach",
            "subject": "A new note",
            "body": "Would another conversation help?",
            "status": "draft",
        }
    )

    approved = approve_outreach(store, draft_id=str(draft.id), actor="anna")

    assert approved.status == "approved"
    assert store.get_lead(str(lead.id)).status == "contacted"  # type: ignore[union-attr]
