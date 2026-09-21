# ADLC Workflow Settings Help

This guide explains `ADLC_workflow_settings.json` for first-time users. The file controls how the ADLC/SDLC agent workflow asks for approvals, runs review gates, manages developer Git behavior, tracks failures, and records work into an Obsidian vault.

## What This File Is

`ADLC_workflow_settings.json` is a project-level configuration file. Agents read it from the project root.

If the file is missing, unreadable, or contains invalid values, agents must fall back to the documented safe defaults and report that fallback. The defaults are intentionally conservative: approval gates stay required, security checks stay enabled, and unsafe automation does not silently proceed.

You can edit these settings in two ways:

- Open `TaskRunner Settings` and use the `SDLC Settings` tab.
- Edit `ADLC_workflow_settings.json` directly.

Prefer the `SDLC Settings` tab for routine changes because it shows descriptions, tooltips, allowed values, and read-only policy-locked fields.

## Quick Start For First-Time Users

Most teams should start with the default file as-is.

Recommended first pass:

1. Leave all approval gates as `required`.
2. Leave `security_check.pre_commit` and `security_check.pre_pr` as `true`.
3. Leave `developer_git_workflow.mode` as `always-branch-and-pr`.
4. Leave `test_red_team.trigger_mode` as `every-pr`.
5. Decide whether you want `obsidian_vault.enabled`.
6. If vault recording is enabled, confirm `obsidian_vault.vault_path` exists or can be created.
7. Only relax gates after the team understands the workflow and has repository protections in place.

## Important Safety Rules

- Validation is always mandatory. Settings can skip user approval prompts, but they do not skip artifact validation.
- Mandatory approval gates are policy-locked. Changing them in JSON is ignored and must be reported by agents.
- Missing or invalid values fail safe to documented defaults.
- No setting allows direct implementation or commits on `main`.
- Security and red-team gates are agent workflow controls. They do not replace deterministic CI, repository protections, or local Git hooks.
- Obsidian vault recording writes only inside `obsidian_vault.vault_path`.

## File Structure

The file has these top-level sections:

| Section | Purpose |
| --- | --- |
| `version` | Settings schema version. Currently `1`. |
| `_about` | Human-readable description of the file. |
| `spoken_plan` | Optional audio narration behavior for implementation plans. |
| `user_approval_gates` | User approval requirements for major artifacts and workflow milestones. |
| `product_pre_mortem` | Product-agent risk analysis before PRD handoff. |
| `llm_judge` | Optional second-opinion review from a different model/provider. |
| `spec_validation` | Spec drift and spec red-team automation. |
| `security_check` | Security-check-agent gates before commits and PRs. |
| `test_red_team` | Red-team behavior owned by test-agent. |
| `developer_git_workflow` | Branch, PR, hook, and post-PR behavior for developer-agent work. |
| `test_failure_tracking` | Whether actionable test failures become backlog items. |
| `obsidian_vault` | Obsidian vault mirroring and action-log behavior. |

Metadata keys such as `_default`, `_defaults`, `_options`, `_notes`, and `_cross_model` document behavior. They are for humans and agents. Do not delete them unless you intentionally want less help and weaker self-documentation.

## Setting Reference

### `version`

```jsonc
"version": 1
```

What it does:

- Identifies the settings schema version.
- Helps future agents or tools understand how to interpret the file.

Allowed values:

| Value | Meaning |
| --- | --- |
| `1` | Current schema version. |

Recommended value:

- Keep `1`.

### `spoken_plan.enabled`

```jsonc
"spoken_plan": {
  "enabled": false
}
```

What it does:

- Controls whether Codex automatically plays a safe conversational audio explanation of each implementation plan before requesting approval.
- This is audio-only. Written plans and approval gates still apply.

Allowed values:

| Value | Meaning |
| --- | --- |
| `true` | Play narrated implementation plans before approval. |
| `false` | Present written plans without audio narration. |

Default:

- `false`

