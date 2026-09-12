#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${SLIPSTREAM_APP_DIR:-/opt/slipstream}"
BRANCH="${SLIPSTREAM_BRANCH:-main}"

if [[ ! -d "$APP_DIR/.git" ]]; then
  echo "Expected a Slipstream checkout at $APP_DIR" >&2
  exit 1
fi

git -C "$APP_DIR" fetch origin "$BRANCH"
git -C "$APP_DIR" merge --ff-only "origin/$BRANCH"
uv sync --directory "$APP_DIR/api" --frozen --no-dev
systemctl restart slipstream-api
systemctl is-active --quiet slipstream-api
curl --fail --silent --show-error http://127.0.0.1:8000/health
