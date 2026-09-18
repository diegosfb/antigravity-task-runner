#!/usr/bin/env python3
"""
Generate a log generation plan by scanning a codebase for common entrypoints,
HTTP routing, and error-handling patterns. Outputs JSON to stdout or a file.

Usage:
  generate_log_plan.py --root . --out log-generation-plan.json
"""

import argparse
import json
import re
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

MAX_FILE_BYTES = 512 * 1024

EXTS = {".cs", ".java", ".js", ".jsx", ".ts", ".tsx", ".py"}
IGNORE_DIRS = {
    ".git",
    "node_modules",
    "dist",
    "build",
    "bin",
    "obj",
    "target",
    "out",
    ".venv",
    "venv",
    ".mypy_cache",
    ".pytest_cache",
    ".next",
    ".nuxt",
    ".svelte-kit",
    ".terraform",
}

REQUIRED_FIELDS = ["timestamp", "level", "message", "service", "env"]
RECOMMENDED_FIELDS = [
    "request_id",
    "trace_id",
    "span_id",
    "route",
    "method",
    "status_code",
    "latency_ms",
    "error",
    "stack",
]


@dataclass
class Pattern:
    event: str
    reason: str
    level: str
    message: str
    regex: re.Pattern
    once_per_file: bool = True


def compile_patterns() -> List[Pattern]:
    return [
        Pattern(
            "startup",
            "Node server start",
            "INFO",
            "Service started",
            re.compile(r"\b(app|server)\.listen\(", re.IGNORECASE),
        ),
        Pattern(
            "startup",
            "Python server start",
            "INFO",
            "Service started",
            re.compile(r"\b(uvicorn|gunicorn)\.run\(", re.IGNORECASE),
        ),
        Pattern(
            "startup",
            "Flask or FastAPI app run",
            "INFO",
            "Service started",
            re.compile(r"\bapp\.run\(", re.IGNORECASE),
        ),
        Pattern(
            "startup",
            "Java Spring Boot start",
            "INFO",
            "Service started",
            re.compile(r"\bSpringApplication\.run\(", re.IGNORECASE),
        ),
        Pattern(
            "startup",
            ".NET app builder",
            "INFO",
            "Service starting",
            re.compile(r"\bWebApplication\.CreateBuilder\(", re.IGNORECASE),
        ),
        Pattern(
            "startup",
            "Java main entrypoint",
            "INFO",
            "Application start",
            re.compile(r"public\s+static\s+void\s+main\s*\(", re.IGNORECASE),
        ),
        Pattern(
            "http_request",
            "HTTP route definitions detected",
            "INFO",
            "HTTP request",
            re.compile(
                r"\b(app|router)\.(get|post|put|delete|patch)\(|\bMap(Get|Post|Put|Delete|Patch)\(|@GetMapping|@PostMapping|@RequestMapping",
                re.IGNORECASE,
            ),
        ),
        Pattern(
            "http_error",
            "Error handling middleware or handlers detected",
            "ERROR",
            "HTTP error",
            re.compile(
                r"\b(err,\s*req,\s*res,\s*next|ExceptionHandler|@ExceptionHandler)",
                re.IGNORECASE,
            ),
        ),
        Pattern(
            "error",
            "Try/catch or exception handling detected",
            "ERROR",
            "Unhandled exception",
            re.compile(r"\bcatch\s*\(|\bexcept\s+", re.IGNORECASE),
        ),
    ]


def iter_files(root: Path) -> Iterable[Path]:
    for path in root.rglob("*"):
        if path.is_dir():
            continue
        if path.suffix.lower() in EXTS:
            if any(part in IGNORE_DIRS for part in path.parts):
                continue
            yield path


def read_text(path: Path) -> Optional[str]:
    try:
        if path.stat().st_size > MAX_FILE_BYTES:
            return None
        return path.read_text(errors="ignore")
    except Exception:
        return None


