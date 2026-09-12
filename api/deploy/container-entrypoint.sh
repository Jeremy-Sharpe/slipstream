#!/usr/bin/env sh
set -eu

case "${PORT:-8000}" in
  ''|*[!0-9]*) echo "PORT must be a positive integer" >&2; exit 1 ;;
esac

if [ "${PORT:-8000}" -lt 1 ] || [ "${PORT:-8000}" -gt 65535 ]; then
  echo "PORT must be between 1 and 65535" >&2
  exit 1
fi

export ENVIRONMENT="${ENVIRONMENT:-production}"
export FORWARDED_ALLOW_IPS="${FORWARDED_ALLOW_IPS:-*}"
LOG_LEVEL_NORMALIZED="$(printf '%s' "${LOG_LEVEL:-info}" | tr '[:upper:]' '[:lower:]')"
exec /app/.venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" \
  --proxy-headers --forwarded-allow-ips "$FORWARDED_ALLOW_IPS" \
  --log-level "$LOG_LEVEL_NORMALIZED"
