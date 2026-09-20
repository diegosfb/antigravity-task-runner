#!/usr/bin/env python3
"""Store private, user-defined founder leadership reflection milestones.

This tool records observations. Counts are not leadership, performance,
readiness, or wellbeing scores.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import date
from pathlib import Path


def load(path: Path) -> dict:
    if not path.exists():
        return {"milestones": [], "next_id": 1}
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict) or not isinstance(data.get("milestones"), list):
        raise ValueError("Store must be a JSON object with a milestones array")
    data.setdefault("next_id", len(data["milestones"]) + 1)
    return data


def save(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Track private founder leadership reflection milestones")
    parser.add_argument("--store", required=True, help="User-selected local JSON path")
    sub = parser.add_subparsers(dest="command", required=True)

    add = sub.add_parser("add", help="Record a user-defined milestone")
    add.add_argument("--focus", required=True, help="User-defined focus area")
    add.add_argument("--milestone", required=True)
    add.add_argument("--evidence", default="")
    add.add_argument("--review-date", default="")

    show = sub.add_parser("list", help="List recorded milestones")
    show.add_argument("--focus")
    show.add_argument("--json", action="store_true")

    args = parser.parse_args()
    path = Path(args.store).expanduser()
    try:
        data = load(path)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    if args.command == "add":
        item = {
            "id": data["next_id"],
            "focus": args.focus,
            "milestone": args.milestone,
            "evidence": args.evidence,
            "recorded_on": date.today().isoformat(),
            "review_date": args.review_date,
        }
        data["milestones"].append(item)
        data["next_id"] += 1
        try:
            save(path, data)
        except OSError as exc:
            print(f"Error: {exc}", file=sys.stderr)
            return 1
        print(json.dumps(item, indent=2))
        return 0

    items = data["milestones"]
    if args.focus:
        items = [item for item in items if item.get("focus") == args.focus]
    if args.json:
        print(json.dumps(items, indent=2))
    else:
        for item in items:
            review = f"; review {item['review_date']}" if item.get("review_date") else ""
            print(f"#{item['id']} [{item['focus']}] {item['milestone']} ({item['recorded_on']}{review})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
