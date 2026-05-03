get_origin_remote_url() {
  git remote get-url origin
}

origin_uses_github_ssh() {
  local origin_url="${1:-}"

  if [[ -z "$origin_url" ]]; then
    origin_url="$(get_origin_remote_url 2>/dev/null || true)"
  fi

  case "$origin_url" in
    git@github.com:*|ssh://git@github.com/*) return 0 ;;
    *) return 1 ;;
  esac
}

github_https_remote_from_origin_url() {
  local origin_url="${1:-}"
  local repo_path=""

  if [[ -z "$origin_url" ]]; then
    origin_url="$(get_origin_remote_url 2>/dev/null || true)"
  fi

  case "$origin_url" in
    git@github.com:*)
      repo_path="${origin_url#git@github.com:}"
      ;;
    ssh://git@github.com/*)
      repo_path="${origin_url#ssh://git@github.com/}"
      ;;
    *)
      return 1
      ;;
  esac

  printf 'https://github.com/%s' "$repo_path"
}

gh_is_authenticated() {
  command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1
}

run_git_with_https_origin() {
  local https_url="$1"
  shift

  if gh_is_authenticated; then
    GIT_CONFIG_GLOBAL=/dev/null \
      GIT_CONFIG_NOSYSTEM=1 \
      git \
        -c credential.helper='!gh auth git-credential' \
        -c remote.origin.url="$https_url" \
        -c remote.origin.pushurl="$https_url" \
        "$@"
    return $?
  fi

  git \
    -c remote.origin.url="$https_url" \
    -c remote.origin.pushurl="$https_url" \
    "$@"
}

print_github_ssh_access_hint() {
  local origin_url="${1:-}"
  local https_url="https://github.com/<owner>/<repo>.git"
  local actual_https_url=""

  if [[ -z "$origin_url" ]]; then
    origin_url="$(get_origin_remote_url 2>/dev/null || true)"
  fi

  if actual_https_url="$(github_https_remote_from_origin_url "$origin_url" 2>/dev/null)"; then
    https_url="$actual_https_url"
  fi

  cat >&2 <<EOF

Detected a GitHub SSH remote that this machine could not use:
  ${origin_url}

To fix it, choose one of these paths:
  1. Configure a GitHub SSH key on this machine.
  2. Switch this repository to HTTPS:
     git remote set-url origin ${https_url}
EOF

  if ! command -v gh >/dev/null 2>&1; then
    cat >&2 <<EOF
  3. Install GitHub CLI if you want these workflows to fall back to HTTPS automatically.
EOF
  elif ! gh auth status >/dev/null 2>&1; then
    cat >&2 <<EOF
  3. Authenticate GitHub CLI and let Git reuse it over HTTPS:
     gh auth login
     gh auth setup-git
EOF
  else
    cat >&2 <<EOF
  3. If you prefer HTTPS for this repository, GitHub CLI is already authenticated:
     gh auth setup-git
EOF
  fi

  echo >&2
}

run_remote_git() {
  local origin_url=""
  local https_url=""
  local status=0
  local used_github_https_override=0

  origin_url="$(get_origin_remote_url 2>/dev/null || true)"
  if origin_uses_github_ssh "$origin_url"; then
    https_url="$(github_https_remote_from_origin_url "$origin_url" 2>/dev/null || true)"
  fi

  if [[ -n "$https_url" ]] && gh_is_authenticated; then
    used_github_https_override=1
    if run_git_with_https_origin "$https_url" "$@"; then
      return 0
    else
      status=$?
    fi
  fi

  if git "$@"; then
    return 0
  else
    status=$?
  fi

  if [[ -n "$https_url" ]] && [[ "$used_github_https_override" -eq 0 ]]; then
    echo "SSH access to GitHub failed. Retrying with a temporary HTTPS remote." >&2
    if run_git_with_https_origin "$https_url" "$@"; then
      return 0
    else
      status=$?
    fi
  fi

  if [[ -n "$https_url" ]]; then
    print_github_ssh_access_hint "$origin_url"
  fi
  return "$status"
}

run_remote_git_and_echo() {
  echo "+ git $*"
  run_remote_git "$@"
}