When to use `true`:

- You want spoken review of plans for accessibility, multitasking, or walkthrough-style approval.

When to keep `false`:

- You prefer written-only plan review.
- Your environment does not support safe audio playback.

Failure behavior:

- Missing, unreadable, or non-boolean values fail safe to `false` and must be reported.

### `spoken_plan.interrupted_by_next_command`

```jsonc
"spoken_plan": {
  "interrupted_by_next_command": false
}
```

What it does:

- Controls whether active narration is stopped before processing the next user message.
- Stopping narration never implies approval.

Allowed values:

| Value | Meaning |
| --- | --- |
| `true` | Start narration in the background, show the plan immediately, and stop narration when the next user command arrives. |
| `false` | Wait for narration to finish before presenting the plan and approval prompt. |

Default:

- `false`

Recommended value:

- Use `true` if narration should not block quick approval or correction.
- Use `false` if you want narration to complete before review.

### `user_approval_gates.configurable`

```jsonc
"user_approval_gates": {
  "configurable": {
    "prd": "required",
    "specifications": "required",
    "ux_ui_design": "required",
    "architecture": "required",
    "backlog_plan": "required",
    "test_plan": "required",
    "pull_request_creation": "required"
  }
}
```

What it does:

- Controls whether agents ask the user to explicitly approve specific artifacts and workflow milestones after validation.
- Validation still runs even when a prompt is skipped.

Allowed values:

| Value | Meaning |
| --- | --- |
| `required` | Validate the artifact, present it to the user, and wait for explicit approval before moving forward. |
| `skip` | Validate the artifact, record that user review was skipped by configuration, and continue without asking for approval. |

Default:

- `required`

Configurable gates:

| Key | Artifact or milestone |
| --- | --- |
| `prd` | Product requirements document approval. |
| `specifications` | Functional or technical specifications approval. |
| `ux_ui_design` | UX/UI design approval. |
| `architecture` | Architecture package approval. |
| `backlog_plan` | Backlog or delivery plan approval. |
| `test_plan` | Test plan approval. |
| `pull_request_creation` | Approval before creating a pull request. |

Recommended first-time setup:

- Keep every configurable gate as `required`.

When to use `skip`:

- The team has already delegated that specific review to the agent workflow.
- The artifact is low-risk.
- The team has strong CI, review, and rollback controls.

When not to use `skip`:

- Requirements, architecture, release, security, or high-impact product decisions are still changing.
- The team has not reviewed several successful end-to-end ADLC runs.

Material-change rule:

- If an approved artifact materially changes, agents must validate it again and obtain fresh approval when its gate is `required`.

### `user_approval_gates.mandatory`

```jsonc
"user_approval_gates": {
  "mandatory": {
    "implementation_plan": "required",
    "pull_request_merge": "required",
    "production_release": "required"
  }
}
```

What it does:

- Shows policy-locked approval gates.
- These gates cannot be skipped through this file.

Allowed values:

| Value | Meaning |
| --- | --- |
| `required` | Required by policy. |

Mandatory gates:

| Key | Meaning |
| --- | --- |
| `implementation_plan` | User must approve the implementation plan before coding begins. |
| `pull_request_merge` | User must approve merging a pull request. |
| `production_release` | User must approve production release. |

Important:

- Any value other than `required` is ignored and must be reported.
- The `SDLC Settings` tab shows these fields read-only.

### `product_pre_mortem.enabled`

```jsonc
"product_pre_mortem": {
  "enabled": false
}
```

What it does:

- Controls whether product-agent invokes pre-mortem-agent before PRD handoff.
- When enabled, product-agent integrates the risk analysis into the PRD.

Allowed values:

| Value | Meaning |
| --- | --- |
| `true` | Run the automatic pre-mortem gate before PRD handoff. |
| `false` | Do not run the automatic pre-mortem gate. The consultant remains directly invokable on demand. |

Default:

- `false`

When to enable:

