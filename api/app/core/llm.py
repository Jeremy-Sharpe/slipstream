import json
import math
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
            "No embedding provider is configured (set a hosted key or local embedding URL)"
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
        self._client = client
        self.embeddings = _OpenRouterEmbeddings(client)

    def close(self) -> None:
        self._client.close()


class _LocalEmbeddings:
    def __init__(self, client: OpenAI, tokenizer: httpx.Client) -> None:
        self._client = client
        self._tokenizer = tokenizer

    def create(self, *, model: str, input: object) -> object:
        if isinstance(input, str):
            prepared: object = f"search_document: {input}"
        elif isinstance(input, list) and all(isinstance(item, str) for item in input):
            prepared = [f"search_document: {item}" for item in input]
        else:
            prepared = input
        texts = [prepared] if isinstance(prepared, str) else prepared
        if isinstance(texts, list) and all(isinstance(item, str) for item in texts):
            for text in texts:
                response = self._tokenizer.post(
                    "tokenize",
                    json={
                        "content": text,
                        "add_special": True,
                        "parse_special": False,
                    },
                )
                response.raise_for_status()
                payload = response.json()
                tokens = payload.get("tokens") if isinstance(payload, dict) else None
                if (
                    not isinstance(tokens, list)
                    or not tokens
                    or not all(type(token) is int for token in tokens)
                    or len(tokens) > 2048
                ):
                    raise ValueError(
                        "Local embedding input exceeds the 2048-token model context"
                    )
        response = self._client.embeddings.create(model=model, input=prepared)
        if getattr(response, "model", None) != model:
            raise ValueError("Local embedding response used an unexpected model")
        data = getattr(response, "data", None)
        if not isinstance(data, list) or not data:
            raise ValueError("Local embedding response did not contain vectors")
        for item in data:
            vector = getattr(item, "embedding", None)
            if (
                not isinstance(vector, list)
                or len(vector) != 768
                or not all(
                    type(value) in (int, float) and math.isfinite(value)
                    for value in vector
                )
            ):
                raise ValueError("Local embedding response contained an invalid vector")
        return response


class _LocalEmbeddingClient:
    def __init__(self, client: OpenAI, tokenizer: httpx.Client) -> None:
        self._client = client
        self.embeddings = _LocalEmbeddings(client, tokenizer)

    def close(self) -> None:
        self._client.close()


class _LocalClient:
    def __init__(self, base_url: str, context_tokens: int) -> None:
        self.context_tokens = context_tokens
        self._http = httpx.Client(
            base_url=base_url.rstrip("/") + "/",
            trust_env=False,
            follow_redirects=False,
            timeout=httpx.Timeout(30.0, connect=1.0),
        )
        self._openai = OpenAI(
            api_key="loopback-only",
            base_url=base_url,
            http_client=self._http,
        )
        self.chat = self._openai.chat

    def count_input_tokens(self, payload: dict[str, object]) -> int:
        response = self._http.post("chat/completions/input_tokens", json=payload)
        response.raise_for_status()
        body = response.json()
        input_tokens = body.get("input_tokens") if isinstance(body, dict) else None
        if not isinstance(input_tokens, int) or input_tokens < 0:
            raise ValueError("Local model returned an invalid input-token count")
        return input_tokens


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


def create_local_client(settings: Settings) -> _LocalClient:
    if settings.local_model_base_url is None:
        raise MissingReasoningProviderError("local")
    return _LocalClient(
        settings.local_model_base_url,
        settings.local_model_context_tokens,
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
    if provider == "local" and settings.local_embedding_base_url is not None:
        http_client = httpx.Client(
            base_url=settings.local_embedding_base_url.removesuffix("/v1") + "/",
            trust_env=False,
            follow_redirects=False,
            timeout=httpx.Timeout(30.0, connect=1.0),
        )
        return _LocalEmbeddingClient(
            OpenAI(
                api_key="loopback-only",
                base_url=settings.local_embedding_base_url,
                http_client=http_client,
            ),
            http_client,
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
    request_payload: dict[str, object] = {
        "model": model,
        "messages": [
            {"role": "system", "content": _json_system_prompt(system, schema)},
            {"role": "user", "content": user},
        ],
        "max_tokens": max_tokens,
        "temperature": 0,
        "response_format": {
            "type": "json_schema",
            "json_schema": {
                "name": schema.__name__,
                "strict": True,
                "schema": schema.model_json_schema(),
            },
        },
    }
    count_tokens = getattr(client, "count_input_tokens", None)
    context_tokens = getattr(client, "context_tokens", None)
    if callable(count_tokens) and isinstance(context_tokens, int):
        input_tokens = count_tokens(request_payload)
        if input_tokens + max_tokens > context_tokens:
            raise ValueError(
                f"Local model request needs {input_tokens + max_tokens} tokens but its "
                f"context supports {context_tokens}"
            )
    completion = client.chat.completions.create(**request_payload, **request_options)
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
