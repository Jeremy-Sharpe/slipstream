#!/usr/bin/env bash
set -euo pipefail

IMAGE="ghcr.io/ggml-org/llama.cpp@sha256:cbcdcb52d484e08e23bfc0135afa5beadd2d540513bbb7c65b233231fa033ff4"
MODEL_URL="https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf"
MODEL_SHA256="6a1a2eb6d15622bf3c96857206351ba97e1af16c30d7a74ee38970e434e9407e"
MODEL_DIR="/var/lib/slipstream-models"
MODEL_PATH="$MODEL_DIR/qwen2.5-1.5b-instruct-q4_k_m.gguf"
UNIT_SOURCE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/slipstream-local-model.service"
API_DROP_IN_SOURCE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/slipstream-api-local-model.conf"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this installer as root" >&2
  exit 1
fi
for command in curl docker sha256sum systemctl; do
  command -v "$command" >/dev/null || {
    echo "Required command is missing: $command" >&2
    exit 1
  }
done

install -d -m 0755 -o root -g root "$MODEL_DIR"
if [[ -f "$MODEL_PATH" ]] && ! echo "$MODEL_SHA256  $MODEL_PATH" | sha256sum --check --status;
then
  echo "Existing model checksum is invalid; refusing to overwrite it" >&2
  exit 1
fi
if [[ ! -f "$MODEL_PATH" ]]; then
  temporary_model="$(mktemp "$MODEL_DIR/.qwen.XXXXXXXX.part")"
  cleanup() { rm -f "$temporary_model"; }
  trap cleanup EXIT INT TERM HUP
  curl --fail --location --retry 3 --connect-timeout 10 --max-time 1800 \
    --output "$temporary_model" "$MODEL_URL"
  echo "$MODEL_SHA256  $temporary_model" | sha256sum --check --status || {
    echo "Downloaded model checksum is invalid" >&2
    exit 1
  }
  chmod 0444 "$temporary_model"
  mv "$temporary_model" "$MODEL_PATH"
  trap - EXIT INT TERM HUP
fi

docker image inspect "$IMAGE" >/dev/null 2>&1 || docker pull "$IMAGE"
install -m 0644 -o root -g root "$UNIT_SOURCE" /etc/systemd/system/slipstream-local-model.service
install -d -m 0755 -o root -g root /etc/systemd/system/slipstream-api.service.d
install -m 0644 -o root -g root "$API_DROP_IN_SOURCE" \
  /etc/systemd/system/slipstream-api.service.d/local-model.conf
systemctl daemon-reload
systemctl enable --now slipstream-local-model.service

for _ in {1..90}; do
  if curl --fail --silent --show-error --connect-timeout 1 --max-time 2 \
    http://127.0.0.1:8081/v1/models \
    | grep -Fq 'slipstream-qwen2.5-1.5b-instruct-q4-k-m'; then
    echo "Slipstream local model is ready on loopback"
    exit 0
  fi
  sleep 2
done

echo "Local model did not become ready" >&2
systemctl --no-pager --full status slipstream-local-model.service >&2 || true
exit 1
