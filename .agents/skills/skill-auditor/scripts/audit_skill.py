#!/usr/bin/env python3
"""
audit_skill.py — Deterministic guideline checks for installed skills.

Usage:
    python3 audit_skill.py <path>            # <path> = one skill dir OR a root folder of skills
    python3 audit_skill.py <path> --json     # machine-readable output

Checks performed per skill:
  1. Frontmatter present with `name` and `description`
  2. Description length <= 1024 characters
  3. SKILL.md line count < 500 (also reports total lines across all text files in the skill)
  4. Reference integrity: every relative path mentioned in SKILL.md (and in files
     under references/) exists on disk
  5. Orphan detection: bundled files (scripts/, references/, assets/) that are never
     mentioned in SKILL.md or any reference file

Exit code: 0 if all skills pass, 1 if any FAIL-level issue found.
"""

import json
import os
import re
import sys

DESC_LIMIT = 1024
LINE_LIMIT = 500

TEXT_EXTS = {".md", ".txt", ".py", ".sh", ".js", ".ts", ".json", ".yaml", ".yml", ".html", ".css", ".csv"}

# Patterns that look like relative file references inside markdown
REF_PATTERNS = [
    re.compile(r"\]\(([^)#\s]+)\)"),                       # [text](path)
    re.compile(r"`((?:scripts|references|assets)/[^`\s]+)`"),  # `scripts/foo.py`
    re.compile(r"(?<![\w/])((?:scripts|references|assets)/[A-Za-z0-9_\-./]+\.[A-Za-z0-9]+)"),  # bare paths
]

EXTERNAL_PREFIXES = ("http://", "https://", "mailto:", "/mnt/", "/tmp/", "/home/", "#")


def parse_frontmatter(text):
    """Minimal YAML frontmatter parser (name/description/other top-level scalars)."""
    if not text.startswith("---"):
        return None, text
    end = text.find("\n---", 3)
    if end == -1:
        return None, text
    block = text[3:end].strip("\n")
    body = text[end + 4:]
    fm = {}
    current_key = None
    for line in block.splitlines():
        m = re.match(r"^([A-Za-z0-9_\-]+):\s*(.*)$", line)
        if m:
            current_key = m.group(1)
            val = m.group(2).strip()
            if val in (">", "|", ">-", "|-", ">+", "|+"):
                # YAML block scalar indicator: real value is the following indented lines
                fm[current_key] = ""
            else:
                fm[current_key] = val.strip('"').strip("'")
        elif current_key and line.startswith((" ", "\t")):
            # folded/continued value
            fm[current_key] = (fm[current_key] + " " + line.strip()).strip()
    return fm, body


def find_refs(text):
    refs = set()
    for pat in REF_PATTERNS:
        for m in pat.finditer(text):
            ref = m.group(1).strip()
            if ref.startswith(EXTERNAL_PREFIXES):
                continue
            if any(ch in ref for ch in "<>*{}$"):  # placeholders/globs like references/<topic>.md
                continue
            if ref.startswith("./"):
                ref = ref[2:]
            # skip things that are clearly not paths (no dot and no slash)
            if "/" not in ref and "." not in ref:
                continue
            refs.add(ref)
    return refs


def is_skill_dir(path):
    return os.path.isfile(os.path.join(path, "SKILL.md"))


def collect_skill_dirs(root):
    if is_skill_dir(root):
        return [root]
    found = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if not d.startswith(".") and d != "node_modules"]
        if "SKILL.md" in filenames:
            found.append(dirpath)
            dirnames[:] = []  # don't descend into a skill looking for nested skills
    return sorted(found)


def count_lines(path):
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            return sum(1 for _ in f)
    except OSError:
        return 0


