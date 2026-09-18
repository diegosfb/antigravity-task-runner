#!/usr/bin/env bash
set -euo pipefail

WHISPER_MODEL="${WHISPER_MODEL:-small}"
WARMUP=1
CHECK_ONLY=0

usage() {
  cat <<'EOF'
Usage: ./install-dependencies.sh [--check] [--no-warmup] [--whisper-model MODEL]

Installs the local dependencies required by the harvesting-meeting-context skill:
  - ffmpeg / ffprobe
  - python3 / pip3
  - openai-whisper

Options:
  --check                 Only report what is missing; do not install anything.
  --no-warmup             Skip whisper model warmup after installation.
  --whisper-model MODEL   Whisper model to warm up. Default: small
  -h, --help              Show this help message.
EOF
}

log() {
  printf '[install-deps] %s\n' "$1"
}

fail() {
  printf '[install-deps] ERROR: %s\n' "$1" >&2
  exit 1
}

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

run_cmd() {
  log "Running: $*"
  "$@"
}

need_sudo() {
  [[ "${EUID:-$(id -u)}" -ne 0 ]]
}

SUDO_CMD=()
if need_sudo && has_cmd sudo; then
  SUDO_CMD=(sudo)
fi

PKG_MANAGER=""
if [[ "$(uname -s)" == "Darwin" ]]; then
  PKG_MANAGER="brew"
elif has_cmd apt-get; then
  PKG_MANAGER="apt-get"
elif has_cmd dnf; then
  PKG_MANAGER="dnf"
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    --check)
      CHECK_ONLY=1
      ;;
    --no-warmup)
      WARMUP=0
      ;;
    --whisper-model)
      shift
      [[ $# -gt 0 ]] || fail "--whisper-model requires a value"
      WHISPER_MODEL="$1"
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      fail "Unknown argument: $1"
      ;;
  esac
  shift
done

missing=()
has_cmd ffmpeg || missing+=("ffmpeg")
has_cmd ffprobe || missing+=("ffprobe")
has_cmd python3 || missing+=("python3")

if has_cmd python3; then
  if ! python3 -m pip --version >/dev/null 2>&1; then
    missing+=("pip3")
  fi
  if ! python3 -c "import whisper" >/dev/null 2>&1; then
    missing+=("openai-whisper")
  fi
else
  missing+=("pip3" "openai-whisper")
fi

if [[ ${#missing[@]} -eq 0 ]]; then
  log "All required dependencies are already installed."
else
  log "Missing dependencies: ${missing[*]}"
fi

if [[ "$CHECK_ONLY" -eq 1 ]]; then
  if [[ ${#missing[@]} -eq 0 ]]; then
    exit 0
  fi
  exit 1
fi

install_system_packages() {
  case "$PKG_MANAGER" in
    brew)
      has_cmd brew || fail "Homebrew is required on macOS for unattended installs."
      if ! has_cmd ffmpeg || ! has_cmd ffprobe; then
        run_cmd brew install ffmpeg
      fi
      ;;
    apt-get)
      if ! has_cmd ffmpeg || ! has_cmd ffprobe; then
        run_cmd "${SUDO_CMD[@]}" apt-get update
        run_cmd "${SUDO_CMD[@]}" apt-get install -y ffmpeg
      fi
      if ! has_cmd python3 || ! python3 -m pip --version >/dev/null 2>&1; then
        run_cmd "${SUDO_CMD[@]}" apt-get update
        run_cmd "${SUDO_CMD[@]}" apt-get install -y python3 python3-pip
      fi
      ;;
    dnf)
      if ! has_cmd ffmpeg || ! has_cmd ffprobe; then
        run_cmd "${SUDO_CMD[@]}" dnf install -y ffmpeg
      fi
      if ! has_cmd python3 || ! python3 -m pip --version >/dev/null 2>&1; then
        run_cmd "${SUDO_CMD[@]}" dnf install -y python3 python3-pip
      fi
      ;;
    *)
      fail "Unsupported platform. Install ffmpeg, ffprobe, python3, pip3, and openai-whisper manually."
      ;;
  esac
}

install_python_package() {
  has_cmd python3 || fail "python3 is still unavailable after system package installation."

  if ! python3 -m pip --version >/dev/null 2>&1; then
    log "pip is missing; trying python3 -m ensurepip --upgrade"
    run_cmd python3 -m ensurepip --upgrade
  fi

  if ! python3 -m pip --version >/dev/null 2>&1; then
    fail "pip is unavailable. Install pip3 manually, then rerun this script."
  fi

  if ! python3 -c "import whisper" >/dev/null 2>&1; then
    run_cmd python3 -m pip install --user --upgrade openai-whisper
  fi
}

warmup_whisper() {
  [[ "$WARMUP" -eq 1 ]] || return 0

  has_cmd ffmpeg || return 0
  has_cmd python3 || return 0
  python3 -c "import whisper" >/dev/null 2>&1 || return 0

  local tmp_dir
  tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/harvesting-meeting-context.XXXXXX")"
  trap 'rm -rf "$tmp_dir"' EXIT

  log "Warming whisper model cache for model: ${WHISPER_MODEL}"
  run_cmd ffmpeg -y -hide_banner -loglevel error \
    -f lavfi -i anullsrc=channel_layout=mono:sample_rate=16000 -t 1 \
    "${tmp_dir}/silence.wav"
  run_cmd python3 -m whisper "${tmp_dir}/silence.wav" \
    --model "${WHISPER_MODEL}" \
    --output_dir "${tmp_dir}/warmup" \
    --output_format txt \
    --verbose False
  rm -rf "${tmp_dir}"
  trap - EXIT
}

install_system_packages
install_python_package
warmup_whisper

log "Verification summary:"
run_cmd ffmpeg -version
run_cmd ffprobe -version
run_cmd python3 --version
run_cmd python3 -m pip show openai-whisper

log "Dependencies are ready for harvesting-meeting-context."
