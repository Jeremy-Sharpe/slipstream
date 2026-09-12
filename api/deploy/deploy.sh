#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="/opt/slipstream"
SOURCE_DIR="$APP_ROOT/source"
STAGING_ROOT="$APP_ROOT/staging"
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
  echo "Expected a source checkout at $SOURCE_DIR" >&2
  exit 1
fi

runuser -u slipstream-deploy -- git -C "$SOURCE_DIR" fetch --quiet --prune \
  origin "refs/heads/$BRANCH"
REVISION="$(runuser -u slipstream-deploy -- git -C "$SOURCE_DIR" \
  rev-parse --verify 'FETCH_HEAD^{commit}')"
if [[ ! "$REVISION" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Git returned an invalid revision" >&2
  exit 1
fi

RELEASE_DIR="$RELEASES_DIR/$REVISION"
PREVIOUS_RELEASE="$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)"
STAGE_DIR="$STAGING_ROOT/$REVISION.$$"
FINALIZE_DIR="$RELEASES_DIR/.prepare-$REVISION.$$"
TEMP_LINK="$APP_ROOT/.current.$$.${RANDOM}"

cleanup() {
  unlink "$TEMP_LINK" 2>/dev/null || true
  if [[ -d "$STAGE_DIR" ]]; then
    find "$STAGE_DIR" -depth -delete 2>/dev/null || true
  fi
  if [[ -d "$FINALIZE_DIR" ]]; then
    find "$FINALIZE_DIR" -depth -delete 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM HUP

if [[ ! -f "$RELEASE_DIR/.prepared" ]]; then
  install -d -m 0755 -o slipstream-deploy -g slipstream-deploy "$STAGE_DIR"
  runuser -u slipstream-deploy -- sh -c \
    'git -C "$1" archive "$2" | tar -x -C "$3"' sh "$SOURCE_DIR" "$REVISION" "$STAGE_DIR"
  runuser -u slipstream-deploy -- env UV_PYTHON_INSTALL_DIR="$UV_PYTHON_INSTALL_DIR" \
    UV_PYTHON_DOWNLOADS=never uv sync --directory "$STAGE_DIR/api" \
    --python 3.12.3 --frozen --no-dev
  install -d -m 0755 -o root -g root "$FINALIZE_DIR"
  cp -a --no-preserve=ownership "$STAGE_DIR/." "$FINALIZE_DIR/"
  chown -R root:root "$FINALIZE_DIR"
  printf 'ENVIRONMENT=production\nRELEASE_SHA=%s\n' "$REVISION" \
    > "$FINALIZE_DIR/.release.env"
  chmod 0644 "$FINALIZE_DIR/.release.env"
  runuser -u slipstream -- env -i PATH=/usr/bin:/bin ENVIRONMENT=production \
    sh -c 'cd "$1" && exec .venv/bin/python -c \
      "from app.main import app; assert app.title == '\''Slipstream API'\''"' \
    sh "$FINALIZE_DIR/api"
  touch "$FINALIZE_DIR/.prepared"
  mv "$FINALIZE_DIR" "$RELEASE_DIR"
fi

switch_release() {
  local target="$1"
  ln -s "$target" "$TEMP_LINK" || return 1
  mv -Tf "$TEMP_LINK" "$CURRENT_LINK" || return 1
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
    unlink "$CURRENT_LINK" 2>/dev/null || true
    systemctl stop slipstream-api || true
    return 1
  fi
  switch_release "$PREVIOUS_RELEASE" || return 1
  systemctl restart slipstream-api || return 1
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

if ! switch_release "$RELEASE_DIR"; then
  echo "Could not activate revision $REVISION" >&2
  exit 1
fi
ACTIVATED=1
if systemctl restart slipstream-api && wait_until_ready "$REVISION"; then
  ACTIVATED=0
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
