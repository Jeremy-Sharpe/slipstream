import json
from datetime import UTC, datetime
from pathlib import Path

from app.core.config import Settings
from app.core.llm import ReasoningResult, structured
from app.schemas.leads import Draft, OutreachDraftContent
from app.services.icp_leads_store import IcpLeadsStore

PROMPT = (Path(__file__).resolve().parents[1] / "prompts" / "outreach-v1.md").read_text(
    encoding="utf-8"
)
SELLER_PATH = Path(__file__).resolve().parents[3] / "fixtures" / "seller.json"


def draft_outreach(
    store: IcpLeadsStore,
    llm: object,
    settings: Settings,
    *,
    lead_id: str,
    rep_name: str,
) -> Draft:
    lead = store.get_lead(lead_id)
    if lead is None:
        raise ValueError("Lead not found")
    profile = store.latest_icp_profile()
    if profile is None:
        raise ValueError("No ready ICP profile found")
    seller = json.loads(SELLER_PATH.read_text(encoding="utf-8"))
    reasoning = _structured(
        llm,
        settings=settings,
        system=PROMPT,
        user=json.dumps(
            {
                "icp": profile.profile.model_dump(mode="json"),
                "lead": lead.model_dump(mode="json"),
                "seller": {
                    "name": seller["name"],
                    "description": seller["description"],
                    "pricing": seller["pricing"],
                },
                "rep_name": rep_name,
            },
            indent=2,
        ),
    )
    content = reasoning.output
    draft = store.insert_draft(
        {
            "kind": "outreach",
            "lead_id": str(lead.id),
            "deal_id": None,
            "conversation_id": None,
            "recipient_name": lead.person_name,
            "recipient_email": lead.email,
            "subject": content.subject,
            "body": content.body,
            "status": "draft",
            "model": reasoning.model,
            "prompt_version": "outreach-v1",
        }
    )
    store.update_lead_status(str(lead.id), "reviewed")
    store.log_activity(
        "outreach.drafted",
        lead_id=str(lead.id),
        details={"draft_id": str(draft.id)},
    )
    return draft


def approve_outreach(store: IcpLeadsStore, *, draft_id: str, actor: str) -> Draft:
    draft = store.get_draft(draft_id)
    if draft is None:
        raise ValueError("Draft not found")
    if draft.kind != "outreach":
        raise ValueError("Draft is not an outreach draft")
    if draft.status != "draft":
        raise ValueError("Only draft outreach can be approved")
    when = datetime.now(UTC)
    sent = store.update_draft_sent(draft_id, actor=actor, when=when)
    store.update_lead_status(str(sent.lead_id), "contacted")
    store.log_activity(
        "outreach.approved",
        actor=actor,
        lead_id=str(sent.lead_id),
        details={"draft_id": str(sent.id)},
    )
    return sent


def _structured(
    llm: object,
    *,
    settings: Settings,
    system: str,
    user: str,
) -> ReasoningResult[OutreachDraftContent]:
    if callable(llm):
        output = llm(
            model=settings.reasoning_model,
            system=system,
            user=user,
            schema=OutreachDraftContent,
            max_tokens=4000,
        )
        if isinstance(output, ReasoningResult):
            return output
        return ReasoningResult(
            output=output,
            model=settings.reasoning_model,
            provider=settings.reasoning_provider,
        )
    return structured(llm, system=system, user=user, schema=OutreachDraftContent)
