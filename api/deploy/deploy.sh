#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="/opt/slipstream"
SOURCE_DIR="$APP_ROOT/source"
RELEASES_DIR="$APP_ROOT/releases"
CURRENT_LINK="$APP_ROOT/current"
BRANCH="${SLIPSTREAM_BRANCH:-main}"
READY_URL="${SLIPSTREAM_READY_URL:-http://127.0.0.1:8000/ready}"
UV_PYTHON_INSTALL_DIR="$APP_ROOT/python"
export UV_PYTHON_INSTALL_DIR

exec 9>/var/lock/slipstream-deploy.lock
if ! flock -n 9; then
  echo "Another Slipstream deployment is already running" >&2
  exit 1
fi

if [[ ! -d "$SOURCE_DIR/.git" ]]; then
  echo "Expected a deployment source checkout at $SOURCE_DIR" >&2
  exit 1
fi

git -C "$SOURCE_DIR" fetch --quiet --prune origin "refs/heads/$BRANCH"
REVISION="$(git -C "$SOURCE_DIR" rev-parse --verify 'FETCH_HEAD^{commit}')"
if [[ ! "$REVISION" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Git returned an invalid revision" >&2
  exit 1
fi

RELEASE_DIR="$RELEASES_DIR/$REVISION"
PREVIOUS_RELEASE="$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)"
TEMP_LINK="$APP_ROOT/.current.$$.${RANDOM}"
trap 'unlink "$TEMP_LINK" 2>/dev/null || true' EXIT INT TERM HUP

if [[ -d "$RELEASE_DIR" && ! -f "$RELEASE_DIR/.prepared" ]]; then
  git -C "$SOURCE_DIR" worktree remove --force "$RELEASE_DIR" 2>/dev/null || true
fi

if [[ ! -f "$RELEASE_DIR/.prepared" ]]; then
  runuser -u slipstream-deploy -- git -C "$SOURCE_DIR" worktree add --detach "$RELEASE_DIR" "$REVISION"
  runuser -u slipstream-deploy -- env UV_PYTHON_INSTALL_DIR="$UV_PYTHON_INSTALL_DIR" \
    uv sync --directory "$RELEASE_DIR/api" --frozen --no-dev
  printf 'ENVIRONMENT=production\nRELEASE_SHA=%s\n' "$REVISION" > "$RELEASE_DIR/api/deploy/release.env"
  chmod 0644 "$RELEASE_DIR/api/deploy/release.env"
  runuser -u slipstream -- env -i PATH=/usr/bin:/bin ENVIRONMENT=production \
    "$RELEASE_DIR/api/.venv/bin/python" -c \
    "import sys; sys.path.insert(0, '$RELEASE_DIR/api'); from app.main import app; assert app.title == 'Slipstream API'"
  touch "$RELEASE_DIR/.prepared"
fi

switch_release() {
  local target="$1"
  ln -s "$target" "$TEMP_LINK"
  mv -Tf "$TEMP_LINK" "$CURRENT_LINK"
}

install_service_unit() {
  local release="$1"
  install -m 0644 "$release/api/deploy/slipstream-api.service" \
    /etc/systemd/system/slipstream-api.service
  systemctl daemon-reload
}

wait_until_ready() {
  local expected_revision="$1"
  local payload
  for _ in {1..20}; do
    if payload="$(curl --fail --silent --show-error --connect-timeout 2 --max-time 3 "$READY_URL" 2>/dev/null)" \
      && [[ "$(jq -r '.revision // empty' <<<"$payload")" == "$expected_revision" ]]; then
      return 0
    fi
    sleep 1
  done
  return 1
}

rollback() {
  if [[ -z "$PREVIOUS_RELEASE" || ! -f "$PREVIOUS_RELEASE/.prepared" ]]; then
    echo "No prepared previous release is available for rollback" >&2
    return 1
  fi
  install_service_unit "$PREVIOUS_RELEASE"
  switch_release "$PREVIOUS_RELEASE"
  systemctl restart slipstream-api
  wait_until_ready "$(basename "$PREVIOUS_RELEASE")"
}

ACTIVATED=0
handle_interruption() {
  set +e
  if [[ "$ACTIVATED" -eq 1 ]]; then
    rollback
  fi
  exit 130
}
trap handle_interruption INT TERM HUP

if ! install_service_unit "$RELEASE_DIR" || ! switch_release "$RELEASE_DIR"; then
  echo "Could not activate revision $REVISION" >&2
  exit 1
fi
ACTIVATED=1
if systemctl restart slipstream-api && wait_until_ready "$REVISION"; then
  ACTIVATED=0
  install -m 0755 "$RELEASE_DIR/api/deploy/deploy.sh" /usr/local/sbin/slipstream-deploy
  echo "Deployed Slipstream API revision $REVISION"
  exit 0
fi

echo "Revision $REVISION failed activation or readiness; rolling back" >&2
if rollback; then
  ACTIVATED=0
  echo "Rolled back to $(basename "$PREVIOUS_RELEASE")" >&2
else
  echo "Rollback failed; inspect slipstream-api.service immediately" >&2
fi
exit 1
