import httpx
import pytest
from openai import BadRequestError, PermissionDeniedError
from pydantic import BaseModel

from app.core.config import Settings
from app.core.llm import (
    MissingEmbeddingProviderError,
    MissingReasoningProviderError,
    ReasoningClient,
    Usage,
    create_embedding_client,
    create_reasoning_client,
    openrouter_model_id,
    structured,
)


def _clear_provider_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in ("ANTHROPIC_API_KEY", "OPENAI_API_KEY", "OPENROUTER_API_KEY"):
        monkeypatch.delenv(name, raising=False)


class MiniOutput(BaseModel):
    subject: str
    body: str


class FakeParsedUsage:
    input_tokens = 11
    output_tokens = 7


class ParsedAnthropic:
    parsed_output = MiniOutput(subject="A", body="B")
    usage = FakeParsedUsage()


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
    usage = FakeParsedUsage()


class FakeResponses:
    def __init__(self) -> None:
        self.kwargs: dict[str, object] = {}

    def parse(self, **kwargs: object) -> ParsedOpenAI:
        self.kwargs = kwargs
        return ParsedOpenAI()


class FakeEmbeddings:
    def __init__(self) -> None:
        self.kwargs: dict[str, object] = {}

    def create(self, **kwargs: object) -> object:
        self.kwargs = kwargs
        return object()


class FakeOpenAIClient:
    instances: list[object] = []

    def __init__(self, **kwargs: object) -> None:
        self.kwargs = kwargs
        self.responses = FakeResponses()
        self.embeddings = FakeEmbeddings()
        self.instances.append(self)


class FakeMessage:
    content = '```json\n{"subject": "R", "body": "S"}\n```'


class FakeChoice:
    message = FakeMessage()


class FakeOpenRouterUsage:
    prompt_tokens = 13
    completion_tokens = 5
    cost = "0.0017"


class FakeCompletion:
    choices = [FakeChoice()]
    usage = FakeOpenRouterUsage()


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
    assert result.usage == Usage(input_tokens=11, output_tokens=7)
    assert client.messages.kwargs["output_format"] is MiniOutput
    assert "timeout" not in client.messages.kwargs


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
    assert result.usage == Usage(input_tokens=11, output_tokens=7)
    assert client.responses.kwargs["text_format"] is MiniOutput
    assert "timeout" not in client.responses.kwargs


def test_structured_applies_an_explicit_provider_timeout() -> None:
    client = FakeOpenAIClient()

    structured(
        ReasoningClient(provider="openai", model="gpt-5.4", client=client),
        system="System",
        user="User",
        schema=MiniOutput,
        timeout=5.0,
    )

    assert client.responses.kwargs["timeout"] == 5.0


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
    assert result.usage == Usage(input_tokens=13, output_tokens=5, cost_usd=0.0017)
    assert client.chat.completions.kwargs["response_format"]["type"] == "json_schema"
    assert client.chat.completions.kwargs["extra_body"] == {"usage": {"include": True}}


def test_structured_returns_no_usage_when_provider_omits_it() -> None:
    class ParsedWithoutUsage:
        parsed_output = MiniOutput(subject="A", body="B")

    class MessagesWithoutUsage:
        def parse(self, **kwargs: object) -> ParsedWithoutUsage:
            return ParsedWithoutUsage()

    class ClientWithoutUsage:
        messages = MessagesWithoutUsage()

    result = structured(
        ReasoningClient(provider="anthropic", model="claude-opus-5", client=ClientWithoutUsage()),
        system="System",
        user="User",
        schema=MiniOutput,
    )

    assert result.output == MiniOutput(subject="A", body="B")
    assert result.usage is None


