#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this one-time provisioning script as root" >&2
  exit 1
fi

API_DOMAIN="${SLIPSTREAM_API_DOMAIN:?Set SLIPSTREAM_API_DOMAIN to the public API hostname}"
REPOSITORY_URL="${SLIPSTREAM_REPOSITORY_URL:-https://github.com/Jeremy-Sharpe/slipstream.git}"
APP_ROOT="${SLIPSTREAM_APP_ROOT:-/opt/slipstream}"
SOURCE_DIR="$APP_ROOT/source"

for command in git uv caddy curl jq flock; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Required command is missing: $command" >&2
    exit 1
  fi
done

if ! id slipstream >/dev/null 2>&1; then
  useradd --system --home-dir /nonexistent --shell /usr/sbin/nologin slipstream
fi

install -d -m 0755 "$APP_ROOT" "$APP_ROOT/releases" /etc/slipstream /etc/caddy/conf.d
if [[ ! -d "$SOURCE_DIR/.git" ]]; then
  git clone --filter=blob:none "$REPOSITORY_URL" "$SOURCE_DIR"
fi

install -m 0644 "$SOURCE_DIR/api/deploy/slipstream-api.service" /etc/systemd/system/slipstream-api.service
cat > /etc/caddy/conf.d/slipstream-api.caddy <<EOF
$API_DOMAIN {
  encode zstd gzip
  reverse_proxy 127.0.0.1:8000
  header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains"
    X-Content-Type-Options "nosniff"
    X-Frame-Options "DENY"
    Referrer-Policy "strict-origin-when-cross-origin"
  }
}
EOF

if ! grep -Fqx 'import /etc/caddy/conf.d/*.caddy' /etc/caddy/Caddyfile; then
  printf '\nimport /etc/caddy/conf.d/*.caddy\n' >> /etc/caddy/Caddyfile
fi

caddy fmt --overwrite /etc/caddy/conf.d/slipstream-api.caddy
caddy validate --config /etc/caddy/Caddyfile
systemctl daemon-reload
systemctl enable slipstream-api
systemctl reload caddy
SLIPSTREAM_APP_ROOT="$APP_ROOT" "$SOURCE_DIR/api/deploy/deploy.sh"
