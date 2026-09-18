#!/usr/bin/env python3
"""Cross-harness Obsidian vault event and artifact recorder."""

import argparse
import json
import os
import re
import shutil
import sys
import unicodedata
from datetime import datetime
from pathlib import Path


ARTIFACT_AREAS = (
    ("docs/project_description/PRD.md", "PRD", True),
    ("docs/specs", "Specs", False),
    ("docs/architecture/adrs", "ADRs", False),
    ("docs/architecture", "Architecture", False),
    ("docs/backlog", "Backlog", False),
    ("docs/estimation", "Estimation", False),
    ("docs/ux", "UX", False),
    ("docs/reviews", "Reviews", False),
    ("docs/test-cases", "Test-Cases", False),
    ("docs/tests", "Test-Cases", False),
    ("docs/context_history", "Context-History", False),
)
LIFECYCLE_VERBS = {
    "SessionStart": "session started",
    "SessionEnd": "session ended",
    "SubagentStart": "started",
    "SubagentStop": "completed",
    "BeforeAgent": "started",
    "AfterAgent": "completed",
    "Stop": "session ended",
}
PLATFORM_NAMES = {"claude": "Claude", "codex": "Codex", "gemini": "Gemini"}


class VaultError(Exception):
    pass


def utc_now():
    return datetime.utcnow()


def slugify(value):
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii").lower()
    return re.sub(r"[^a-z0-9]+", "-", ascii_value).strip("-")[:80] or "note"


def redact(value):
    value = re.sub(
        r"(?i)\b(api[_-]?key|token|password|passwd|secret)\s*[:=]\s*[^\s,;]+",
        lambda match: "{}=[REDACTED]".format(match.group(1)),
        value,
    )
    value = re.sub(r"(?i)\bBearer\s+[A-Za-z0-9._~+/=-]+", "Bearer [REDACTED]", value)
    return re.sub(
        r"-----BEGIN [^-]+ PRIVATE KEY-----.*?-----END [^-]+ PRIVATE KEY-----",
        "[REDACTED PRIVATE KEY]",
        value,
        flags=re.DOTALL,
    )