- New product idea.
- High uncertainty.
- High downside risk.
- You want early failure-mode analysis before specifications are created.

Ownership rule:

- Enabling the gate never transfers PRD ownership away from product-agent.

Failure behavior:

- Missing, unreadable, or non-boolean values fail safe to `false` and must be reported in the PRD Risk Analysis section.

### `llm_judge.trigger_mode`

```jsonc
"llm_judge": {
  "trigger_mode": "architecture"
}
```

What it does:

- Controls when llm-judge-agent runs as a second-opinion reviewer.
- The judge is advisory only. It does not replace test-agent or code-review-agent gates.

Allowed values:

| Value | Meaning |
| --- | --- |
| `on-demand` | No automation. Invoke llm-judge-agent manually when needed. |
| `architecture` | architect-agent invokes llm-judge-agent on `architecture.md` and ADRs before handoff. Developer tasks stay on-demand. |
| `architecture-and-risky-dev` | Architecture review plus developer-agent judge review for high-risk tasks. |
| `architecture-and-all-dev` | Architecture review plus judge review for every developer task before test-agent handoff. |

Documented default:

- `on-demand`

Current project value:

- `architecture`

When to use each value:

| Scenario | Recommended value |
| --- | --- |
| Early adoption or cost-sensitive use | `on-demand` |
| You want architecture reviewed by a second model | `architecture` |
| You want extra review for risky implementation only | `architecture-and-risky-dev` |
| You want maximum automated review coverage | `architecture-and-all-dev` |

### `llm_judge.judge_provider`

```jsonc
"llm_judge": {
  "judge_provider": ""
}
```

What it does:

- Optionally names the provider used by the judge model.
- Examples: `google`, `openai`, `anthropic`.

Allowed values:

- Empty string `""`
- Provider name string

Default:

- Empty string `""`

Recommended first-time value:

- Leave empty unless you need deterministic provider selection.

Cross-model rule:

- The judge must run on a different model than the one that produced the artifact, ideally from a different provider.
- If `judge_provider` equals the author provider, or no different model is reachable, the judge report is reduced-confidence and marked as same-model.

### `llm_judge.judge_command`

```jsonc
"llm_judge": {
  "judge_command": ""
}
```

What it does:

- Optionally defines the command used to reach the judge model.

Allowed values:

- Empty string `""`
- Command string such as:
  - `gemini`
  - `codex`
  - `ollama run llama3.3`

Default:

- Empty string `""`

Recommended first-time value:

- Leave empty to let the judge auto-detect an available cross-provider CLI or API key.

### `spec_validation.drift_check_mode`

```jsonc
"spec_validation": {
  "drift_check_mode": "on-demand"
}
```

What it does:

- Controls when spec-validation-agent checks whether implemented behavior drifted away from specifications.

Allowed values:

| Value | Meaning |
| --- | --- |
| `on-demand` | No automation. Invoke spec-validation-agent's spec-drift-checker manually. |
| `on-implementation` | developer-agent runs spec-drift-checker on each completed task before test-agent handoff. |

Default:

- `on-demand`

Recommended first-time value:

- Keep `on-demand` until the team understands the signal quality.
- Use `on-implementation` when specs are stable and traceability is important.

Behavior:

- Drift checks are advisory review input.
- They are not build blockers by themselves.

### `spec_validation.red_team_mode`

```jsonc
"spec_validation": {
  "red_team_mode": "on-demand"
}
```

What it does:

- Controls when spec red-team review runs.

Allowed values:

| Value | Meaning |
| --- | --- |
| `on-demand` | No automation. Invoke `/red-team-workflow` or spec-red-team manually. |
| `pre-release` | deployment-agent runs the red-team pass against a confirmed ephemeral environment before release. |

Default:

- `on-demand`

Important:

- Spec red-team requires a confirmed non-production target using synthetic data.
- Confirmed findings should become regression tests after a human merges them.

### `security_check.pre_commit`

