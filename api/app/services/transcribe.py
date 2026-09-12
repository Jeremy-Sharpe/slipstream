from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any

import httpx

SCRIBE_URL = "https://api.elevenlabs.io/v1/speech-to-text"


class TranscriptionUnavailableError(RuntimeError):
    """Raised when a transcription provider is unavailable or rejects a request."""


@dataclass(frozen=True, slots=True)
class TranscriptSegment:
    sequence: int
    speaker: str
    body: str
    start_ms: int
    end_ms: int | None


@dataclass(frozen=True, slots=True)
class Transcript:
    text: str
    language_code: str | None
    segments: list[TranscriptSegment]
    provider: str = "elevenlabs_scribe_v2"


def _timestamp_ms(value: object) -> int:
    if not isinstance(value, int | float) or isinstance(value, bool) or not math.isfinite(value):
        raise TranscriptionUnavailableError(
            "The transcription provider returned invalid timestamps"
        )
    return max(0, round(float(value) * 1000))


def normalise_scribe_response(payload: dict[str, Any]) -> Transcript:
    words = payload.get("words")
    if not isinstance(payload.get("text"), str) or not isinstance(words, list):
        raise TranscriptionUnavailableError(
            "The transcription provider returned an invalid response"
        )

    groups: list[dict[str, Any]] = []
    for item in words:
        if not isinstance(item, dict) or item.get("type") not in {
            "word",
            "spacing",
            "audio_event",
        }:
            continue
        token = item.get("text")
        if not isinstance(token, str) or (item.get("type") != "spacing" and not token.strip()):
            continue
        speaker = item.get("speaker_id")
        speaker_name = speaker if isinstance(speaker, str) and speaker else "speaker_unknown"
        start_ms = _timestamp_ms(item.get("start"))
        end_ms = _timestamp_ms(item.get("end"))
        if end_ms < start_ms:
            raise TranscriptionUnavailableError(
                "The transcription provider returned invalid timestamps"
            )

        if groups and groups[-1]["speaker"] == speaker_name:
            groups[-1]["body"] += token
            groups[-1]["end_ms"] = end_ms
        else:
            groups.append(
                {
                    "speaker": speaker_name,
                    "body": token,
                    "start_ms": start_ms,
                    "end_ms": end_ms,
                }
            )

    if not groups:
        raise TranscriptionUnavailableError("The transcription did not contain timestamped speech")

    return Transcript(
        text=payload["text"].strip(),
        language_code=payload.get("language_code"),
        segments=[TranscriptSegment(sequence=index, **group) for index, group in enumerate(groups)],
    )


async def transcribe_audio(
    *,
    content: bytes,
    filename: str,
    content_type: str,
    api_key: str,
    client: httpx.AsyncClient | None = None,
) -> Transcript:
    owns_client = client is None
    http_client = client or httpx.AsyncClient(timeout=httpx.Timeout(180, connect=10))
    try:
        response = await http_client.post(
            SCRIBE_URL,
            headers={"xi-api-key": api_key},
            files={"file": (filename, content, content_type)},
            data={
                "model_id": "scribe_v2",
                "diarize": "true",
                "timestamps_granularity": "word",
                "tag_audio_events": "true",
            },
        )
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, dict):
            raise TranscriptionUnavailableError(
                "The transcription provider returned an invalid response"
            )
        return normalise_scribe_response(payload)
    except (httpx.HTTPError, ValueError) as error:
        raise TranscriptionUnavailableError("The transcription provider request failed") from error
    finally:
        if owns_client:
            await http_client.aclose()
