---
name: bigquery-transformation-frameworks
description: Build, modify, troubleshoot, and optimize BigQuery ELT projects using dbt or Dataform. Use when a request mentions dbt, Dataform, SQLX, dbt models, Dataform actions, or choosing between these BigQuery transformation frameworks.
license: Apache-2.0
metadata:
  version: "v2"
  library: "Google Data Agent Kit"
  library-url: "https://github.com/gemini-cli-extensions/data-agent-kit-starter-pack"
  pack: "Software Development"
  publisher: google
---

# BigQuery Transformation Frameworks

Build correct, efficient BigQuery ELT pipelines with dbt or Dataform while
preserving the conventions and validation workflow of the selected framework.

## Select the framework

- If the repository contains `dbt_project.yml`, or the request mentions dbt,
  models, Jinja, or `profiles.yml`, read [references/dbt.md](references/dbt.md)
  and follow its dbt workflow.
- If the repository contains `workflow_settings.yaml`, or the request mentions
  Dataform, SQLX, actions, or declarations, read
  [references/dataform.md](references/dataform.md) and follow its Dataform
  workflow.
- If both frameworks are present, apply the appropriate reference to each
  affected project and keep their configuration and validation separate.
- If neither the request nor repository identifies a framework, explain the
  relevant tradeoffs and ask the user to choose before generating framework-
  specific files.

## Shared constraints

- Inspect existing configuration and compiled project state before changing
  pipeline code.
- Confirm source and destination BigQuery assets rather than inventing them.
- Apply the repository's BigQuery optimization and data-quality guidance when
  it is relevant to the requested transformation.
- Compile and run non-mutating validation for the selected framework.
- Never execute `dbt run` or a real `dataform run` without explicit user
  authorization.
- Do not create or expose credentials. Follow repository security policy for
  authentication setup and secret-bearing local files.