```jsonc
"security_check": {
  "pre_commit": true
}
```

What it does:

- Requires security-check-agent PASS on the exact staged diff before every developer-agent-managed commit.

Allowed values:

| Value | Meaning |
| --- | --- |
| `true` | Run the pre-commit security-check-agent gate. |
| `false` | Disable only this agent gate. Deterministic hooks and later security review are not disabled. |

Default:

- `true`

Recommended value:

- Keep `true`.

Failure behavior:

- Missing or invalid values fail safe to `true`.
- FAIL or BLOCKED stops the commit and enters the approved revised-plan and tracked-defect loop.

### `security_check.pre_pr`

```jsonc
"security_check": {
  "pre_pr": true
}
```

What it does:

- Requires a fresh security-check-agent PASS on the complete branch diff before every developer-agent-managed pull request.

Allowed values:

| Value | Meaning |
| --- | --- |
| `true` | Run the pre-PR security-check-agent gate. |
| `false` | Disable only this repeated agent gate. |

Default:

- `true`

Recommended value:

- Keep `true`.

Important:

- Native Git operations outside the agent workflow require separately installed deterministic hooks and repository protections.

### `test_red_team.trigger_mode`

```jsonc
"test_red_team": {
  "trigger_mode": "every-pr"
}
```

What it does:

- Controls when test-agent's red-team-agent runs automatically.

Allowed values:

| Value | Meaning |
| --- | --- |
| `never` | Do not run test-agent's red-team-agent automatically. Explicit invocation remains available. |
| `every-commit` | Run red-team-agent against every candidate change before test PASS and developer pre-commit finalization. |
| `every-pr` | Run red-team-agent once against the complete candidate branch after normal tests pass and before planner completion and final PASS handoff. |

Default:

- `every-pr`

Recommended first-time value:

- Keep `every-pr`.

Important:

- Each configured run first checks whether an executable attack surface changed.
- Documentation-only or non-attackable changes may return an evidenced not-applicable PASS.
- Dynamic attacks require a confirmed local or ephemeral non-production target using synthetic data.
- Inability to confirm a safe target returns BLOCKED rather than attacking production or silently skipping.

### `developer_git_workflow.mode`

```jsonc
"developer_git_workflow": {
  "mode": "always-branch-and-pr"
}
```

What it does:

- Controls how developer-agent uses branches and pull requests.
- The resolved mode applies once per new backlog item or feature.

Allowed values:

| Value | Meaning |
| --- | --- |
| `always-branch-and-pr` | Create a short-lived task branch after plan approval and before implementation. After test-agent PASS, commit, push, and create a PR for code-review-agent. |
| `ask-branch-and-pr` | Ask after plan approval whether to create a short-lived branch and later PR. |
| `current-branch` | Implement on the current non-main branch and do not automatically create a branch or PR. If current branch is `main`, stop and ask for a safe branch decision. |

Default:

- `always-branch-and-pr`

Recommended first-time value:

- Keep `always-branch-and-pr`.

Important:

- No setting permits direct implementation or commits on `main`.
- Test and review feedback reuse the task's existing branch and PR.
- Branch naming, Jira traceability, commit rules, and pull-request content follow `.agents/guidelines/github-flow.md` and `.agents/guidelines/jira-flow.md`.

### `developer_git_workflow.run_pre_commit_hooks`

```jsonc
"developer_git_workflow": {
  "run_pre_commit_hooks": true
}
```

What it does:

- Runs the repository's configured pre-commit hook suite after planner completion acknowledgement and before commit.

Allowed values:

| Value | Meaning |
| --- | --- |
| `true` | Run configured pre-commit hooks. |
| `false` | Skip this explicit hook run. |

Default:

- `true`

Recommended value:

- Keep `true`.

Failure behavior:

- Missing or invalid values fail safe to `true`.
- Hook failures block the commit step.

### `developer_git_workflow.run_pre_pr_hooks`

