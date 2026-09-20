#!/usr/bin/env python3
"""
check_overlap.py — Detect functionally overlapping skills across one or more skill folders.

Usage:
    python3 check_overlap.py <path> [<path> ...] [--json] [--threshold 0.35] [--body-threshold 0.35]

What it detects (deterministic signals — merge/keep-separate is a judgment call
the reviewing agent makes on top of these):

  DUPLICATE   — SKILL.md content is byte-identical (same skill installed twice)
  HIGH        — description similarity >= threshold + 0.25, or same name in
                different locations
  MODERATE    — description similarity >= threshold, or significant shared
                trigger vocabulary

Description similarity detects trigger competition. Body similarity detects
functional-overlap candidates whose descriptions use different wording but whose
workflows, outputs, or domain guidance substantially overlap. Both are Jaccard
overlap over content tokens with stopwords removed. The script surfaces evidence;
the reviewer traces callers and decides whether to merge, sharpen, keep, or retire.
"""

import hashlib
import json
import os
import re
import sys

STOPWORDS = set("""
a an and are as at be by for from has have how if in into is it its of on or
that the this to use user users when whenever where which with will you your
skill skills also any can do does not should would about like even they them
including mention mentions asks ask asked request requests requested want wants
el la los las de del un una para por con que se en es y o cuando usar
""".split())


def tokenize(text):
    return {t for t in re.findall(r"[a-záéíóúñü0-9\-]{3,}", text.lower()) if t not in STOPWORDS}


def parse_frontmatter(text):
    if not text.startswith("---"):
        return {}
    end = text.find("\n---", 3)
    if end == -1:
        return {}
    fm, key = {}, None
    for line in text[3:end].splitlines():
        m = re.match(r"^([A-Za-z0-9_\-]+):\s*(.*)$", line)
        if m:
            key = m.group(1)
            val = m.group(2).strip()
            fm[key] = "" if val in (">", "|", ">-", "|-", ">+", "|+") else val.strip('"').strip("'")
        elif key and line.startswith((" ", "\t")):
            fm[key] = (fm[key] + " " + line.strip()).strip()
    return fm


def collect(roots):
    skills = []
    for root in roots:
        if os.path.isfile(os.path.join(root, "SKILL.md")):
            dirs = [root]
        else:
            dirs = []
            for dp, dn, fn in os.walk(root):
                dn[:] = [d for d in dn if not d.startswith(".")]
                if "SKILL.md" in fn:
                    dirs.append(dp)
                    dn[:] = []
        for d in sorted(dirs):
            with open(os.path.join(d, "SKILL.md"), "r", encoding="utf-8", errors="replace") as f:
                text = f.read()
            fm = parse_frontmatter(text)
            body = text[text.find("\n---", 3) + 4:] if text.startswith("---") and text.find("\n---", 3) != -1 else text
            skills.append({
                "path": d,
                "name": fm.get("name", os.path.basename(d)),
                "description": fm.get("description", ""),
                "hash": hashlib.sha256(text.encode()).hexdigest(),
                "tokens": tokenize(fm.get("name", "") + " " + fm.get("description", "")),
                "body_tokens": tokenize(body),
            })
    return skills


def jaccard(a, b):
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def main():
    raw_args = sys.argv[1:]
    args = []
    threshold = 0.35
    body_threshold = 0.35
    as_json = False
    i = 0
    while i < len(raw_args):
        arg = raw_args[i]
        if arg == "--json":
            as_json = True
        elif arg in ("--threshold", "--body-threshold"):
            if i + 1 >= len(raw_args):
                sys.exit(f"{arg} requires a numeric value")
            try:
                value = float(raw_args[i + 1])
            except ValueError:
                sys.exit(f"{arg} requires a numeric value")
            if not 0 <= value <= 1:
                sys.exit(f"{arg} must be between 0 and 1")
            if arg == "--threshold":
                threshold = value
            else:
                body_threshold = value
            i += 1
        elif arg.startswith("--"):
            sys.exit(f"Unknown option: {arg}")
        else:
            args.append(arg)
        i += 1
    if not args:
        print(__doc__)
        sys.exit(2)

    skills = collect(args)
    pairs = []
    for i in range(len(skills)):
        for j in range(i + 1, len(skills)):
            a, b = skills[i], skills[j]
            sim = jaccard(a["tokens"], b["tokens"])
            body_sim = jaccard(a["body_tokens"], b["body_tokens"])
            shared = sorted(a["tokens"] & b["tokens"])
            shared_body = sorted(a["body_tokens"] & b["body_tokens"])
            if a["hash"] == b["hash"]:
                level = "DUPLICATE"
            elif a["name"] == b["name"] or sim >= threshold + 0.25:
                level = "HIGH"
            elif sim >= threshold or body_sim >= body_threshold:
                level = "MODERATE"
            else:
                continue
            pairs.append({
                "level": level,
                "similarity": round(sim, 3),
                "description_similarity": round(sim, 3),
                "body_similarity": round(body_sim, 3),
                "match_basis": "duplicate" if level == "DUPLICATE" else (
                    "description" if sim >= threshold or a["name"] == b["name"] else "body"
                ),
                "skill_a": {"name": a["name"], "path": a["path"]},
                "skill_b": {"name": b["name"], "path": b["path"]},
                "shared_terms": shared[:20],
                "shared_body_terms": shared_body[:20],
            })

    order = {"DUPLICATE": 0, "HIGH": 1, "MODERATE": 2}
    pairs.sort(key=lambda p: (order[p["level"]], -max(p["description_similarity"], p["body_similarity"])))

    if as_json:
        print(json.dumps(pairs, indent=2))
    else:
        if not pairs:
            print(f"No overlapping skills found among {len(skills)} skills (threshold {threshold}).")
        for p in pairs:
            print(f"\n[{p['level']}] {p['skill_a']['name']}  <->  {p['skill_b']['name']}  "
                  f"(description {p['description_similarity']}, body {p['body_similarity']}, basis {p['match_basis']})")
            print(f"    {p['skill_a']['path']}")
            print(f"    {p['skill_b']['path']}")
            print(f"    shared terms: {', '.join(p['shared_terms'])}")
            if p["match_basis"] == "body":
                print(f"    shared body terms: {', '.join(p['shared_body_terms'])}")
        print(f"\n{len(skills)} skills compared — {len(pairs)} overlapping pair(s).")

    sys.exit(0)


if __name__ == "__main__":
    main()
