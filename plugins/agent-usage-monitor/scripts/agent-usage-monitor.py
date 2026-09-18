#!/usr/bin/env python3
"""Local, dependency-free usage monitor for Claude Code, Codex, and OpenCode on macOS."""

import argparse
import glob
import json
import os
import re
import shlex
import shutil
import signal
import sqlite3
import subprocess
import sys
import tempfile
import textwrap
import time
import unicodedata
import urllib.parse
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple


VERSION = "0.1.0"
MAX_JSONL_LINE_BYTES = 256 * 1024
MAX_JSONL_HEAD_BYTES = 256 * 1024
MAX_JSONL_TAIL_BYTES = 2 * 1024 * 1024
MAX_JSONL_RECORDS = 4096
MAX_RESOURCES = 256
MAX_RESOURCE_NAME_CHARS = 200
MAX_RESOURCE_CONTENT_CHARS = 200_000
MAX_MODEL_CATALOG_BYTES = 16 * 1024 * 1024
MAX_CONVERSATION_CHARS = 2 * 1024 * 1024
DEFAULT_STATE = Path.home() / "Library" / "Caches" / "agent-usage-monitor" / "claude.json"
OPENCODE_DATABASE = Path.home() / ".local" / "share" / "opencode" / "opencode.db"
OPENCODE_MODELS = Path.home() / ".cache" / "opencode" / "models.json"
OPENCODE_MODEL_CACHE: Dict[Tuple[str, int, str, str], Optional[int]] = {}
INSTALL_PATH = Path.home() / ".local" / "bin" / "agent-usage-monitor"
TERMINAL_ESCAPE_RE = re.compile(
    r"\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b\[[0-?]*[ -/]*[@-~]|\x1b[@-_]"
)
UNSAFE_TERMINAL_CONTROL_RE = re.compile(r"[\x00-\x08\x0b-\x1f\x7f-\x9f]")
CODEX_STATUS_ITEMS = [
    "model-with-reasoning",
    "current-dir",
    "git-branch",
    "context-used",
    "used-tokens",
    "total-input-tokens",
    "total-output-tokens",
    "five-hour-limit",
    "weekly-limit",
]

# USD per million tokens. Codex subscription charges may differ; these are
# current list-price estimates and are deliberately labeled as estimates.
OPENAI_RATES = {
    "gpt-5.6-sol": (4.00, 0.40, 20.00),
    "gpt-5.6": (4.00, 0.40, 20.00),
    "gpt-5.6-terra": (2.00, 0.20, 12.00),
    "gpt-5.6-luna": (0.20, 0.02, 1.20),
    "gpt-5.5": (5.00, 0.50, 30.00),
    "gpt-5.4": (2.50, 0.25, 15.00),
    "gpt-5.3-codex": (1.75, 0.175, 14.00),
    "gpt-5.2": (1.75, 0.175, 14.00),
}


class Snapshot:
    def __init__(
        self,
        provider: str,
        model: str,
        thinking_level: str = "",
        project: str = "",
        branch: str = "",
        input_tokens: Optional[int] = None,
        cached_tokens: Optional[int] = None,
        output_tokens: Optional[int] = None,
        context_used: Optional[int] = None,
        context_window: Optional[int] = None,
        cost_usd: Optional[float] = None,
        cost_label: str = "unavailable",
        short_limit: Optional[float] = None,
        weekly_limit: Optional[float] = None,
        resources: Optional[List[Any]] = None,
        transcript_path: str = "",
    ) -> None:
        self.provider = provider
        self.model = model
        self.thinking_level = thinking_level
        self.project = project
        self.branch = branch
        self.input_tokens = input_tokens
        self.cached_tokens = cached_tokens
        self.output_tokens = output_tokens
        self.context_used = context_used
        self.context_window = context_window
        self.cost_usd = cost_usd
        self.cost_label = cost_label
        self.short_limit = short_limit
        self.weekly_limit = weekly_limit
        self.transcript_path = transcript_path
        self.resources = [
            resource if isinstance(resource, ContextResource) else ContextResource(**resource)
            for resource in (resources or [])
        ]

    def as_dict(self) -> Dict[str, Any]:
        result = dict(self.__dict__)
        result["resources"] = [resource.as_dict() for resource in self.resources]
        return result


class ContextResource:
    def __init__(
        self,
        kind: str,
        name: str,
        estimated_tokens: int,
        source: str,
        accuracy: str = "estimated",
    ) -> None:
        self.kind = kind
        self.name = name
        self.estimated_tokens = estimated_tokens
        self.source = source
        self.accuracy = accuracy

    def as_dict(self) -> Dict[str, Any]:
        return dict(self.__dict__)


def _number(value: Any, integer: bool = True) -> Optional[Any]:
    if value is None or isinstance(value, bool):
        return None
    try:
        return int(value) if integer else float(value)
    except (TypeError, ValueError):
        return None


def _mapping(value: Any) -> Dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _sequence(value: Any) -> List[Any]:
    return value if isinstance(value, list) else []


def _bounded_name(value: Any) -> str:
    if not isinstance(value, (str, int, float)) or isinstance(value, bool):
        return ""
    return str(value)[:MAX_RESOURCE_NAME_CHARS]


def _git_branch(directory: str) -> str:
    if not directory:
        return ""
    try:
        result = subprocess.run(
            ["git", "-C", directory, "branch", "--show-current"],
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
            timeout=0.3,
            check=False,
        )
        return result.stdout.strip()
    except (OSError, subprocess.SubprocessError):
        return ""


