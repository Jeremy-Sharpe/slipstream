from __future__ import annotations

import asyncio
from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, Request, status

from app.routers.calls import load_call
from app.schemas.extraction import ExtractionResult
from app.services.extract import (
    ExtractionUnavailableError,
    extract_fixture,
    extract_with_claude,
)

router = APIRouter(prefix="/calls", tags=["extraction"])


def _read_stored(client: Any, conversation_id: UUID) -> ExtractionResult | None:
    rows = (
        client.table("conversations")
        .select("extracted_fields")
        .eq("id", str(conversation_id))
        .limit(1)
        .execute()
        .data
    )
    if not rows or not rows[0].get("extracted_fields"):
        return None
    return ExtractionResult.model_validate(rows[0]["extracted_fields"])


def _store(client: Any, result: ExtractionResult) -> None:
    payload = result.model_dump(mode="json")
    client.table("conversations").update(
        {
            "extracted_fields": payload,
            "summary": result.summary,
            "processing_status": "ready",
            "processing_error": None,
        }
    ).eq("id", str(result.conversation_id)).execute()


async def _existing(request: Request, conversation_id: UUID) -> ExtractionResult | None:
    if request.app.state.supabase is None:
        return request.app.state.extraction_store.get(str(conversation_id))
    try:
        return await asyncio.to_thread(_read_stored, request.app.state.supabase, conversation_id)
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The CRM staging store is unavailable",
        ) from error


async def _save(request: Request, result: ExtractionResult) -> None:
    if request.app.state.supabase is None:
        request.app.state.extraction_store[str(result.conversation_id)] = result
        return
    try:
        await asyncio.to_thread(_store, request.app.state.supabase, result)
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The extracted CRM fields could not be staged",
        ) from error


@router.post("/{conversation_id}/extract", response_model=ExtractionResult)
async def extract_call(conversation_id: UUID, request: Request) -> ExtractionResult:
    lock = request.app.state.extraction_locks[
        conversation_id.int % len(request.app.state.extraction_locks)
    ]
    async with lock:
        existing = await _existing(request, conversation_id)
        if existing is not None:
            return existing
        call = await load_call(request, conversation_id)
        if call is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Call not found")
        try:
            if call.fixture:
                result = await asyncio.to_thread(extract_fixture, call)
            else:
                api_key = request.app.state.settings.anthropic_api_key
                if api_key is None:
                    raise HTTPException(
                        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                        detail=(
                            "Claude extraction is not configured; fixture calls remain available"
                        ),
                    )
                result = await extract_with_claude(
                    call,
                    api_key=api_key.get_secret_value(),
                    client=request.app.state.transcription_client,
                )
        except ExtractionUnavailableError as error:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="The call could not be converted into CRM fields",
            ) from error
        await _save(request, result)
        return result


@router.get("/{conversation_id}/extraction", response_model=ExtractionResult)
async def get_extraction(conversation_id: UUID, request: Request) -> ExtractionResult:
    result = await _existing(request, conversation_id)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Extraction not found")
    return result
