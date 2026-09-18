---
name: data-scraper-agent
description: Build a fully automated AI-powered data collection agent for any public source such as job boards, prices, news, GitHub, sports, and listings. Use when the user wants to monitor, collect, scrape, or track public data automatically on a schedule, enrich results with a free LLM, and store them in Notion, Google Sheets, Supabase, or local files.
metadata:
  version: "1.0.0"
  library: "Community / source not recorded"
  library-url: ""
  pack: "Productivity Tools"
  origin: community
---

# Data Scraper Agent

Build a production-ready public-data monitoring agent that follows a simple pipeline:

`COLLECT -> ENRICH -> STORE`

- `COLLECT`: scrape or fetch from public websites, APIs, or RSS feeds
- `ENRICH`: score, summarize, classify, or filter with Gemini Flash
- `STORE`: write deduplicated results to Notion, Sheets, Supabase, or a local database

## When To Use

Activate this skill when the user wants any of the following:

- A bot that checks a public source repeatedly
- Monitoring for jobs, prices, listings, news, releases, scores, events, or repos
- A scraper that runs for free on a schedule
- AI enrichment such as scoring, summarization, sentiment, or categorization
- A system that improves over time from user feedback

## First Response Workflow

Start by pinning down the five implementation choices:

1. Data source: URL, API, RSS feed, or public endpoint
2. Required fields: title, price, URL, timestamp, score, tags, or source-specific data
3. Storage target: Notion, Google Sheets, Supabase, SQLite, or local files
4. Enrichment goal: summarize, classify, score, match, or filter
5. Schedule: hourly, daily, weekly, or manual-only

If the user is vague, offer common examples:

- Job boards: score relevance against a resume or role profile
- Product tracking: detect price drops or restocks
- GitHub monitoring: summarize new repos or releases
- News feeds: classify by topic or sentiment
- Sports or events: extract structured results into a tracker

## Default Architecture

Unless the user already has a codebase, scaffold around this shape:

```text
my-agent/
├── config.yaml
├── profile/
│   └── context.md
├── scraper/
│   ├── main.py
│   ├── filters.py
│   └── sources/
├── ai/
│   ├── client.py
│   ├── pipeline.py
│   ├── jd_fetcher.py
│   └── memory.py
├── storage/
│   └── notion_sync.py
├── data/
│   └── feedback.json
├── .env.example
├── setup.py
├── enrich_existing.py
├── requirements.txt
└── .github/workflows/scraper.yml
```

Adjust the storage module to `sheets_sync.py`, `supabase_sync.py`, or another provider when needed.

## Implementation Rules

- Prefer public APIs or RSS feeds before HTML scraping.
- Start with `requests` plus `BeautifulSoup`; use Playwright only when the site is JS-rendered.
- Keep all user-tunable behavior in `config.yaml`.
- Deduplicate before storage, usually by URL or a stable external ID.
- Use `.env` and GitHub Actions secrets for all credentials.
- Respect `robots.txt`, rate limits, and site terms.
- Add a fast rule-based pre-filter before any AI call.
- Batch AI requests instead of sending one request per item.
- Keep Gemini fallback models in priority order and retry on quota or model availability errors.

## AI Enrichment Rules

- Default to Gemini Flash family models for the free tier.
- Batch around 5 items per call unless the payload size requires smaller batches.
- Ask the model for JSON output only.
- Keep `maxOutputTokens` high enough for batched structured output.
- Store both machine-friendly fields like `ai_score` and human-readable fields like `ai_summary`.
- Build a preference prompt from prior user decisions so the scoring improves over time.

Use this fallback chain by default:

```text
gemini-2.0-flash-lite ->
gemini-2.0-flash ->
gemini-2.5-flash ->
gemini-flash-lite-latest
```

## Storage Guidance

- Notion is the best default when the user wants an easy review UI.
- Google Sheets is fine for lightweight tracking and simple collaboration.
- Supabase is better when the user needs a real database and app integrations.
- SQLite or JSON files are fine for local-first prototypes.

Always support:

- Deduplication
- Incremental syncs
- Clear item statuses such as `New`, `Saved`, `Rejected`, or `Applied`
- Feedback extraction from those statuses into `data/feedback.json`

## Scheduling Guidance

For free hosting, prefer GitHub Actions cron plus `workflow_dispatch`.

- Keep runs short and deterministic.
- Cache Python dependencies when possible.
- Commit updated feedback history back to the repo only when it changed.
- Document required secrets in `.env.example` and the repo README if one exists.

## Reference Map

Load [implementation-guide.md](references/implementation-guide.md) when you need detailed templates for:

- Scraper source modules
- Gemini REST client code
- Batch AI pipeline code
- Feedback memory implementation
- Notion sync implementation
- GitHub Actions workflow
- `config.yaml` and `requirements.txt` templates
- Scraping patterns, anti-patterns, and free-tier notes

## Delivery Checklist

Before considering the task complete, make sure:

- `config.yaml` controls all user-facing behavior
- `profile/context.md` holds reusable user context
- Deduplication happens before writing to storage
- Batch AI analysis is implemented
- Feedback is persisted and reused
- `.env.example` exists
- A scheduled workflow or equivalent runner exists
- Setup and backfill entry points exist when the project needs them

## Output Style

When using this skill, produce:

1. A concrete architecture recommendation for the chosen source and storage target
2. The scaffolded files or patches needed to make it runnable
3. Minimal setup instructions with required secrets
4. Any legal or operational caveats for the chosen source
