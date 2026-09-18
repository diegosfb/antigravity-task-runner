#!/usr/bin/env bash

set -euo pipefail

if [[ "${1:-}" == __run ]]; then
  [[ $# -eq 7 ]] || exit 64
  state_file=$2
  job_label=$3
  narration_file=$4
  rate=$5
  voice=$6
  ready_file=$7
  runner_path=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)/${BASH_SOURCE[0]##*/}
  runner_dir=${runner_path%/*}

  [[ "$job_label" == codex.plan-speech.* ]] || exit 64
  case "$runner_path" in
    /private/tmp/*-runner.sh | /tmp/*-runner.sh | \
      /private/var/folders/*-runner.sh | /var/folders/*-runner.sh) ;;
    *) exit 65 ;;
  esac
  [[ "$state_file" == "$runner_dir/"*.state ]] || exit 65
  [[ "$ready_file" == "$runner_dir/"*.ready ]] || exit 65
  [[ -f "$narration_file" && -s "$narration_file" ]] || exit 66
  [[ -n "$rate" && "$rate" != *[!0-9]* && 10#$rate -gt 0 ]] || exit 64

  say_args=(-r "$rate")
  if [[ -n "$voice" ]]; then
    say_args+=(-v "$voice")
  fi

  /usr/bin/say "${say_args[@]}" -f "$narration_file" >/dev/null 2>&1 &
  speech_pid=$!
  printf '%s\n%s\n%s\n%s\n' \
    "$speech_pid" "$narration_file" "$job_label" "$runner_path" >"$state_file"
  chmod 600 "$state_file"
  : >"$ready_file"
  chmod 600 "$ready_file"

  exit_code=0
  wait "$speech_pid" || exit_code=$?
  if [[ -f "$state_file" && ! -L "$state_file" ]]; then
    IFS= read -r recorded_pid <"$state_file"
    if [[ "$recorded_pid" == "$speech_pid" ]]; then
      rm -f "$state_file" "$narration_file" "$runner_path"
    fi
  fi
  launchctl remove "$job_label" >/dev/null 2>&1 || true
  exit "$exit_code"
fi

usage() {
  printf 'Usage: %s <temporary-narration-file>\n' "${0##*/}" >&2
  printf '       %s start <temporary-narration-file>\n' "${0##*/}" >&2
  printf '       %s stop|status\n' "${0##*/}" >&2
}

repo_root=$(pwd -P)
read -r repo_checksum _ < <(printf '%s' "$repo_root" | cksum)
system_tmp=${TMPDIR:-/private/tmp}
system_tmp=${system_tmp%/}
system_tmp=$(cd "$system_tmp" && pwd -P)
state_dir="$system_tmp/codex-plan-speech-${UID}"
state_file="$state_dir/$repo_checksum.state"
job_prefix="codex.plan-speech.${UID}.${repo_checksum}"
job_label="$job_prefix.$$.${RANDOM}"
launch_domain="gui/${UID}"
helper_path=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)/${BASH_SOURCE[0]##*/}
runner_prefix="$state_dir/$repo_checksum-"
runner_path="$runner_prefix$$.${RANDOM}-runner.sh"
ready_file="${runner_path%-runner.sh}.ready"

mkdir -p "$state_dir"
chmod 700 "$state_dir"

load_state() {
  speech_pid=
  narration_file=
  recorded_job=
  recorded_runner=
  [[ -f "$state_file" && ! -L "$state_file" ]] || return 1
  {
    IFS= read -r speech_pid
    IFS= read -r narration_file
    IFS= read -r recorded_job
    IFS= read -r recorded_runner
  } <"$state_file"
  [[ "$speech_pid" =~ ^[0-9]+$ && -n "$narration_file" &&
    "$recorded_job" == "$job_prefix."* &&
    "$recorded_runner" == "$runner_prefix"*-runner.sh ]]
}

cleanup_state() {
  local recorded_file=${1:-}
  local cleanup_runner=$runner_path
  if [[ -n "${recorded_runner:-}" && "$recorded_runner" == "$runner_prefix"*-runner.sh ]]; then
    cleanup_runner=$recorded_runner
  fi
  local cleanup_ready=${cleanup_runner%-runner.sh}.ready
  rm -f "$state_file" "$cleanup_runner" "$cleanup_ready"
  if [[ -n "$recorded_file" ]]; then
    rm -f "$recorded_file"
  fi
}

is_recorded_speech() {
  local pid=$1
  local file=$2
  local command_line
  command_line=$(ps -p "$pid" -o command= 2>/dev/null || true)
  [[ "$command_line" == /usr/bin/say* && "$command_line" == *"$file"* ]]
}

stop_speech() {
  if ! load_state; then
    rm -f "$state_file"
    return 0
  fi

  local pid=$speech_pid
  local file=$narration_file
  if is_recorded_speech "$pid" "$file"; then
    kill "$pid"
    for _ in {1..20}; do
      if ! kill -0 "$pid" 2>/dev/null; then
        break
      fi
      sleep 0.1
    done
    if kill -0 "$pid" 2>/dev/null; then
      printf 'Unable to stop active plan narration.\n' >&2
      return 70
    fi
  fi
  launchctl remove "$recorded_job" >/dev/null 2>&1 || true
  cleanup_state "$file"
}

command_name=play
if [[ $# -gt 0 && ( "$1" == start || "$1" == stop || "$1" == status ) ]]; then
  command_name=$1
  shift
fi

if [[ "$command_name" == stop ]]; then
  [[ $# -eq 0 ]] || { usage; exit 64; }
  stop_speech
  exit 0
fi

if [[ "$command_name" == status ]]; then
  [[ $# -eq 0 ]] || { usage; exit 64; }
  if load_state &&
    is_recorded_speech "$speech_pid" "$narration_file" &&
    launchctl print "$launch_domain/$recorded_job" >/dev/null 2>&1; then
    exit 0
  fi
  cleanup_state "${narration_file:-}"
  exit 1
fi

if [[ $# -ne 1 ]]; then
  usage
  exit 64
fi

narration_file=$1

if [[ ! -f "$narration_file" || ! -s "$narration_file" ]]; then
  printf 'Plan narration file is missing or empty.\n' >&2
  exit 66
fi

narration_dir=$(cd "$(dirname "$narration_file")" && pwd -P)

case "$narration_dir/" in
  /private/tmp/* | /tmp/* | "$system_tmp"/*) ;;
  *)
    printf 'Plan narration must be stored in a temporary directory.\n' >&2
    exit 65
    ;;
esac

if [[ ! -x /usr/bin/say ]]; then
  printf 'macOS speech command /usr/bin/say is unavailable.\n' >&2
  exit 69
fi

voice=${CODEX_PLAN_VOICE:-}
rate=${CODEX_PLAN_RATE:-190}

if [[ "$rate" == *[!0-9]* || -z "$rate" ]]; then
  printf 'CODEX_PLAN_RATE must be a positive integer.\n' >&2
  exit 64
fi
if ((10#$rate <= 0)); then
  printf 'CODEX_PLAN_RATE must be a positive integer.\n' >&2
  exit 64
fi

say_args=(-r "$rate")
if [[ -n "$voice" ]]; then
  say_args+=(-v "$voice")
fi

if [[ "$command_name" == play ]]; then
  /usr/bin/say "${say_args[@]}" -f "$narration_file"
  exit 0
fi

requested_narration_file=$narration_file
stop_speech
narration_file=$requested_narration_file
cp "$helper_path" "$runner_path"
chmod 700 "$runner_path"
if ! launchctl submit -l "$job_label" -- \
  "$runner_path" __run "$state_file" "$job_label" "$narration_file" "$rate" "$voice" "$ready_file"; then
  cleanup_state "$narration_file"
  printf 'Unable to start persistent plan narration. Run with macOS GUI/audio session access.\n' >&2
  exit 70
fi

for _ in {1..100}; do
  if [[ -f "$ready_file" && ! -L "$ready_file" ]]; then
    rm -f "$ready_file"
    exit 0
  fi
  sleep 0.1
done

launchctl remove "$job_label" >/dev/null 2>&1 || true
cleanup_state "$narration_file"
printf 'Unable to start persistent plan narration.\n' >&2
exit 70
