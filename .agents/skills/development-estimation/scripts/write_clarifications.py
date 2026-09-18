#!/usr/bin/env python3
import argparse
import csv
import json
import re
import sys
from datetime import datetime, timezone
from io import StringIO
from pathlib import Path

DIMENSIONS = {
    "scope",
    "technical_complexity",
    "uncertainty",
    "dependencies",
    "integration_surface",
    "testing_burden",
    "compatibility",
    "risk",
}
REQUIRED_QUESTION_FIELDS = ("category", "question", "why_it_matters", "estimation_dimension")


def read_output_folder(config_path):
    config_path = Path(config_path)
    for raw in config_path.read_text(errors="replace").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        if key.strip() == "OUTPUT_FOLDER":
            value = value.strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in "'\"":
                value = value[1:-1].strip()
            if not value:
                break
            folder = Path(value).expanduser()
            if not folder.is_absolute():
                folder = config_path.resolve().parent / folder
            return folder
    raise ValueError("OUTPUT_FOLDER is missing from the StoryPoint council config.")


def parse_single_task(text):
    try:
        value = json.loads(text)
        if isinstance(value, dict):
            return value
    except (json.JSONDecodeError, TypeError):
        pass
    try:
        rows = list(csv.DictReader(StringIO(text)))
        if len(rows) == 1:
            return rows[0]
    except (csv.Error, TypeError):
        pass
    raise ValueError("Task input must be a single JSON object or one-row CSV.")


def resolve_task(task, task_source):
    try:
        path = Path(task)
        if path.is_file():
            return parse_single_task(path.read_text(errors="replace"))
    except OSError:
        pass
    source = Path(task_source)
    if source.is_file():
        with source.open(newline="", encoding="utf-8-sig") as handle:
            for row in csv.DictReader(handle):
                task_id = row.get("test_id") or row.get("task_id") or row.get("id")
                if task_id == task:
                    return row
    return parse_single_task(task)


def load_questions(path):
    value = json.loads(Path(path).read_text())
    if isinstance(value, dict):
        value = value.get("questions")
    if not isinstance(value, list):
        raise ValueError("Questions file must contain a JSON list or a questions list.")
    questions = []
    for index, item in enumerate(value, 1):
        if not isinstance(item, dict):
            raise ValueError(f"Question {index} must be a JSON object.")
        missing = [field for field in REQUIRED_QUESTION_FIELDS if not str(item.get(field, "")).strip()]
        if missing:
            raise ValueError(f"Question {index} is missing: {', '.join(missing)}.")
        dimension = str(item["estimation_dimension"]).strip()
        if dimension not in DIMENSIONS:
            raise ValueError(f"Question {index} has invalid estimation_dimension: {dimension}.")
        questions.append({
            "id": f"Q{index}",
            "category": str(item["category"]).strip(),
            "question": str(item["question"]).strip(),
            "why_it_matters": str(item["why_it_matters"]).strip(),
            "estimation_dimension": dimension,
        })
    return questions


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--task", required=True, help="Task ID, single-task file, or inline JSON task")
    parser.add_argument("--task-source", default="storypoints-test-data/test/new-tasks.csv")
    parser.add_argument("--questions-file", required=True)
    parser.add_argument("--config", default=".agents/skills/storypoints-council/storypoints-council.openrouter.conf")
    args = parser.parse_args()

    try:
        task = resolve_task(args.task, args.task_source)
        questions = load_questions(args.questions_file)
        folder = read_output_folder(args.config)
        folder.mkdir(parents=True, exist_ok=True)
        task_id = task.get("test_id") or task.get("task_id") or task.get("id")
        if not task_id:
            raise ValueError("Task ID is missing.")
        safe_task_id = re.sub(r"[^A-Za-z0-9._-]+", "_", str(task_id)).strip("._")
        if not safe_task_id:
            raise ValueError("Task ID cannot form a safe filename.")
        now = datetime.now(timezone.utc)
        output = folder / f"{safe_task_id}_clarification-questions_{now.strftime('%Y%m%dT%H%M%SZ')}.json"
        artifact = {
            "timestamp": now.isoformat(),
            "task_id": task_id,
            "title": task.get("title") or "",
            "description": task.get("description") or task.get("task_description") or "",
            "questions": questions,
        }
        output.write_text(json.dumps(artifact, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    except Exception as error:
        sys.exit(f"Clarification output error: {error}")
    print(output)


if __name__ == "__main__":
    main()
