FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

WORKDIR /app/api

COPY api/pyproject.toml api/uv.lock ./
RUN uv sync --frozen --no-dev

COPY api/app ./app
COPY fixtures /app/fixtures
COPY api/deploy/container-entrypoint.sh /usr/local/bin/slipstream-api

RUN chmod 0555 /usr/local/bin/slipstream-api \
    && useradd --system --uid 10001 --no-create-home --home-dir /nonexistent slipstream

USER slipstream

EXPOSE 8000
ENTRYPOINT ["/usr/local/bin/slipstream-api"]
