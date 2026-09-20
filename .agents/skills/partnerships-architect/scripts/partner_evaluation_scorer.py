#!/usr/bin/env python3
"""
partner_evaluation_scorer.py — Score a potential partner against 6 evaluation dimensions.

Reads a partner spec YAML containing reviewed dimension scores and optional,
organization-defined decision bands. It validates and summarizes inputs; it
does not infer universal scores or authorize a partnership.

Stdlib only. Markdown or JSON output.

Usage:
    python3 partner_evaluation_scorer.py --partner partner.yaml
    python3 partner_evaluation_scorer.py --partner partner.yaml --format json
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any


# Minimal YAML parser
def parse_yaml(text: str) -> dict[str, Any]:
    lines: list[tuple[int, str]] = []
    for raw in text.splitlines():
        line = raw.split("#", 1)[0].rstrip()
        if not line.strip():
            continue
        indent = len(line) - len(line.lstrip(" "))
        lines.append((indent, line[indent:]))
    result, _ = _parse_block(lines, 0, 0)
    return result if isinstance(result, dict) else {}


def _parse_block(lines, idx, indent):
    if idx >= len(lines):
        return None, idx
    first_indent = lines[idx][0]
    if first_indent < indent:
        return None, idx
    first_line = lines[idx][1]
    if first_line.startswith("- "):
        return _parse_seq(lines, idx, first_indent)
    return _parse_map(lines, idx, first_indent)


def _parse_map(lines, idx, indent):
    out: dict[str, Any] = {}
    while idx < len(lines):
        cur_indent, content = lines[idx]
        if cur_indent < indent:
            break
        if cur_indent > indent:
            idx += 1
            continue
        if ":" not in content:
            idx += 1
            continue
        key, _, rest = content.partition(":")
        key = key.strip().strip('"').strip("'")
        rest = rest.strip()
        if rest:
            out[key] = _scalar(rest)
            idx += 1
        else:
            idx += 1
            if idx < len(lines) and lines[idx][0] > indent:
                value, idx = _parse_block(lines, idx, lines[idx][0])
                out[key] = value if value is not None else {}
            else:
                out[key] = {}
    return out, idx


def _parse_seq(lines, idx, indent):
    out: list[Any] = []
    while idx < len(lines):
        cur_indent, content = lines[idx]
        if cur_indent < indent:
            break
        if not content.startswith("- "):
            break
        rest = content[2:].strip()
        if not rest:
            idx += 1
            if idx < len(lines) and lines[idx][0] > indent:
                value, idx = _parse_block(lines, idx, lines[idx][0])
                out.append(value if value is not None else {})
            else:
                out.append(None)
        elif ":" in rest:
            synth = [(indent + 2, rest)]
            j = idx + 1
            while j < len(lines) and lines[j][0] > indent:
                synth.append(lines[j])
                j += 1
            value, _ = _parse_map(synth, 0, indent + 2)
            out.append(value)
            idx = j
        else:
            out.append(_scalar(rest))
            idx += 1
    return out, idx


def _scalar(s: str):
    s = s.strip()
    if s.startswith('"') and s.endswith('"'):
        return s[1:-1]
    if s.startswith("'") and s.endswith("'"):
        return s[1:-1]
    if s.lower() in ("true", "yes"):
        return True
    if s.lower() in ("false", "no"):
        return False
    if s.lower() in ("null", "~", ""):
        return None
    try:
        return int(s)
    except ValueError:
        pass
    try:
        return float(s)
    except ValueError:
        pass
    return s


@dataclass
class DimensionScore:
    dimension: str
    score: int
    rationale: str


@dataclass
class Evaluation:
    partner_name: str
    dimension_scores: list[DimensionScore]
    total: int
    recommendation: str
    recommendation_reasoning: str


def evaluate(partner: dict[str, Any]) -> Evaluation:
    required = {
        "strategic_fit": "Strategic fit",
        "economic_potential": "Economic potential",
        "partner_credibility": "Partner credibility",
        "mutual_commitment": "Mutual commitment",
        "operational_fit": "Operational fit",
        "reversibility": "Reversibility",
    }
    supplied = partner.get("dimension_scores") or {}
    dims = []
    for key, label in required.items():
        item = supplied.get(key)
        if not isinstance(item, dict):
            raise ValueError(f"dimension_scores.{key} is required")
        try:
            score = int(item["score"])
        except (KeyError, TypeError, ValueError) as exc:
            raise ValueError(f"dimension_scores.{key}.score must be an integer from 1 to 5") from exc
        rationale = str(item.get("rationale", "")).strip()
        if score not in range(1, 6) or not rationale:
            raise ValueError(f"dimension_scores.{key} requires score 1-5 and non-empty rationale")
        dims.append(DimensionScore(label, score, rationale))
    total = sum(d.score for d in dims)
    bands = partner.get("decision_bands") or {}
    if "proceed_min" not in bands or "pilot_min" not in bands:
        rec = "CALIBRATION-REQUIRED"
        reason = "No organization-approved decision bands supplied; review the evidence and define thresholds before deciding."
    else:
        proceed_min = int(bands["proceed_min"])
        pilot_min = int(bands["pilot_min"])
        if not 6 <= pilot_min < proceed_min <= 30:
            raise ValueError("decision_bands must satisfy 6 <= pilot_min < proceed_min <= 30")
        if total >= proceed_min:
            rec, reason = "PROCEED-TO-APPROVAL", "Meets the supplied proceed band; accountable reviewers still decide."
        elif total >= pilot_min:
            rec, reason = "PILOT-OR-REDESIGN", "Meets the supplied pilot band but not the proceed band."
        else:
            rec, reason = "DEFER-OR-DECLINE", "Falls below the supplied pilot band; resolve evidence or redesign before commitment."
    return Evaluation(
        partner_name=partner.get("name", "unknown"),
        dimension_scores=dims,
        total=total,
        recommendation=rec,
        recommendation_reasoning=reason,
    )


def render_markdown(e: Evaluation) -> str:
    out = [f"# Partner Evaluation: {e.partner_name}", ""]
    out.append("## Per-Dimension Scores")
    out.append("")
    out.append("| Dimension | Score | Rationale |")
    out.append("|-----------|-------|-----------|")
    for d in e.dimension_scores:
        out.append(f"| {d.dimension} | {d.score}/5 | {d.rationale} |")
    out.append("")
    out.append(f"## Total: {e.total}/30")
    out.append("")
    out.append(f"## Recommendation: **{e.recommendation}**")
    out.append("")
    out.append(e.recommendation_reasoning)
    return "\n".join(out)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Score a potential partner on 6 evaluation dimensions",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    p.add_argument("--partner", required=True, help="Partner spec YAML")
    p.add_argument("--format", choices=["markdown", "json"], default="markdown")
    p.add_argument("--output", help="Output file path")
    return p.parse_args()


def main() -> int:
    args = parse_args()
    try:
        partner = parse_yaml(Path(args.partner).read_text())
    except OSError as e:
        print(f"error: {e}", file=sys.stderr)
        return 2
    try:
        evaluation = evaluate(partner)
    except ValueError as e:
        print(f"error: {e}", file=sys.stderr)
        return 2
    if args.format == "json":
        out = json.dumps(asdict(evaluation), indent=2)
    else:
        out = render_markdown(evaluation)
    if args.output:
        Path(args.output).write_text(out)
        print(f"wrote {args.output}", file=sys.stderr)
    else:
        print(out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
