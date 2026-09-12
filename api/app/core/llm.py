import json
from dataclasses import dataclass
from typing import Literal

import httpx
from anthropic import Anthropic
from openai import BadRequestError, NotFoundError, OpenAI
from pydantic import BaseModel

from app.core.config import Settings

ReasoningProvider = Literal["anthropic", "openai", "openrouter", "local"]


class MissingReasoningProviderError(RuntimeError):
    def __init__(self, provider: ReasoningProvider) -> None:
        self.provider = provider
        super().__init__(f"{provider} integration is not configured")


class MissingEmbeddingProviderError(RuntimeError):
    def __init__(self) -> None:
        super().__init__(
            "No embedding provider is configured (set OPENAI_API_KEY or OPENROUTER_API_KEY)"
        )


@dataclass(frozen=True)
class ReasoningClient:
    provider: ReasoningProvider
    model: str
    client: object


@dataclass(frozen=True)
class Usage:
    input_tokens: int
    output_tokens: int
    cost_usd: float | None = None


@dataclass(frozen=True)
class ReasoningResult[SchemaT: BaseModel]:
    output: SchemaT
    model: str
    provider: ReasoningProvider
    usage: Usage | None = None


class _OpenRouterEmbeddings:
    def __init__(self, client: OpenAI) -> None:
        self._client = client

    def create(self, *, model: str, input: object) -> object:
        return self._client.embeddings.create(
            model=openrouter_model_id(model, "openai"),
            input=input,
        )


class _OpenRouterEmbeddingClient:
    def __init__(self, client: OpenAI) -> None:
        self.embeddings = _OpenRouterEmbeddings(client)


def openrouter_model_id(model: str, native: str) -> str:
    if "/" in model or native not in {"openai", "anthropic"}:
        return model
    return f"{native}/{model}"


def create_anthropic_client(settings: Settings) -> Anthropic:
    if settings.anthropic_api_key is None:
        raise MissingReasoningProviderError("anthropic")
    return Anthropic(api_key=settings.anthropic_api_key.get_secret_value())


def create_openai_client(settings: Settings) -> OpenAI:
    if settings.openai_api_key is None:
        raise MissingReasoningProviderError("openai")
    return OpenAI(api_key=settings.openai_api_key.get_secret_value())


def create_openrouter_client(settings: Settings) -> OpenAI:
    if settings.openrouter_api_key is None:
        raise MissingReasoningProviderError("openrouter")
    return OpenAI(
        api_key=settings.openrouter_api_key.get_secret_value(),
        base_url=settings.openrouter_base_url,
    )


def create_local_client(settings: Settings) -> OpenAI:
    if settings.local_model_base_url is None:
        raise MissingReasoningProviderError("local")
    return OpenAI(
        api_key="loopback-only",
        base_url=settings.local_model_base_url,
        http_client=httpx.Client(trust_env=False, follow_redirects=False),
    )


def create_reasoning_client(settings: Settings) -> ReasoningClient:
    provider = settings.reasoning_provider
    native = settings._native_reasoning_provider
    model = settings.reasoning_model
    if provider == "anthropic":
        client = create_anthropic_client(settings)
    elif provider == "openai":
        client = create_openai_client(settings)
    elif provider == "openrouter":
        client = create_openrouter_client(settings)
        if native != provider:
            model = openrouter_model_id(model, native)
    else:
        client = create_local_client(settings)
        model = settings.local_model_name
    return ReasoningClient(provider=provider, model=model, client=client)


def create_embedding_client(settings: Settings) -> object:
    provider = settings.embedding_provider
    if provider == "openai":
        if settings.openai_api_key is None:
            raise MissingEmbeddingProviderError()
        return OpenAI(api_key=settings.openai_api_key.get_secret_value())
    if provider == "openrouter":
        if settings.openrouter_api_key is None:
            raise MissingEmbeddingProviderError()
        return _OpenRouterEmbeddingClient(
            OpenAI(
                api_key=settings.openrouter_api_key.get_secret_value(),
                base_url=settings.openrouter_base_url,
            )
        )
    raise MissingEmbeddingProviderError()


def structured[SchemaT: BaseModel](
    reasoning: Settings | ReasoningClient,
    *,
    system: str,
    user: str,
    schema: type[SchemaT],
    max_tokens: int = 4000,
    timeout: float | None = None,
) -> ReasoningResult[SchemaT]:
    client = create_reasoning_client(reasoning) if isinstance(reasoning, Settings) else reasoning
    if client.provider == "anthropic":
        output, usage = _anthropic_structured(
            client.client,
            client.model,
            system,
            user,
            schema,
            max_tokens,
            timeout,
        )
    elif client.provider == "openai":
        output, usage = _openai_structured(
            client.client, client.model, system, user, schema, max_tokens, timeout
        )
    elif client.provider == "openrouter":
        output, usage = _openrouter_structured(
            client.client,
            client.model,
            system,
            user,
            schema,
            max_tokens,
            timeout,
        )
    else:
        output, usage = _local_structured(
            client.client,
            client.model,
            system,
            user,
            schema,
            max_tokens,
            timeout,
        )
    return ReasoningResult(output=output, model=client.model, provider=client.provider, usage=usage)


