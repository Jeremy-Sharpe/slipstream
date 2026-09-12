import json
from dataclasses import dataclass
from typing import Literal

from anthropic import Anthropic
from openai import OpenAI
from pydantic import BaseModel

from app.core.config import Settings

ReasoningProvider = Literal["anthropic", "openai", "openrouter"]


class MissingReasoningProviderError(RuntimeError):
    def __init__(self, provider: ReasoningProvider) -> None:
        self.provider = provider
        super().__init__(f"{provider} integration is not configured")


@dataclass(frozen=True)
class ReasoningClient:
    provider: ReasoningProvider
    model: str
    client: object


@dataclass(frozen=True)
class ReasoningResult[SchemaT: BaseModel]:
    output: SchemaT
    model: str
    provider: ReasoningProvider


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


def create_reasoning_client(settings: Settings) -> ReasoningClient:
    provider = settings.reasoning_provider
    if provider == "anthropic":
        client = create_anthropic_client(settings)
    elif provider == "openai":
        client = create_openai_client(settings)
    else:
        client = create_openrouter_client(settings)
    return ReasoningClient(provider=provider, model=settings.reasoning_model, client=client)


def structured[SchemaT: BaseModel](
    reasoning: Settings | ReasoningClient,
    *,
    system: str,
    user: str,
    schema: type[SchemaT],
    max_tokens: int = 4000,
) -> ReasoningResult[SchemaT]:
    client = create_reasoning_client(reasoning) if isinstance(reasoning, Settings) else reasoning
    if client.provider == "anthropic":
        output = _anthropic_structured(
            client.client,
            client.model,
            system,
            user,
            schema,
            max_tokens,
        )
    elif client.provider == "openai":
        output = _openai_structured(client.client, client.model, system, user, schema, max_tokens)
    else:
        output = _openrouter_structured(
            client.client,
            client.model,
            system,
            user,
            schema,
            max_tokens,
        )
    return ReasoningResult(output=output, model=client.model, provider=client.provider)


def _anthropic_structured[SchemaT: BaseModel](
    client: object,
    model: str,
    system: str,
    user: str,
    schema: type[SchemaT],
    max_tokens: int,
) -> SchemaT:
    parsed_response = client.messages.parse(
        model=model,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}],
        output_format=schema,
    )
    parsed = parsed_response.parsed_output
    if parsed is None:
        raise ValueError("Anthropic returned no parsed structured output")
    return parsed


def _openai_structured[SchemaT: BaseModel](
    client: object,
    model: str,
    system: str,
    user: str,
    schema: type[SchemaT],
    max_tokens: int,
) -> SchemaT:
    parsed_response = client.responses.parse(
        model=model,
        instructions=system,
        input=user,
        text_format=schema,
        max_output_tokens=max_tokens,
    )
    parsed = parsed_response.output_parsed
    if parsed is None:
        raise ValueError("OpenAI returned no parsed structured output")
    return parsed


def _openrouter_structured[SchemaT: BaseModel](
    client: object,
    model: str,
    system: str,
    user: str,
    schema: type[SchemaT],
    max_tokens: int,
) -> SchemaT:
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
        )
    except Exception:
        completion = client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=max_tokens,
        )
    return schema.model_validate_json(_strip_code_fences(_completion_text(completion)))


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
            item.get("text", "")
            if isinstance(item, dict)
            else getattr(item, "text", "")
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