class VaultRecorder:
    def __init__(self, root):
        self.root = Path(root).resolve()
        config_path = self.root / "ADLC_workflow_settings.json"
        try:
            config = json.loads(config_path.read_text(encoding="utf-8"))
        except (OSError, ValueError) as error:
            raise VaultError("invalid configuration {}: {}".format(config_path, error))
        settings = config.get("obsidian_vault", {})
        self.enabled = settings.get("enabled") is True
        vault_path = settings.get("vault_path", "")
        if self.enabled and not vault_path:
            raise VaultError("obsidian_vault.vault_path is required when enabled")
        self.vault = (
            Path(vault_path).resolve()
            if os.path.isabs(vault_path)
            else (self.root / vault_path).resolve()
        )
        self.link_mode = settings.get("link_mode", "symlink")
        if self.link_mode not in ("symlink", "copy"):
            raise VaultError("obsidian_vault.link_mode must be symlink or copy")

    def ensure_skeleton(self):
        if not self.enabled:
            return
        for area in (
            "PRD",
            "Specs",
            "Architecture",
            "ADRs",
            "Backlog",
            "Estimation",
            "UX",
            "Reviews",
            "Implementation-Plans",
            "Notes",
            "Test-Cases",
            "Context-History",
            "Action-Log",
        ):
            (self.vault / area).mkdir(parents=True, exist_ok=True)
        index = self.vault / "00-index.md"
        if not index.exists():
            index.write_text(
                "# Design Vault\n\n## Knowledge notes\n\n## Areas\n\n"
                "PRD · Specs · Architecture · ADRs · Backlog · Estimation · UX · "
                "Reviews · Implementation-Plans · Notes · Test-Cases · "
                "Context-History · Action-Log\n",
                encoding="utf-8",
            )
        self.migrate_legacy_plans(index)

    def migrate_legacy_plans(self, index):
        notes = self.vault / "Notes"
        plans = self.vault / "Implementation-Plans"
        if not notes.is_dir():
            return
        index_content = index.read_text(encoding="utf-8")
        index_changed = False
        for source in notes.glob("*.md"):
            header = source.read_text(encoding="utf-8")[:512]
            if not re.search(r'^kind:\s*["\']?plan["\']?\s*$', header, re.MULTILINE):
                continue
            target = plans / source.name
            if target.exists():
                continue
            source.replace(target)
            old_link = "[[Notes/{}]]".format(source.stem)
            new_link = "[[Implementation-Plans/{}]]".format(source.stem)
            if old_link in index_content:
                index_content = index_content.replace(old_link, new_link)
                index_changed = True
        if index_changed:
            index.write_text(index_content, encoding="utf-8")

    def artifact_target(self, artifact):
        artifact = Path(artifact).resolve()
        try:
            relative = artifact.relative_to(self.root).as_posix()
        except ValueError:
            return None
        for prefix, area, exact in ARTIFACT_AREAS:
            if exact and relative == prefix:
                return self.vault / area / artifact.name
            if not exact and (relative == prefix or relative.startswith(prefix + "/")):
                tail = relative[len(prefix) :].lstrip("/")
                return self.vault / area / tail
        return None

    def sync(self, artifact, log=True):
        if not self.enabled:
            return None
        artifact = Path(artifact).resolve()
        if not artifact.is_file() or self.vault in artifact.parents:
            return None
        target = self.artifact_target(artifact)
        if target is None:
            return None
        self.ensure_skeleton()
        target.parent.mkdir(parents=True, exist_ok=True)
        if self.link_mode == "copy":
            if target.is_symlink():
                target.unlink()
            shutil.copy2(str(artifact), str(target))
        else:
            relative_source = os.path.relpath(str(artifact), str(target.parent))
            temporary = target.with_name(target.name + ".tmp-link")
            if temporary.exists() or temporary.is_symlink():
                temporary.unlink()
            temporary.symlink_to(relative_source)
            os.replace(str(temporary), str(target))
        link = self.vault_link(target)
        self.add_to_index(link, "synced artifact")
        if log:
            self.append_action("synced `{}` as [[{}]]".format(
                artifact.relative_to(self.root).as_posix(), link
            ))
        return target

    def vault_link(self, target):
        return target.relative_to(self.vault).with_suffix("").as_posix()

    def add_to_index(self, link, label):
        index = self.vault / "00-index.md"
        marker = "[[{}]]".format(link)
        content = index.read_text(encoding="utf-8")
        if marker not in content:
            with index.open("a", encoding="utf-8") as output:
                output.write("\n- {} — {}\n".format(marker, label))

    def sync_all(self):
        if not self.enabled:
            return 0
        synced_targets = set()
        for prefix, _area, exact in ARTIFACT_AREAS:
            source = self.root / prefix
            candidates = [source] if exact else source.rglob("*") if source.exists() else []
            for artifact in candidates:
                if artifact.is_file():
                    target = self.sync(artifact, log=False)
                    if target:
                        synced_targets.add(target)
        if synced_targets:
            self.append_action(
                "reconciled {} design artifact(s)".format(len(synced_targets))
            )
        return len(synced_targets)

    def append_action(self, message, timestamp=None):
        if not self.enabled:
            return None
        self.ensure_skeleton()
        timestamp = timestamp or utc_now()
        log = self.vault / "Action-Log" / (timestamp.strftime("%Y-%m-%d") + ".md")
        if not log.exists():
            log.write_text(
                "# Action log — {}\n\n".format(timestamp.strftime("%Y-%m-%d")),
                encoding="utf-8",
            )
        with log.open("a", encoding="utf-8") as output:
            output.write("- {} · {}\n".format(timestamp.strftime("%H:%M"), redact(message)))
        return log

    def record_lifecycle(self, payload, platform):
        event = payload.get("hook_event_name") or payload.get("event_name") or ""
        verb = LIFECYCLE_VERBS.get(event)
        if not verb or not self.enabled:
            return
        agent = payload.get("agent_type") or payload.get("agent_name") or "agent"
        session = payload.get("session_id") or payload.get("thread_id")
        suffix = " (session `{}`)".format(session) if session else ""
        self.append_action(
            "**{}** `{}` {}{}".format(
                PLATFORM_NAMES.get(platform, platform.title()), agent, verb, suffix
            )
        )

    def record_note(self, kind, summary, details, agent, artifacts):
        if not self.enabled:
            return None
        self.ensure_skeleton()
        timestamp = utc_now()
        safe_summary = redact(summary)
        safe_details = redact(details or "")
        area = "Implementation-Plans" if kind == "plan" else "Notes"
        note = self.vault / area / (
            "{}-{}-{}.md".format(timestamp.strftime("%Y%m%dT%H%M%S%fZ"), slugify(kind), slugify(summary))
        )
        links = []
        for artifact in artifacts:
            target = self.sync(artifact, log=False)
            if target:
                links.append("[[{}]]".format(self.vault_link(target)))
        content = [
            "---",
            "kind: {}".format(json.dumps(kind)),
            "date: {}".format(timestamp.strftime("%Y-%m-%dT%H:%M:%SZ")),
            "agent: {}".format(json.dumps(agent)),
            "---",
            "",
            "# {}".format(safe_summary),
            "",
            safe_details or "No additional details supplied.",
            "",
            "## Related artifacts",
            "",
            " · ".join(links) if links else "None supplied.",
            "",
        ]
        note.write_text("\n".join(content), encoding="utf-8")
        self.add_to_index("{}/{}".format(area, note.stem), safe_summary)
        self.append_action(
            "**{}** recorded {} [[{}]] related to {}".format(
                agent, kind, note.stem, " · ".join(links) if links else "no artifact"
            ),
            timestamp,
        )
        return note


