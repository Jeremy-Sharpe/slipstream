from __future__ import annotations

import io
import json
import os
import subprocess
import sys
import time
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
            {"SLIPSTREAM_INGEST_TOKEN": "secret\nheader"},
            {"SLIPSTREAM_INGEST_TOKEN": "non-ascii-🔑"},
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
            {
                "claimed_count": 1,
                "campaign": {
                    "id": "3ba7550e-759c-4f13-bc91-70d5e0453e7a",
                    "status": [],
                },
            },
        ):
            with self.subTest(payload=payload), self.assertRaises(SchedulerError):
                run(self.settings(), FakeOpener(FakeResponse(payload)))

        nested = FakeResponse(None)
        nested._raw = b'{"claimed_count":' + (b"9" * 5_000) + b',"campaign":null}'
        with self.assertRaisesRegex(SchedulerError, "malformed JSON"):
            run(self.settings(), FakeOpener(nested))

    def test_wall_clock_deadline_stops_a_stalled_transport(self) -> None:
        script = """
import time
from run import Settings, run
from test_run import FakeOpener, FakeResponse

class SlowOpener(FakeOpener):
    def open(self, request, *, timeout):
        time.sleep(2)
        return FakeResponse({"claimed_count": 0, "campaign": None})

settings = Settings("https://api.example.test", "secret", 8, 0.1, None)
run(settings, SlowOpener(FakeResponse({})))
"""
        environment = dict(os.environ)
        environment["PYTHONPATH"] = os.path.dirname(__file__)
        started = time.monotonic()
        completed = subprocess.run(
            [sys.executable, "-c", script],
            capture_output=True,
            text=True,
            timeout=1,
            env=environment,
            check=False,
        )
        self.assertLess(time.monotonic() - started, 1)
        self.assertNotEqual(completed.returncode, 0)
        self.assertIn("total deadline", completed.stderr)

    def test_container_sigterm_exits_promptly_and_nonzero(self) -> None:
        script = """
import time
import run as worker

worker.run = lambda settings: time.sleep(10)
raise SystemExit(worker.main())
"""
        environment = dict(os.environ)
        environment.update(
            {
                "PYTHONPATH": os.path.dirname(__file__),
                "SLIPSTREAM_API_URL": "https://api.example.test",
                "SLIPSTREAM_INGEST_TOKEN": "secret",
            }
        )
        process = subprocess.Popen(
            [sys.executable, "-c", script],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env=environment,
        )
        time.sleep(0.1)
        process.terminate()
        stdout, stderr = process.communicate(timeout=1)
        self.assertEqual(process.returncode, 1)
        self.assertEqual(stdout, "")
        self.assertIn("scheduler was terminated", stderr)


if __name__ == "__main__":
    unittest.main()
