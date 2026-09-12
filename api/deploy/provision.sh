#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this one-time provisioning script as root" >&2
  exit 1
fi

API_DOMAIN="${SLIPSTREAM_API_DOMAIN:?Set SLIPSTREAM_API_DOMAIN to the public API hostname}"
REPOSITORY_URL="${SLIPSTREAM_REPOSITORY_URL:-https://github.com/Jeremy-Sharpe/slipstream.git}"
APP_ROOT="/opt/slipstream"
SOURCE_DIR="$APP_ROOT/source"

for command in git uv caddy curl jq flock runuser tar; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Required command is missing: $command" >&2
    exit 1
  fi
done

if ! id slipstream >/dev/null 2>&1; then
  useradd --system --home-dir /nonexistent --shell /usr/sbin/nologin slipstream
fi
if ! id slipstream-deploy >/dev/null 2>&1; then
  useradd --system --create-home --home-dir /var/lib/slipstream-deploy \
    --shell /usr/sbin/nologin slipstream-deploy
fi

install -d -m 0755 -o root -g root "$APP_ROOT" "$APP_ROOT/releases"
install -d -m 0755 -o slipstream-deploy -g slipstream-deploy "$APP_ROOT/staging"
install -d -m 0755 -o root -g root "$APP_ROOT/python"
env UV_PYTHON_INSTALL_DIR="$APP_ROOT/python" uv python install 3.12.3
chown -R root:root "$APP_ROOT/python"
chmod -R go-w "$APP_ROOT/python"
install -d -m 0700 -o root -g root /etc/slipstream
if [[ ! -e /etc/slipstream/api.env ]]; then
  install -m 0600 -o root -g root /dev/null /etc/slipstream/api.env
else
  chown root:root /etc/slipstream/api.env
  chmod 0600 /etc/slipstream/api.env
fi

if [[ ! -d "$SOURCE_DIR/.git" ]]; then
  install -d -m 0755 -o slipstream-deploy -g slipstream-deploy "$SOURCE_DIR"
  runuser -u slipstream-deploy -- git clone --filter=blob:none "$REPOSITORY_URL" "$SOURCE_DIR"
else
  runuser -u slipstream-deploy -- git -C "$SOURCE_DIR" fetch --quiet --prune origin main
  runuser -u slipstream-deploy -- git -C "$SOURCE_DIR" checkout --quiet -B main origin/main
fi

install -m 0755 "$SOURCE_DIR/api/deploy/deploy.sh" /usr/local/sbin/slipstream-deploy
install -m 0644 "$SOURCE_DIR/api/deploy/slipstream-api.service" \
  /etc/systemd/system/slipstream-api.service
systemctl daemon-reload
systemctl enable slipstream-api
/usr/local/sbin/slipstream-deploy

install -d -m 0755 /etc/caddy/conf.d
CADDY_CANDIDATE="$(mktemp /etc/caddy/conf.d/slipstream-api.XXXXXXXX)"
trap 'unlink "$CADDY_CANDIDATE" 2>/dev/null || true' EXIT
cat > "$CADDY_CANDIDATE" <<EOF
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
caddy fmt --overwrite "$CADDY_CANDIDATE"

MAIN_CANDIDATE="$(mktemp /tmp/slipstream-caddy-main.XXXXXXXX)"
cp /etc/caddy/Caddyfile "$MAIN_CANDIDATE"
if ! grep -Fqx 'import /etc/caddy/conf.d/*.caddy' "$MAIN_CANDIDATE"; then
  printf '\nimport /etc/caddy/conf.d/*.caddy\n' >> "$MAIN_CANDIDATE"
fi

SNIPPET_BACKUP="$(mktemp /tmp/slipstream-caddy-snippet.XXXXXXXX)"
HAD_SNIPPET=0
if [[ -f /etc/caddy/conf.d/slipstream-api.caddy ]]; then
  cp /etc/caddy/conf.d/slipstream-api.caddy "$SNIPPET_BACKUP"
  HAD_SNIPPET=1
fi
cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.slipstream-backup
install -m 0644 "$CADDY_CANDIDATE" /etc/caddy/conf.d/slipstream-api.caddy
install -m 0644 "$MAIN_CANDIDATE" /etc/caddy/Caddyfile

if caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy; then
  unlink /etc/caddy/Caddyfile.slipstream-backup
  unlink "$MAIN_CANDIDATE"
  unlink "$SNIPPET_BACKUP"
  echo "Slipstream API provisioned at https://$API_DOMAIN"
  exit 0
fi

install -m 0644 /etc/caddy/Caddyfile.slipstream-backup /etc/caddy/Caddyfile
if [[ "$HAD_SNIPPET" -eq 1 ]]; then
  install -m 0644 "$SNIPPET_BACKUP" /etc/caddy/conf.d/slipstream-api.caddy
else
  unlink /etc/caddy/conf.d/slipstream-api.caddy
fi
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
echo "Caddy configuration failed and was restored" >&2
exit 1
