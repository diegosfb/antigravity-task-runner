# Data Scraper Agent Reference

Use this file when building or updating a scraper agent. It contains the detailed patterns, templates, and examples that support the main skill workflow.

## Stack

- Python
- Gemini Flash via REST API
- GitHub Actions
- Notion, Google Sheets, Supabase, SQLite, or local files

## Source Discovery Questions

Ask the user:

1. What should we collect?
2. Which fields matter?
3. Where should the results be stored?
4. How should AI enrich the results?
5. How often should the agent run?

## Suggested Project Structure

```text
my-agent/
├── config.yaml
├── profile/
│   └── context.md
├── scraper/
│   ├── __init__.py
│   ├── main.py
│   ├── filters.py
│   └── sources/
│       ├── __init__.py
│       └── source_name.py
├── ai/
│   ├── __init__.py
│   ├── client.py
│   ├── pipeline.py
│   ├── jd_fetcher.py
│   └── memory.py
├── storage/
│   ├── __init__.py
│   └── notion_sync.py
├── data/
│   └── feedback.json
├── .env.example
├── setup.py
├── enrich_existing.py
├── requirements.txt
└── .github/
    └── workflows/
        └── scraper.yml
```

## Source Template

```python
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone
from scraper.filters import is_relevant

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; research-bot/1.0)",
}


def fetch() -> list[dict]:
    results = []
    resp = requests.get("https://api.example.com/items", headers=HEADERS, timeout=15)
    if resp.status_code == 200:
        for item in resp.json().get("results", []):
            if not is_relevant(item.get("title", "")):
                continue
            results.append(_normalise(item))
    return results


def _normalise(raw: dict) -> dict:
    return {
        "name": raw.get("title", ""),
        "url": raw.get("link", ""),
        "source": "MySource",
        "date_found": datetime.now(timezone.utc).date().isoformat(),
    }
```

## HTML Scraping Pattern

```python
soup = BeautifulSoup(resp.text, "lxml")
for card in soup.select("[class*='listing']"):
    title = card.select_one("h2, h3").get_text(strip=True)
    link = card.select_one("a")["href"]
    if not link.startswith("http"):
        link = f"https://example.com{link}"
```

## RSS Pattern

```python
import xml.etree.ElementTree as ET

root = ET.fromstring(resp.text)
for item in root.findall(".//item"):
    title = item.findtext("title", "")
    link = item.findtext("link", "")
```

## Paginated API Pattern

```python
page = 1
while True:
    resp = requests.get(url, params={"page": page, "limit": 50}, timeout=15)
    data = resp.json()
    items = data.get("results", [])
    if not items:
        break
    for item in items:
        results.append(_normalise(item))
    if not data.get("has_more"):
        break
    page += 1
```

## JS-Rendered Sites

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto(url)
    page.wait_for_selector(".listing")
    html = page.content()
    browser.close()
```

## Gemini Client Template

```python
import os
import json
import time
import requests

_last_call = 0.0

MODEL_FALLBACK = [
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.5-flash",
    "gemini-flash-lite-latest",
]


def generate(prompt: str, model: str = "", rate_limit: float = 7.0) -> dict:
    global _last_call
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        return {}

    elapsed = time.time() - _last_call
    if elapsed < rate_limit:
        time.sleep(rate_limit - elapsed)

    models = [model] + [m for m in MODEL_FALLBACK if m != model] if model else MODEL_FALLBACK
    _last_call = time.time()

    for m in models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.3,
                "maxOutputTokens": 2048,
            },
        }
        try:
            resp = requests.post(url, json=payload, timeout=30)
            if resp.status_code == 200:
                return _parse(resp)
            if resp.status_code in (429, 404):
                time.sleep(1)
                continue
            return {}
        except requests.RequestException:
            return {}

    return {}


def _parse(resp) -> dict:
    try:
        text = (
            resp.json()
            .get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
            .strip()
        )
        if text.startswith("```"):
            text = text.split("\n", 1)[-1].rsplit("```", 1)[0]
        return json.loads(text)
    except (json.JSONDecodeError, KeyError):
        return {}
```

## Batch AI Pipeline Template

```python
import json
import yaml
from pathlib import Path
from ai.client import generate