def test_structured_missing_selected_provider_key_names_provider(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _clear_provider_env(monkeypatch)
    settings = Settings(_env_file=None, reasoning_model="meta-llama/llama-4-maverick")

    with pytest.raises(MissingReasoningProviderError) as error:
        structured(settings, system="System", user="User", schema=MiniOutput)

    assert error.value.provider == "openrouter"
    assert "openrouter" in str(error.value)


@pytest.mark.parametrize(
    ("model", "native", "expected"),
    [
        ("gpt-5.4", "openai", "openai/gpt-5.4"),
        ("openai/gpt-5.4", "openai", "openai/gpt-5.4"),
        ("claude-sonnet-5", "anthropic", "anthropic/claude-sonnet-5"),
        ("meta-llama/llama-4-maverick", "openrouter", "meta-llama/llama-4-maverick"),
    ],
)
def test_openrouter_model_id(model: str, native: str, expected: str) -> None:
    assert openrouter_model_id(model, native) == expected


@pytest.mark.parametrize(
    ("model", "expected"),
    [
        ("gpt-5.4", "openai/gpt-5.4"),
        ("claude-sonnet-5", "anthropic/claude-sonnet-5"),
    ],
)
def test_create_reasoning_client_prefixes_native_models_for_openrouter(
    monkeypatch: pytest.MonkeyPatch,
    model: str,
    expected: str,
) -> None:
    _clear_provider_env(monkeypatch)
    monkeypatch.setattr("app.core.llm.OpenAI", FakeOpenAIClient)
    settings = Settings(
        _env_file=None,
        environment="test",
        reasoning_model=model,
        openrouter_api_key="openrouter-test",
    )

    client = create_reasoning_client(settings)

    assert client.provider == "openrouter"
    assert client.model == expected


def test_openrouter_embedding_client_prefixes_openai_models(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _clear_provider_env(monkeypatch)
    FakeOpenAIClient.instances = []
    monkeypatch.setattr("app.core.llm.OpenAI", FakeOpenAIClient)
    settings = Settings(
        _env_file=None,
        environment="test",
        openrouter_api_key="openrouter-test",
    )

    client = create_embedding_client(settings)
    client.embeddings.create(model="text-embedding-3-small", input=["first"])
    inner = FakeOpenAIClient.instances[-1]

    assert inner.embeddings.kwargs == {
        "model": "openai/text-embedding-3-small",
        "input": ["first"],
    }

    client.embeddings.create(model="openai/text-embedding-3-small", input=["second"])

    assert inner.embeddings.kwargs == {
        "model": "openai/text-embedding-3-small",
        "input": ["second"],
    }


def test_create_embedding_client_raises_without_provider(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _clear_provider_env(monkeypatch)
    settings = Settings(_env_file=None, environment="test")

    with pytest.raises(MissingEmbeddingProviderError) as error:
        create_embedding_client(settings)

    assert str(error.value) == (
        "No embedding provider is configured (set OPENAI_API_KEY or OPENROUTER_API_KEY)"
    )


class _RaisingCompletions:
    def __init__(self, error: Exception) -> None:
        self.error = error
        self.calls: list[dict[str, object]] = []

    def create(self, **kwargs: object) -> FakeCompletion:
        self.calls.append(kwargs)
        if len(self.calls) == 1:
            raise self.error
        return FakeCompletion()


def _openai_error(cls: type, status_code: int) -> Exception:
    response = httpx.Response(status_code, request=httpx.Request("POST", "https://x"))
    return cls("boom", response=response, body=None)


def test_openrouter_falls_back_to_plain_json_only_on_schema_rejection() -> None:
    client = FakeOpenRouterClient()
    client.chat.completions = _RaisingCompletions(_openai_error(BadRequestError, 400))

    result = structured(
        ReasoningClient(provider="openrouter", model="x/y", client=client),
        system="System",
        user="User",
        schema=MiniOutput,
    )

    assert result.output == MiniOutput(subject="R", body="S")
    assert len(client.chat.completions.calls) == 2
    assert "response_format" not in client.chat.completions.calls[1]


def test_openrouter_does_not_retry_on_credit_or_rate_limit_errors() -> None:
    client = FakeOpenRouterClient()
    client.chat.completions = _RaisingCompletions(_openai_error(PermissionDeniedError, 402))

    with pytest.raises(PermissionDeniedError):
        structured(
            ReasoningClient(provider="openrouter", model="x/y", client=client),
            system="System",
            user="User",
            schema=MiniOutput,
        )

    assert len(client.chat.completions.calls) == 1
