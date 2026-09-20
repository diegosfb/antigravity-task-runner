#!/usr/bin/env python3
"""Static, non-executing security scanner for agent content."""
import argparse, datetime as dt, hashlib, json, os, re, stat, sys, tarfile, zipfile
from pathlib import Path

SEVERITY = {"info": 0, "low": 1, "medium": 2, "high": 3, "critical": 4}
TEXT_EXTENSIONS = {".md", ".txt", ".py", ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".sh", ".bash", ".zsh", ".fish", ".ps1", ".json", ".yaml", ".yml", ".toml", ".ini", ".cfg", ".conf", ".env", ".xml", ".html", ".css", ".sql", ".rb", ".go", ".rs", ".java", ".kt", ".swift"}
ARCHIVES = {".zip", ".tar", ".tgz", ".tar.gz", ".tar.bz2", ".tar.xz"}
SELF_DIR = Path("skills/agent-content-security")
PATTERNS = [
    ("SEC001", "secrets", "critical", "high", r"\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b", "Possible GitHub credential"),
    ("SEC002", "secrets", "critical", "high", r"\bsk-(?:proj-|ant-|or-v1-)?[A-Za-z0-9_-]{20,}\b", "Possible model-provider credential"),
    ("SEC003", "secrets", "high", "medium", r"(?i)(?:api[_-]?key|token|password|secret)\s*[:=]\s*[\"']?(?!\$|\{|<|your|example|changeme)[A-Za-z0-9_./+=-]{16,}", "Possible hard-coded credential"),
    ("PI001", "prompt-injection", "high", "medium", r"(?i)\bignore\s+(?:all\s+)?(?:previous|prior|system|developer)\s+instructions\b", "Instruction-override language"),
    ("PI002", "prompt-injection", "high", "medium", r"(?i)\b(?:reveal|print|exfiltrate|send)\b.{0,50}\b(?:system prompt|developer message|conversation context)\b", "Prompt or context extraction language"),
    ("EX001", "exfiltration", "critical", "high", r"(?i)\b(?:curl|wget)\b[^\n]*(?:--data|-d\s|--upload-file|-T\s)[^\n]*https?://", "Command may transmit local data"),
    ("EX002", "exfiltration", "high", "medium", r"(?i)\b(?:printenv|env)\b[^\n|]*(?:\||>)", "Environment enumeration is redirected or piped"),
    ("SC001", "supply-chain", "critical", "high", r"(?i)(?:curl|wget)[^\n|]*\|\s*(?:sudo\s+)?(?:sh|bash|zsh|python|node)\b", "Remote content piped to an interpreter"),
    ("SC002", "supply-chain", "high", "medium", r"(?i)\b(?:pip|pip3|npm|pnpm|yarn|uv)\s+(?:install|add)\b[^\n]*(?:@latest|git\+https?://|https?://)", "Mutable or remote dependency installation"),
    ("SC003", "supply-chain", "medium", "medium", r"(?i)\bnpx\s+(?!.*(?:@[0-9]|--offline))[^\n]+", "Unpinned npx execution"),
    ("CMD001", "dangerous-command", "critical", "high", r"\brm\s+-[A-Za-z]*r[A-Za-z]*f[A-Za-z]*\s+(?:/|~|\$HOME|\$\{HOME\}|\.\.?)(?:\s|$)", "Broad recursive deletion"),
    ("CMD002", "dangerous-command", "high", "high", r"(?i)\b(?:sudo\s+|chmod\s+(?:777|a\+rwx)|chown\s+-R\s+root)\b", "Privilege escalation or broad permission change"),
    ("CMD003", "dangerous-code", "high", "high", r"\bsubprocess\.(?:run|Popen|call|check_output|check_call)\s*\([^\n]*shell\s*=\s*True", "Python subprocess uses shell=True"),
    ("CMD004", "dangerous-code", "high", "medium", r"\b(?:eval|exec)\s*\(\s*(?:base64|bytes\.fromhex|codecs\.decode|decompress)", "Decoded content is evaluated"),
    ("CMD005", "dangerous-code", "high", "medium", r"\b(?:os\.system|child_process\.(?:exec|execSync))\s*\(", "Code executes through a command shell"),
    ("DES001", "serialization", "high", "high", r"\b(?:pickle|dill|marshal)\.loads?\s*\(", "Unsafe deserialization primitive"),
    ("AG001", "excessive-agency", "high", "medium", r"(?i)\b(?:without|no)\s+(?:asking|approval|confirmation|human review)\b", "Instruction may suppress required approval"),
    ("AG002", "excessive-agency", "medium", "medium", r"(?i)(?:allowed-tools|tools)\s*:\s*(?:\*|all)\b", "Unrestricted tool declaration"),
    ("OUT001", "output-handling", "high", "medium", r"(?i)\b(?:eval|exec|source)\b.{0,40}\b(?:model|llm|response|output)\b", "Model output may reach execution without validation"),
]

