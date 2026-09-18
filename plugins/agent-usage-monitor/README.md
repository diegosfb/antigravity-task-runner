# Agent Usage Monitor

A local macOS terminal monitor for Claude Code, Codex, and OpenCode. It adds a compact
status line and an optional right-hand `tmux` sidebar inspired by IDE context
panels.

## Metrics

| Metric | Claude Code | Codex | OpenCode |
|---|---|---|---|
| Input, output, and cached tokens | CLI telemetry | CLI session telemetry | Local session database |
| Active context use | CLI telemetry | CLI session telemetry | Latest completed model step |
| Rate-limit windows | When exposed by the account | When exposed by the account | Unavailable |
| Cost | Claude estimate | List-price estimate | Recorded session cost |
| Agents, skills, and MCPs | Injected metadata | Session/config metadata | Local discovery/config metadata |

Subscription billing, negotiated rates, promotions, and provider-side
adjustments can differ from displayed estimates. Missing data is shown as
`unavailable`; it is never silently replaced with zero.

## Requirements

- macOS
- Python 3.7 or newer (standard library only)
- Claude Code, Codex, and/or OpenCode CLI
- Optional: `tmux` for the sidebar (`brew install tmux`)

## Install

```bash
python3 scripts/agent-usage-monitor.py install
```

The installer copies the executable to `~/.local/bin`, backs up existing
Claude and Codex configuration, merges the Claude `statusLine` setting, and
adds Codex's native status items. It does not read or store credentials.

Restart Codex after installation. Claude Code reloads its status-line setting
automatically.

## Use

Normal compact status:

```bash
claude
codex
```

Compact status plus sidebar:

```bash
agent-usage-monitor launch claude
agent-usage-monitor launch codex
agent-usage-monitor launch opencode
```

Pass CLI arguments after the provider:

```bash
agent-usage-monitor launch codex --model gpt-5.6-terra
agent-usage-monitor launch claude --model sonnet
```

The sidebar reads only local CLI data. Its mode-600 Claude state file contains
normalized counters and the local transcript path needed by the viewer, but no
prompt or response content. The viewer reads visible user questions and final
assistant responses from the current session on demand. Thinking, tool data,
injected harness context, and image payloads are excluded. Claude and Codex
session transcripts and the OpenCode database are never copied.

### Context resources

The sidebar always shows separate estimated summaries, for example
`Agents 4 (10% of context · ~4k)` and `Skills 12 (12% of context · ~5k)`.
Click the fixed `Resources ▸` row to expand or collapse the individual entries.
Mouse mode is enabled only in the launcher's dedicated tmux server, so it does
not alter your existing tmux sessions. Hold `Option` while dragging to select
terminal text directly.

Press `Page Up` while the agent pane is focused, or double-click it, to open the
current conversation as a saved Markdown editor tab. Questions and responses appear
chronologically under `You` and provider headings. The monitor
reuses the host Antigravity or VS Code window when detected and otherwise opens
Sublime Text. The background monitor automatically creates and updates a
private Markdown file for the session under
`./tmp/agent-usage-monitor-conversations/`; opening the viewer refreshes and
opens the same file. Unchanged refreshes do not rewrite it. The directory is
gitignored; its mode is `0700` and each conversation file uses mode `0600`.
Long prose and list lines are hard-wrapped at 102 characters; existing short
lines, headings, fenced code, and Markdown tables retain their original layout.

For Codex, resource totals combine the current session's injected skill
metadata with project `.codex/agents/*.toml` definitions and MCP server names
from `~/.codex/config.toml`. Only names and bounded size estimates are retained;
agent prompts and MCP configuration values are never displayed or persisted.

For OpenCode, the monitor opens its local SQLite database read-only, uses the
local model catalog for context-window limits, and scans the documented local
agent and skill locations. It reads only MCP names from valid `opencode.json`
files. Authentication data, hidden reasoning, tool payloads, prompts from agent
definitions, and MCP configuration values are not retained. Conversation text
is capped at 2 MiB, and resource symlinks escaping their discovery roots are
ignored.

When expanded, the resource list shows eight entries at a time. Click inside
the list to focus it, then use `↑`/`↓` or the mouse wheel to navigate. The `›`
marker identifies the selected resource and the viewport follows it. Press
`Esc` to return focus to the agent CLI. Arrow keys continue to work
normally whenever the dashboard is not focused.

The `Window` value and its progress bar turn yellow above 60% context usage
and red above 80%. At or below 60%, they use the terminal's normal color.

Resource token counts are labeled with `~` because both CLIs expose resource
text rather than provider-tokenized counts. Claude reports its injected skill
and agent listings. Codex reports injected skill discovery metadata and active
agent contributions. Installed but undiscovered resources are not counted, and
subagent-private context is not attributed to the main context until a
contribution is returned there.

Session files are sampled with fixed head, tail, line, and resource limits.
Malformed or oversized records are skipped so a corrupt local transcript cannot
grow the monitor's memory or CPU work without bound.

## Uninstall

Remove `~/.local/bin/agent-usage-monitor`, restore the timestamped
`.aum-backup-*` configuration files created during installation, and restart
the affected CLI.

## Development

```bash
python3 -m unittest discover -s tests -v
python3 ~/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py .
```
