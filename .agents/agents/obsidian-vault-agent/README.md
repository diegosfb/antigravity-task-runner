# Obsidian Vault Agent

> Source contract: [`obsidian-vault-agent.md`](./obsidian-vault-agent.md). The source contract is authoritative if this summary and the contract differ.

## What it does

Optional knowledge recorder. As the SDLC progresses, it mirrors the project's artifacts - PRD, specs, ADRs, architecture, backlog/issues, estimation, UX, reviews, plus decisions, plans, implementation notes, workarounds, and test cases - into an Obsidian vault as a navigable graph of linked notes, using symlinks to the canonical files so nothing is duplicated. It also maintains an action log of what each agent did. Read-only toward the project; writes only inside the configured vault. Enabled and pointed at a vault folder via ADLC_workflow_settings.json.

## How it interacts with other agents

- **Workflow agents:** provide canonical artifacts and record material semantic outcomes after completing work.
- **Obsidian Vault Agent:** is the only agent allowed to write inside the configured vault and mirrors those artifacts without changing project source files.
- **Workflow relationship:** it is an off-workflow recorder. No agent handoff depends on it, and it never gates delivery.

## Input artifacts

- **Vault configuration:** `obsidian_vault.enabled`, `vault_path`, and `link_mode` from `ADLC_workflow_settings.json`.
- **Canonical project artifacts:** PRDs, specifications, ADRs, architecture documents, backlogs, estimates, UX artifacts, reviews, implementation plans, and test artifacts.
- **Semantic outcome records:** decisions, approaches, lessons, issues, trade-offs, implementation notes, and other material outcomes recorded by workflow agents.
- **Agent activity:** action metadata used to maintain the dated action log.

## Output artifacts

- **Vault structure:** the configured folder hierarchy, indexes, and maps of content.
- **Canonical artifact links:** repository-relative symlinks by default, or portable linked/copied notes when `link_mode` is `copy`.
- **Generated knowledge notes:** decisions, implementation notes, plans, lessons, and other linked summaries grounded in canonical artifacts.
- **Action log:** dated records of material actions performed by agents.

## Artifact locations

- Vault root: the configured `obsidian_vault.vault_path`, commonly `docs/vault/`
- Action records: `<vault_path>/Action-Log/`
- Vault layout and note templates: `references/vault-structure.md`

## Usage notes

- Invoke this agent only within the scope and activation rules defined in [`obsidian-vault-agent.md`](./obsidian-vault-agent.md).
- Preserve artifact traceability across handoffs; do not substitute summaries for required source evidence.
- Follow repository approval, security, validation, and failure-routing rules before declaring the work complete.