def fingerprint(rule, path, line, evidence):
    normalized = re.sub(r"\s+", " ", evidence.strip())[:160]
    return hashlib.sha256("{}|{}|{}|{}".format(rule, path, line, normalized).encode()).hexdigest()[:20]

def finding(rule, category, severity, confidence, message, path, line=0, evidence="", archive_member=None):
    shown = "[REDACTED]" if category == "secrets" else re.sub(r"\s+", " ", evidence.strip())[:160]
    location = "{}!{}".format(path, archive_member) if archive_member else path
    return {"rule_id": rule, "category": category, "severity": severity, "confidence": confidence, "message": message, "path": location, "line": line, "evidence": shown, "fingerprint": fingerprint(rule, location, line, evidence), "status": "candidate"}

def inspect_text(text, path, archive_member=None):
    results = []
    location = archive_member or str(path)
    documentation = Path(location).suffix.lower() in (".md", ".txt") or "references" in Path(location).parts
    for rule, category, severity, confidence, regex, message in PATTERNS:
        for match in re.finditer(regex, text):
            evidence = match.group(0)
            if rule == "SEC003":
                lowered = evidence.lower()
                value = re.split(r"[:=]", evidence, maxsplit=1)[-1].strip(" \t\"'")
                if any(marker in lowered for marker in ("process.env", "os.environ", "getenv", "${", "settings.", "config.", "secretmanager", "placeholder", "example", "changeme", "dummy", "fake", "test")):
                    continue
                if value and len(set(value.lower())) <= 2:
                    continue
            adjusted = confidence
            if documentation and category != "secrets":
                adjusted = "medium" if confidence == "high" else "low"
            results.append(finding(rule, category, severity, adjusted, message, path, text.count("\n", 0, match.start()) + 1, evidence, archive_member))
    for match in re.finditer("[\u200b-\u200f\u202a-\u202e\u2060\u2066-\u2069\ufeff]", text):
        results.append(finding("PI003", "prompt-injection", "medium", "high", "Invisible or bidirectional control character", path, text.count("\n", 0, match.start()) + 1, repr(match.group(0)), archive_member))
    return results

def looks_text(path, data):
    return path.suffix.lower() in TEXT_EXTENSIONS or path.name.startswith(".") or b"\x00" not in data[:4096]

def binary_findings(path, data, mode, rel):
    results, magic = [], data[:4]
    executable_magic = magic.startswith((b"\x7fELF", b"MZ")) or magic in (b"\xcf\xfa\xed\xfe", b"\xfe\xed\xfa\xcf", b"\xca\xfe\xba\xbe")
    if path.suffix.lower() in (".pyc", ".pyo"):
        results.append(finding("SC004", "supply-chain", "high", "high", "Shipped Python bytecode", rel, evidence=path.name))
    if executable_magic:
        results.append(finding("SC005", "concealed-executable", "high", "high", "Native executable artifact", rel, evidence=magic.hex()))
    if mode & (stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH) and not data.startswith(b"#!") and path.suffix.lower() not in (".sh", ".bash", ".zsh", ".py", ".js"):
        results.append(finding("SC006", "concealed-executable", "medium", "medium", "Executable permission on non-script content", rel, evidence=path.name))
    return results

def inspect_zip(path, rel, max_file, max_archive, max_members):
    results, consumed = [], 0
    try:
        with zipfile.ZipFile(str(path)) as archive:
            infos = archive.infolist()
            if len(infos) > max_members:
                return [finding("ARC001", "archive", "critical", "high", "Archive member limit exceeded", rel, evidence=str(len(infos)))]
            for info in infos:
                target = Path(info.filename)
                if target.is_absolute() or ".." in target.parts:
                    results.append(finding("ARC002", "archive", "high", "high", "Archive path escapes extraction root", rel, archive_member=info.filename, evidence=info.filename)); continue
                consumed += info.file_size
                if consumed > max_archive:
                    results.append(finding("ARC003", "archive", "critical", "high", "Archive expansion limit exceeded", rel, evidence=str(consumed))); break
                if info.file_size > max_file:
                    results.append(finding("ARC004", "archive", "medium", "high", "Archive member exceeds analysis limit", rel, archive_member=info.filename, evidence=str(info.file_size))); continue
                if info.compress_size and info.file_size / float(info.compress_size) > 200:
                    results.append(finding("ARC005", "archive", "high", "high", "Suspicious archive compression ratio", rel, archive_member=info.filename, evidence=str(info.file_size)))
                data = archive.read(info)
                if looks_text(target, data): results.extend(inspect_text(data.decode("utf-8", "replace"), rel, info.filename))
                else: results.extend(binary_findings(target, data, info.external_attr >> 16, rel + "!" + info.filename))
    except (OSError, zipfile.BadZipFile, RuntimeError) as exc:
        results.append(finding("ARC006", "archive", "medium", "high", "Unreadable ZIP archive", rel, evidence=type(exc).__name__))
    return results

