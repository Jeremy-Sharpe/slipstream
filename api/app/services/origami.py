import asyncio
import csv
import io
import math
import re
import time
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
from typing import Any
from uuid import uuid4

import httpx

from app.schemas.leads import LeadIn
from app.schemas.origami import Job

TERMINAL_STATUSES = {"succeeded", "failed", "cancelled"}
MAX_ROW_PAGES_PER_BATCH = 10
RETRYABLE_JOB_STATUSES = {429, 502, 503, 504}
GROUPED_INTEGER = re.compile(r"(?:\d{1,9}|[1-9]\d{0,2}(?:,\d{3}){1,2})")
MAX_EMPLOYEE_COUNT = 999_999_999


class OrigamiRetryableError(RuntimeError):
    def __init__(self, retry_after_seconds: float) -> None:
        super().__init__("Origami temporarily asked the client to retry")
        self.retry_after_seconds = retry_after_seconds


class OrigamiClient:
    def __init__(self, http: httpx.AsyncClient, api_key: str, base_url: str) -> None:
        self._http = http
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")

    async def create_search(
        self,
        brief: str,
        count: int,
        quality: str = "fast",
        idempotency_key: str | None = None,
    ) -> Job:
        response = await self._http.post(
            f"{self._base_url}/leads/searches",
            headers=self._headers(idempotency_key=idempotency_key or str(uuid4())),
            json={"brief": brief, "count": count, "quality": quality},
        )
        response.raise_for_status()
        return Job.model_validate(response.json())

    async def get_job(self, job_id: str) -> Job:
        response = await self._http.get(
            f"{self._base_url}/jobs/{job_id}",
            headers=self._headers(),
        )
        retry_after = _retry_after_seconds(response.headers.get("Retry-After"))
        if response.status_code in RETRYABLE_JOB_STATUSES and retry_after is not None:
            raise OrigamiRetryableError(retry_after)
        response.raise_for_status()
        job = Job.model_validate(response.json())
        return job.model_copy(update={"retry_after_seconds": retry_after})

    async def read_rows(self, list_id: str, ids: list[str]) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        for start in range(0, len(ids), 100):
            batch = ids[start : start + 100]
            cursor: str | None = None
            seen_cursors: set[str] = set()
            seen_row_ids: set[str] = set()
            for _ in range(MAX_ROW_PAGES_PER_BATCH):
                params = [("ids", row_id) for row_id in batch]
                params.append(("limit", "100"))
                if cursor is not None:
                    params.append(("cursor", cursor))
                response = await self._http.get(
                    f"{self._base_url}/leads/lists/{list_id}/rows",
                    headers=self._headers(),
                    params=params,
                )
                response.raise_for_status()
                payload = response.json()
                if not isinstance(payload, dict) or payload.get("object") != "list":
                    raise RuntimeError("Origami returned a malformed row-list response")
                items = payload.get("items")
                if not isinstance(items, list) or not all(isinstance(row, dict) for row in items):
                    raise RuntimeError("Origami returned a malformed row-list response")
                if "next_cursor" not in payload:
                    raise RuntimeError("Origami row-list response omitted its cursor")
                for row in items:
                    row_id = str(row.get("id") or "")
                    if not row_id or row_id not in batch or row_id in seen_row_ids:
                        raise RuntimeError("Origami returned inconsistent row-list results")
                    seen_row_ids.add(row_id)
                    rows.append(row)
                next_cursor = payload.get("next_cursor")
                if next_cursor is None:
                    break
                if not isinstance(next_cursor, str) or not next_cursor.strip():
                    raise RuntimeError("Origami returned a malformed row-list cursor")
                if next_cursor in seen_cursors:
                    raise RuntimeError("Origami repeated a row-list cursor")
                seen_cursors.add(next_cursor)
                cursor = next_cursor
            else:
                raise RuntimeError("Origami row-list pagination exceeded its safety bound")
        return rows

    async def export_csv(self, list_id: str, ids: list[str]) -> str:
        params = [("ids", row_id) for row_id in ids]
        params.append(("format", "csv"))
        response = await self._http.get(
            f"{self._base_url}/leads/lists/{list_id}/rows",
            headers=self._headers(),
            params=params,
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

    def _headers(self, *, idempotency_key: str | None = None) -> dict[str, str]:
        headers = {"Authorization": f"Bearer {self._api_key}"}
        if idempotency_key is not None:
            headers["Idempotency-Key"] = idempotency_key
        return headers


async def poll_until_done(
    client: OrigamiClient, job_id: str, *, max_wait_seconds: int = 600
) -> Job:
    started = _monotonic()
    while True:
        remaining = max_wait_seconds - (_monotonic() - started)
        if remaining <= 0:
            raise TimeoutError("Origami job did not finish before the polling deadline")
        try:
            async with asyncio.timeout(remaining):
                job = await client.get_job(job_id)
        except OrigamiRetryableError as error:
            remaining = max_wait_seconds - (_monotonic() - started)
            if remaining <= 0 or error.retry_after_seconds >= remaining:
                raise TimeoutError(
                    "Origami job did not finish before the polling deadline"
                ) from error
            await asyncio.sleep(error.retry_after_seconds)
            continue
        except TimeoutError as error:
            raise TimeoutError("Origami job did not finish before the polling deadline") from error
        remaining = max_wait_seconds - (_monotonic() - started)
        if remaining <= 0:
            raise TimeoutError("Origami job did not finish before the polling deadline")
        if job.status == "succeeded":
            return job
        if job.status == "needs_input":
            raise RuntimeError("Origami job requires operator input")
        if job.status in {"failed", "cancelled"}:
            raise RuntimeError(f"Origami job ended with status {job.status}")
        wait_seconds = (
            job.retry_after_seconds
            if job.retry_after_seconds is not None
            else _seconds_until(job.next_poll_at)
        )
        if wait_seconds >= remaining:
            raise TimeoutError("Origami job did not finish before the polling deadline")
        await asyncio.sleep(wait_seconds)


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
        csv_cells = csv_by_id.get(row_id, {})
        company_name = _field_value(
            cells,
            csv_cells,
            "company_name",
            "company",
            "organisation",
            "organization",
        )
        if not company_name:
            continue
        relevance = row.get("relevance_score")
        if relevance is None:
            relevance = row.get("origami_relevance_score")
        leads.append(
            LeadIn(
                company_name=company_name,
                company_domain=_field_value(
                    cells, csv_cells, "company_domain", "domain", "website"
                ),
                person_name=_field_value(cells, csv_cells, "full_name", "name", "person_name"),
                title=_field_value(cells, csv_cells, "title", "job_title"),
                email=_field_value(cells, csv_cells, "email"),
                linkedin_url=_field_value(cells, csv_cells, "linkedin_url", "linkedin"),
                industry=_field_value(cells, csv_cells, "industry"),
                employee_count=_field_int_value(
                    cells, csv_cells, "employee_count", "headcount", "company_size"
                ),
                location=_field_value(cells, csv_cells, "location", "city"),
                origami_row_id=row_id,
                origami_relevance_score=_float_or_none(relevance),
                metadata={"source": "origami", "origami_row": row},
            )
        )
    return leads


def _seconds_until(value: datetime | str | None) -> float:
    if value is None:
        return 15.0
    if isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return 15.0
    else:
        parsed = value
    if parsed.tzinfo is None:
        return 15.0
    return max((parsed - datetime.now(UTC)).total_seconds(), 0.0)


def _monotonic() -> float:
    return time.monotonic()


def _retry_after_seconds(value: str | None, *, now: datetime | None = None) -> float | None:
    if value is None:
        return None
    try:
        seconds = float(value)
    except ValueError:
        try:
            retry_at = parsedate_to_datetime(value)
        except (TypeError, ValueError):
            return None
        if retry_at.tzinfo is None:
            return None
        return max(0.0, (retry_at - (now or datetime.now(UTC))).total_seconds())
    return seconds if math.isfinite(seconds) and seconds >= 0 else None


def _cells(row: dict[str, Any]) -> dict[str, Any]:
    cells = row.get("cells")
    if isinstance(cells, dict):
        return {_normalise_cell_key(key): _cell_value(value) for key, value in cells.items()}
    if isinstance(cells, list):
        mapped: dict[str, Any] = {}
        for cell in cells:
            if not isinstance(cell, dict):
                continue
            key = cell.get("slug") or cell.get("column") or cell.get("name")
            if key:
                mapped[_normalise_cell_key(key)] = (
                    cell.get("value")
                    if "type" not in cell and "value" in cell
                    else _cell_value(cell)
                )
        return mapped
    return {}


def _normalise_cell_key(value: Any) -> str:
    return str(value).strip().lower().replace("-", "_").replace(" ", "_")


def _cell_value(value: Any) -> Any:
    cell_type = value.get("type") if isinstance(value, dict) else None
    if (
        isinstance(value, dict)
        and isinstance(cell_type, str)
        and cell_type in {"scalar", "value"}
        and "value" in value
    ):
        return value["value"]
    if isinstance(value, (dict, list)):
        return None
    return value


def _value(cells: dict[str, Any], *keys: str) -> str | None:
    for key in keys:
        value = cells.get(key)
        if _is_usable_scalar(value):
            return str(value).strip()
    return None


def _field_value(cells: dict[str, Any], csv_cells: dict[str, Any], *keys: str) -> str | None:
    return _value(cells, *keys) or _value(csv_cells, *keys)


def _is_usable_scalar(value: Any) -> bool:
    if isinstance(value, bool) or not isinstance(value, (str, int, float)):
        return False
    if isinstance(value, float) and not math.isfinite(value):
        return False
    return bool(str(value).strip())


def _int_value(cells: dict[str, Any], *keys: str) -> int | None:
    for key in keys:
        value = _nonnegative_int(cells.get(key))
        if value is not None:
            return value
    return None


def _nonnegative_int(value: Any) -> int | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value if 0 <= value <= MAX_EMPLOYEE_COUNT else None
    if isinstance(value, float):
        return (
            int(value)
            if math.isfinite(value) and 0 <= value <= MAX_EMPLOYEE_COUNT and value.is_integer()
            else None
        )
    if isinstance(value, str):
        candidate = value.strip()
        if not GROUPED_INTEGER.fullmatch(candidate):
            return None
        try:
            parsed = int(candidate.replace(",", ""))
        except ValueError:
            return None
        return parsed if parsed <= MAX_EMPLOYEE_COUNT else None
    return None


def _field_int_value(cells: dict[str, Any], csv_cells: dict[str, Any], *keys: str) -> int | None:
    value = _int_value(cells, *keys)
    return value if value is not None else _int_value(csv_cells, *keys)


def _float_or_none(value: Any) -> float | None:
    if value is None:
        return None
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    return parsed if math.isfinite(parsed) else None


def _csv_by_id(csv_text: str | None) -> dict[str, dict[str, Any]]:
    if not csv_text:
        return {}
    reader = csv.DictReader(io.StringIO(csv_text))
    mapped: dict[str, dict[str, Any]] = {}
    for row in reader:
        row_id = row.get("id")
        if row_id:
            mapped[row_id] = {_normalise_cell_key(key): value for key, value in row.items() if key}
    return mapped