def find_root(start):
    current = Path(start).resolve()
    if current.is_file():
        current = current.parent
    for candidate in (current,) + tuple(current.parents):
        if (candidate / "ADLC_workflow_settings.json").is_file():
            return candidate
    raise VaultError("no ADLC_workflow_settings.json found from {}".format(start))


def extract_artifact(payload):
    tool_input = payload.get("tool_input") or payload.get("toolInput") or {}
    for key in ("file_path", "path", "file", "plan_path"):
        value = tool_input.get(key)
        if isinstance(value, str) and value:
            return value
    return None


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path)
    subparsers = parser.add_subparsers(dest="command", required=True)
    sync = subparsers.add_parser("sync")
    sync.add_argument("artifact")
    hook = subparsers.add_parser("hook")
    hook.add_argument("--platform", choices=sorted(PLATFORM_NAMES), default="claude")
    record = subparsers.add_parser("record")
    record.add_argument("--kind", required=True, choices=(
        "lesson", "design-decision", "approach", "issue", "problem",
        "trade-off", "product-decision", "adr", "spec", "implementation-note",
        "plan",
    ))
    record.add_argument("--summary", required=True)
    record.add_argument("--details", default="")
    record.add_argument("--details-file", type=Path)
    record.add_argument("--agent", required=True)
    record.add_argument("--artifact", action="append", default=[])
    return parser.parse_args()


def main():
    args = parse_args()
    payload = {}
    artifact = getattr(args, "artifact", None)
    if args.command == "hook":
        try:
            payload = json.load(sys.stdin)
        except ValueError as error:
            raise VaultError("invalid hook JSON: {}".format(error))
        artifact = extract_artifact(payload)
    root = args.root or find_root(artifact or payload.get("cwd") or Path.cwd())
    recorder = VaultRecorder(root)
    if args.command == "sync":
        recorder.sync(args.artifact)
    elif args.command == "hook":
        if artifact:
            recorder.sync(artifact)
        recorder.record_lifecycle(payload, args.platform)
        event = payload.get("hook_event_name") or payload.get("event_name")
        if event in ("SessionEnd", "Stop"):
            recorder.sync_all()
    else:
        details = (
            args.details_file.read_text(encoding="utf-8")
            if args.details_file
            else args.details
        )
        note = recorder.record_note(
            args.kind, args.summary, details, args.agent, args.artifact
        )
        if note:
            print(str(note.resolve()))


if __name__ == "__main__":
    try:
        main()
    except (OSError, VaultError) as error:
        print("vault-event: {}".format(error), file=sys.stderr)
        sys.exit(1)