def inspect_tar(path, rel, max_file, max_archive, max_members):
    results, consumed = [], 0
    try:
        with tarfile.open(str(path), "r:*") as archive:
            members = archive.getmembers()
            if len(members) > max_members:
                return [finding("ARC001", "archive", "critical", "high", "Archive member limit exceeded", rel, evidence=str(len(members)))]
            for info in members:
                target = Path(info.name)
                if target.is_absolute() or ".." in target.parts or info.issym() or info.islnk():
                    results.append(finding("ARC002", "archive", "high", "high", "Archive contains escaping path or link", rel, archive_member=info.name, evidence=info.name)); continue
                if not info.isfile(): continue
                consumed += info.size
                if consumed > max_archive:
                    results.append(finding("ARC003", "archive", "critical", "high", "Archive expansion limit exceeded", rel, evidence=str(consumed))); break
                if info.size > max_file:
                    results.append(finding("ARC004", "archive", "medium", "high", "Archive member exceeds analysis limit", rel, archive_member=info.name, evidence=str(info.size))); continue
                stream = archive.extractfile(info); data = stream.read(max_file + 1) if stream else b""
                if looks_text(target, data): results.extend(inspect_text(data.decode("utf-8", "replace"), rel, info.name))
                else: results.extend(binary_findings(target, data, info.mode, rel + "!" + info.name))
    except (OSError, tarfile.TarError) as exc:
        results.append(finding("ARC006", "archive", "medium", "high", "Unreadable TAR archive", rel, evidence=type(exc).__name__))
    return results

def load_baseline(path):
    if not path: return {}
    entries, today, valid = json.loads(path.read_text(encoding="utf-8")).get("suppressions", []), dt.date.today(), {}
    for entry in entries:
        fp, rationale, expires = entry.get("fingerprint"), entry.get("rationale"), entry.get("expires")
        try:
            if fp and rationale and expires and dt.datetime.strptime(expires, "%Y-%m-%d").date() >= today: valid[fp] = entry
        except (ValueError, TypeError): pass
    return valid

def scan(root, max_file, max_total, max_archive, max_members, baseline):
    findings, skipped, total = [], [], 0; root = root.resolve()
    for path in sorted(root.rglob("*")):
        rel_path = path.relative_to(root); rel = rel_path.as_posix()
        if rel_path == SELF_DIR or SELF_DIR in rel_path.parents: continue
        if path.is_symlink():
            try: path.resolve().relative_to(root)
            except ValueError: findings.append(finding("FS001", "filesystem", "high", "high", "Symlink escapes scan root", rel, evidence=os.readlink(str(path))))
            continue
        if not path.is_file(): continue
        size = path.stat().st_size; total += size
        if total > max_total:
            findings.append(finding("LIM001", "resource-limit", "critical", "high", "Total scan byte limit exceeded", rel, evidence=str(total))); break
        name = path.name.lower()
        archive_suffix = next((suffix for suffix in ARCHIVES if name.endswith(suffix)), None)
        if size > max_file and archive_suffix is None:
            skipped.append({"path": rel, "reason": "file exceeds analysis limit", "bytes": size}); continue
        if archive_suffix == ".zip": findings.extend(inspect_zip(path, rel, max_file, max_archive, max_members)); continue
        if archive_suffix in (".tar", ".tgz", ".tar.gz", ".tar.bz2", ".tar.xz"): findings.extend(inspect_tar(path, rel, max_file, max_archive, max_members)); continue
        data = path.read_bytes(); findings.extend(binary_findings(path, data, path.stat().st_mode, rel))
        if looks_text(path, data): findings.extend(inspect_text(data.decode("utf-8", "replace"), rel))
    active, suppressed = [], []
    for item in findings:
        if item["fingerprint"] in baseline: item["status"] = "suppressed"; item["suppression"] = baseline[item["fingerprint"]]; suppressed.append(item)
        else: active.append(item)
    active.sort(key=lambda x: (-SEVERITY[x["severity"]], x["path"], x["line"], x["rule_id"]))
    score = min(100, sum({"critical": 25, "high": 12, "medium": 4, "low": 1, "info": 0}[f["severity"]] for f in active))
    return {"scanner": "agent-content-security", "scan_mode": "static-offline", "target": str(root), "risk_score": score, "severity": "critical" if score >= 75 else "high" if score >= 40 else "medium" if score >= 15 else "low", "safe_to_use": not any(f["severity"] in ("critical", "high") and f["confidence"] == "high" for f in active), "findings": active, "suppressed": suppressed, "skipped": skipped, "bootstrap_exclusion": SELF_DIR.as_posix()}

