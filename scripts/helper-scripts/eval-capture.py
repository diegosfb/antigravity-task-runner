#!/usr/bin/env python3
"""Capture redaction-safe, observable agent evidence across supported harnesses."""

import argparse
import json
import os
from pathlib import Path, PurePosixPath
import re
import sys
import tempfile


PLATFORMS = ("claude", "codex", "gemini", "opencode")
SESSION_KEYS = ("session_id", "sessionID", "sessionId", "conversation_id")
AGENT_KEYS = ("agent_type", "agent_name", "agent", "subagent_type")
PATH_KEYS = ("file_path", "path", "file")
END_EVENTS = ("stop", "sessionend", "session.end", "session.idle", "afteragent")
ARTIFACT_PREFIXES = (
    ("docs/project_description/", "prd"),
    ("docs/specs/", "specs"),
    ("docs/ux/", "ux-designs"),
    ("docs/UX Designs/", "ux-designs"),
    ("docs/architecture/adrs/", "adrs"),
    ("docs/architecture/", "architecture-doc"),
    ("docs/backlog/", "task-backlog"),
    ("docs/implementation-plans/", "implementation-plan"),
    ("docs/test-cases/", "test-scripts"),
    ("docs/tests/", "test-scripts"),
    ("docs/reviews/", "review"),
)


class CaptureError(Exception):
    pass


def safe_identifier(value, fallback):
    if not isinstance(value, str):
        return fallback
    cleaned = re.sub(r"[^A-Za-z0-9._:-]+", "-", value).strip("-.")
    return cleaned[:160] or fallback


def first_string(payload, keys):
    for key in keys:
        value = payload.get(key)
        if isinstance(value, str) and value:
            return value
    return None


def event_name(payload):
    return first_string(payload, ("hook_event_name", "event_name", "event", "type")) or "unknown"


def repository_path(root, value):
    if not isinstance(value, str) or not value:
        return None
    candidate = Path(value)
    resolved = candidate.resolve() if candidate.is_absolute() else (root / candidate).resolve()
    try:
        relative = resolved.relative_to(root).as_posix()
    except ValueError:
        return None
    parts = PurePosixPath(relative).parts
    if not parts or any(part == ".env" or part.startswith(".env.") for part in parts):
        return None
    return relative


def observed_paths(root, payload):
    candidates = []
    tool_input = payload.get("tool_input")
    if not isinstance(tool_input, dict):
        tool_input = payload.get("args")
    if isinstance(tool_input, dict):
        candidates.extend(tool_input.get(key) for key in PATH_KEYS)
    candidates.extend(payload.get(key) for key in PATH_KEYS)
    paths = []
    for candidate in candidates:
        path = repository_path(root, candidate)
        if path and path not in paths:
            paths.append(path)
    return paths


def artifact_type(path):
    for prefix, name in ARTIFACT_PREFIXES:
        if path.startswith(prefix):
            return name
    return None


def default_evidence(identifier):
    return {
        "id": identifier,
        "approval_requested": False,
        "changed_files": [],
        "artifacts": [],
        "agent_sequence": [],
        "artifact_types": [],
        "handoffs": [],
        "gates": [],
    }


class EvidenceCapture:
    def __init__(self, root, platform):
        self.root = Path(root).resolve()
        self.platform = platform
        config_path = self.root / "ADLC_workflow_settings.json"
        try:
            config = json.loads(config_path.read_text(encoding="utf-8"))
        except (OSError, ValueError) as error:
            raise CaptureError("invalid configuration {}: {}".format(config_path, error))
        settings = config.get("eval_capture", {})
        self.enabled = settings.get("enabled") is True
        if not self.enabled:
            self.output_dir = None
            return
        output_value = settings.get("output_dir", "tmp/evals/evidence")
        if not isinstance(output_value, str):
            raise CaptureError("eval_capture.output_dir must be a string")
        output_path = PurePosixPath(output_value)
        if output_path.is_absolute() or ".." in output_path.parts or not output_path.parts:
            raise CaptureError("eval_capture.output_dir must be repository-relative")
        if output_path.parts[0] != "tmp":
            raise CaptureError("eval_capture.output_dir must be under tmp/")
        self.output_dir = (self.root / output_path).resolve()
        try:
            resolved_output = self.output_dir.relative_to(self.root)
        except ValueError:
            raise CaptureError("eval_capture.output_dir resolves outside the repository")
        if not resolved_output.parts or resolved_output.parts[0] != "tmp":
            raise CaptureError("eval_capture.output_dir must resolve under tmp/")

    def capture(self, payload):
        if not self.enabled:
            return
        session = safe_identifier(
            first_string(payload, SESSION_KEYS) or os.environ.get("ADLC_SESSION_ID"),
            "unknown-session",
        )
        default_id = "{}-{}".format(self.platform, session)
        identifier = safe_identifier(
            os.environ.get("ADLC_EVAL_CASE_ID") or payload.get("case_id"),
            default_id,
        )
        self.output_dir.mkdir(parents=True, exist_ok=True)
        evidence_path = self.output_dir / "{}-{}.jsonl".format(self.platform, session)
        evidence = default_evidence(identifier)
        if evidence_path.is_file():
            try:
                loaded = json.loads(evidence_path.read_text(encoding="utf-8"))
                if isinstance(loaded, dict):
                    evidence.update(loaded)
            except (OSError, ValueError):
                pass
        evidence["id"] = identifier

        event = event_name(payload).lower()
        agent = first_string(payload, AGENT_KEYS)
        if agent and (
            "agentstart" in event
            or "subagentstart" in event
            or event in ("beforeagent", "chat.message", "agent.start")
            or payload.get("capture_kind") == "agent_start"
        ):
            agent = safe_identifier(agent, "")
            if agent:
                evidence.setdefault("selected_agent", agent)
                evidence["agent_sequence"].append(agent)

        for path in observed_paths(self.root, payload):
            if path not in evidence["changed_files"]:
                evidence["changed_files"].append(path)
            if path not in evidence["artifacts"]:
                evidence["artifacts"].append(path)
            kind = artifact_type(path)
            if kind and kind not in evidence["artifact_types"]:
                evidence["artifact_types"].append(kind)

        if payload.get("approval_requested") is True:
            evidence["approval_requested"] = True
        if event in END_EVENTS:
            evidence["outcome"] = "completed"
        self.write_atomic(evidence_path, evidence)

    def write_atomic(self, path, evidence):
        descriptor, temporary_name = tempfile.mkstemp(
            prefix=path.name + ".", suffix=".tmp", dir=str(path.parent)
        )
        try:
            with os.fdopen(descriptor, "w", encoding="utf-8") as output:
                output.write(json.dumps(evidence, sort_keys=True) + "\n")
            os.replace(temporary_name, str(path))
        finally:
            if os.path.exists(temporary_name):
                os.unlink(temporary_name)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path.cwd())
    subparsers = parser.add_subparsers(dest="command", required=True)
    hook = subparsers.add_parser("hook")
    hook.add_argument("--platform", choices=PLATFORMS, required=True)
    args = parser.parse_args()
    try:
        payload = json.load(sys.stdin)
        if not isinstance(payload, dict):
            raise CaptureError("hook payload must be an object")
        EvidenceCapture(args.root, args.platform).capture(payload)
    except (CaptureError, OSError, ValueError) as error:
        print("eval-capture: {}".format(error), file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
