#!/usr/bin/env python3
"""Validate and score supplied account facts against a versioned ICP."""

import argparse
import csv
import json
import re
import sys
from pathlib import Path

UNKNOWN_VALUES = {"", "unknown", "n/a", "na", "null", "none", "?"}
MATCH_MODES = {"exact", "token", "contains", "numeric_range"}


def normalize(value):
    return " ".join(str(value or "").strip().casefold().split())


def is_unknown(value):
    return normalize(value) in UNKNOWN_VALUES


def candidates(rule):
    value = rule.get("value")
    return value if isinstance(value, list) else [value]


def numeric_range_matches(rule, lead_value):
    try:
        number = float(str(lead_value).replace(",", "").strip())
    except (TypeError, ValueError):
        return False
    lower = rule.get("min")
    upper = rule.get("max")
    return not ((lower is not None and number < lower) or (upper is not None and number > upper))


def rule_matches(rule, lead_value):
    mode = rule.get("match", "numeric_range" if "min" in rule or "max" in rule else "exact")
    if mode == "numeric_range":
        return numeric_range_matches(rule, lead_value)

    actual = normalize(lead_value)
    expected = [normalize(value) for value in candidates(rule) if value is not None]
    if mode == "exact":
        return actual in expected
    if mode == "contains":
        return any(value and value in actual for value in expected)
    if mode == "token":
        tokens = {normalize(item) for item in re.split(r"[,;|]", str(lead_value)) if normalize(item)}
        return any(value in tokens for value in expected)
    raise ValueError(f"Unsupported match mode: {mode}")


def validate_icp(icp):
    errors = []
    if not isinstance(icp, dict):
        return ["ICP root must be an object"]
    if not str(icp.get("name", "")).strip():
        errors.append("ICP requires a non-empty name")
    if not str(icp.get("version", "")).strip():
        errors.append("ICP requires a version")
    if not isinstance(icp.get("must_have"), list) or not icp["must_have"]:
        errors.append("ICP requires at least one must_have rule")

    for group in ("must_have", "nice_to_have", "disqualifiers"):
        rules = icp.get(group, [])
        if not isinstance(rules, list):
            errors.append(f"{group} must be an array")
            continue
        for index, rule in enumerate(rules):
            prefix = f"{group}[{index}]"
            if not isinstance(rule, dict) or not str(rule.get("field", "")).strip():
                errors.append(f"{prefix} requires a field")
                continue
            mode = rule.get("match", "numeric_range" if "min" in rule or "max" in rule else "exact")
            if mode not in MATCH_MODES:
                errors.append(f"{prefix} has unsupported match mode {mode!r}")
            if mode == "numeric_range" and "min" not in rule and "max" not in rule:
                errors.append(f"{prefix} numeric_range requires min or max")
            if mode != "numeric_range" and rule.get("value") is None:
                errors.append(f"{prefix} requires value for {mode} matching")
            try:
                if float(rule.get("weight", 10)) < 0:
                    errors.append(f"{prefix} weight must be non-negative")
            except (TypeError, ValueError):
                errors.append(f"{prefix} weight must be numeric")
    return errors


def required_fields(icp):
    fields = {"company"}
    for group in ("must_have", "nice_to_have", "disqualifiers"):
        fields.update(rule["field"] for rule in icp.get(group, []) if rule.get("field"))
    return fields


def describe(rule, value):
    mode = rule.get("match", "numeric_range" if "min" in rule or "max" in rule else "exact")
    return f"{rule['field']}={value!r} ({mode})"


def score_lead(icp, lead):
    for rule in icp.get("disqualifiers", []):
        value = lead.get(rule["field"], "")
        if not is_unknown(value) and rule_matches(rule, value):
            return result(lead, "disqualified", 0.0, disqualifier=describe(rule, value))

    matched = []
    failed = []
    unknown = []
    earned = 0.0
    possible = 0.0

    for rule in icp.get("must_have", []):
        weight = float(rule.get("weight", 10))
        possible += weight
        value = lead.get(rule["field"], "")
        if is_unknown(value):
            unknown.append(rule["field"])
        elif rule_matches(rule, value):
            earned += weight
            matched.append(describe(rule, value))
        else:
            failed.append(describe(rule, value))

    if unknown:
        return result(lead, "needs_data", None, matched, failed, unknown)
    if failed:
        return result(lead, "disqualified", 0.0, matched, failed, unknown)

    for rule in icp.get("nice_to_have", []):
        weight = float(rule.get("weight", 5))
        possible += weight
        value = lead.get(rule["field"], "")
        if is_unknown(value):
            unknown.append(rule["field"])
        elif rule_matches(rule, value):
            earned += weight
            matched.append(describe(rule, value))

    score = round(earned / possible * 100, 1) if possible else 0.0
    tier = "A" if score >= 75 else "B" if score >= 50 else "C"
    return result(lead, tier, score, matched, failed, unknown)


def result(lead, status, score, matched=None, failed=None, unknown=None, disqualifier=None):
    return {
        "company": lead.get("company", ""),
        "status": status,
        "score": score,
        "matched_signals": matched or [],
        "failed_must_haves": failed or [],
        "unknown_signals": sorted(set(unknown or [])),
        "disqualifier": disqualifier,
    }


def render_human(icp, scored):
    lines = [f"ICP: {icp['name']} ({icp['version']})", "Advisory heuristic; not a conversion prediction or outreach authorization.", ""]
    lines.append(f"{'Status':<14}{'Score':<10}{'Company':<32}Evidence")
    lines.append("-" * 90)
    rank = {"A": 0, "B": 1, "C": 2, "needs_data": 3, "disqualified": 4}
    for row in sorted(scored, key=lambda item: (rank.get(item["status"], 9), -(item["score"] or 0))):
        score = "—" if row["score"] is None else f"{row['score']:.1f}"
        evidence = row["disqualifier"] or ", ".join(row["unknown_signals"]) or f"{len(row['matched_signals'])} matches"
        lines.append(f"{row['status']:<14}{score:<10}{row['company'][:30]:<32}{evidence}")
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Validate and score supplied account facts against a versioned ICP.")
    parser.add_argument("icp", help="Path to ICP JSON")
    parser.add_argument("leads", help="Path to lead CSV")
    parser.add_argument("--json", action="store_true", help="Output JSON")
    args = parser.parse_args()

    try:
        icp = json.loads(Path(args.icp).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"Error reading ICP: {exc}", file=sys.stderr)
        return 1
    errors = validate_icp(icp)
    if errors:
        print("Invalid ICP: " + "; ".join(errors), file=sys.stderr)
        return 1

    try:
        with Path(args.leads).open(encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            headers = set(reader.fieldnames or [])
            missing_headers = sorted(required_fields(icp) - headers)
            if missing_headers:
                print("Missing CSV columns: " + ", ".join(missing_headers), file=sys.stderr)
                return 1
            leads = list(reader)
    except OSError as exc:
        print(f"Error reading leads: {exc}", file=sys.stderr)
        return 1
    if not leads:
        print("No leads to score.", file=sys.stderr)
        return 1

    scored = [score_lead(icp, lead) for lead in leads]
    if args.json:
        print(json.dumps({"icp": {"name": icp["name"], "version": icp["version"]}, "methodology_warning": "Advisory heuristic; not a conversion prediction or outreach authorization.", "leads": scored}, indent=2))
    else:
        print(render_human(icp, scored))
    return 0


if __name__ == "__main__":
    sys.exit(main())
