#!/usr/bin/env bash
set -euo pipefail

IMAGE="ghcr.io/ggml-org/llama.cpp@sha256:cbcdcb52d484e08e23bfc0135afa5beadd2d540513bbb7c65b233231fa033ff4"
NETWORK="slipstream-models"
MODEL_URL="https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf"
MODEL_SHA256="6a1a2eb6d15622bf3c96857206351ba97e1af16c30d7a74ee38970e434e9407e"
MODEL_DIR="/var/lib/slipstream-models"
MODEL_PATH="$MODEL_DIR/qwen2.5-1.5b-instruct-q4_k_m.gguf"
EMBEDDING_URL="https://huggingface.co/nomic-ai/nomic-embed-text-v1.5-GGUF/resolve/0188c9bf409793f810680a5a431e7b899c46104c/nomic-embed-text-v1.5.Q4_K_M.gguf"
EMBEDDING_SHA256="d4e388894e09cf3816e8b0896d81d265b55e7a9fff9ab03fe8bf4ef5e11295ac"
EMBEDDING_PATH="$MODEL_DIR/nomic-embed-text-v1.5.Q4_K_M.gguf"
UNIT_SOURCE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/slipstream-local-model.service"
EMBEDDING_UNIT_SOURCE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/slipstream-local-embedding.service"
API_DROP_IN_SOURCE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/slipstream-api-local-model.conf"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this installer as root" >&2
  exit 1
fi
for command in curl docker flock jq sha256sum systemctl; do
  command -v "$command" >/dev/null || {
    echo "Required command is missing: $command" >&2
    exit 1
  }
done

exec 9>/run/lock/slipstream-local-model-install.lock
if ! flock --nonblock 9; then
  echo "Another local-model installation is already running" >&2
  exit 1
fi

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

if [[ -f "$EMBEDDING_PATH" ]] && ! echo "$EMBEDDING_SHA256  $EMBEDDING_PATH" | sha256sum --check --status;
then
  echo "Existing embedding model checksum is invalid; refusing to overwrite it" >&2
  exit 1
fi
if [[ ! -f "$EMBEDDING_PATH" ]]; then
  temporary_embedding="$(mktemp "$MODEL_DIR/.nomic.XXXXXXXX.part")"
  cleanup_embedding() { rm -f "$temporary_embedding"; }
  trap cleanup_embedding EXIT INT TERM HUP
  curl --fail --location --retry 3 --connect-timeout 10 --max-time 1800 \
    --output "$temporary_embedding" "$EMBEDDING_URL"
  echo "$EMBEDDING_SHA256  $temporary_embedding" | sha256sum --check --status || {
    echo "Downloaded embedding model checksum is invalid" >&2
    exit 1
  }
  chmod 0444 "$temporary_embedding"
  mv "$temporary_embedding" "$EMBEDDING_PATH"
  trap - EXIT INT TERM HUP
fi

docker image inspect "$IMAGE" >/dev/null 2>&1 || docker pull "$IMAGE"
if docker network inspect "$NETWORK" >/dev/null 2>&1; then
  network_settings="$(
    docker network inspect "$NETWORK" \
      --format '{{.Internal}} {{index .Options "com.docker.network.bridge.enable_icc"}}'
  )"
  if [[ "$network_settings" != "false false" ]]; then
    echo "Existing model network does not have the required isolation settings" >&2
    exit 1
  fi
else
  docker network create \
    --opt com.docker.network.bridge.enable_icc=false \
    "$NETWORK" >/dev/null
fi

backup_dir="$(mktemp -d /tmp/slipstream-model-install.XXXXXXXX)"
reasoning_unit="/etc/systemd/system/slipstream-local-model.service"
embedding_unit="/etc/systemd/system/slipstream-local-embedding.service"
api_drop_in="/etc/systemd/system/slipstream-api.service.d/local-model.conf"
rollback_needed=0
reasoning_had_unit=0
embedding_had_unit=0
api_had_drop_in=0
reasoning_was_active=0
embedding_was_active=0
reasoning_enablement="not-found"
embedding_enablement="not-found"
temporary_drop_in=""
restore_enablement() {
  local unit="$1"
  local state="$2"
  case "$state" in
    enabled)
      systemctl enable "$unit"
      ;;
    enabled-runtime)
      systemctl disable "$unit" && systemctl enable --runtime "$unit"
      ;;
    masked)
      systemctl mask "$unit"
      ;;
    masked-runtime)
      systemctl unmask "$unit" && systemctl mask --runtime "$unit"
      ;;
    disabled)
      systemctl disable "$unit"
      ;;
    not-found | static | indirect | generated | transient | alias)
      ;;
    *)
      echo "Cannot restore unrecognised enablement state '$state' for $unit" >&2
      return 1
      ;;
  esac
}
cleanup_install() {
  set +e
  local rollback_failed=0
  if [[ "$rollback_needed" -eq 1 ]]; then
    systemctl stop slipstream-local-model.service slipstream-local-embedding.service \
      || rollback_failed=1
    # Remove links created by the enable calls while the replacement unit files
    # still exist. The original enablement state is restored after the unit
    # snapshots are put back.
    if [[ -e "$reasoning_unit" || -L "$reasoning_unit" ]]; then
      systemctl disable slipstream-local-model.service || rollback_failed=1
    fi
    if [[ -e "$embedding_unit" || -L "$embedding_unit" ]]; then
      systemctl disable slipstream-local-embedding.service || rollback_failed=1
    fi
    if [[ "$reasoning_had_unit" -eq 1 ]]; then
      cp -a "$backup_dir/reasoning.service" "$reasoning_unit" || rollback_failed=1
    else
      rm -f "$reasoning_unit" || rollback_failed=1
    fi
    if [[ "$embedding_had_unit" -eq 1 ]]; then
      cp -a "$backup_dir/embedding.service" "$embedding_unit" || rollback_failed=1
    else
      rm -f "$embedding_unit" || rollback_failed=1
    fi
    if [[ "$api_had_drop_in" -eq 1 ]]; then
      cp -a "$backup_dir/api-local-model.conf" "$api_drop_in" || rollback_failed=1
    else
      rm -f "$api_drop_in" || rollback_failed=1
    fi
    systemctl daemon-reload || rollback_failed=1
    restore_enablement slipstream-local-model.service "$reasoning_enablement" \
      || rollback_failed=1
    restore_enablement slipstream-local-embedding.service "$embedding_enablement" \
      || rollback_failed=1
    if [[ "$reasoning_was_active" -eq 1 ]]; then
      systemctl restart slipstream-local-model.service || rollback_failed=1
    fi
    if [[ "$embedding_was_active" -eq 1 ]]; then
      systemctl restart slipstream-local-embedding.service || rollback_failed=1
    fi
  fi
  [[ -n "$temporary_drop_in" ]] && rm -f "$temporary_drop_in"
  if [[ "$rollback_failed" -eq 1 ]]; then
    echo "Rollback was incomplete; recovery backups remain at $backup_dir" >&2
    return
  fi
  rm -f \
    "$backup_dir/reasoning.service" \
    "$backup_dir/embedding.service" \
    "$backup_dir/api-local-model.conf"
  rmdir "$backup_dir"
}
trap cleanup_install EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
trap 'exit 129' HUP