def _estimate_tokens(value: Any) -> int:
    if not isinstance(value, (str, int, float)) or isinstance(value, bool):
        return 1
    length = min(len(str(value)), MAX_RESOURCE_CONTENT_CHARS)
    return max(1, (length + 3) // 4)


def _merge_resources(resources: Iterable[ContextResource]) -> List[ContextResource]:
    merged: Dict[Tuple[str, str], ContextResource] = {}
    for resource in resources:
        if len(merged) >= MAX_RESOURCES and (resource.kind, resource.name) not in merged:
            continue
        key = (resource.kind, resource.name)
        if key in merged:
            merged[key].estimated_tokens += resource.estimated_tokens
        else:
            merged[key] = ContextResource(**resource.as_dict())
    return list(merged.values())


def parse_claude_resources(records: Iterable[Dict[str, Any]]) -> List[ContextResource]:
    resources = []
    for record in records:
        if not isinstance(record, dict):
            continue
        if record.get("type") != "attachment":
            continue
        attachment = _mapping(record.get("attachment"))
        attachment_type = attachment.get("type")
        if attachment_type == "skill_listing":
            names = _sequence(attachment.get("names"))[:MAX_RESOURCES]
            share = max(1, _estimate_tokens(attachment.get("content")) // max(len(names), 1))
            resources.extend(
                ContextResource("skill", _bounded_name(name), share, "discovery metadata")
                for name in names
                if _bounded_name(name)
            )
        elif attachment_type == "agent_listing_delta":
            names = _sequence(attachment.get("addedTypes"))[:MAX_RESOURCES]
            lines = _sequence(attachment.get("addedLines"))[:MAX_RESOURCES]
            for index, name in enumerate(names):
                content = lines[index] if index < len(lines) else name
                safe_name = _bounded_name(name)
                if safe_name:
                    resources.append(ContextResource("agent", safe_name, _estimate_tokens(content), "discovery metadata"))
        elif attachment_type == "mcp_listing":
            names = _sequence(attachment.get("names"))[:MAX_RESOURCES]
            share = max(1, _estimate_tokens(attachment.get("content")) // max(len(names), 1))
            resources.extend(
                ContextResource("mcp", _bounded_name(name), share, "discovery metadata")
                for name in names
                if _bounded_name(name)
            )
    return _merge_resources(resources)


def read_claude_resources(path: Path) -> List[ContextResource]:
    records = [
        record
        for record in _read_bounded_json_records(path)
        if record.get("type") == "attachment"
        and _mapping(record.get("attachment")).get("type") in ("skill_listing", "agent_listing_delta", "mcp_listing")
    ]
    return parse_claude_resources(records)


def parse_claude(payload: Dict[str, Any], resources: Optional[List[ContextResource]] = None) -> Snapshot:
    payload = _mapping(payload)
    context = _mapping(payload.get("context_window"))
    current = _mapping(context.get("current_usage"))
    workspace = _mapping(payload.get("workspace"))
    directory = workspace.get("current_dir") or payload.get("cwd") or ""
    cache_read = _number(current.get("cache_read_input_tokens")) or 0
    cache_write = _number(current.get("cache_creation_input_tokens")) or 0
    cost = _number(_mapping(payload.get("cost")).get("total_cost_usd"), integer=False)
    limits = _mapping(payload.get("rate_limits"))
    return Snapshot(
        provider="claude",
        model=_mapping(payload.get("model")).get("display_name") or "unknown",
        thinking_level=_bounded_name(_mapping(payload.get("effort")).get("level")),
        transcript_path=payload.get("transcript_path") if isinstance(payload.get("transcript_path"), str) else "",
        project=Path(directory).name if directory else "",
        branch=_git_branch(directory),
        input_tokens=_number(current.get("input_tokens")),
        cached_tokens=cache_read + cache_write,
        output_tokens=_number(current.get("output_tokens")),
        context_used=_number(context.get("total_input_tokens")),
        context_window=_number(context.get("context_window_size")),
        cost_usd=cost,
        cost_label="CLI estimate" if cost is not None else "unavailable",
        short_limit=_number(_mapping(limits.get("five_hour")).get("used_percentage"), False),
        weekly_limit=_number(_mapping(limits.get("seven_day")).get("used_percentage"), False),
        resources=resources,
    )


def _model_from_records(records: Iterable[Dict[str, Any]]) -> str:
    model = "unknown"
    for record in records:
        if not isinstance(record, dict):
            continue
        payload = _mapping(record.get("payload"))
        candidate = payload.get("model") or _mapping(payload.get("info")).get("model")
        if candidate:
            model = str(candidate)
    return model


def _thinking_from_records(records: Iterable[Dict[str, Any]]) -> str:
    thinking_level = ""
    for record in records:
        if not isinstance(record, dict):
            continue
        payload = _mapping(record.get("payload"))
        candidate = payload.get("effort") or payload.get("reasoning_effort")
        if candidate:
            thinking_level = _bounded_name(candidate)
    return thinking_level


def _rates_for(model: str) -> Optional[Tuple[float, float, float]]:
    normalized = model.lower().replace("_", "-")
    for name in sorted(OPENAI_RATES, key=len, reverse=True):
        if name in normalized:
            return OPENAI_RATES[name]
    # Codex sometimes records a family name without the Sol suffix.
    if "5.6" in normalized or "5-6" in normalized:
        return OPENAI_RATES["gpt-5.6-sol"]
    return None


def _codex_skill_resources(instructions: str) -> List[ContextResource]:
    resources = []
    in_skills = False
    for line in instructions[:MAX_RESOURCE_CONTENT_CHARS].splitlines():
        if line.strip() == "### Available skills":
            in_skills = True
            continue
        if in_skills and line.startswith("#"):
            break
        match = re.match(r"\s*-\s+([A-Za-z0-9_.:-]+):", line) if in_skills else None
        if match:
            resources.append(ContextResource("skill", _bounded_name(match.group(1)), _estimate_tokens(line), "discovery metadata"))
            if len(resources) >= MAX_RESOURCES:
                break
    return resources


def _codex_instruction_texts(record: Dict[str, Any]) -> List[str]:
    payload = _mapping(record.get("payload"))
    if record.get("type") == "session_meta":
        instructions = payload.get("base_instructions")
        if isinstance(instructions, dict):
            instructions = instructions.get("text")
        return [instructions] if isinstance(instructions, str) else []
    if (
        record.get("type") == "response_item"
        and payload.get("type") == "message"
        and payload.get("role") == "developer"
    ):
        return [
            item.get("text")
            for item in _sequence(payload.get("content"))
            if isinstance(item, dict) and isinstance(item.get("text"), str)
        ]
    return []


def read_codex_resources(
    project_root: Path,
    records: Iterable[Dict[str, Any]],
    config_path: Optional[Path] = None,
) -> List[ContextResource]:
    """Read resource names and bounded size estimates without retaining prompts or config values."""
    resources = []
    for record in records:
        if not isinstance(record, dict):
            continue
        payload = _mapping(record.get("payload"))
        if record.get("type") == "context_resources":
            for item in _sequence(payload.get("resources"))[:MAX_RESOURCES]:
                if isinstance(item, dict):
                    try:
                        resources.append(ContextResource(**item))
                    except TypeError:
                        continue
        for instructions in _codex_instruction_texts(record):
            resources.extend(_codex_skill_resources(instructions))

    agent_root = project_root.resolve() / ".codex" / "agents"
    if agent_root.is_dir():
        for path in sorted(agent_root.glob("*.toml"))[:MAX_RESOURCES]:
            try:
                resolved = path.resolve()
                if resolved.parent != agent_root or not resolved.is_file():
                    continue
                resources.append(
                    ContextResource(
                        "agent",
                        _bounded_name(path.stem),
                        max(1, min(resolved.stat().st_size, MAX_RESOURCE_CONTENT_CHARS) // 4),
                        "Codex agent configuration",
                    )
                )
            except OSError:
                continue

    config = config_path or (Path.home() / ".codex" / "config.toml")
    try:
        with config.open("r", encoding="utf-8", errors="replace") as handle:
            config_text = handle.read(MAX_RESOURCE_CONTENT_CHARS)
    except OSError:
        config_text = ""
    for match in re.finditer(r"(?m)^\s*\[mcp_servers\.([A-Za-z0-9_-]+)\]\s*$", config_text):
        name = _bounded_name(match.group(1))
        if name:
            resources.append(ContextResource("mcp", name, _estimate_tokens(match.group(0)), "Codex MCP configuration"))
    return _merge_resources(resources)


def _markdown_discovery_tokens(path: Path, name: str) -> int:
    """Estimate only model-facing name/description metadata, not the instruction body."""
    try:
        with path.open("r", encoding="utf-8", errors="replace") as handle:
            prefix = handle.read(8192)
    except OSError:
        return _estimate_tokens(name)
    frontmatter = prefix.split("---", 2)[1] if prefix.startswith("---") and prefix.count("---") >= 2 else ""
    descriptions = [
        line.split(":", 1)[1].strip().strip("\"'")
        for line in frontmatter.splitlines()
        if line.lstrip().startswith("description:")
    ]
    return _estimate_tokens("{} {}".format(name, " ".join(descriptions)))


def read_opencode_resources(
    project_root: Path,
    config_paths: Optional[List[Path]] = None,
) -> List[ContextResource]:
    """Discover OpenCode resource metadata without retaining prompt or credential values."""
    project_root = project_root.resolve()
    resources = [
        ContextResource("agent", name, _estimate_tokens(name), "OpenCode built-in")
        for name in ("build", "plan", "general", "explore")
    ]
    agent_roots = [
        Path.home() / ".config" / "opencode" / "agents",
        project_root / ".opencode" / "agents",
    ]
    for root in agent_roots:
        if not root.is_dir():
            continue
        resolved_root = root.resolve()
        for index, path in enumerate(root.rglob("*.md")):
            if index >= MAX_RESOURCES:
                break
            try:
                resolved = path.resolve()
                resolved.relative_to(resolved_root)
                if not resolved.is_file():
                    continue
                name = path.relative_to(root).with_suffix("").as_posix()
            except (OSError, ValueError):
                continue
            resources.append(ContextResource("agent", _bounded_name(name), _markdown_discovery_tokens(resolved, name), "OpenCode agent"))

    skill_roots = [
        Path.home() / ".config" / "opencode" / "skills",
        Path.home() / ".claude" / "skills",
        Path.home() / ".agents" / "skills",
        project_root / ".opencode" / "skills",
        project_root / ".claude" / "skills",
        project_root / ".agents" / "skills",
    ]
    for root in skill_roots:
        if not root.is_dir():
            continue
        resolved_root = root.resolve()
        for index, path in enumerate(root.rglob("SKILL.md")):
            if index >= MAX_RESOURCES:
                break
            try:
                resolved = path.resolve()
                resolved.relative_to(resolved_root)
                if not resolved.is_file():
                    continue
            except (OSError, ValueError):
                continue
            name = path.parent.name
            resources.append(ContextResource("skill", _bounded_name(name), _markdown_discovery_tokens(resolved, name), "OpenCode skill"))

    configs = config_paths or [
        Path.home() / ".config" / "opencode" / "opencode.json",
        project_root / "opencode.json",
        project_root / ".opencode" / "opencode.json",
    ]
    for path in configs:
        try:
            with path.open("r", encoding="utf-8", errors="replace") as handle:
                text = handle.read(MAX_RESOURCE_CONTENT_CHARS + 1)
            if len(text) > MAX_RESOURCE_CONTENT_CHARS:
                continue
            config = json.loads(text)
        except (OSError, ValueError):
            continue
        for name, value in _mapping(_mapping(config).get("agent")).items():
            safe_name = _bounded_name(name)
            if safe_name:
                description = _bounded_name(_mapping(value).get("description"))
                resources.append(ContextResource("agent", safe_name, _estimate_tokens(safe_name + description), "OpenCode configuration"))
        for name, value in _mapping(_mapping(config).get("mcp")).items():
            safe_name = _bounded_name(name)
            if safe_name and _mapping(value).get("enabled", True) is not False:
                resources.append(ContextResource("mcp", safe_name, _estimate_tokens(safe_name), "OpenCode MCP configuration"))
    return _merge_resources(resources)


def _opencode_model_context(path: Path, provider: str, model: str) -> Optional[int]:
    try:
        cache_key = (str(path.resolve()), path.stat().st_mtime_ns, provider, model)
        if cache_key in OPENCODE_MODEL_CACHE:
            return OPENCODE_MODEL_CACHE[cache_key]
        with path.open("r", encoding="utf-8", errors="replace") as handle:
            text = handle.read(MAX_MODEL_CATALOG_BYTES + 1)
        if len(text) > MAX_MODEL_CATALOG_BYTES:
            return None
        catalog = json.loads(text)
    except (OSError, ValueError):
        return None
    entry = _mapping(_mapping(_mapping(catalog).get(provider)).get("models")).get(model)
    context = _number(_mapping(_mapping(entry).get("limit")).get("context"))
    OPENCODE_MODEL_CACHE.clear()
    OPENCODE_MODEL_CACHE[cache_key] = context
    return context


def read_opencode_session(
    database: Path,
    models: Path,
    project_root: Path,
    since: float = 0,
    resources: Optional[List[ContextResource]] = None,
) -> Tuple[Snapshot, str, List[Dict[str, Any]]]:
    """Read the newest matching OpenCode session through a read-only SQLite connection."""
    empty = Snapshot(provider="opencode", model="waiting for telemetry", project=project_root.name)
    uri = "file:{}?mode=ro".format(urllib.parse.quote(str(database.resolve()), safe="/"))
    connection: Optional[sqlite3.Connection] = None
    try:
        connection = sqlite3.connect(uri, uri=True, timeout=0.1)
        connection.row_factory = sqlite3.Row
        session = connection.execute(
            "SELECT id, agent, json_extract(model, '$.id') AS model_id, "
            "json_extract(model, '$.providerID') AS provider_id, "
            "json_extract(model, '$.variant') AS variant, cost, tokens_input, "
            "tokens_output, tokens_reasoning, tokens_cache_read, tokens_cache_write FROM session "
            "WHERE directory = ? AND time_updated >= ? ORDER BY time_updated DESC LIMIT 1",
            (str(project_root.resolve()), int(since * 1000)),
        ).fetchone()
        if session is None:
            connection.close()
            return empty, "", []
        message_rows = connection.execute(
            "SELECT json_extract(m.data, '$.role') AS role, "
            "substr(json_extract(p.data, '$.text'), 1, ?) AS text, "
            "length(json_extract(p.data, '$.text')) AS text_length, "
            "json_extract(p.data, '$.synthetic') AS synthetic FROM message m "
            "JOIN part p ON p.message_id = m.id WHERE m.session_id = ? "
            "AND json_extract(p.data, '$.type') = 'text' "
            "ORDER BY m.time_created, p.time_created, p.id LIMIT ?",
            (MAX_RESOURCE_CONTENT_CHARS, session["id"], MAX_JSONL_RECORDS),
        )
        messages = []
        remaining_characters = MAX_CONVERSATION_CHARS
        for row in message_rows:
            text = row["text"]
            if not isinstance(text, str) or row["text_length"] > MAX_RESOURCE_CONTENT_CHARS:
                continue
            if len(text) > remaining_characters:
                break
            messages.append(row)
            remaining_characters -= len(text)
        latest = connection.execute(
            "SELECT json_extract(data, '$.tokens.total') AS total FROM message WHERE session_id = ? "
            "AND json_extract(data, '$.role') = 'assistant' "
            "AND json_extract(data, '$.tokens.total') > 0 ORDER BY time_created DESC LIMIT 1",
            (session["id"],),
        ).fetchone()
        connection.close()
    except (OSError, sqlite3.Error):
        if connection is not None:
            connection.close()
        return empty, "", []

    model = _bounded_name(session["model_id"])
    provider = _bounded_name(session["provider_id"])
    variant = _bounded_name(session["variant"])
    records = []
    for row in messages:
        if row["synthetic"] == 1:
            continue
        text = row["text"]
        role = row["role"]
        if role in ("user", "assistant") and isinstance(text, str):
            records.append({"type": "opencode_message", "role": role, "text": text})

    discovered_resources = resources if resources is not None else read_opencode_resources(project_root)
    snapshot = Snapshot(
        provider="opencode",
        model="{}/{}".format(provider, model) if provider else model,
        thinking_level=variant,
        project=project_root.name,
        branch=_git_branch(str(project_root)),
        input_tokens=_number(session["tokens_input"]),
        cached_tokens=_number(session["tokens_cache_read"]),
        output_tokens=_number(session["tokens_output"]),
        context_used=_number(latest["total"] if latest else None),
        context_window=_opencode_model_context(models, provider, model),
        cost_usd=_number(session["cost"], False),
        cost_label="CLI exact",
        resources=discovered_resources,
    )
    return snapshot, str(session["id"]), records


def sanitize_codex_records(records: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Reduce Codex JSONL to counters and resource metadata before retention."""
    safe = []
    for record in records:
        if not isinstance(record, dict) or len(safe) >= MAX_JSONL_RECORDS:
            continue
        record_type = record.get("type")
        payload = _mapping(record.get("payload"))
        if not payload:
            continue
        if record_type == "session_meta":
            resources = []
            for instructions in _codex_instruction_texts(record):
                resources.extend(_codex_skill_resources(instructions))
            if resources:
                safe.append({"type": "context_resources", "payload": {"resources": [item.as_dict() for item in resources]}})
        elif record_type == "response_item" and payload.get("type") == "message" and payload.get("role") == "developer":
            resources = []
            for instructions in _codex_instruction_texts(record):
                resources.extend(_codex_skill_resources(instructions))
            if resources:
                safe.append({"type": "context_resources", "payload": {"resources": [item.as_dict() for item in resources]}})
        elif record_type == "turn_context":
            model = _bounded_name(payload.get("model"))
            effort = _bounded_name(payload.get("effort") or payload.get("reasoning_effort"))
            if model or effort:
                safe_payload = {}
                if model:
                    safe_payload["model"] = model
                if effort:
                    safe_payload["effort"] = effort
                safe.append({"type": "turn_context", "payload": safe_payload})
        elif record_type == "event_msg" and payload.get("type") == "token_count":
            info = _mapping(payload.get("info"))
            if info:
                safe.append({"type": "event_msg", "payload": {"type": "token_count", "info": info, "rate_limits": _mapping(payload.get("rate_limits"))}})
        elif record_type == "response_item" and payload.get("type") == "agent_message":
            name = _bounded_name(payload.get("author") or payload.get("recipient")) or "agent"
            resource = ContextResource("agent", name, _estimate_tokens(payload.get("content")), "active contribution")
            safe.append({"type": "context_resources", "payload": {"resources": [resource.as_dict()]}})
    return safe


def estimate_openai_cost(
    model: str, input_tokens: Optional[int], cached_tokens: Optional[int], output_tokens: Optional[int]
) -> Optional[float]:
    rates = _rates_for(model)
    if rates is None or input_tokens is None or output_tokens is None:
        return None
    cached = max(cached_tokens or 0, 0)
    uncached = max(input_tokens - cached, 0)
    return (uncached * rates[0] + cached * rates[1] + output_tokens * rates[2]) / 1_000_000


def parse_codex(
    records: List[Dict[str, Any]],
    project: str = "",
    branch: str = "",
    resources: Optional[List[ContextResource]] = None,
) -> Snapshot:
    latest = None
    latest_limits: Dict[str, Any] = {}
    discovered_resources = list(resources or [])
    for record in records:
        if not isinstance(record, dict):
            continue
        payload = _mapping(record.get("payload"))
        if record.get("type") == "event_msg" and payload.get("type") == "token_count":
            latest = _mapping(payload.get("info"))
            latest_limits = _mapping(payload.get("rate_limits")) or _mapping(latest.get("rate_limits"))
        elif record.get("type") == "context_resources":
            for item in _sequence(payload.get("resources"))[:MAX_RESOURCES]:
                if isinstance(item, dict):
                    try:
                        discovered_resources.append(ContextResource(**item))
                    except TypeError:
                        continue
    model = _model_from_records(records)
    thinking_level = _thinking_from_records(records)
    if latest is None:
        return Snapshot(
            provider="codex",
            model=model,
            thinking_level=thinking_level,
            project=project,
            branch=branch,
            resources=_merge_resources(discovered_resources),
        )
    total = _mapping(latest.get("total_token_usage"))
    active = _mapping(latest.get("last_token_usage"))
    input_tokens = _number(total.get("input_tokens"))
    cached_tokens = _number(total.get("cached_input_tokens"))
    output_tokens = _number(total.get("output_tokens"))
    cost = estimate_openai_cost(model, input_tokens, cached_tokens, output_tokens)
    return Snapshot(
        provider="codex",
        model=model,
        thinking_level=thinking_level,
        project=project,
        branch=branch,
        input_tokens=input_tokens,
        cached_tokens=cached_tokens,
        output_tokens=output_tokens,
        context_used=_number(active.get("total_tokens")),
        context_window=_number(latest.get("model_context_window")),
        cost_usd=cost,
        cost_label="list-price estimate" if cost is not None else "unavailable",
        short_limit=_number(_mapping(latest_limits.get("primary")).get("used_percent"), False),
        weekly_limit=_number(_mapping(latest_limits.get("secondary")).get("used_percent"), False),
        resources=_merge_resources(discovered_resources),
    )


def _compact_number(value: Optional[int]) -> str:
    if value is None:
        return "—"
    if value >= 1_000_000:
        return "{:.1f}m".format(value / 1_000_000).rstrip("0").rstrip(".")
    if value >= 1_000:
        amount = "{:.1f}".format(value / 1_000).rstrip("0").rstrip(".")
        return amount + "k"
    return str(value)


def _context(snapshot: Snapshot) -> Tuple[str, Optional[int]]:
    if snapshot.context_used is None or not snapshot.context_window:
        return "unavailable", None
    percent = round(100 * snapshot.context_used / snapshot.context_window)
    return "{}/{}".format(_compact_number(snapshot.context_used), _compact_number(snapshot.context_window)), percent


def _safe_label(value: Any, max_length: int = 80) -> str:
    """Return bounded, single-line text that cannot carry terminal controls."""
    text = str(value or "")
    printable = "".join(
        character
        for character in text
        if unicodedata.category(character) not in ("Cc", "Cf", "Cs")
    )
    return " ".join(printable.split())[:max_length]


def render_compact(snapshot: Snapshot, color: bool = True) -> str:
    context, percent = _context(snapshot)
    cost = "unavailable" if snapshot.cost_usd is None else "${:.2f}{}".format(
        snapshot.cost_usd, "~" if snapshot.cost_label != "exact" else ""
    )
    parts = [_safe_label(snapshot.model), _safe_label(snapshot.project)]
    if snapshot.branch:
        parts.append("git:{}".format(_safe_label(snapshot.branch)))
    parts.extend(["ctx {} {}%".format(context, percent) if percent is not None else "ctx unavailable", "cost {}".format(cost)])
    return "  |  ".join(part for part in parts if part)


def _bar(percent: Optional[int], width: int = 16) -> str:
    if percent is None:
        return "[{}]".format("?" * width)
    filled = max(0, min(width, round(width * percent / 100)))
    return "[{}{}]".format("█" * filled, "░" * (width - filled))


def _context_warning(value: str, percent: Optional[int], color: bool) -> str:
    if not color or percent is None or percent <= 60:
        return value
    ansi = "\033[31m" if percent > 80 else "\033[33m"
    return ansi + value + "\033[0m"


def _resource_view(
    resources: List[ContextResource], selected: int, offset: int, limit: int
) -> Tuple[int, int, List[ContextResource]]:
    limit = max(1, min(limit, MAX_RESOURCES))
    if not resources:
        return 0, 0, []
    selected = max(0, min(selected, len(resources) - 1))
    maximum_offset = max(0, len(resources) - limit)
    offset = max(0, min(offset, maximum_offset))
    if selected < offset:
        offset = selected
    elif selected >= offset + limit:
        offset = selected - limit + 1
    return selected, offset, resources[offset : offset + limit]


def render_sidebar(
    snapshot: Snapshot,
    color: bool = True,
    resources_expanded: bool = True,
    resource_selected: int = 0,
    resource_offset: int = 0,
    resource_limit: int = 8,
) -> str:
    context, percent = _context(snapshot)
    cost = "unavailable" if snapshot.cost_usd is None else "${:.4f}".format(snapshot.cost_usd)
    total_tokens = None
    if snapshot.input_tokens is not None and snapshot.output_tokens is not None:
        total_tokens = snapshot.input_tokens + snapshot.output_tokens
    window_line = _context_warning("Window  {}".format(context), percent, color)
    bar_line = _context_warning(
        "{} {}".format(_bar(percent), "{}%".format(percent) if percent is not None else "unavailable"),
        percent,
        color,
    )
    agent_resources = [resource for resource in snapshot.resources if resource.kind == "agent"]
    skill_resources = [resource for resource in snapshot.resources if resource.kind == "skill"]
    mcp_resources = [resource for resource in snapshot.resources if resource.kind == "mcp"]

    def resource_summary(label: str, resources: List[ContextResource]) -> str:
        tokens = sum(resource.estimated_tokens for resource in resources)
        usage = round(100 * tokens / snapshot.context_window) if tokens and snapshot.context_window else None
        percentage = "{}% of context".format(usage) if usage is not None else "context unavailable"
        return "{} {} ({} · ~{})".format(label, len(resources), percentage, _compact_number(tokens))

    lines = [
        "Resources {}".format("▾" if resources_expanded else "▸"),
        resource_summary("Agents", agent_resources),
        resource_summary("Skills", skill_resources),
        resource_summary("MCPs  ", mcp_resources),
    ]
    if resources_expanded:
        selected, offset, visible = _resource_view(
            snapshot.resources, resource_selected, resource_offset, resource_limit
        )
        for visible_index, resource in enumerate(visible):
            absolute_index = offset + visible_index
            lines.append(
                "{} {} {} ~{}".format(
                    "›" if absolute_index == selected else " ",
                    "A" if resource.kind == "agent" else "M" if resource.kind == "mcp" else "S",
                    _safe_label(resource.name, 20),
                    _compact_number(resource.estimated_tokens),
                )
            )
        if len(snapshot.resources) > resource_limit:
            lines.append(
                "  {}–{} of {}".format(
                    offset + 1, offset + len(visible), len(snapshot.resources)
                )
            )
    lines.extend([
        "",
        "Context",
        "────────────────────────────",
        "Model   {}".format(_safe_label(snapshot.model)),
        "Thinking  {}".format(
            _safe_label(snapshot.thinking_level).title() if snapshot.thinking_level else "unavailable"
        ),
        "Tokens  {}".format(_compact_number(total_tokens) if total_tokens is not None else "unavailable"),
        "  In    {}".format(_compact_number(snapshot.input_tokens)),
        "  Out   {}".format(_compact_number(snapshot.output_tokens)),
        "  Cache {}".format(_compact_number(snapshot.cached_tokens)),
        "",
        "Cost    {}".format(cost),
        "        {}".format(snapshot.cost_label),
        "",
        window_line,
        bar_line,
    ])
    if snapshot.short_limit is not None:
        lines.append("5 hour {:.0f}% used".format(snapshot.short_limit))
    if snapshot.weekly_limit is not None:
        lines.append("7 day  {:.0f}% used".format(snapshot.weekly_limit))
    if snapshot.project:
        lines.extend(["", _safe_label(snapshot.project), _safe_label(snapshot.branch) or "no git branch"])
    return "\n".join(lines)


def write_state(path: Path, snapshot: Snapshot) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(snapshot.as_dict(), separators=(",", ":")))
    os.chmod(str(temporary), 0o600)
    temporary.replace(path)


def read_state(path: Path) -> Snapshot:
    try:
        return Snapshot(**json.loads(path.read_text()))
    except (OSError, ValueError, TypeError):
        return Snapshot(provider="claude", model="waiting for telemetry")


def _latest_answer(records: Iterable[Dict[str, Any]], provider: str) -> str:
    for record in reversed(list(records)):
        if not isinstance(record, dict):
            continue
        if provider == "claude" and record.get("type") == "assistant":
            content = _sequence(_mapping(record.get("message")).get("content"))
            texts = [item.get("text") for item in content if isinstance(item, dict) and item.get("type") == "text"]
        elif provider == "codex" and record.get("type") == "response_item":
            payload = _mapping(record.get("payload"))
            if payload.get("type") != "message" or payload.get("role") != "assistant":
                continue
            content = _sequence(payload.get("content"))
            texts = [item.get("text") for item in content if isinstance(item, dict) and item.get("type") == "output_text"]
        else:
            continue
        answer = "\n".join(text for text in texts if isinstance(text, str) and text)
        if answer:
            return answer
    return ""


def _conversation_document(records: Iterable[Dict[str, Any]], provider: str) -> str:
    turns: List[Tuple[str, str]] = []
    for record in records:
        if not isinstance(record, dict):
            continue
        role = ""
        texts: List[str] = []
        if provider == "claude" and record.get("type") in ("user", "assistant"):
            message = _mapping(record.get("message"))
            role = str(message.get("role") or record.get("type"))
            content = message.get("content")
            if role == "user" and isinstance(content, str):
                texts = [_visible_claude_user_text(content)]
            elif isinstance(content, list):
                if role == "assistant" and any(
                    isinstance(item, dict) and item.get("type") == "tool_use" for item in content
                ):
                    continue
                texts = [
                    _visible_claude_user_text(item.get("text")) if role == "user" else item.get("text")
                    for item in content
                    if isinstance(item, dict) and item.get("type") == "text"
                ]
        elif provider == "codex" and record.get("type") == "response_item":
            message = _mapping(record.get("payload"))
            if message.get("type") != "message":
                continue
            role = str(message.get("role") or "")
            content = _sequence(message.get("content"))
            if role == "user":
                texts = [
                    _visible_user_text(item.get("text"))
                    for item in content
                    if isinstance(item, dict) and item.get("type") == "input_text"
                ]
            elif role == "assistant" and message.get("phase") in (None, "final_answer"):
                texts = [
                    item.get("text")
                    for item in content
                    if isinstance(item, dict) and item.get("type") == "output_text"
                ]
        elif provider == "opencode" and record.get("type") == "opencode_message":
            role = str(record.get("role") or "")
            value = record.get("text")
            if role == "user":
                texts = [_visible_user_text(value)]
            elif role == "assistant" and isinstance(value, str):
                texts = [value]
        text = "\n".join(item.strip() for item in texts if isinstance(item, str) and item.strip())
        if role not in ("user", "assistant") or not text:
            continue
        if turns and turns[-1][0] == role:
            turns[-1] = (role, turns[-1][1] + "\n" + text)
        else:
            turns.append((role, text))
    assistant_label = "Claude" if provider == "claude" else "OpenCode" if provider == "opencode" else "Codex"
    return "\n\n".join(
        "## {}\n\n{}".format("You" if role == "user" else assistant_label, text)
        for role, text in turns
    )


def _visible_user_text(value: Any) -> str:
    if not isinstance(value, str):
        return ""
    text = value.strip()
    if text.startswith("# AGENTS.md instructions for") or text.startswith("<environment_context>"):
        return ""
    marker = "## My request:"
    if marker in text and text.startswith("# Files mentioned by the user:"):
        return text.split(marker, 1)[1].strip()
    if text.startswith("<image ") or text == "</image>":
        return ""
    return text


def _visible_claude_user_text(value: Any) -> str:
    if not isinstance(value, str):
        return ""
    text = value.strip()
    return "" if text.startswith("<system-reminder>") else text


def _safe_viewer_text(value: str) -> str:
    """Remove terminal controls while retaining readable multiline text."""
    without_escapes = TERMINAL_ESCAPE_RE.sub("", value)
    return UNSAFE_TERMINAL_CONTROL_RE.sub("", without_escapes)


def _hard_wrap_markdown(value: str, width: int = 102) -> str:
    lines = value.splitlines()
    output: List[str] = []
    table_lines = set()
    fence_character = ""
    fence_length = 0

    for index, line in enumerate(lines):
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if index == 0 or len(cells) < 2 or not all(
            re.fullmatch(r":?-{3,}:?", cell) for cell in cells
        ):
            continue
        header = lines[index - 1].strip().strip("|")
        header_cells = [cell.strip() for cell in header.split("|")]
        if "|" not in header or len(header_cells) != len(cells):
            continue
        table_lines.add(index - 1)
        table_lines.add(index)
        following = index + 1
        while following < len(lines) and lines[following].strip() and "|" in lines[following]:
            table_lines.add(following)
            following += 1

    for index, line in enumerate(lines):
        stripped = line.strip()
        fence = re.match(r"^\s*(`{3,}|~{3,})", line)
        if fence_character:
            output.append(line)
            if re.fullmatch(
                r"\s*{}{{{},}}\s*".format(re.escape(fence_character), fence_length), line
            ):
                fence_character = ""
                fence_length = 0
        elif fence:
            marker = fence.group(1)
            fence_character = marker[0]
            fence_length = len(marker)
            output.append(line)
        elif (
            not stripped
            or len(line) <= width
            or stripped.startswith("#")
            or index in table_lines
            or (stripped.startswith("|") and stripped.endswith("|"))
        ):
            output.append(line)
        else:
            item = re.match(r"^(\s*(?:[-*+]|\d+[.)])\s+)(.*)$", line)
            if item:
                prefix, text = item.groups()
                output.extend(
                    textwrap.wrap(
                        text,
                        width=width,
                        initial_indent=prefix,
                        subsequent_indent=" " * len(prefix),
                        break_long_words=False,
                        break_on_hyphens=False,
                    )
                )
            else:
                output.extend(
                    textwrap.wrap(
                        line,
                        width=width,
                        break_long_words=False,
                        break_on_hyphens=False,
                    )
                )
    return "\n".join(output)


def _editor_command(target: str) -> Optional[List[str]]:
    environment = " ".join(
        value for key, value in os.environ.items() if key.startswith("VSCODE_") or key == "TERM_PROGRAM"
    ).lower()
    if "antigravity" in environment:
        executable = shutil.which("antigravity-ide")
        if not executable:
            bundled = Path("/Applications/Antigravity IDE.app/Contents/Resources/app/bin/antigravity-ide")
            executable = str(bundled) if bundled.is_file() else None
        if executable:
            return [executable, "--reuse-window", target]
    if "vscode" in environment or any(key.startswith("VSCODE_") for key in os.environ):
        executable = shutil.which("code")
        if executable:
            return [executable, "--reuse-window", target]
    executable = shutil.which("subl")
    return [executable, target] if executable else None


def _write_conversation(
    project_root: str, transcript: Path, provider: str, content: str
) -> Path:
    if provider not in ("claude", "codex", "opencode"):
        raise ValueError("unsupported provider")
    root = Path(project_root).expanduser().resolve()
    if not root.is_dir():
        raise ValueError("project root is not a directory")
    directory = root / "tmp" / "agent-usage-monitor-conversations"
    directory.mkdir(parents=True, exist_ok=True)
    session = re.sub(r"[^A-Za-z0-9._-]", "-", transcript.stem)[:120] or "session"
    destination_name = "{}-{}.md".format(provider, session)
    original_directory = os.open(".", os.O_RDONLY | os.O_DIRECTORY)
    conversation_directory: Optional[int] = None
    temporary_name = ""
    try:
        try:
            conversation_directory = os.open(
                str(directory), os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW
            )
        except OSError as error:
            raise ValueError("conversation directory leaves the project root") from error
        os.fchdir(conversation_directory)
        if Path.cwd().resolve() != directory:
            raise ValueError("conversation directory leaves the project root")
        os.fchmod(conversation_directory, 0o700)
        descriptor, temporary_path = tempfile.mkstemp(prefix=".conversation-", dir=".")
        temporary_name = Path(temporary_path).name
        os.fchmod(descriptor, 0o600)
        with os.fdopen(descriptor, "w", encoding="utf-8") as temporary:
            temporary.write(content)
        os.replace(temporary_name, destination_name)
        temporary_name = ""
        if Path.cwd().resolve() != directory:
            os.unlink(destination_name)
            raise ValueError("conversation directory changed during conversation write")
    finally:
        if temporary_name:
            try:
                os.unlink(temporary_name)
            except OSError:
                pass
        os.fchdir(original_directory)
        if conversation_directory is not None:
            os.close(conversation_directory)
        os.close(original_directory)
    return directory / destination_name


def _trusted_transcript_path(value: Any, provider: str) -> Optional[Path]:
    if not isinstance(value, str) or not value:
        return None
    roots = {
        "claude": Path.home() / ".claude" / "projects",
        "codex": Path.home() / ".codex" / "sessions",
    }
    root = roots.get(provider)
    if root is None:
        return None
    try:
        candidate = Path(value).expanduser().resolve()
        candidate.relative_to(root.resolve())
    except (OSError, ValueError):
        return None
    return candidate if candidate.suffix == ".jsonl" and candidate.is_file() else None


def command_viewer(args: argparse.Namespace) -> int:
    if args.provider == "claude":
        candidate = read_state(Path(args.state)).transcript_path
        transcript = _trusted_transcript_path(candidate, args.provider)
        records = _read_bounded_json_records(transcript) if transcript else []
    elif args.provider == "codex":
        session = newest_codex_session(args.started)
        candidate = str(session) if session else ""
        transcript = _trusted_transcript_path(candidate, args.provider)
        records = _read_bounded_json_records(transcript) if transcript else []
    else:
        unused, session_id, records = read_opencode_session(
            OPENCODE_DATABASE, OPENCODE_MODELS, Path(args.project_root), args.started
        )
        transcript = Path(session_id + ".json") if session_id else None
    document = _conversation_document(records, args.provider)
    content = _hard_wrap_markdown(_safe_viewer_text(document)) if document else "No conversation is available yet."
    if transcript is None:
        print("No trusted conversation transcript is available yet.", file=sys.stderr)
        return 2
    try:
        conversation = _write_conversation(args.project_root, transcript, args.provider, content)
    except (OSError, ValueError) as error:
        print("Could not save the conversation: {}".format(error), file=sys.stderr)
        return 2
    editor = _editor_command(str(conversation))
    if editor is None:
        print("Could not find Antigravity, VS Code, or Sublime Text.", file=sys.stderr)
        return 2
    subprocess.run(editor, check=False)
    return 0


def _read_bounded_json_records(path: Path) -> List[Dict[str, Any]]:
    """Sample a bounded head and tail, skipping partial or oversized JSONL lines."""
    try:
        size = path.stat().st_size
        with path.open("rb") as handle:
            if size <= MAX_JSONL_HEAD_BYTES + MAX_JSONL_TAIL_BYTES:
                chunks = [(handle.read(size), False)]
            else:
                head = handle.read(MAX_JSONL_HEAD_BYTES)
                handle.seek(max(0, size - MAX_JSONL_TAIL_BYTES))
                tail = handle.read(MAX_JSONL_TAIL_BYTES)
                chunks = [(head, False), (tail, True)]
    except OSError:
        return []

    records = []
    for chunk, starts_mid_file in chunks:
        lines = chunk.splitlines()
        if starts_mid_file and lines:
            lines = lines[1:]
        for line in lines:
            if len(records) >= MAX_JSONL_RECORDS:
                return records
            if not line or len(line) > MAX_JSONL_LINE_BYTES:
                continue
            try:
                value = json.loads(line.decode("utf-8", errors="replace"))
            except (UnicodeError, ValueError):
                continue
            if isinstance(value, dict):
                records.append(value)
    return records


def read_jsonl(path: Path) -> List[Dict[str, Any]]:
    records = []
    for value in _read_bounded_json_records(path):
        records.extend(sanitize_codex_records((value,)))
        if len(records) >= MAX_JSONL_RECORDS:
            break
    return records


def newest_codex_session(since: float = 0) -> Optional[Path]:
    candidates = [Path(path) for path in glob.glob(str(Path.home() / ".codex" / "sessions" / "**" / "*.jsonl"), recursive=True)]
    candidates = [path for path in candidates if path.stat().st_mtime >= since]
    return max(candidates, key=lambda path: path.stat().st_mtime) if candidates else None


def command_claude_status(args: argparse.Namespace) -> int:
    try:
        payload = json.load(sys.stdin)
    except ValueError:
        payload = {}
    payload = _mapping(payload)
    transcript = payload.get("transcript_path")
    resources = read_claude_resources(Path(transcript)) if isinstance(transcript, str) and transcript else []
    snapshot = parse_claude(payload, resources)
    write_state(Path(os.environ.get("AUM_STATE_FILE", str(DEFAULT_STATE))), snapshot)
    print(render_compact(snapshot, color=sys.stdout.isatty()))
    return 0


def command_watch(args: argparse.Namespace) -> int:
    state_path = Path(args.state)
    started = float(os.environ.get("AUM_STARTED_AT", "0"))
    view = {"resources_expanded": True, "resource_selected": 0, "resource_offset": 0}
    saved_conversation: Optional[Tuple[str, str]] = None
    opencode_resources = (
        read_opencode_resources(Path(args.project_root))
        if args.provider == "opencode"
        else None
    )

    def toggle_resources(signum: int, frame: Any) -> None:
        view["resources_expanded"] = not view["resources_expanded"]

    def previous_resource(signum: int, frame: Any) -> None:
        if view["resources_expanded"]:
            view["resource_selected"] = max(0, view["resource_selected"] - 1)

    def next_resource(signum: int, frame: Any) -> None:
        if view["resources_expanded"]:
            view["resource_selected"] += 1

    signal.signal(signal.SIGUSR1, toggle_resources)
    signal.signal(signal.SIGINFO, previous_resource)
    signal.signal(signal.SIGUSR2, next_resource)
    while True:
        transcript: Optional[Path] = None
        conversation_records: List[Dict[str, Any]] = []
        if args.provider == "claude":
            snapshot = read_state(state_path)
            transcript = _trusted_transcript_path(snapshot.transcript_path, "claude")
            conversation_records = _read_bounded_json_records(transcript) if transcript else []
        elif args.provider == "codex":
            session = newest_codex_session(started)
            codex_records = read_jsonl(session) if session else []
            configured_resources = read_codex_resources(Path(args.project_root), [])
            snapshot = parse_codex(
                codex_records,
                Path.cwd().name,
                _git_branch(str(Path.cwd())),
                configured_resources,
            )
            transcript = _trusted_transcript_path(str(session) if session else "", "codex")
            conversation_records = _read_bounded_json_records(transcript) if transcript else []
        else:
            snapshot, session_id, conversation_records = read_opencode_session(
                OPENCODE_DATABASE,
                OPENCODE_MODELS,
                Path(args.project_root),
                started,
                opencode_resources,
            )
            transcript = Path(session_id + ".json") if session_id else None
        if transcript:
            document = _conversation_document(conversation_records, args.provider)
            content = (
                _hard_wrap_markdown(_safe_viewer_text(document))
                if document
                else "No conversation is available yet."
            )
            current_conversation = (str(transcript), content)
            if current_conversation != saved_conversation:
                try:
                    _write_conversation(
                        args.project_root, transcript, args.provider, content
                    )
                except (OSError, ValueError):
                    pass
                else:
                    saved_conversation = current_conversation
        selected, offset, unused = _resource_view(
            snapshot.resources,
            view["resource_selected"],
            view["resource_offset"],
            8,
        )
        view["resource_selected"] = selected
        view["resource_offset"] = offset
        sys.stdout.write(
            "\033[2J\033[H"
            + render_sidebar(
                snapshot,
                resources_expanded=view["resources_expanded"],
                resource_selected=selected,
                resource_offset=offset,
            )
            + "\n"
        )
        sys.stdout.flush()
        time.sleep(1)


def _backup(path: Path) -> Optional[Path]:
    if not path.exists():
        return None
    backup = path.with_name("{}.aum-backup-{}".format(path.name, int(time.time())))
    shutil.copy2(str(path), str(backup))
    return backup


def _install_claude(script_path: Path) -> Optional[Path]:
    settings = Path.home() / ".claude" / "settings.json"
    settings.parent.mkdir(parents=True, exist_ok=True)
    backup = _backup(settings)
    try:
        data = json.loads(settings.read_text()) if settings.exists() else {}
    except ValueError as error:
        raise RuntimeError("Claude settings are not valid JSON; no changes made") from error
    data["statusLine"] = {
        "type": "command",
        "command": "{} claude-status".format(shlex.quote(str(script_path))),
        "refreshInterval": 2,
    }
    settings.write_text(json.dumps(data, indent=2) + "\n")
    return backup


def _install_codex() -> Optional[Path]:
    config = Path.home() / ".codex" / "config.toml"
    config.parent.mkdir(parents=True, exist_ok=True)
    original = config.read_text() if config.exists() else ""
    backup = _backup(config)
    status = "status_line = {}".format(json.dumps(CODEX_STATUS_ITEMS))
    lines = original.splitlines()
    tui_start = next((index for index, line in enumerate(lines) if line.strip() == "[tui]"), None)
    if tui_start is None:
        lines.extend(([""] if lines else []) + ["[tui]", status])
    else:
        end = next((index for index in range(tui_start + 1, len(lines)) if lines[index].lstrip().startswith("[")), len(lines))
        existing = next((index for index in range(tui_start + 1, end) if lines[index].strip().startswith("status_line")), None)
        if existing is None:
            lines.insert(end, status)
        else:
            lines[existing] = status
    config.write_text("\n".join(lines) + "\n")
    return backup


def command_install(args: argparse.Namespace) -> int:
    INSTALL_PATH.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(str(Path(__file__).resolve()), str(INSTALL_PATH))
    os.chmod(str(INSTALL_PATH), 0o755)
    backups = [_install_claude(INSTALL_PATH), _install_codex()]
    print("Installed {}".format(INSTALL_PATH))
    for backup in backups:
        if backup:
            print("Backup: {}".format(backup))
    print("Compact status is configured. Run 'agent-usage-monitor launch claude|codex' for the sidebar.")
    return 0


def _tmux_args(socket: str, *arguments: str) -> List[str]:
    if not re.fullmatch(r"aum-[1-9][0-9]{0,9}", socket):
        raise RuntimeError("invalid isolated tmux socket name")
    return ["tmux", "-L", socket] + list(arguments)


def _validated_pane_pid(value: str) -> str:
    candidate = value.strip()
    if not re.fullmatch(r"[1-9][0-9]{0,9}", candidate):
        raise RuntimeError("tmux returned an invalid pane PID")
    if int(candidate) > 2_147_483_647:
        raise RuntimeError("tmux returned an out-of-range pane PID")
    return candidate


def _mouse_binding(pane: str, pane_pid: str) -> List[str]:
    if not re.fullmatch(r"%[1-9][0-9]{0,9}", pane):
        raise RuntimeError("tmux returned an invalid pane identifier")
    pid = _validated_pane_pid(pane_pid)
    hovered = "#{==:#{mouse_pane},%s}" % pane
    header = "#{==:#{mouse_y},0}"
    focus_dashboard = (
        "select-pane -t= ; bind-key -n Up run-shell 'kill -INFO {0}' ; "
        "bind-key -n Down run-shell 'kill -USR2 {0}'"
    ).format(pid)
    toggle_and_focus = "run-shell 'kill -USR1 {}' ; {}".format(pid, focus_dashboard)
    focus_sidebar = "if-shell -F {} {} {}".format(
        shlex.quote(header), shlex.quote(toggle_and_focus), shlex.quote(focus_dashboard)
    )
    focus_agent = "unbind-key -n Up ; unbind-key -n Down ; select-pane -t="
    return [
        "bind-key",
        "-n",
        "MouseDown1Pane",
        "if-shell",
        "-F",
        hovered,
        focus_sidebar,
        focus_agent,
    ]


def _navigation_bindings(pane: str, pane_pid: str) -> List[List[str]]:
    if not re.fullmatch(r"%[1-9][0-9]{0,9}", pane):
        raise RuntimeError("tmux returned an invalid pane identifier")
    pid = _validated_pane_pid(pane_pid)
    focused = "#{==:#{pane_id},%s}" % pane
    hovered = "#{==:#{mouse_pane},%s}" % pane
    return [
        ["bind-key", "-n", "Escape", "if-shell", "-F", focused, "unbind-key -n Up ; unbind-key -n Down ; select-pane -L", "send-keys Escape"],
        ["bind-key", "-n", "WheelUpPane", "if-shell", "-F", hovered, "run-shell 'kill -INFO {}'".format(pid), "if-shell -F '#{pane_in_mode}' 'send-keys -M' 'copy-mode -e ; send-keys -M'"],
        ["bind-key", "-n", "WheelDownPane", "if-shell", "-F", hovered, "run-shell 'kill -USR2 {}'".format(pid), "send-keys -M"],
    ]


def _copy_bindings() -> List[List[str]]:
    return [
        ["bind-key", "-T", "copy-mode", "MouseDragEnd1Pane", "send-keys", "-X", "copy-pipe-and-cancel", "pbcopy"],
        ["bind-key", "-T", "copy-mode", "Enter", "send-keys", "-X", "copy-pipe-and-cancel", "pbcopy"],
    ]


def _write_log_filter(path: Path) -> None:
    path.write_text(
        "import sys, re\n"
        "ANSI = re.compile(rb'\\x1b(?:\\[[0-9;?]*[A-Za-z]|\\][^\\x07]*\\x07|.)')\n"
        "inp = sys.stdin.buffer; out = sys.stdout.buffer\n"
        "cur = b''; cr = False\n"
        "for chunk in iter(lambda: inp.read(256), b''):\n"
        "    for b in ANSI.sub(b'', chunk):\n"
        "        if cr:\n"
        "            cr = False\n"
        "            if b == 10:\n"
        "                if cur.strip(): out.write(cur + b'\\n'); out.flush()\n"
        "                cur = b''; continue\n"
        "            cur = b''\n"
        "        if b == 13: cr = True\n"
        "        elif b == 10:\n"
        "            if cur.strip(): out.write(cur + b'\\n'); out.flush()\n"
        "            cur = b''\n"
        "        else: cur += bytes([b])\n"
    )


def _scroll_viewer_bindings(pane: str, viewer_command: str) -> List[List[str]]:
    if not re.fullmatch(r"%[1-9][0-9]{0,9}", pane):
        raise RuntimeError("tmux returned an invalid pane identifier")
    hovered = "#{==:#{mouse_pane},%s}" % pane
    focused = "#{==:#{pane_id},%s}" % pane
    open_editor = "run-shell -b {}".format(shlex.quote(viewer_command))
    return [
        ["bind-key", "-n", "DoubleClick1Pane", "if-shell", "-F", hovered, "select-pane -t=", open_editor],
        ["bind-key", "-n", "PageUp", "if-shell", "-F", focused, "send-keys PageUp", open_editor],
    ]


def command_launch(args: argparse.Namespace) -> int:
    if shutil.which("tmux") is None:
        print("tmux is required for the sidebar: brew install tmux", file=sys.stderr)
        return 2
    state = Path.home() / "Library" / "Caches" / "agent-usage-monitor" / "{}.json".format(os.getpid())
    session = "aum-{}-{}".format(args.provider, os.getpid())
    socket = "aum-{}".format(os.getpid())
    started = time.time()
    environment = ["env", "AUM_STATE_FILE={}".format(state), "AUM_STARTED_AT={}".format(started)]
    cli = [args.provider] + args.cli_args
    project_root = str(Path.cwd().resolve())
    watch = [
        str(Path(__file__).resolve()),
        "watch",
        args.provider,
        "--state",
        str(state),
        "--project-root",
        project_root,
    ]
    cli_command = " ".join(shlex.quote(value) for value in environment + cli)
    watch_command = "exec " + " ".join(shlex.quote(value) for value in environment + watch)
    subprocess.run(_tmux_args(socket, "new-session", "-d", "-s", session, "-c", str(Path.cwd()), cli_command), check=True)
    split = subprocess.run(
        _tmux_args(socket, "split-window", "-h", "-l", "34", "-P", "-F", "#{pane_id}", "-t", session, "-c", str(Path.cwd()), watch_command),
        stdout=subprocess.PIPE,
        text=True,
        check=True,
    )
    pane = split.stdout.strip()
    pane_pid = _validated_pane_pid(subprocess.run(
        _tmux_args(socket, "display-message", "-p", "-t", pane, "#{pane_pid}"),
        stdout=subprocess.PIPE,
        text=True,
        check=True,
    ).stdout)
    subprocess.run(_tmux_args(socket, "set-option", "-g", "mouse", "on"), check=True)
    subprocess.run(_tmux_args(socket, "set-option", "-g", "history-limit", "50000"), check=True)
    subprocess.run(_tmux_args(socket, *_mouse_binding(pane, pane_pid)), check=True)
    for binding in _navigation_bindings(pane, pane_pid):
        subprocess.run(_tmux_args(socket, *binding), check=True)
    for binding in _copy_bindings():
        subprocess.run(_tmux_args(socket, *binding), check=True)
    viewer_command = " ".join(
        shlex.quote(value)
        for value in (
            str(Path(__file__).resolve()),
            "viewer",
            args.provider,
            "--state",
            str(state),
            "--started",
            str(started),
            "--project-root",
            project_root,
        )
    )
    for binding in _scroll_viewer_bindings(pane, viewer_command):
        subprocess.run(_tmux_args(socket, *binding), check=True)
    subprocess.run(_tmux_args(socket, "select-pane", "-t", "{}:0.0".format(session)), check=True)
    return subprocess.run(_tmux_args(socket, "attach-session", "-t", session), check=False).returncode


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--version", action="version", version=VERSION)
    commands = parser.add_subparsers(dest="command")
    commands.required = True
    commands.add_parser("install").set_defaults(func=command_install)
    commands.add_parser("claude-status").set_defaults(func=command_claude_status)
    viewer = commands.add_parser("viewer")
    viewer.add_argument("provider", choices=("claude", "codex", "opencode"))
    viewer.add_argument("--state", default=str(DEFAULT_STATE))
    viewer.add_argument("--started", type=float, default=0)
    viewer.add_argument("--project-root", default=str(Path.cwd()))
    viewer.set_defaults(func=command_viewer)
    watch = commands.add_parser("watch")
    watch.add_argument("provider", choices=("claude", "codex", "opencode"))
    watch.add_argument("--state", default=str(DEFAULT_STATE))
    watch.add_argument("--project-root", default=str(Path.cwd()))
    watch.set_defaults(func=command_watch)
    launch = commands.add_parser("launch")
    launch.add_argument("provider", choices=("claude", "codex", "opencode"))
    launch.add_argument("cli_args", nargs=argparse.REMAINDER)
    launch.set_defaults(func=command_launch)
    return parser


def main() -> int:
    args = build_parser().parse_args()
    try:
        return args.func(args)
    except KeyboardInterrupt:
        return 130


if __name__ == "__main__":
    sys.exit(main())