```jsonc
"developer_git_workflow": {
  "run_pre_pr_hooks": true
}
```

What it does:

- Runs the repository's configured pre-PR hook suite after commit and before push/PR creation when the workflow mode creates a PR.

Allowed values:

| Value | Meaning |
| --- | --- |
| `true` | Run configured pre-PR hooks. |
| `false` | Skip this explicit hook run. |

Default:

- `true`

Recommended value:

- Keep `true`.

Failure behavior:

- Missing or invalid values fail safe to `true`.
- Hook failures block the PR step.

### `developer_git_workflow.post_pr_branch`

```jsonc
"developer_git_workflow": {
  "post_pr_branch": "stay-on-task-branch"
}
```

What it does:

- Controls which branch remains checked out after creating a PR.

Allowed values:

| Value | Meaning |
| --- | --- |
| `stay-on-task-branch` | Remain on the task branch after creating the PR. |
| `switch-to-main` | After creating the PR, switch to `main` and update it from `origin`. Review feedback must switch back to the existing task branch. |

Default:

- `stay-on-task-branch`

Recommended first-time value:

- Keep `stay-on-task-branch`.

### `test_failure_tracking.track_in_backlog`

```jsonc
"test_failure_tracking": {
  "track_in_backlog": true
}
```

What it does:

- Controls whether test-agent asks project-planner-agent to track actionable failures in the backlog.

Allowed values:

| Value | Meaning |
| --- | --- |
| `true` | Send every actionable failure report to developer-agent and project-planner-agent. The planner deduplicates it, creates or updates a linked Bug or investigation Task, and closes it only after test-agent verifies the fix. |
| `false` | Send the complete failure report to developer-agent, but do not request a linked backlog item from project-planner-agent. |

Default:

- `true`

Recommended value:

- Keep `true` for team workflows.
- Consider `false` for experiments or very small solo prototypes.

Important:

- Failure context sent to agents must be actionable and secret-safe.
- This setting never removes the mandatory revised-plan approval gate for developer fixes.

### `obsidian_vault.enabled`

```jsonc
"obsidian_vault": {
  "enabled": true
}
```

What it does:

- Controls whether obsidian-vault-agent mirrors artifacts into the vault and records agent action summaries there.

Allowed values:

| Value | Meaning |
| --- | --- |
| `true` | Enable vault recording and artifact mirroring. |
| `false` | Disable vault recording. |

Documented default:

- `false`

Current project value:

- `true`

When to enable:

- You want a durable project memory, linked notes, and action logs.
- The project has an agreed vault path.

When to disable:

- You do not use Obsidian.
- You do not want agent lifecycle notes written during workflow execution.

Important:

- obsidian-vault-agent is off-workflow and does not gate delivery.
- It writes only inside `obsidian_vault.vault_path`.

### `obsidian_vault.vault_path`

```jsonc
"obsidian_vault": {
  "vault_path": "./docs/vault"
}
```

What it does:

- Defines the folder the vault agent writes into.

Allowed values:

- Relative path from project root, such as `./docs/vault`
- Absolute path, such as `/Users/you/Obsidian/ProjectVault`

Current project value:

- `./docs/vault`

Rules:

- Required when `obsidian_vault.enabled` is `true`.
- The agent stops and reports if the path is empty or unwritable.
- The agent writes only inside this folder.

### `obsidian_vault.link_mode`

```jsonc
"obsidian_vault": {
  "link_mode": "symlink"
}
```

What it does:

- Controls how canonical project docs are represented in the vault.

Allowed values:

| Value | Meaning |
| --- | --- |
| `symlink` | Symlink canonical `docs/` files into the vault so content is not duplicated. |
| `copy` | Use a portable copy/link behavior for environments where symlinks do not travel well, such as mobile, Windows, or Obsidian Sync. |

Default:

- `symlink`

Recommended value:

- Use `symlink` on Unix/macOS local workflows.
- Use `copy` when portability matters more than avoiding duplication.

