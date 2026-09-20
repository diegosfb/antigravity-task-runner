#!/usr/bin/env python3
"""Report keyword-based topic coverage from a slide-summary Markdown file.

This diagnostic does not measure quality, prescribe slide order, or determine
whether a deck is ready to send.
"""

import argparse
import json
import re
import sys
from pathlib import Path


TOPICS = {
    "investor": {
        "problem or insight": [r"\b(problem|pain|insight|status quo)\b"],
        "solution or product": [r"\b(solution|product|demo|how it works)\b"],
        "market": [r"\b(market|tam|sam|som|addressable)\b"],
        "proof or traction": [r"\b(traction|growth|customers?|users?|arr|mrr|retention)\b"],
        "business model": [r"\b(business model|pricing|revenue model|unit economics)\b"],
        "competition": [r"\b(competition|competitor|alternative|differentiation)\b"],
        "team": [r"\b(team|founders?|leadership)\b"],
        "ask or milestones": [r"\b(ask|raising|round|use of funds|milestones?)\b"],
    },
    "sales": {
        "customer problem": [r"\b(problem|pain|cost of|status quo)\b"],
        "solution": [r"\b(solution|product|service|how it works)\b"],
        "proof": [r"\b(proof|case study|customer|outcome|result)\b"],
        "value": [r"\b(value|roi|savings|revenue|impact)\b"],
        "differentiation": [r"\b(differentiation|alternative|competition|why us)\b"],
        "implementation": [r"\b(implementation|rollout|timeline|onboarding)\b"],
        "next step": [r"\b(next step|decision|proposal|pilot|commitment)\b"],
    },
    "product": {
        "user problem": [r"\b(user|customer).*(problem|pain|need)\b", r"\bproblem\b"],
        "product": [r"\b(product|experience|workflow|capabilit)\b"],
        "evidence": [r"\b(evidence|research|interview|telemetry|metric)\b"],
        "outcomes": [r"\b(outcome|success|metric|goal)\b"],
        "risks or assumptions": [r"\b(risk|assumption|constraint|unknown)\b"],
        "decision or next step": [r"\b(decision|ask|next step|approval)\b"],
    },
    "partnership": {
        "strategic fit": [r"\b(strategic fit|shared goal|complement)\b"],
        "joint customer value": [r"\b(joint|mutual).*(customer|value|outcome)\b"],
        "partnership model": [r"\b(model|reseller|referral|co-sell|oem|integration|alliance)\b"],
        "evidence": [r"\b(evidence|proof|customer|pipeline|traction)\b"],
        "commitments": [r"\b(commitment|owner|responsibilit|resource|governance)\b"],
        "economics": [r"\b(economic|revenue|cost|margin|roi|investment)\b"],
        "next step": [r"\b(next step|pilot|decision|approval|timeline)\b"],
    },
}


def diagnose(text, deck_type):
    topics = TOPICS[deck_type]
    observed = []
    not_detected = []
    for topic, patterns in topics.items():
        if any(re.search(pattern, text, re.IGNORECASE | re.MULTILINE) for pattern in patterns):
            observed.append(topic)
        else:
            not_detected.append(topic)
    slide_markers = re.findall(r"^\s*(?:#+\s|[0-9]+[.)]\s|slide\s*\d+\s*[:\-])", text, re.IGNORECASE | re.MULTILINE)
    return {
        "deck_type": deck_type,
        "estimated_slide_count": len(slide_markers),
        "observed_topics": observed,
        "topics_not_detected": not_detected,
        "limitations": [
            "Keyword presence does not establish quality, truth, prominence, or persuasiveness.",
            "A topic not detected may be intentional or expressed with different language.",
            "Visual design, charts, accessibility, and delivery are not assessed from text structure.",
        ],
    }


def render(result):
    lines = [f"# Pitch Deck Coverage Diagnostic — {result['deck_type']}", "", "> This is not a score or readiness verdict.", "", f"Estimated slide markers: {result['estimated_slide_count']}", "", "## Topics observed"]
    lines.extend(f"- {topic}" for topic in result["observed_topics"])
    if not result["observed_topics"]:
        lines.append("- None detected")
    lines.extend(["", "## Topics not detected"])
    lines.extend(f"- {topic}" for topic in result["topics_not_detected"])
    if not result["topics_not_detected"]:
        lines.append("- None")
    lines.extend(["", "## Limitations"])
    lines.extend(f"- {item}" for item in result["limitations"])
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Report candidate topic coverage in a deck summary; does not score quality.")
    parser.add_argument("deck_summary", help="Slide-by-slide Markdown summary")
    parser.add_argument("--deck-type", choices=sorted(TOPICS), required=True)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    try:
        text = Path(args.deck_summary).read_text(encoding="utf-8")
    except (OSError, UnicodeError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    result = diagnose(text, args.deck_type)
    print(json.dumps(result, indent=2) if args.json else render(result))
    return 0


if __name__ == "__main__":
    sys.exit(main())