def audit(skill_dir):
    result = {
        "skill": os.path.basename(skill_dir.rstrip("/")),
        "path": skill_dir,
        "checks": [],
        "bundled_files": [],
        "broken_refs": [],
        "orphans": [],
    }

    def check(name, status, detail):
        result["checks"].append({"check": name, "status": status, "detail": detail})

    skill_md = os.path.join(skill_dir, "SKILL.md")
    with open(skill_md, "r", encoding="utf-8", errors="replace") as f:
        text = f.read()

    fm, body = parse_frontmatter(text)

    # 1. Frontmatter
    if fm is None:
        check("frontmatter", "FAIL", "No YAML frontmatter found")
        fm = {}
    else:
        missing = [k for k in ("name", "description") if not fm.get(k)]
        if missing:
            check("frontmatter", "FAIL", f"Missing required field(s): {', '.join(missing)}")
        else:
            check("frontmatter", "PASS", "name and description present")

    # 1b. Name must be kebab-case (validator requirement)
    name = fm.get("name", "")
    if name and not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", name):
        check("name_format", "FAIL", f"Name '{name}' must be kebab-case (lowercase letters, digits, hyphens only)")
    elif name:
        check("name_format", "PASS", "Name is kebab-case")

    # 2. Description length
    desc = fm.get("description", "")
    dlen = len(desc)
    if dlen == 0:
        check("description_length", "FAIL", "No description")
    elif dlen <= DESC_LIMIT:
        check("description_length", "PASS", f"{dlen}/{DESC_LIMIT} characters")
    else:
        check("description_length", "FAIL", f"{dlen} characters exceeds {DESC_LIMIT} limit by {dlen - DESC_LIMIT}")

    # 2b. Angle brackets are rejected by the official packager/validator
    if "<" in desc or ">" in desc:
        check("description_charset", "FAIL", "Description contains angle brackets (< or >), which the skill validator rejects")
    elif desc:
        check("description_charset", "PASS", "No forbidden characters in description")

    # 3. Line counts
    md_lines = count_lines(skill_md)
    total_lines = 0
    bundled = []
    for dirpath, dirnames, filenames in os.walk(skill_dir):
        dirnames[:] = [d for d in dirnames if not d.startswith(".")]
        for fn in filenames:
            fp = os.path.join(dirpath, fn)
            rel = os.path.relpath(fp, skill_dir)
            ext = os.path.splitext(fn)[1].lower()
            n = count_lines(fp) if ext in TEXT_EXTS else None
            if n is not None:
                total_lines += n
            if rel != "SKILL.md":
                bundled.append({"file": rel, "lines": n})
    result["bundled_files"] = bundled

    if md_lines < LINE_LIMIT:
        check("skill_md_lines", "PASS", f"SKILL.md is {md_lines} lines (< {LINE_LIMIT})")
    else:
        check("skill_md_lines", "FAIL", f"SKILL.md is {md_lines} lines (limit {LINE_LIMIT}); split content into references/")
    if total_lines >= LINE_LIMIT:
        check("total_lines", "WARN", f"Whole skill is {total_lines} text lines across {1 + len(bundled)} files — fine if progressive disclosure is used, but review whether reference files are loaded only when needed")
    else:
        check("total_lines", "PASS", f"Whole skill is {total_lines} text lines")

    # 4. Reference integrity (SKILL.md + all markdown reference files)
    ref_sources = {"SKILL.md": body}
    for b in bundled:
        if b["file"].endswith(".md"):
            with open(os.path.join(skill_dir, b["file"]), "r", encoding="utf-8", errors="replace") as f:
                ref_sources[b["file"]] = f.read()

    all_mentioned = set()
    broken = []
    for src, src_text in ref_sources.items():
        for ref in find_refs(src_text):
            # resolve relative to skill root first, then relative to the referencing file
            cand1 = os.path.join(skill_dir, ref)
            cand2 = os.path.join(skill_dir, os.path.dirname(src), ref)
            if os.path.exists(cand1) or os.path.exists(cand2):
                all_mentioned.add(os.path.relpath(cand1 if os.path.exists(cand1) else cand2, skill_dir))
            else:
                broken.append({"referenced_in": src, "path": ref})
    result["broken_refs"] = broken
    if broken:
        check("broken_references", "FAIL", f"{len(broken)} referenced path(s) do not exist")
    else:
        check("broken_references", "PASS", "All referenced paths exist")

    # 5. Orphaned bundled files
    mention_text = "\n".join(ref_sources.values())
    orphans = []
    for b in bundled:
        rel = b["file"]
        base = os.path.basename(rel)
        if rel in all_mentioned or rel in mention_text or base in mention_text:
            continue
        orphans.append(rel)
    result["orphans"] = orphans
    if orphans:
        check("orphaned_assets", "WARN", f"{len(orphans)} bundled file(s) never referenced from SKILL.md or references")
    else:
        check("orphaned_assets", "PASS", "All bundled files are referenced" if bundled else "No bundled files")

    result["verdict"] = "FAIL" if any(c["status"] == "FAIL" for c in result["checks"]) else (
        "WARN" if any(c["status"] == "WARN" for c in result["checks"]) else "PASS")
    return result


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    as_json = "--json" in sys.argv
    if not args:
        print(__doc__)
        sys.exit(2)
    root = args[0]
    if not os.path.exists(root):
        print(f"Path not found: {root}", file=sys.stderr)
        sys.exit(2)

    skill_dirs = collect_skill_dirs(root)
    if not skill_dirs:
        print(f"No SKILL.md found under {root}", file=sys.stderr)
        sys.exit(2)

    results = [audit(d) for d in skill_dirs]

    if as_json:
        print(json.dumps(results, indent=2))
    else:
        for r in results:
            print(f"\n=== {r['skill']}  [{r['verdict']}]  ({r['path']})")
            for c in r["checks"]:
                print(f"  [{c['status']:4}] {c['check']}: {c['detail']}")
            for b in r["broken_refs"]:
                print(f"         broken: {b['path']} (referenced in {b['referenced_in']})")
            for o in r["orphans"]:
                print(f"         orphan: {o}")
        n_fail = sum(1 for r in results if r["verdict"] == "FAIL")
        print(f"\n{len(results)} skill(s) audited — {n_fail} failing, "
              f"{sum(1 for r in results if r['verdict'] == 'WARN')} with warnings.")

    sys.exit(1 if any(r["verdict"] == "FAIL" for r in results) else 0)


if __name__ == "__main__":
    main()
