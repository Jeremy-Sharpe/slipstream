#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${SLIPSTREAM_APP_ROOT:-/opt/slipstream}"
SOURCE_DIR="${SLIPSTREAM_SOURCE_DIR:-$APP_ROOT/source}"
RELEASES_DIR="$APP_ROOT/releases"
CURRENT_LINK="$APP_ROOT/current"
BRANCH="${SLIPSTREAM_BRANCH:-main}"
LOCK_FILE="${SLIPSTREAM_DEPLOY_LOCK:-/var/lock/slipstream-deploy.lock}"
READY_URL="${SLIPSTREAM_READY_URL:-http://127.0.0.1:8000/ready}"

exec 9>"$LOCK_FILE"
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
RELEASE_DIR="$RELEASES_DIR/$REVISION"
PREVIOUS_RELEASE="$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)"

mkdir -p "$RELEASES_DIR"
if [[ ! -d "$RELEASE_DIR" ]]; then
  git -C "$SOURCE_DIR" worktree add --detach "$RELEASE_DIR" "$REVISION"
  uv sync --directory "$RELEASE_DIR/api" --frozen --no-dev
  (cd "$RELEASE_DIR/api" && .venv/bin/python -c "from app.main import app; assert app.title == 'Slipstream API'")
fi

activate_release() {
  local target="$1"
  local revision="$2"
  ln -s "$target" "$CURRENT_LINK.next"
  mv -Tf "$CURRENT_LINK.next" "$CURRENT_LINK"
  printf 'RELEASE_SHA=%s\n' "$revision" > /etc/slipstream/release.env
  systemctl restart slipstream-api
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

activate_release "$RELEASE_DIR" "$REVISION"
if wait_until_ready "$REVISION"; then
  echo "Deployed Slipstream API revision $REVISION"
  exit 0
fi

echo "Revision $REVISION failed readiness checks" >&2
if [[ -n "$PREVIOUS_RELEASE" && -d "$PREVIOUS_RELEASE" ]]; then
  PREVIOUS_REVISION="$(basename "$PREVIOUS_RELEASE")"
  activate_release "$PREVIOUS_RELEASE" "$PREVIOUS_REVISION"
  if wait_until_ready "$PREVIOUS_REVISION"; then
    echo "Rolled back to $PREVIOUS_REVISION" >&2
  else
    echo "Rollback to $PREVIOUS_REVISION also failed readiness checks" >&2
  fi
fi
exit 1
