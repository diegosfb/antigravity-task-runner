#!/usr/bin/env bash
# Auto-commit checkpoints when the working tree changes.
#
# Usage:
#   ./scripts/autocommit_changes.sh start
#   ./scripts/autocommit_changes.sh stop

set -euo pipefail

INTERVAL="${AGENTIC_CHECKPOINT_INTERVAL:-2}"
SCRIPT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

git_dir() {
  git rev-parse --git-dir 2>/dev/null || echo ".git"
}

pid_path() {
  echo "$(git_dir)/.agentic_autocommit.pid"
}

is_running() {
  local pid="$1"
  kill -0 "$pid" 2>/dev/null
}

timestamp() {
  date +"%m%d%H%M%S"
}

# ---------------------------------------------------------------------------
# Core loop
# ---------------------------------------------------------------------------

commit_checkpoint() {
  export GIT_TERMINAL_PROMPT=0
  git add -A
  # Nothing staged — nothing to do.
  if git diff --cached --quiet; then
    return
  fi
  local msg="[AGENTIC DEV CHECKPOINT] - $(timestamp)"
  if git commit --no-gpg-sign -m "$msg" >/dev/null 2>&1; then
    # Push: set upstream if not already set, otherwise plain push.
    if git rev-parse --abbrev-ref --symbolic-full-name "@{u}" >/dev/null 2>&1; then
      git push >/dev/null 2>&1 || true
    else
      git push -u origin HEAD >/dev/null 2>&1 || true
    fi
  fi
}

run_loop() {
  export GIT_TERMINAL_PROMPT=0
  while true; do
    # Only commit if there are changes in the working tree.
    if ! git diff --quiet || ! git diff --cached --quiet || \
       [ -n "$(git ls-files --others --exclude-standard)" ]; then
      commit_checkpoint
    fi
    sleep "$INTERVAL"
  done
}

# ---------------------------------------------------------------------------
# Daemon management
# ---------------------------------------------------------------------------

env_file() {
  echo "$(git rev-parse --show-toplevel 2>/dev/null || pwd)/.env"
}

set_env_pid() {
  local pid="$1"
  local file
  file="$(env_file)"
  if [ -f "$file" ]; then
    # Update existing entry if present, otherwise append.
    if grep -q "^AGENTIC_AUTOCOMMIT_PID=" "$file" 2>/dev/null; then
      sed -i.bak "s/^AGENTIC_AUTOCOMMIT_PID=.*/AGENTIC_AUTOCOMMIT_PID=${pid}/" "$file" && rm -f "${file}.bak"
    else
      echo "AGENTIC_AUTOCOMMIT_PID=${pid}" >> "$file"
    fi
  else
    echo "AGENTIC_AUTOCOMMIT_PID=${pid}" > "$file"
  fi
}

clear_env_pid() {
  local file
  file="$(env_file)"
  if [ -f "$file" ]; then
    sed -i.bak "/^AGENTIC_AUTOCOMMIT_PID=/d" "$file" && rm -f "${file}.bak"
  fi
}

start_daemon() {
  local pidfile
  pidfile="$(pid_path)"

  if [ -f "$pidfile" ]; then
    local existing
    existing="$(cat "$pidfile" 2>/dev/null || true)"
    if [ -n "$existing" ] && is_running "$existing"; then
      echo "Already running (pid $existing)."
      return
    fi
    rm -f "$pidfile"
  fi

  # Spawn a detached background process running the loop.
  GIT_TERMINAL_PROMPT=0 nohup bash "$SCRIPT_PATH" run \
    </dev/null >/dev/null 2>&1 &
  local child_pid=$!
  echo "$child_pid" > "$pidfile"
  set_env_pid "$child_pid"
  echo "Started (pid $child_pid)."
}

stop_daemon() {
  local pidfile
  pidfile="$(pid_path)"

  if [ ! -f "$pidfile" ]; then
    echo "Not running."
    return
  fi

  local pid
  pid="$(cat "$pidfile" 2>/dev/null || true)"

  if [ -z "$pid" ]; then
    echo "Could not read pidfile; removing it."
    rm -f "$pidfile"
    return
  fi

  if ! is_running "$pid"; then
    echo "Process not running; removing stale pidfile."
    rm -f "$pidfile"
    return
  fi

  kill "$pid"
  rm -f "$pidfile"
  clear_env_pid
  echo "Stopped."
}

print_usage() {
  echo "Usage:"
  echo "  autocommit_changes.sh start  # Start background auto-commit + push"
  echo "  autocommit_changes.sh stop   # Stop the background process"
}

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

CMD="${1:-}"
case "$CMD" in
  start) start_daemon ;;
  stop)  stop_daemon  ;;
  run)   run_loop     ;;
  *)     print_usage; exit 1 ;;
esac
