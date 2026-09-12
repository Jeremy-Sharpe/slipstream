import asyncio
import csv
import io
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

import httpx

from app.schemas.leads import LeadIn
from app.schemas.origami import Job

TERMINAL_STATUSES = {"succeeded", "failed", "cancelled"}


class OrigamiClient:
    def __init__(self, http: httpx.AsyncClient, api_key: str, base_url: str) -> None:
        self._http = http
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")

    async def create_search(self, brief: str, count: int, quality: str = "fast") -> Job:
        response = await self._http.post(
            f"{self._base_url}/leads/searches",
            headers=self._headers(idempotent=True),
            json={"brief": brief, "count": count},
        )
        response.raise_for_status()
        return Job.model_validate(response.json())

    async def get_job(self, job_id: str) -> Job:
        response = await self._http.get(
            f"{self._base_url}/jobs/{job_id}",
            headers=self._headers(),
        )
        response.raise_for_status()
        return Job.model_validate(response.json())

    async def read_rows(self, list_id: str, ids: list[str]) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        for start in range(0, len(ids), 100):
            batch = ids[start : start + 100]
            response = await self._http.get(
                f"{self._base_url}/leads/lists/{list_id}/rows",
                headers=self._headers(),
                params={"ids": ",".join(batch)},
            )
            response.raise_for_status()
            payload = response.json()
            if isinstance(payload, list):
                rows.extend(payload)
            elif isinstance(payload, dict):
                value = payload.get("rows") or payload.get("data") or []
                if isinstance(value, list):
                    rows.extend(value)
        return rows

    async def export_csv(self, list_id: str) -> str:
        response = await self._http.get(
            f"{self._base_url}/leads/lists/{list_id}/rows",
            headers=self._headers(),
            params={"format": "csv"},
        )
        response.raise_for_status()
        return response.text

    async def get_list(self, list_id: str) -> dict[str, Any]:
        response = await self._http.get(
            f"{self._base_url}/leads/lists/{list_id}",
            headers=self._headers(),
        )
        response.raise_for_status()
        payload = response.json()
        return payload if isinstance(payload, dict) else {"data": payload}

    async def aclose(self) -> None:
        await self._http.aclose()

    def _headers(self, *, idempotent: bool = False) -> dict[str, str]:
        headers = {"Authorization": f"Bearer {self._api_key}"}
        if idempotent:
            headers["Idempotency-Key"] = str(uuid4())
        return headers


async def poll_until_done(
    client: OrigamiClient, job_id: str, *, max_wait_seconds: int = 600
) -> Job:
    started = datetime.now(UTC)
    while True:
        job = await client.get_job(job_id)
        if job.status == "succeeded":
            return job
        if job.status in {"failed", "cancelled"}:
            raise RuntimeError(f"Origami job {job_id} {job.status}: {job.error}")
        elapsed = (datetime.now(UTC) - started).total_seconds()
        if elapsed >= max_wait_seconds:
            raise TimeoutError(
                f"Origami job {job_id} did not finish within {max_wait_seconds} seconds"
            )
        await asyncio.sleep(min(_seconds_until(job.next_poll_at), max_wait_seconds - elapsed))


def map_rows_to_leads(rows: list[dict[str, Any]], csv_text: str | None = None) -> list[LeadIn]:
    csv_by_id = _csv_by_id(csv_text)
    leads: list[LeadIn] = []
    for row in rows:
        if row.get("is_excluded") or row.get("is_deduplicated"):
            continue
        row_id = str(row.get("id") or row.get("row_id") or "")
        if not row_id:
            continue
        cells = _cells(row)
        if not cells and row_id in csv_by_id:
            cells = csv_by_id[row_id]
        company_name = _value(cells, "company_name", "company", "organisation", "organization")
        if not company_name:
            continue
        relevance = row.get("relevance_score") or row.get("origami_relevance_score")
        leads.append(
            LeadIn(
                company_name=company_name,
                company_domain=_value(cells, "company_domain", "domain", "website"),
                person_name=_value(cells, "full_name", "name", "person_name"),
                title=_value(cells, "title", "job_title"),
                email=_value(cells, "email"),
                linkedin_url=_value(cells, "linkedin_url", "linkedin"),
                industry=_value(cells, "industry"),
                employee_count=_int_value(cells, "employee_count", "headcount", "company_size"),
                location=_value(cells, "location", "city"),
                origami_row_id=row_id,
                origami_relevance_score=_float_or_none(relevance),
                metadata={"source": "fixtures", "origami_row": row},
            )
        )
    return leads


def _seconds_until(value: datetime | str | None) -> float:
    if value is None:
        return 15.0
    if isinstance(value, str):
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    else:
        parsed = value
    return max((parsed - datetime.now(UTC)).total_seconds(), 0.0)


def _cells(row: dict[str, Any]) -> dict[str, Any]:
    cells = row.get("cells")
    if isinstance(cells, dict):
        return {str(key).lower(): value for key, value in cells.items()}
    if isinstance(cells, list):
        mapped: dict[str, Any] = {}
        for cell in cells:
            if not isinstance(cell, dict):
                continue
            key = cell.get("slug") or cell.get("column") or cell.get("name")
            if key:
                mapped[str(key).lower()] = cell.get("value")
        return mapped
    return {}


def _value(cells: dict[str, Any], *keys: str) -> str | None:
    for key in keys:
        value = cells.get(key)
        if value is not None and str(value).strip():
            return str(value).strip()
    return None


def _int_value(cells: dict[str, Any], *keys: str) -> int | None:
    value = _value(cells, *keys)
    if value is None:
        return None
    digits = "".join(character for character in value if character.isdigit())
    return int(digits) if digits else None


def _float_or_none(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _csv_by_id(csv_text: str | None) -> dict[str, dict[str, Any]]:
    if not csv_text:
        return {}
    reader = csv.DictReader(io.StringIO(csv_text))
    mapped: dict[str, dict[str, Any]] = {}
    for row in reader:
        row_id = row.get("id")
        if row_id:
            mapped[row_id] = {key.lower(): value for key, value in row.items() if key}
    return mapped