def _anthropic_structured[SchemaT: BaseModel](
    client: object,
    model: str,
    system: str,
    user: str,
    schema: type[SchemaT],
    max_tokens: int,
    timeout: float | None,
) -> tuple[SchemaT, Usage | None]:
    request_options = {} if timeout is None else {"timeout": timeout}
    parsed_response = client.messages.parse(
        model=model,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}],
        output_format=schema,
        **request_options,
    )
    parsed = parsed_response.parsed_output
    if parsed is None:
        raise ValueError("Anthropic returned no parsed structured output")
    return parsed, _parsed_usage(parsed_response)


def _openai_structured[SchemaT: BaseModel](
    client: object,
    model: str,
    system: str,
    user: str,
    schema: type[SchemaT],
    max_tokens: int,
    timeout: float | None,
) -> tuple[SchemaT, Usage | None]:
    request_options = {} if timeout is None else {"timeout": timeout}
    parsed_response = client.responses.parse(
        model=model,
        instructions=system,
        input=user,
        text_format=schema,
        max_output_tokens=max_tokens,
        **request_options,
    )
    parsed = parsed_response.output_parsed
    if parsed is None:
        raise ValueError("OpenAI returned no parsed structured output")
    return parsed, _parsed_usage(parsed_response)


def _openrouter_structured[SchemaT: BaseModel](
    client: object,
    model: str,
    system: str,
    user: str,
    schema: type[SchemaT],
    max_tokens: int,
    timeout: float | None,
) -> tuple[SchemaT, Usage | None]:
    request_options = {} if timeout is None else {"timeout": timeout}
    messages = [
        {"role": "system", "content": _json_system_prompt(system, schema)},
        {"role": "user", "content": user},
    ]
    response_format = {
        "type": "json_schema",
        "json_schema": {
            "name": schema.__name__,
            "strict": True,
            "schema": schema.model_json_schema(),
        },
    }
    try:
        completion = client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=max_tokens,
            response_format=response_format,
            extra_body={"usage": {"include": True}},
            **request_options,
        )
    except (BadRequestError, NotFoundError):
        # The provider rejected the schema or the response_format parameter; ask for plain
        # JSON instead. Every other failure (auth, credit, rate limit, timeout) propagates.
        completion = client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=max_tokens,
            extra_body={"usage": {"include": True}},
            **request_options,
        )
    return (
        schema.model_validate_json(_strip_code_fences(_completion_text(completion))),
        _openrouter_usage(completion),
    )


def _local_structured[SchemaT: BaseModel](
    client: object,
    model: str,
    system: str,
    user: str,
    schema: type[SchemaT],
    max_tokens: int,
    timeout: float | None,
) -> tuple[SchemaT, Usage | None]:
    request_options = {"timeout": 600.0 if timeout is None else timeout}
    completion = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": _json_system_prompt(system, schema)},
            {"role": "user", "content": user},
        ],
        max_tokens=max_tokens,
        temperature=0,
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": schema.__name__,
                "strict": True,
                "schema": schema.model_json_schema(),
            },
        },
        **request_options,
    )
    if not completion.choices:
        raise ValueError("Local model returned no completion choices")
    if getattr(completion.choices[0], "finish_reason", None) == "length":
        raise ValueError("Local model output exceeded the requested token budget")
    return (
        schema.model_validate_json(_strip_code_fences(_completion_text(completion))),
        _openrouter_usage(completion),
    )


def _parsed_usage(response: object) -> Usage | None:
    usage = getattr(response, "usage", None)
    if usage is None:
        return None
    input_tokens = getattr(usage, "input_tokens", None)
    output_tokens = getattr(usage, "output_tokens", None)
    if input_tokens is None or output_tokens is None:
        return None
    return Usage(input_tokens=int(input_tokens), output_tokens=int(output_tokens))


def _openrouter_usage(completion: object) -> Usage | None:
    usage = getattr(completion, "usage", None)
    if usage is None:
        return None
    input_tokens = getattr(usage, "prompt_tokens", None)
    output_tokens = getattr(usage, "completion_tokens", None)
    if input_tokens is None or output_tokens is None:
        return None
    cost = getattr(usage, "cost", None)
    if cost is None:
        model_extra = getattr(usage, "model_extra", None)
        if isinstance(model_extra, dict):
            cost = model_extra.get("cost")
    return Usage(
        input_tokens=int(input_tokens),
        output_tokens=int(output_tokens),
        cost_usd=float(cost) if cost is not None else None,
    )


def _json_system_prompt(system: str, schema: type[BaseModel]) -> str:
    return (
        f"{system}\n\nReturn only valid JSON matching this JSON schema. "
        f"Do not wrap the JSON in markdown.\n{json.dumps(schema.model_json_schema())}"
    )


def _completion_text(completion: object) -> str:
    message = completion.choices[0].message
    content = message.content
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = [
            item.get("text", "") if isinstance(item, dict) else getattr(item, "text", "")
            for item in content
        ]
        return "".join(parts)
    return str(content)


def _strip_code_fences(text: str) -> str:
    stripped = text.strip()
    if not stripped.startswith("```"):
        return stripped
    lines = stripped.splitlines()
    if lines and lines[0].startswith("```"):
        lines = lines[1:]
    if lines and lines[-1].strip() == "```":
        lines = lines[:-1]
    return "\n".join(lines).strip()
