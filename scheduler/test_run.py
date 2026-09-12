from __future__ import annotations

import io
import json
import unittest
from typing import Self
from urllib.error import HTTPError
from urllib.request import Request

from run import ConfigError, SchedulerError, load_settings, run


class FakeResponse:
    def __init__(self, payload: object, status: int = 200) -> None:
        self.status = status
        self._raw = json.dumps(payload).encode()

    def read(self, amount: int = -1) -> bytes:
        return self._raw[:amount]

    def __enter__(self) -> Self:
        return self

    def __exit__(self, *args: object) -> None:
        return None


class FakeOpener:
    def __init__(self, response: FakeResponse | Exception) -> None:
        self.response = response
        self.request: Request | None = None
        self.timeout: float | None = None

    def open(self, request: Request, *, timeout: float) -> FakeResponse:
        self.request = request
        self.timeout = timeout
        if isinstance(self.response, Exception):
            raise self.response
        return self.response


class SchedulerTests(unittest.TestCase):
    def settings(self, **overrides: str):
        values = {
            "SLIPSTREAM_API_URL": "https://api.example.test/base/",
            "SLIPSTREAM_INGEST_TOKEN": "server-secret",
        }
        values.update(overrides)
        return load_settings(values)

    def test_calls_exact_endpoint_without_logging_secret(self) -> None:
        campaign_id = "3ba7550e-759c-4f13-bc91-70d5e0453e7a"
        opener = FakeOpener(
            FakeResponse(
                {
                    "claimed_count": 2,
                    "campaign": {"id": campaign_id, "status": "scheduled", "items": []},
                }
            )
        )
        summary = run(self.settings(SLIPSTREAM_CAMPAIGN_BATCH_LIMIT="2"), opener)

        self.assertEqual(
            summary,
            {
                "ok": True,
                "claimed_count": 2,
                "campaign_id": campaign_id,
                "status": "scheduled",
            },
        )
        assert opener.request is not None
        self.assertEqual(
            opener.request.full_url,
            "https://api.example.test/base/api/v1/campaigns/run-due",
        )
        self.assertEqual(json.loads(opener.request.data or b""), {"limit": 2})
        self.assertEqual(
            opener.request.get_header("X-slipstream-ingest-token"), "server-secret"
        )
        self.assertNotIn("server-secret", json.dumps(summary))
        self.assertEqual(opener.timeout, 65)

    def test_empty_queue_is_success(self) -> None:
        summary = run(
            self.settings(),
            FakeOpener(FakeResponse({"claimed_count": 0, "campaign": None})),
        )
        self.assertEqual(summary, {"ok": True, "claimed_count": 0})

    def test_optional_campaign_id_is_validated_and_forwarded(self) -> None:
        campaign_id = "3ba7550e-759c-4f13-bc91-70d5e0453e7a"
        opener = FakeOpener(FakeResponse({"claimed_count": 0, "campaign": None}))
        run(self.settings(SLIPSTREAM_CAMPAIGN_ID=campaign_id), opener)
        assert opener.request is not None
        self.assertEqual(
            json.loads(opener.request.data or b"")["campaign_id"], campaign_id
        )
        with self.assertRaises(ConfigError):
            self.settings(SLIPSTREAM_CAMPAIGN_ID="not-a-uuid")

    def test_configuration_rejects_unsafe_or_unbounded_values(self) -> None:
        for overrides in (
            {"SLIPSTREAM_API_URL": "http://api.example.test"},
            {"SLIPSTREAM_API_URL": "https://secret@api.example.test"},
            {"SLIPSTREAM_CAMPAIGN_BATCH_LIMIT": "9"},
            {"SLIPSTREAM_SCHEDULER_TIMEOUT_SECONDS": "71"},
            {"SLIPSTREAM_INGEST_TOKEN": ""},
        ):
            with self.subTest(overrides=overrides), self.assertRaises(ConfigError):
                self.settings(**overrides)

    def test_http_and_malformed_responses_fail_without_echoing_body(self) -> None:
        error = HTTPError(
            "https://api.example.test/api/v1/campaigns/run-due",
            401,
            "unauthorized",
            {},
            io.BytesIO(b'{"detail":"server-secret"}'),
        )
        with self.assertRaisesRegex(SchedulerError, "HTTP 401") as caught:
            run(self.settings(), FakeOpener(error))
        self.assertNotIn("server-secret", str(caught.exception))
        for payload in (
            [],
            {"claimed_count": True, "campaign": None},
            {"claimed_count": 9, "campaign": {}},
            {"claimed_count": 1, "campaign": None},
            {"claimed_count": 0, "campaign": {}},
            {
                "claimed_count": 1,
                "campaign": {"id": "not-a-uuid", "status": "scheduled"},
            },
            {
                "claimed_count": 1,
                "campaign": {
                    "id": "3ba7550e-759c-4f13-bc91-70d5e0453e7a",
                    "status": "invented",
                },
            },
        ):
            with self.subTest(payload=payload), self.assertRaises(SchedulerError):
                run(self.settings(), FakeOpener(FakeResponse(payload)))


if __name__ == "__main__":
    unittest.main()