def analyse_batch(items: list[dict], context: str = "", preference_prompt: str = "") -> list[dict]:
    config = yaml.safe_load((Path(__file__).parent.parent / "config.yaml").read_text())
    model = config.get("ai", {}).get("model", "gemini-2.5-flash")
    rate_limit = config.get("ai", {}).get("rate_limit_seconds", 7.0)
    min_score = config.get("ai", {}).get("min_score", 0)
    batch_size = config.get("ai", {}).get("batch_size", 5)

    batches = [items[i:i + batch_size] for i in range(0, len(items), batch_size)]
    enriched = []
    for batch in batches:
        prompt = _build_prompt(batch, context, preference_prompt, config)
        result = generate(prompt, model=model, rate_limit=rate_limit)
        analyses = result.get("analyses", [])
        for i, item in enumerate(batch):
            ai = analyses[i] if i < len(analyses) else {}
            if ai:
                score = max(0, min(100, int(ai.get("score", 0))))
                if min_score and score < min_score:
                    continue
                enriched.append({
                    **item,
                    "ai_score": score,
                    "ai_summary": ai.get("summary", ""),
                    "ai_notes": ai.get("notes", ""),
                })
            else:
                enriched.append(item)
    return enriched


def _build_prompt(batch, context, preference_prompt, config):
    priorities = config.get("priorities", [])
    items_text = "\n\n".join(
        f"Item {i+1}: {json.dumps({k: v for k, v in item.items() if not k.startswith('_')})}"
        for i, item in enumerate(batch)
    )
    return f"""Analyse these {len(batch)} items and return JSON.

# Items
{items_text}

# User Context
{context[:800] if context else "Not provided"}

# User Priorities
{chr(10).join(f"- {p}" for p in priorities)}

{preference_prompt}

# Instructions
Return: {{"analyses": [{{"score": <0-100>, "summary": "<2 sentences>", "notes": "<why this matches or doesn't>"}} for each item in order]}}
Be concise."""
```

## Feedback Memory Template

```python
import json
from pathlib import Path

FEEDBACK_PATH = Path(__file__).parent.parent / "data" / "feedback.json"


def load_feedback() -> dict:
    if FEEDBACK_PATH.exists():
        try:
            return json.loads(FEEDBACK_PATH.read_text())
        except (json.JSONDecodeError, OSError):
            pass
    return {"positive": [], "negative": []}


def save_feedback(fb: dict):
    FEEDBACK_PATH.parent.mkdir(parents=True, exist_ok=True)
    FEEDBACK_PATH.write_text(json.dumps(fb, indent=2))


def build_preference_prompt(feedback: dict, max_examples: int = 15) -> str:
    lines = []
    if feedback.get("positive"):
        lines.append("# Items the user LIKED:")
        for e in feedback["positive"][-max_examples:]:
            lines.append(f"- {e}")
    if feedback.get("negative"):
        lines.append("")
        lines.append("# Items the user REJECTED:")
        for e in feedback["negative"][-max_examples:]:
            lines.append(f"- {e}")
    if lines:
        lines.append("")
        lines.append("Use these patterns to bias scoring on new items.")
    return "\n".join(lines)
```

## Notion Sync Template

```python
import os
from notion_client import Client
from notion_client.errors import APIResponseError

_client = None


def get_client():
    global _client
    if _client is None:
        _client = Client(auth=os.environ["NOTION_TOKEN"])
    return _client


def get_existing_urls(db_id: str) -> set[str]:
    client, seen, cursor = get_client(), set(), None
    while True:
        resp = client.databases.query(
            database_id=db_id,
            page_size=100,
            **({"start_cursor": cursor} if cursor else {})
        )
        for page in resp["results"]:
            url = page["properties"].get("URL", {}).get("url", "")
            if url:
                seen.add(url)
        if not resp["has_more"]:
            break
        cursor = resp["next_cursor"]
    return seen


def push_item(db_id: str, item: dict) -> bool:
    props = {
        "Name": {"title": [{"text": {"content": item.get("name", "")[:100]}}]},
        "URL": {"url": item.get("url")},
        "Source": {"select": {"name": item.get("source", "Unknown")}},
        "Date Found": {"date": {"start": item.get("date_found")}},
        "Status": {"select": {"name": "New"}},
    }
    if item.get("ai_score") is not None:
        props["AI Score"] = {"number": item["ai_score"]}
    if item.get("ai_summary"):
        props["Summary"] = {"rich_text": [{"text": {"content": item["ai_summary"][:2000]}}]}
    if item.get("ai_notes"):
        props["Notes"] = {"rich_text": [{"text": {"content": item["ai_notes"][:2000]}}]}

    try:
        get_client().pages.create(parent={"database_id": db_id}, properties=props)
        return True
    except APIResponseError as e:
        print(f"[notion] Push failed: {e}")
        return False