def find_upwards(start: Path, root: Path, names: Sequence[str]) -> Optional[Path]:
    current = start
    while True:
        for name in names:
            candidate = current / name
            if candidate.exists():
                return candidate
        if current == root:
            return None
        if current.parent == current:
            return None
        current = current.parent


def find_upwards_glob(start: Path, root: Path, pattern: str) -> Optional[Path]:
    current = start
    while True:
        matches = list(current.glob(pattern))
        if matches:
            return matches[0]
        if current == root:
            return None
        if current.parent == current:
            return None
        current = current.parent


def infer_service_name(path: Path, root: Path) -> str:
    pkg = find_upwards(path.parent, root, ["package.json"])
    if pkg:
        try:
            data = json.loads(pkg.read_text(errors="ignore"))
            if isinstance(data, dict) and isinstance(data.get("name"), str):
                return data["name"].strip() or pkg.parent.name
        except Exception:
            pass

    csproj = find_upwards_glob(path.parent, root, "*.csproj")
    if not csproj:
        for candidate in path.parent.rglob("*.csproj"):
            csproj = candidate
            break
    if csproj:
        return csproj.stem

    pom = find_upwards(path.parent, root, ["pom.xml"])
    if pom and pom.exists():
        try:
            text = pom.read_text(errors="ignore")
            match = re.search(r"<artifactId>([^<]+)</artifactId>", text)
            if match:
                return match.group(1).strip()
        except Exception:
            pass

    return path.parent.name or root.name


def build_template(event: str, level: str, message: str, service: str) -> Dict[str, str]:
    template: Dict[str, str] = {
        "timestamp": "<auto>",
        "level": level,
        "message": message,
        "service": service,
        "env": "${ENV}",
        "event": event,
    }

    if event in {"http_request", "http_error"}:
        template.update(
            {
                "request_id": "${request_id}",
                "trace_id": "${trace_id}",
                "span_id": "${span_id}",
                "route": "${route}",
                "method": "${method}",
                "status_code": "${status_code}",
                "latency_ms": "${latency_ms}",
            }
        )

    if event in {"error", "http_error"}:
        template.update({"error": "${error}", "stack": "${stack}"})

    return template


def generate_entries(root: Path) -> List[Dict[str, object]]:
    patterns = compile_patterns()
    entries: List[Dict[str, object]] = []
    seen: set[Tuple[str, str]] = set()

    for file_path in iter_files(root):
        content = read_text(file_path)
        if not content:
            continue

        rel = str(file_path.relative_to(root))
        service = infer_service_name(file_path, root)
        lines = content.splitlines()

        for index, line in enumerate(lines, start=1):
            for pattern in patterns:
                if pattern.regex.search(line):
                    key = (rel, pattern.event)
                    if pattern.once_per_file and key in seen:
                        continue
                    seen.add(key)
                    entry = {
                        "id": f"{pattern.event}:{rel}:{index}",
                        "file": rel,
                        "line": index,
                        "event": pattern.event,
                        "reason": pattern.reason,
                        "level": pattern.level,
                        "message": pattern.message,
                        "service": service,
                        "required_fields": REQUIRED_FIELDS,
                        "recommended_fields": RECOMMENDED_FIELDS,
                        "template": build_template(
                            pattern.event, pattern.level, pattern.message, service
                        ),
                    }
                    entries.append(entry)

    return entries


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate a log generation plan.")
    parser.add_argument("--root", default=".", help="Repo root to scan")
    parser.add_argument("--out", help="Write JSON output to file")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    if not root.exists() or not root.is_dir():
        print(f"[ERROR] Root not found: {root}", file=sys.stderr)
        return 2

    entries = generate_entries(root)
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "root": str(root),
        "entry_count": len(entries),
        "entries": entries,
    }

    output = json.dumps(payload, indent=2)
    if args.out:
        Path(args.out).write_text(output)
    else:
        print(output)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
