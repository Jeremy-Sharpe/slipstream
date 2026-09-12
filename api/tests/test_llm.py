import pytest
from pydantic import BaseModel

from app.core.config import Settings
from app.core.llm import (
    MissingReasoningProviderError,
    ReasoningClient,
    structured,
)


class MiniOutput(BaseModel):
    subject: str
    body: str


class ParsedAnthropic:
    parsed_output = MiniOutput(subject="A", body="B")


class FakeAnthropicMessages:
    def __init__(self) -> None:
        self.kwargs: dict[str, object] = {}

    def parse(self, **kwargs: object) -> ParsedAnthropic:
        self.kwargs = kwargs
        return ParsedAnthropic()


class FakeAnthropicClient:
    def __init__(self) -> None:
        self.messages = FakeAnthropicMessages()


class ParsedOpenAI:
    output_parsed = MiniOutput(subject="O", body="P")


class FakeResponses:
    def __init__(self) -> None:
        self.kwargs: dict[str, object] = {}

    def parse(self, **kwargs: object) -> ParsedOpenAI:
        self.kwargs = kwargs
        return ParsedOpenAI()


class FakeOpenAIClient:
    def __init__(self) -> None:
        self.responses = FakeResponses()


class FakeMessage:
    content = '```json\n{"subject": "R", "body": "S"}\n```'


class FakeChoice:
    message = FakeMessage()


class FakeCompletion:
    choices = [FakeChoice()]


class FakeCompletions:
    def __init__(self) -> None:
        self.kwargs: dict[str, object] = {}

    def create(self, **kwargs: object) -> FakeCompletion:
        self.kwargs = kwargs
        return FakeCompletion()


class FakeChat:
    def __init__(self) -> None:
        self.completions = FakeCompletions()


class FakeOpenRouterClient:
    def __init__(self) -> None:
        self.chat = FakeChat()


def test_structured_uses_anthropic_messages_parse() -> None:
    client = FakeAnthropicClient()

    result = structured(
        ReasoningClient(provider="anthropic", model="claude-opus-5", client=client),
        system="System",
        user="User",
        schema=MiniOutput,
    )

    assert result.output == MiniOutput(subject="A", body="B")
    assert result.model == "claude-opus-5"
    assert client.messages.kwargs["output_format"] is MiniOutput


def test_structured_uses_openai_responses_parse() -> None:
    client = FakeOpenAIClient()

    result = structured(
        ReasoningClient(provider="openai", model="gpt-5.4", client=client),
        system="System",
        user="User",
        schema=MiniOutput,
    )

    assert result.output == MiniOutput(subject="O", body="P")
    assert result.model == "gpt-5.4"
    assert client.responses.kwargs["text_format"] is MiniOutput


def test_structured_validates_openrouter_fenced_json() -> None:
    client = FakeOpenRouterClient()

    result = structured(
        ReasoningClient(
            provider="openrouter",
            model="meta-llama/llama-4-maverick",
            client=client,
        ),
        system="System",
        user="User",
        schema=MiniOutput,
    )

    assert result.output == MiniOutput(subject="R", body="S")
    assert result.model == "meta-llama/llama-4-maverick"
    assert client.chat.completions.kwargs["response_format"]["type"] == "json_schema"


def test_structured_missing_selected_provider_key_names_provider() -> None:
    settings = Settings(_env_file=None, reasoning_model="meta-llama/llama-4-maverick")

    with pytest.raises(MissingReasoningProviderError) as error:
        structured(settings, system="System", user="User", schema=MiniOutput)

    assert error.value.provider == "openrouter"
    assert "openrouter" in str(error.value)