def sync(db_id: str, items: list[dict]) -> tuple[int, int]:
    existing = get_existing_urls(db_id)
    added = skipped = 0
    for item in items:
        if item.get("url") in existing:
            skipped += 1
            continue
        if push_item(db_id, item):
            added += 1
            existing.add(item["url"])
        else:
            skipped += 1
    return added, skipped
```

## Main Orchestrator Template

```python
import os
import sys
import yaml
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

from scraper.sources import my_source
from storage.notion_sync import sync

SOURCES = [
    ("My Source", my_source.fetch),
]


def ai_enabled():
    return bool(os.environ.get("GEMINI_API_KEY"))


def main():
    config = yaml.safe_load((Path(__file__).parent.parent / "config.yaml").read_text())
    provider = config.get("storage", {}).get("provider", "notion")

    if provider == "notion":
        db_id = os.environ.get("NOTION_DATABASE_ID")
        if not db_id:
            print("ERROR: NOTION_DATABASE_ID not set")
            sys.exit(1)
    else:
        print(f"ERROR: provider '{provider}' not yet wired in main.py")
        sys.exit(1)

    all_items = []
    for name, fetch_fn in SOURCES:
        try:
            items = fetch_fn()
            print(f"[{name}] {len(items)} items")
            all_items.extend(items)
        except Exception as e:
            print(f"[{name}] FAILED: {e}")

    seen, deduped = set(), []
    for item in all_items:
        url = item.get("url", "")
        if url and url not in seen:
            seen.add(url)
            deduped.append(item)

    if ai_enabled() and deduped:
        from ai.memory import load_feedback, build_preference_prompt
        from ai.pipeline import analyse_batch

        feedback = load_feedback()
        preference = build_preference_prompt(feedback)
        context_path = Path(__file__).parent.parent / "profile" / "context.md"
        context = context_path.read_text() if context_path.exists() else ""
        deduped = analyse_batch(deduped, context=context, preference_prompt=preference)

    added, skipped = sync(db_id, deduped)
    print(f"Done: {added} new, {skipped} existing")


if __name__ == "__main__":
    main()
```

## GitHub Actions Workflow

```yaml
name: Data Scraper Agent

on:
  schedule:
    - cron: "0 */3 * * *"
  workflow_dispatch:

permissions:
  contents: write

jobs:
  scrape:
    runs-on: ubuntu-latest
    timeout-minutes: 20

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: "pip"

      - run: pip install -r requirements.txt

      - name: Run agent
        env:
          NOTION_TOKEN: ${{ secrets.NOTION_TOKEN }}
          NOTION_DATABASE_ID: ${{ secrets.NOTION_DATABASE_ID }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
        run: python -m scraper.main

      - name: Commit feedback history
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add data/feedback.json || true
          git diff --cached --quiet || git commit -m "chore: update feedback history"
          git push
```

## config.yaml Template

```yaml
filters:
  required_keywords: []
  blocked_keywords: []

priorities:
  - "example priority 1"
  - "example priority 2"

storage:
  provider: "notion"

feedback:
  positive_statuses: ["Saved", "Applied", "Interested"]
  negative_statuses: ["Skip", "Rejected", "Not relevant"]

ai:
  enabled: true
  model: "gemini-2.5-flash"
  min_score: 0
  rate_limit_seconds: 7
  batch_size: 5
```

## requirements.txt Template

```text
requests==2.31.0
beautifulsoup4==4.12.3
lxml==5.1.0
python-dotenv==1.0.1
pyyaml==6.0.2
notion-client==2.2.1
# playwright==1.40.0
```

## Anti-Patterns

- One LLM call per item
- Hardcoded filters in code instead of config
- No rate limiting or crawl politeness
- Secrets stored in the repository
- No deduplication before writes
- Using `requests` against a JS-rendered site that exposes no server-rendered content
- AI responses without structured output requirements

## Free-Tier Notes

- Gemini Flash Lite is a good primary choice for scheduled batched analysis.
- Public GitHub Actions workflows are a strong zero-cost scheduler.
- Notion works well for review-heavy flows.
- Supabase is better when the user needs SQL, joins, or an app backend.

## Example Requests

- Build me an agent that monitors Hacker News for AI startup funding news.
- Scrape product prices from three e-commerce sites and alert on drops.
- Track new GitHub repos tagged `llm` or `agents` and summarize each one.
- Collect operations job listings into Notion and rank them by fit.
- Monitor sports fixtures and keep a structured table in Google Sheets.
