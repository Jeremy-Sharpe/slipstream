#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SOURCE_DIR

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run this installer as root" >&2
  exit 1
fi
for file in slipstream-supabase-start slipstream-supabase.service slipstream-api-supabase.conf; do
  [[ -f "$SOURCE_DIR/$file" ]] || {
    echo "Missing deployment asset: $file" >&2
    exit 1
  }
done

install -m 0755 -o root -g root \
  "$SOURCE_DIR/slipstream-supabase-start" /usr/local/sbin/slipstream-supabase-start
install -m 0644 -o root -g root \
  "$SOURCE_DIR/slipstream-supabase.service" /etc/systemd/system/slipstream-supabase.service
install -d -m 0755 -o root -g root /etc/systemd/system/slipstream-api.service.d
install -m 0644 -o root -g root \
  "$SOURCE_DIR/slipstream-api-supabase.conf" \
  /etc/systemd/system/slipstream-api.service.d/supabase.conf

systemctl daemon-reload
systemctl enable --now slipstream-supabase.service
systemctl restart slipstream-api.service

ready="$(curl --fail --silent --show-error --max-time 10 http://127.0.0.1:8000/ready)"
if [[ "$(jq -r '.storage' <<<"$ready")" != "supabase" ]] || \
   [[ "$(jq -r '.integrations.supabase' <<<"$ready")" != "true" ]]; then
  echo "Slipstream API did not report durable Supabase storage" >&2
  exit 1
fi
echo "Slipstream API is using the loopback-only Supabase runtime"