def markdown(report):
    lines = ["# Agent Content Security Report", "", "- Target: `{}`".format(report["target"]), "- Mode: `{}`".format(report["scan_mode"]), "- Risk score: **{}/100 ({})**".format(report["risk_score"], report["severity"]), "- Safe to use without review: **{}**".format("yes" if report["safe_to_use"] else "no"), "", "## Findings", "", "| Severity | Confidence | Rule | Location | Finding | Fingerprint |", "|---|---|---|---|---|---|"]
    for f in report["findings"]:
        location = "{}:{}".format(f["path"], f["line"]) if f["line"] else f["path"]
        lines.append("| {} | {} | `{}` | `{}` | {} | `{}` |".format(f["severity"].upper(), f["confidence"], f["rule_id"], location.replace("|", "\\|"), f["message"], f["fingerprint"]))
    if not report["findings"]: lines.append("| — | — | — | — | No findings | — |")
    lines.extend(["", "## Scan limitations", "", "- Static findings are candidates requiring contextual review; a clean scan is not proof of safety.", "- Scanned content was never executed.", "- The scanner's own package is excluded as a bootstrap trust boundary and must be reviewed separately.", "- {} oversized files were skipped; {} findings were suppressed by reviewed, unexpired baseline entries.".format(len(report["skipped"]), len(report["suppressed"])), ""])
    return "\n".join(lines)

def sarif(report):
    rules, results = {}, []
    for f in report["findings"]:
        rules.setdefault(f["rule_id"], {"id": f["rule_id"], "shortDescription": {"text": f["message"]}})
        results.append({"ruleId": f["rule_id"], "level": "error" if f["severity"] in ("critical", "high") else "warning", "message": {"text": f["message"]}, "locations": [{"physicalLocation": {"artifactLocation": {"uri": f["path"]}, "region": {"startLine": max(1, f["line"])}}}], "fingerprints": {"agentContentSecurity": f["fingerprint"]}})
    return {"version": "2.1.0", "$schema": "https://json.schemastore.org/sarif-2.1.0.json", "runs": [{"tool": {"driver": {"name": "agent-content-security", "rules": list(rules.values())}}, "results": results}]}

def main():
    parser = argparse.ArgumentParser(description=__doc__); parser.add_argument("target", type=Path); parser.add_argument("--format", choices=("terminal", "json", "markdown", "sarif"), default="terminal"); parser.add_argument("--output", type=Path); parser.add_argument("--baseline", type=Path); parser.add_argument("--max-file-bytes", type=int, default=1024*1024); parser.add_argument("--max-total-bytes", type=int, default=100*1024*1024); parser.add_argument("--max-archive-bytes", type=int, default=100*1024*1024); parser.add_argument("--max-archive-members", type=int, default=10000); parser.add_argument("--fail-on", choices=("none", "high", "critical"), default="none"); args = parser.parse_args()
    if not args.target.exists() or not args.target.is_dir(): parser.error("target must be an existing directory")
    report = scan(args.target, args.max_file_bytes, args.max_total_bytes, args.max_archive_bytes, args.max_archive_members, load_baseline(args.baseline))
    output = markdown(report) if args.format == "markdown" else json.dumps(sarif(report), indent=2) if args.format == "sarif" else json.dumps(report, indent=2) if args.format == "json" else "risk={}/100 severity={} findings={} suppressed={} skipped={} safe_to_use={}".format(report["risk_score"], report["severity"], len(report["findings"]), len(report["suppressed"]), len(report["skipped"]), report["safe_to_use"])
    if args.format == "terminal":
        for f in report["findings"]: output += "\n{:<8} {:<7} {} {}:{} {} [{}]".format(f["severity"].upper(), f["confidence"], f["rule_id"], f["path"], f["line"], f["message"], f["fingerprint"])
    if args.output: args.output.parent.mkdir(parents=True, exist_ok=True); args.output.write_text(output + "\n", encoding="utf-8")
    else: print(output)
    threshold = SEVERITY.get(args.fail_on, 99); return 1 if args.fail_on != "none" and any(SEVERITY[f["severity"]] >= threshold and f["confidence"] == "high" for f in report["findings"]) else 0

if __name__ == "__main__": sys.exit(main())
