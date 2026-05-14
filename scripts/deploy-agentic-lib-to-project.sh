#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: deploy-agentic-lib-to-project.sh <source-folder> [workspace-root]

Detects whether <source-folder> is:
- a single skill folder containing SKILL.md
- a single agent folder containing AGENT.md or <folder-name>.md
- a skills collection folder containing child skill folders
- an agents collection folder containing child agent folders with AGENT.md or <folder-name>.md
- a package/lib folder containing skills/ and/or agents/

Then creates symlinks in:
- .agent2/skills, .claude2/skills, .codex/skills
- .agent2/agents, .claude2/agents, .codex/agents
inside the target workspace root (defaults to the current directory).
EOF
}

if [ "${1:-}" = "" ] || [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  usage
  exit $([ "${1:-}" = "" ] && echo 1 || echo 0)
fi

SOURCE_INPUT="$1"
WORKSPACE_INPUT="${2:-$(pwd)}"

if [ ! -d "${SOURCE_INPUT}" ]; then
  echo "ERROR: Source folder does not exist: ${SOURCE_INPUT}" >&2
  exit 1
fi

if [ ! -d "${WORKSPACE_INPUT}" ]; then
  echo "ERROR: Workspace root does not exist: ${WORKSPACE_INPUT}" >&2
  exit 1
fi

SOURCE_DIR="$(cd "${SOURCE_INPUT}" && pwd -P)"
WORKSPACE_ROOT="$(cd "${WORKSPACE_INPUT}" && pwd -P)"

SKILL_TARGETS=(
  "${WORKSPACE_ROOT}/.agent2/skills"
  "${WORKSPACE_ROOT}/.claude2/skills"
  "${WORKSPACE_ROOT}/.codex/skills"
)
AGENT_TARGETS=(
  "${WORKSPACE_ROOT}/.agent2/agents"
  "${WORKSPACE_ROOT}/.claude2/agents"
  "${WORKSPACE_ROOT}/.codex/agents"
)

CREATED_COUNT=0
UNCHANGED_COUNT=0

ensure_target_dirs() {
  local target
  for target in "$@"; do
    mkdir -p "${target}"
  done
}

has_skill_definition() {
  local dir="$1"
  [ -f "${dir}/SKILL.md" ]
}

has_agent_definition() {
  local dir="$1"
  local dir_name

  dir_name="$(basename "${dir}")"

  [ -f "${dir}/AGENT.md" ] || [ -f "${dir}/${dir_name}.md" ]
}

directory_matches_kind() {
  local dir="$1"
  local kind="$2"

  case "${kind}" in
    skill)
      has_skill_definition "${dir}"
      ;;
    agent)
      has_agent_definition "${dir}"
      ;;
    *)
      return 1
      ;;
  esac
}

link_item_into_targets() {
  local source_item="$1"
  shift

  local source_name
  local source_abs
  local target_dir
  local link_path
  local existing_target

  source_abs="$(cd "${source_item}" && pwd -P)"
  source_name="$(basename "${source_abs}")"

  for target_dir in "$@"; do
    link_path="${target_dir}/${source_name}"

    if [ -L "${link_path}" ]; then
      existing_target="$(readlink "${link_path}")"
      if [ "${existing_target}" = "${source_abs}" ]; then
        echo "unchanged: ${link_path} -> ${source_abs}"
        UNCHANGED_COUNT=$((UNCHANGED_COUNT + 1))
        continue
      fi

      echo "ERROR: ${link_path} already points to ${existing_target}" >&2
      return 1
    fi

    if [ -e "${link_path}" ]; then
      echo "ERROR: ${link_path} already exists and is not a symlink" >&2
      return 1
    fi

    ln -s "${source_abs}" "${link_path}"
    echo "created: ${link_path} -> ${source_abs}"
    CREATED_COUNT=$((CREATED_COUNT + 1))
  done
}

link_child_directories() {
  local collection_dir="$1"
  local kind="$2"
  shift 2

  local matched=0
  local child

  if [ ! -d "${collection_dir}" ]; then
    return 0
  fi

  while IFS= read -r -d '' child; do
    if directory_matches_kind "${child}" "${kind}"; then
      link_item_into_targets "${child}" "$@"
      matched=1
    fi
  done < <(find "${collection_dir}" -mindepth 1 -maxdepth 1 -type d -print0)

  if [ "${matched}" -eq 1 ]; then
    return 0
  fi

  return 1
}

has_child_directories_with_marker() {
  local collection_dir="$1"
  local kind="$2"
  local child

  if [ ! -d "${collection_dir}" ]; then
    return 1
  fi

  while IFS= read -r -d '' child; do
    if directory_matches_kind "${child}" "${kind}"; then
      return 0
    fi
  done < <(find "${collection_dir}" -mindepth 1 -maxdepth 1 -type d -print0)

  return 1
}

process_single_skill_dir() {
  ensure_target_dirs "${SKILL_TARGETS[@]}"
  link_item_into_targets "$1" "${SKILL_TARGETS[@]}"
}

process_single_agent_dir() {
  ensure_target_dirs "${AGENT_TARGETS[@]}"
  link_item_into_targets "$1" "${AGENT_TARGETS[@]}"
}

process_skills_collection() {
  ensure_target_dirs "${SKILL_TARGETS[@]}"
  if ! link_child_directories "$1" "skill" "${SKILL_TARGETS[@]}"; then
    echo "ERROR: No skill folders with SKILL.md found in ${1}" >&2
    return 1
  fi
}

process_agents_collection() {
  ensure_target_dirs "${AGENT_TARGETS[@]}"
  if ! link_child_directories "$1" "agent" "${AGENT_TARGETS[@]}"; then
    echo "ERROR: No agent folders with AGENT.md or <folder-name>.md found in ${1}" >&2
    return 1
  fi
}

handled=0

if [ -d "${SOURCE_DIR}/skills" ] || [ -d "${SOURCE_DIR}/agents" ]; then
  if [ -d "${SOURCE_DIR}/skills" ]; then
    process_skills_collection "${SOURCE_DIR}/skills"
    handled=1
  fi

  if [ -d "${SOURCE_DIR}/agents" ]; then
    process_agents_collection "${SOURCE_DIR}/agents"
    handled=1
  fi
elif has_skill_definition "${SOURCE_DIR}"; then
  process_single_skill_dir "${SOURCE_DIR}"
  handled=1
elif has_agent_definition "${SOURCE_DIR}"; then
  process_single_agent_dir "${SOURCE_DIR}"
  handled=1
elif has_child_directories_with_marker "${SOURCE_DIR}" "skill"; then
  process_skills_collection "${SOURCE_DIR}"
  handled=1
elif has_child_directories_with_marker "${SOURCE_DIR}" "agent"; then
  process_agents_collection "${SOURCE_DIR}"
  handled=1
fi

if [ "${handled}" -eq 0 ]; then
  echo "ERROR: ${SOURCE_DIR} is not a recognized skill folder, agent folder, or package folder." >&2
  exit 1
fi

echo "done: created=${CREATED_COUNT} unchanged=${UNCHANGED_COUNT} workspace=${WORKSPACE_ROOT}"
