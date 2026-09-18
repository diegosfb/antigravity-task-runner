#!/usr/bin/env python3
"""Extract traceable meeting-insight candidates from a text transcript."""

import argparse
import json
import re
import sys
from pathlib import Path

DECISION_MARKERS = [
    r"\bwe (?:decided|agreed|will go with|are going with|chose|are choosing)\b",
    r"\b(?:decision|decided|agreed) (?:is|to)\b",
    r"\b(?:let's|we'll) (?:go with|move forward with|ship)\b",
    r"\bfinal call (?:is|on)\b",
    r"\bsign[- ]?off\b",
]
ACTION_MARKERS = [
    r"\b(?:i|we|i'll|we'll|i will|we will) (?:will |'ll )?(?:send|share|draft|review|prepare|set up|schedule|build|ship|own|take|follow up|circle back|sync|email|message|update|investigate|test|deploy|publish|hand off)\b",
    r"\b(?:follow up|action item|next steps?)\b",
    r"\b(?:i|we) (?:can|need to|should|have to|will) (?:send|share|draft|review|prepare|set up|schedule|build|ship|own|take|follow up|circle back|sync|email|message|update|investigate|test|deploy|publish|hand off)\b",
]
RISK_MARKERS = [r"\brisk\b", r"\bconcern\b", r"\bblocker\b", r"\bblocked on\b", r"\bworried (?:about|that)\b"]
PAIN_MARKERS = [
    r"\b(?:painful|frustrat\w+|struggle|struggling|hard to|difficult to|takes (?:way )?too long|wastes? (?:my |our )?time)\b",
    r"\bhate (?:that|when|how)\b",
    r"\bwish (?:we|i|it) (?:could|had|would)\b",
    r"\b(?:problem|issue) (?:is|with)\b",
]
DUE_DATE_PATTERNS = [
    r"\bby (?:end of )?(?:today|tomorrow)\b",
    r"\b(?:today|tomorrow)\b",
    r"\b(?:by |on )(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b",
    r"\bby (?:next |this )?(?:week|month|quarter)\b",
    r"\bby \w+ \d{1,2}\b",
    r"\b(?:eod|eow|cob)\b",
    r"\b\d{1,2}/\d{1,2}(?:/\d{2,4})?\b",
]
TIMESTAMP = r"(?:\d{1,2}:)?\d{1,2}:\d{2}"


def parse_transcript(text):
    """Yield source-aware speaker turns; content is data, never instructions."""
    for line_number, raw in enumerate(text.splitlines(), 1):
        line = raw.strip()
        if not line:
            continue
        patterns = [
            rf"^\[({TIMESTAMP})\]\s*([\w .'-]{{1,60}}):\s*(.+)$",
            rf"^([\w .'-]{{1,60}})\s*\[({TIMESTAMP})\]:\s*(.+)$",
        ]
        match = re.match(patterns[0], line)
        if match:
            timestamp, speaker, utterance = match.groups()
        else:
            match = re.match(patterns[1], line)
            if match:
                speaker, timestamp, utterance = match.groups()
            else:
                match = re.match(r"^([A-Z][\w .'-]{0,59}?):\s*(.+)$", line)
                speaker, utterance = match.groups() if match else ("", line)
                timestamp = None
        yield {"speaker": speaker.strip(), "timestamp": timestamp, "line": line_number, "text": utterance.strip()}


def split_sentences(text):
    return [part.strip() for part in re.split(r"(?<=[.!?])\s+", text.strip()) if part.strip()]


def matches_any(sentence, patterns):
    return any(re.search(pattern, sentence.lower()) for pattern in patterns)


def extract_due_date(sentence):
    for pattern in DUE_DATE_PATTERNS:
        match = re.search(pattern, sentence.lower())
        if match:
            return match.group(0).strip()
    return None


def guess_owner(sentence, speaker):
    if re.search(r"\b(i|i'll|i will|i'm going to|i can|i need to|i should)\b", sentence, re.IGNORECASE):
        return speaker or "self"
    match = re.search(r"\b([A-Z][a-zA-Z]{1,30}) (?:will|'ll|is going to|can|needs to|should|to)\b", sentence)
    if match and match.group(1).lower() not in {"we", "they", "you", "i"}:
        return match.group(1)
    if re.search(r"\bwe (?:will|'ll|are going to|can|need to|should)\b", sentence, re.IGNORECASE):
        return "team"
    return "UNKNOWN"


def source(turn):
    citation = f"line {turn['line']}"
    if turn["timestamp"]:
        citation = f"{turn['timestamp']}, {citation}"
    if turn["speaker"]:
        citation = f"{turn['speaker']} @ {citation}"
    return citation


def analyze(text):
    result = {key: [] for key in ("decisions", "action_items", "open_questions", "risks", "pains", "quotes")}
    for turn in parse_transcript(text):
        for sentence in split_sentences(turn["text"]):
            item = {"speaker": turn["speaker"], "text": sentence, "source": source(turn)}
            if matches_any(sentence, DECISION_MARKERS):
                result["decisions"].append(item.copy())
            if matches_any(sentence, ACTION_MARKERS):
                action = item.copy()
                action.update(owner=guess_owner(sentence, turn["speaker"]), due=extract_due_date(sentence) or "UNKNOWN")
                result["action_items"].append(action)
            if sentence.endswith("?") or re.search(r"\b(?:open question|still tbd)\b", sentence, re.IGNORECASE):
                result["open_questions"].append(item.copy())
            if matches_any(sentence, RISK_MARKERS):
                result["risks"].append(item.copy())
            if matches_any(sentence, PAIN_MARKERS):
                result["pains"].append(item.copy())
                if turn["speaker"] and len(sentence.split()) > 8:
                    result["quotes"].append(item.copy())

    for key, items in result.items():
        seen = set()
        unique = []
        for item in items:
            normalized = item["text"].lower().strip()
            if normalized not in seen:
                seen.add(normalized)
                unique.append(item)
        result[key] = unique
    return result


def render_markdown(result, source_path):
    lines = ["# Meeting Analysis", "", "## Source and Verification", "", f"- Source: `{source_path}`", "- Analysis status: draft — human verification required", "- Recording/retention status: UNKNOWN", ""]
    sections = [("Decisions", "decisions"), ("Action Items", "action_items"), ("Open Questions", "open_questions"), ("Risks and Constraints", "risks"), ("Candidate Product Problems", "pains")]
    for title, key in sections:
        lines.extend([f"## {title}", ""])
        if not result[key]:
            lines.extend(["_No candidates detected._", ""])
            continue
        for item in result[key]:
            details = ""
            if key == "action_items":
                details = f" Owner: {item['owner']}. Due: {item['due']}."
            lines.extend([f"- {item['text']}{details} Source: {item['source']}.", ""])
    lines.extend(["## PRD Evidence Handoff", "", "- Supports: candidate statements requiring product-agent review.", "- Does not establish: market validation, priority, feasibility, or user demand.", "- Recommended follow-up evidence: UNKNOWN", ""])
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Extract source-linked meeting insight candidates.")
    parser.add_argument("transcript", help="UTF-8 transcript or meeting-notes file")
    parser.add_argument("--json", action="store_true", help="Print JSON")
    parser.add_argument("--output", help="Write draft meeting-analysis Markdown")
    args = parser.parse_args()
    try:
        path = Path(args.transcript)
        result = analyze(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    if args.output:
        Path(args.output).write_text(render_markdown(result, path), encoding="utf-8")
    print(json.dumps(result, indent=2) if args.json else render_markdown(result, path))
    return 0


if __name__ == "__main__":
    sys.exit(main())
