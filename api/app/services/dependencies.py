from fastapi import Request

from app.core.config import Settings
from app.core.llm import create_embedding_client
from app.services.icp_leads_store import IcpLeadsStore, create_icp_leads_store


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


def get_store(request: Request) -> IcpLeadsStore:
    store = getattr(request.app.state, "icp_leads_store", None)
    if store is None:
        store = create_icp_leads_store(request.app.state.settings)
        request.app.state.icp_leads_store = store
    return store


def get_embedding_client(request: Request) -> object:
    return create_embedding_client(request.app.state.settings)
