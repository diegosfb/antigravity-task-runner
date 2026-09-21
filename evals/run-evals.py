#!/usr/bin/env python3
"""Grade captured agent evidence against deterministic JSONL cases."""

import argparse
import json
from pathlib import PurePosixPath
import sys


class EvalInputError(Exception):
    def __init__(self, path, line, kind):
        super().__init__(kind)
        self.path = path
        self.line = line
        self.kind = kind


def is_string_list(value):
    return isinstance(value, list) and all(isinstance(item, str) for item in value)


def normalize_repository_path(path):
    if not isinstance(path, str) or not path or path.startswith("/"):
        return None
    while path.startswith("./"):
        path = path[2:]
    parts = PurePosixPath(path).parts
    if not parts or ".." in parts:
        return None
    return PurePosixPath(*parts).as_posix()


def record_has_valid_schema(record, record_kind):
    if record_kind == "case":
        allowed_fields = {
            "id", "description", "expected_agent", "approval_required",
            "forbidden_changes", "required_artifact_prefix", "tags",
            "required_agent_sequence", "required_artifacts",
            "required_handoffs", "required_gates", "expected_outcome",
        }
        checks = (
            ("description", str),
            ("expected_agent", str),
            ("approval_required", bool),
            ("forbidden_changes", is_string_list),
            ("required_artifact_prefix", str),
            ("tags", is_string_list),
            ("required_agent_sequence", is_string_list),
            ("required_artifacts", is_string_list),
            ("required_handoffs", is_string_list),
            ("required_gates", is_string_list),
            ("expected_outcome", str),
        )
    else:
        allowed_fields = {
            "id", "selected_agent", "approval_requested", "changed_files",
            "artifacts", "agent_sequence", "artifact_types", "handoffs",
            "gates", "outcome",
        }
        checks = (
            ("selected_agent", str),
            ("approval_requested", bool),
            ("changed_files", is_string_list),
            ("artifacts", is_string_list),
            ("agent_sequence", is_string_list),
            ("artifact_types", is_string_list),
            ("handoffs", is_string_list),
            ("gates", is_string_list),
            ("outcome", str),
        )
    if set(record) - allowed_fields:
        return False
    for field, validator in checks:
        if field not in record:
            continue
        if validator in (str, bool):
            valid = isinstance(record[field], validator)
        else:
            valid = validator(record[field])
        if not valid:
            return False
    if record_kind == "case":
        if "forbidden_changes" in record and any(
            normalize_repository_path(path) is None
            for path in record["forbidden_changes"]
        ):
            return False
        if "required_artifact_prefix" in record and normalize_repository_path(
            record["required_artifact_prefix"]
        ) is None:
            return False
    return True


def read_jsonl(path, record_kind):
    with open(path, encoding="utf-8") as source:
        records = []
        identifiers = set()
        for line_number, line in enumerate(source, 1):
            if not line.strip():
                continue
            try:
                record = json.loads(line)
            except ValueError:
                raise EvalInputError(path, line_number, "invalid JSONL")
            if not isinstance(record, dict) or not isinstance(record.get("id"), str) or not record["id"]:
                raise EvalInputError(path, line_number, "invalid record")
            if not record_has_valid_schema(record, record_kind):
                raise EvalInputError(path, line_number, "invalid record")
            if record["id"] in identifiers:
                raise EvalInputError(path, line_number, "duplicate id")
            identifiers.add(record["id"])
            records.append(record)
        return records


def path_matches_prefix(path, prefix):
    normalized_prefix = prefix.rstrip("/")
    return path == normalized_prefix or path.startswith(normalized_prefix + "/")


def is_ordered_subsequence(required, observed):
    required_index = 0
    for item in observed:
        if required_index < len(required) and item == required[required_index]:
            required_index += 1
    return required_index == len(required)


def evaluate(cases, evidence_records):
    evidence_by_id = {record["id"]: record for record in evidence_records}
    results = []
    for case in cases:
        evidence = evidence_by_id.get(case["id"])
        failures = []
        if evidence is None:
            results.append({
                "id": case["id"],
                "status": "fail",
                "failures": ["evidence missing"],
            })
            continue
        expected_agent = case.get("expected_agent")
        if expected_agent and evidence.get("selected_agent") != expected_agent:
            failures.append("selected_agent must be {}".format(expected_agent))
        if case.get("approval_required") and evidence.get("approval_requested") is not True:
            failures.append("approval must be requested before implementation")
        for changed_file in evidence.get("changed_files", []):
            normalized_file = normalize_repository_path(changed_file)
            if normalized_file is None:
                failures.append("changed_files path must be repository-relative")
                continue
            if any(
                path_matches_prefix(normalized_file, prefix)
                for prefix in case.get("forbidden_changes", [])
            ):
                failures.append("forbidden path changed: {}".format(changed_file))
        required_prefix = case.get("required_artifact_prefix")
        if required_prefix and not any(
            normalize_repository_path(artifact) is not None
            and path_matches_prefix(
                normalize_repository_path(artifact),
                normalize_repository_path(required_prefix),
            )
            for artifact in evidence.get("artifacts", [])
        ):
            failures.append(
                "required artifact missing under {}".format(required_prefix)
            )
        required_sequence = case.get("required_agent_sequence", [])
        if required_sequence and not is_ordered_subsequence(
            required_sequence, evidence.get("agent_sequence", [])
        ):
            failures.append("required agent sequence was not observed in order")
        for case_field, evidence_field, label in (
            ("required_artifacts", "artifact_types", "artifact"),
            ("required_handoffs", "handoffs", "handoff"),
            ("required_gates", "gates", "gate"),
        ):
            observed = evidence.get(evidence_field, [])
            for required_item in case.get(case_field, []):
                if required_item not in observed:
                    failures.append(
                        "required {} missing: {}".format(label, required_item)
                    )
        expected_outcome = case.get("expected_outcome")
        if expected_outcome and evidence.get("outcome") != expected_outcome:
            failures.append("outcome must be {}".format(expected_outcome))
        results.append({
            "id": case["id"],
            "status": "fail" if failures else "pass",
            "failures": failures,
        })
    failed = sum(1 for result in results if result["status"] == "fail")
    return {
        "totals": {
            "cases": len(results),
            "passed": len(results) - failed,
            "failed": failed,
        },
        "results": results,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cases", required=True)
    parser.add_argument("--evidence", required=True)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    try:
        report = evaluate(
            read_jsonl(args.cases, "case"),
            read_jsonl(args.evidence, "evidence"),
        )
    except EvalInputError as error:
        payload = {
            "error": error.kind,
            "path": error.path,
            "line": error.line,
        }
        if args.json:
            print(json.dumps(payload, indent=2, sort_keys=True))
        else:
            print(
                "invalid JSONL: {} line {}".format(error.path, error.line),
                file=sys.stderr,
            )
        return 2
    except OSError as error:
        payload = {
            "error": "input unavailable",
            "path": error.filename,
        }
        if args.json:
            print(json.dumps(payload, indent=2, sort_keys=True))
        else:
            print("input unavailable: {}".format(error.filename), file=sys.stderr)
        return 2
    if args.json:
        print(json.dumps(report, indent=2, sort_keys=True))
    else:
        print("{passed}/{cases} cases passed".format(**report["totals"]))
    return 1 if report["totals"]["failed"] else 0


if __name__ == "__main__":
    sys.exit(main())
