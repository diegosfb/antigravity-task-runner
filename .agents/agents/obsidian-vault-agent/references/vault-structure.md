# Vault Structure

The layout the obsidian-vault-agent maintains under `vault_path`, the note
templates, and the linking conventions. All paths are relative to `vault_path`.

## Folder map

```text
<vault_path>/
├── 00-index.md              # top Map of Content — entry point, links to every area + feature MOC
├── PRD/                     # symlink → docs/project_description/PRD.md
├── Specs/                   # symlinks → docs/specs/*.md
├── Architecture/            # symlinks → architecture.md, development_guidelines.md
├── ADRs/                    # symlinks → docs/architecture/adrs/*.md
├── Backlog/                 # symlinks → docs/backlog/*.md  (epics/features/bugs/tasks = issues)
├── Estimation/              # symlinks → docs/estimation/*
├── UX/                      # symlinks → docs/ux/*
├── Reviews/                 # symlinks → docs/reviews/*  (judge, drift, red-team reports)
├── Implementation-Plans/    # AUTHORED exact approved implementation plans
├── Notes/                   # AUTHORED decisions, implementation notes, workarounds
├── Test-Cases/              # test-case notes (symlink to test files where they exist, else authored)
├── MOCs/                    # one Map-of-Content note per feature
└── Action-Log/              # YYYY-MM-DD.md append-only action records
```

Symlinked areas mirror the canonical files (single source of truth). Authored
areas (`Implementation-Plans/`, `Notes/`, `MOCs/`, `Action-Log/`, `00-index.md`, and Test-Cases you
write) are real `.md` files the agent owns.

## Linking conventions

- **Symlink a source in:** relative link from the vault to `docs/…`, e.g.
  `ADRs/0001-postgres.md → ../../docs/architecture/adrs/0001-postgres.md`.
- **Wikilink between notes:** `[[0001-postgres]]` resolves to the note of that
  basename anywhere in the vault. Prefer basename links so moves don't break them.
- **Relationship graph to build** (both directions where it helps navigation):
  - a **Spec** links to the **ADRs** that answer it, the **Backlog** items that
    implement it, and the **Test-Cases** that verify its acceptance criteria;
  - an **ADR** links back to its **Spec** and to the **Architecture** doc;
  - a **Backlog** item links to its **Spec**, the **ADRs** that bind it, and its
    **Test-Cases**;
  - a **Review** links to the artifact it judged;
  - every note links up to its **feature MOC**.

## `00-index.md` (top MOC)

```markdown
# <Project> — Design Vault

Living mirror of the project's design. Notes marked with a link icon are
symlinks to the canonical file in `docs/`; edit those in `docs/`, not here.

## Features
- [[MOC - <feature>]]

## Areas
- [[PRD]] · Specs · [[Architecture]] · ADRs · Backlog · Estimation · UX · Reviews
- Implementation-Plans · Notes (decisions / implementation / workarounds) · Test-Cases · Action-Log

_Last synced: <ISO date>_
```

## Feature MOC (`MOCs/MOC - <feature>.md`)

```markdown
# MOC — <feature>

**Spec:** [[<spec>]]
**Architecture / ADRs:** [[architecture]] · [[<adr>]] …
**Backlog:** [[<epic>]] · [[<feature-item>]] · [[<task>]] …
**Tests:** [[<test-case>]] …
**Reviews:** [[<judge/drift/red-team report>]] …

## Decisions
- [[<decision note>]]

## Implementation notes & workarounds
- [[<impl note>]]

## Open issues
- [[<issue>]]
```

## Approved plan template (`Implementation-Plans/<timestamp>-plan-<slug>.md`)

Approved developer plans preserve the exact Markdown presented to and approved
by the user. Their frontmatter uses `kind: plan`. Legacy plan notes found under
`Notes/` migrate here without overwriting an existing destination.

## Authored note template (`Notes/<kind>-<slug>.md`)

For decisions, implementation notes, and workarounds the agent authors
from agent action records (these are not files that exist in `docs/`):

```markdown
---
kind: decision | implementation-note | workaround | issue
date: <ISO>
by: <agent>
relates: ["[[<artifact>]]", "..."]
---

# <title>

<one- to few-paragraph summary of the decision/plan/note, in the author agent's words>

**Context / why:** <…>
**Affects:** [[<artifact>]]
```

## Action-Log entry (`Action-Log/YYYY-MM-DD.md`)

Append-only. One bullet per completed agent action:

```markdown
# Action log — <YYYY-MM-DD>

- HH:MM · **<agent>** <verb> [[<artifact>]] — <one-line summary>
```

## Test-Cases

- If test files exist in the repo, symlink them in and give each a note that
  links to the spec acceptance criterion it covers.
- If a test case is described but not yet coded, author a stub note under
  `Test-Cases/` linking to its spec and backlog item, tagged `#pending`.