[[ -f "$reasoning_unit" ]] && {
  cp -a "$reasoning_unit" "$backup_dir/reasoning.service"
  reasoning_had_unit=1
}
[[ -f "$embedding_unit" ]] && {
  cp -a "$embedding_unit" "$backup_dir/embedding.service"
  embedding_had_unit=1
}
[[ -f "$api_drop_in" ]] && {
  cp -a "$api_drop_in" "$backup_dir/api-local-model.conf"
  api_had_drop_in=1
}
systemctl is-active --quiet slipstream-local-model.service && reasoning_was_active=1
systemctl is-active --quiet slipstream-local-embedding.service && embedding_was_active=1
reasoning_enablement="$(systemctl is-enabled slipstream-local-model.service 2>/dev/null || true)"
embedding_enablement="$(systemctl is-enabled slipstream-local-embedding.service 2>/dev/null || true)"
rollback_needed=1

install -m 0644 -o root -g root "$UNIT_SOURCE" /etc/systemd/system/slipstream-local-model.service
install -m 0644 -o root -g root "$EMBEDDING_UNIT_SOURCE" \
  /etc/systemd/system/slipstream-local-embedding.service
install -d -m 0755 -o root -g root /etc/systemd/system/slipstream-api.service.d
systemctl daemon-reload
systemctl enable slipstream-local-model.service
systemctl enable slipstream-local-embedding.service
systemctl restart slipstream-local-model.service
systemctl restart slipstream-local-embedding.service

models_ready=0
for _ in {1..90}; do
  if curl --disable --noproxy '*' --fail --silent --show-error --connect-timeout 1 --max-time 2 \
    http://127.0.0.1:8081/v1/models \
    | grep -Fq 'slipstream-qwen2.5-1.5b-instruct-q4-k-m' \
    && curl --disable --noproxy '*' --fail --silent --show-error --connect-timeout 1 --max-time 2 \
      http://127.0.0.1:8082/v1/models \
      | grep -Fq 'slipstream-nomic-embed-text-v1.5-q4-k-m' \
    && curl --disable --noproxy '*' --fail --silent --show-error --connect-timeout 1 --max-time 5 \
      http://127.0.0.1:8082/v1/embeddings \
      --header 'Content-Type: application/json' \
      --data '{"model":"slipstream-nomic-embed-text-v1.5-q4-k-m","input":["search_document: readiness probe"]}' \
      | jq -e '.model == "slipstream-nomic-embed-text-v1.5-q4-k-m" and (.data | length) == 1 and (.data[0].embedding | length) == 768 and all(.data[0].embedding[]; type == "number")' \
      >/dev/null; then
    models_ready=1
    break
  fi
  sleep 2
done

if [[ "$models_ready" -ne 1 ]]; then
  echo "Local models did not become ready" >&2
  systemctl --no-pager --full status slipstream-local-model.service >&2 || true
  systemctl --no-pager --full status slipstream-local-embedding.service >&2 || true
  exit 1
fi

expected_image_id="$(docker image inspect "$IMAGE" --format '{{.Id}}')"
running_image_id="$(docker inspect slipstream-local-model --format '{{.Image}}')"
embedding_image_id="$(docker inspect slipstream-local-embedding --format '{{.Image}}')"
if [[ "$running_image_id" != "$expected_image_id" || "$embedding_image_id" != "$expected_image_id" ]]; then
  echo "Running model container does not use the pinned image" >&2
  exit 1
fi

temporary_drop_in="$(mktemp /etc/systemd/system/slipstream-api.service.d/.local-model.XXXXXXXX)"
install -m 0644 -o root -g root "$API_DROP_IN_SOURCE" "$temporary_drop_in"
mv "$temporary_drop_in" "$api_drop_in"
temporary_drop_in=""
systemctl daemon-reload
rollback_needed=0
echo "Slipstream local reasoning and embedding models are ready on loopback"
