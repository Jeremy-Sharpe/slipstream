import httpx
import pytest

from app.services.transcribe import (
    TranscriptionUnavailableError,
    normalise_scribe_response,
    transcribe_audio,
)


def test_scribe_words_are_grouped_into_diarised_segments() -> None:
    transcript = normalise_scribe_response(
        {
            "text": "Hello, Dev! Hi Jordan.",
            "language_code": "en",
            "words": [
                {
                    "type": "word",
                    "text": "Hello,",
                    "start": 0.1,
                    "end": 0.3,
                    "speaker_id": "speaker_0",
                },
                {
                    "type": "spacing",
                    "text": " ",
                    "start": 0.3,
                    "end": 0.31,
                    "speaker_id": "speaker_0",
                },
                {
                    "type": "word",
                    "text": "Dev!",
                    "start": 0.32,
                    "end": 0.5,
                    "speaker_id": "speaker_0",
                },
                {
                    "type": "word",
                    "text": "Hi ",
                    "start": 0.7,
                    "end": 0.8,
                    "speaker_id": "speaker_1",
                },
                {
                    "type": "word",
                    "text": "Jordan.",
                    "start": 0.81,
                    "end": 1.1,
                    "speaker_id": "speaker_1",
                },
            ],
        }
    )

    assert transcript.language_code == "en"
    assert [segment.body for segment in transcript.segments] == ["Hello, Dev!", "Hi Jordan."]
    assert transcript.segments[0].start_ms == 100
    assert transcript.segments[-1].end_ms == 1100


def test_scribe_preserves_unspaced_languages() -> None:
    transcript = normalise_scribe_response(
        {
            "text": "你好世界",
            "language_code": "cmn",
            "words": [
                {
                    "type": "word",
                    "text": "你好",
                    "start": 0,
                    "end": 0.3,
                    "speaker_id": "speaker_0",
                },
                {
                    "type": "word",
                    "text": "世界",
                    "start": 0.3,
                    "end": 0.6,
                    "speaker_id": "speaker_0",
                },
            ],
        }
    )

    assert transcript.segments[0].body == "你好世界"


@pytest.mark.parametrize("timestamp", [None, float("inf"), float("nan")])
def test_scribe_rejects_invalid_timestamps(timestamp: float | None) -> None:
    with pytest.raises(TranscriptionUnavailableError):
        normalise_scribe_response(
            {
                "text": "Hello",
                "words": [
                    {
                        "type": "word",
                        "text": "Hello",
                        "start": timestamp,
                        "end": 1,
                        "speaker_id": "speaker_0",
                    }
                ],
            }
        )


@pytest.mark.asyncio
async def test_transcribe_calls_scribe_v2_with_diarisation() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        body = await request.aread()
        assert request.headers["xi-api-key"] == "test-key"
        assert b'name="model_id"' in body and b"scribe_v2" in body
        assert b'name="diarize"' in body and b"true" in body
        assert b'name="num_speakers"' not in body
        return httpx.Response(
            200,
            json={
                "text": "Hello",
                "language_code": "en",
                "words": [
                    {
                        "type": "word",
                        "text": "Hello",
                        "start": 0,
                        "end": 0.4,
                        "speaker_id": "speaker_0",
                    }
                ],
            },
        )

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        transcript = await transcribe_audio(
            content=b"audio",
            filename="call.wav",
            content_type="audio/wav",
            api_key="test-key",
            client=client,
        )

    assert transcript.text == "Hello"
    assert transcript.provider == "elevenlabs_scribe_v2"


@pytest.mark.asyncio
async def test_transcription_provider_errors_are_sanitised() -> None:
    async def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(401, text="sensitive upstream detail")

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
        with pytest.raises(TranscriptionUnavailableError) as error:
            await transcribe_audio(
                content=b"audio",
                filename="call.wav",
                content_type="audio/wav",
                api_key="bad-key",
                client=client,
            )

    assert "sensitive" not in str(error.value)