## Common Configuration Profiles

### Conservative Team Default

Use this when the team is adopting ADLC for the first time.

```jsonc
{
  "user_approval_gates": {
    "configurable": {
      "prd": "required",
      "specifications": "required",
      "ux_ui_design": "required",
      "architecture": "required",
      "backlog_plan": "required",
      "test_plan": "required",
      "pull_request_creation": "required"
    }
  },
  "security_check": {
    "pre_commit": true,
    "pre_pr": true
  },
  "developer_git_workflow": {
    "mode": "always-branch-and-pr",
    "run_pre_commit_hooks": true,
    "run_pre_pr_hooks": true,
    "post_pr_branch": "stay-on-task-branch"
  },
  "test_red_team": {
    "trigger_mode": "every-pr"
  }
}
```

### Faster Solo Prototype

Use only for low-risk experiments.

```jsonc
{
  "user_approval_gates": {
    "configurable": {
      "prd": "skip",
      "specifications": "required",
      "ux_ui_design": "skip",
      "architecture": "required",
      "backlog_plan": "required",
      "test_plan": "required",
      "pull_request_creation": "required"
    }
  },
  "developer_git_workflow": {
    "mode": "ask-branch-and-pr"
  }
}
```

Do not skip mandatory gates. Do not use this profile for production release work.

### High-Assurance Architecture Work

Use when architecture correctness is high-impact.

```jsonc
{
  "llm_judge": {
    "trigger_mode": "architecture",
    "judge_provider": "",
    "judge_command": ""
  },
  "spec_validation": {
    "drift_check_mode": "on-implementation",
    "red_team_mode": "pre-release"
  },
  "security_check": {
    "pre_commit": true,
    "pre_pr": true
  }
}
```

## How To Edit Safely

1. Open `TaskRunner Settings`.
2. Select `SDLC Settings`.
3. Change one section at a time.
4. Apply the settings.
5. Review the updated `ADLC_workflow_settings.json`.
6. Commit the change with an explanation of why the workflow behavior changed.

If editing JSON directly:

1. Keep valid JSON syntax.
2. Change only documented non-underscore fields.
3. Do not edit mandatory approval gates away from `required`.
4. Keep metadata keys because agents use them as inline documentation.
5. Run a JSON parse check before committing:

```bash
node -e "JSON.parse(require('fs').readFileSync('ADLC_workflow_settings.json','utf8')); console.log('ok')"
```

## Troubleshooting

### The agent ignored my setting

Check:

- Is the value spelled exactly as documented?
- Is the value under the correct section?
- Is it a mandatory policy-locked gate?
- Did the agent report a fallback because the value was missing or invalid?

### Approval is still required after I used `skip`

Possible reasons:

- The gate is mandatory.
- The artifact materially changed and needs fresh approval.
- The agent is enforcing a separate safety policy outside this setting.
- Validation failed and the agent needs user input.

### The judge says SAME-MODEL

Possible reasons:

- `judge_provider` is the same as the artifact author provider.
- `judge_command` points to the same model family.
- No different provider CLI or API key was available.

Fix:

- Set `judge_provider` and `judge_command` to a genuinely different model/provider.

### Vault recording fails

Check:

- `obsidian_vault.enabled` is `true`.
- `obsidian_vault.vault_path` is not empty.
- The path exists or can be created.
- The process has write permission.
- The target path is safe and does not contain secrets.

## First-Time User Checklist

- [ ] I know where `ADLC_workflow_settings.json` lives.
- [ ] I understand that validation always runs.
- [ ] I left mandatory gates as `required`.
- [ ] I reviewed every configurable approval gate before changing it to `skip`.
- [ ] I kept security checks enabled.
- [ ] I understand branch and PR behavior before changing `developer_git_workflow.mode`.
- [ ] I know whether vault recording is enabled.
- [ ] I verified `obsidian_vault.vault_path`.
- [ ] I committed workflow-setting changes with a rationale.

