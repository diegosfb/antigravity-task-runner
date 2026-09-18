import importlib.util
import json
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest import mock


SCRIPT = Path(__file__).parents[1] / "scripts" / "agent-usage-monitor.py"
SPEC = importlib.util.spec_from_file_location("agent_usage_monitor", SCRIPT)
monitor = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(monitor)


class ClaudeTelemetryTests(unittest.TestCase):
    def test_parses_exact_claude_status_payload(self):
        payload = {
            "model": {"id": "claude-sonnet-5", "display_name": "Sonnet 5"},
            "effort": {"level": "high"},
            "workspace": {"current_dir": "/tmp/weather"},
            "cost": {"total_cost_usd": 0.0521},
            "context_window": {
                "total_input_tokens": 70_400,
                "total_output_tokens": 1_500,
                "context_window_size": 200_000,
                "used_percentage": 35.2,
                "current_usage": {
                    "input_tokens": 2_400,
                    "output_tokens": 1_500,
                    "cache_read_input_tokens": 66_500,
                    "cache_creation_input_tokens": 1_500,
                },
            },
            "rate_limits": {"five_hour": {"used_percentage": 23}},
        }

        snapshot = monitor.parse_claude(payload)

        self.assertEqual(snapshot.provider, "claude")
        self.assertEqual(snapshot.thinking_level, "high")
        self.assertEqual(snapshot.input_tokens, 2_400)
        self.assertEqual(snapshot.cached_tokens, 68_000)
        self.assertEqual(snapshot.output_tokens, 1_500)
        self.assertEqual(snapshot.context_used, 70_400)
        self.assertEqual(snapshot.context_window, 200_000)
        self.assertEqual(snapshot.cost_usd, 0.0521)
        self.assertEqual(snapshot.cost_label, "CLI estimate")


class CodexTelemetryTests(unittest.TestCase):
    def test_uses_latest_codex_token_event_and_estimates_cost(self):
        records = [
            {
                "type": "turn_context",
                "payload": {"model": "gpt-5.6-codex", "effort": "high"},
            },
            {
                "type": "event_msg",
                "payload": {
                    "type": "token_count",
                    "info": {
                        "total_token_usage": {
                            "input_tokens": 70_400,
                            "cached_input_tokens": 66_500,
                            "output_tokens": 1_500,
                            "total_tokens": 71_900,
                        },
                        "last_token_usage": {"total_tokens": 23_500},
                        "model_context_window": 200_000,
                    },
                    "rate_limits": {
                        "primary": {"used_percent": 12},
                        "secondary": {"used_percent": 31},
                    },
                },
            },
        ]

        snapshot = monitor.parse_codex(records)

        self.assertEqual(snapshot.provider, "codex")
        self.assertEqual(snapshot.thinking_level, "high")
        self.assertEqual(snapshot.context_used, 23_500)
        self.assertEqual(snapshot.context_window, 200_000)
        self.assertEqual(snapshot.input_tokens, 70_400)
        self.assertEqual(snapshot.cached_tokens, 66_500)
        self.assertEqual(snapshot.output_tokens, 1_500)
        self.assertIsNotNone(snapshot.cost_usd)
        self.assertEqual(snapshot.cost_label, "list-price estimate")
        self.assertEqual(snapshot.short_limit, 12)
        self.assertEqual(snapshot.weekly_limit, 31)

    def test_parses_skill_discovery_and_active_agent_without_retaining_content(self):
        instructions = """Intro
### Available skills
- prompt-engineer: Improve prompts (file: /skills/prompt-engineer/SKILL.md)
- accessibility: Review WCAG (file: /skills/accessibility/SKILL.md)
### Other section
Private instruction text
"""
        records = [
            {
                "type": "session_meta",
                "payload": {"base_instructions": instructions},
            },
            {
                "type": "response_item",
                "payload": {
                    "type": "agent_message",
                    "author": "security-check-agent",
                    "content": "private review content",
                },
            },
        ]

        safe_records = monitor.sanitize_codex_records(records)
        snapshot = monitor.parse_codex(safe_records)

        names = {(resource.kind, resource.name) for resource in snapshot.resources}
        self.assertIn(("skill", "prompt-engineer"), names)
        self.assertIn(("skill", "accessibility"), names)
        self.assertIn(("agent", "security-check-agent"), names)
        self.assertNotIn("private review content", json.dumps(safe_records))
        self.assertNotIn("Private instruction text", json.dumps(safe_records))

    def test_discovers_codex_agents_skills_and_mcps_from_loaded_configuration(self):
        with tempfile.TemporaryDirectory() as directory:
            project = Path(directory)
            agents = project / ".codex" / "agents"
            agents.mkdir(parents=True)
            (agents / "reviewer.toml").write_text(
                'name = "reviewer"\ndescription = "Reviews changes"\n', encoding="utf-8"
            )
            (agents / "planner.toml").write_text(
                'name = "planner"\ndescription = "Plans changes"\n', encoding="utf-8"
            )
            config = project / "config.toml"
            config.write_text(
                '[mcp_servers.github]\ncommand = "safe-placeholder"\n'
                '[mcp_servers.postgres]\ncommand = "safe-placeholder"\n'
                '[mcp_servers.shadow.env]\nTOKEN = "not-retained"\n',
                encoding="utf-8",
            )
            records = [
                {
                    "type": "session_meta",
                    "payload": {
                        "base_instructions": {
                            "text": "### Available skills\n- prompt-engineer: Improve prompts\n"
                        }
                    },
                },
                {
                    "type": "response_item",
                    "payload": {
                        "type": "message",
                        "role": "developer",
                        "content": [
                            {
                                "type": "input_text",
                                "text": (
                                    "## Skills\n### Skill roots\n- r0 = /safe/root\n"
                                    "### Available skills\n- accessibility: Review WCAG\n"
                                ),
                            }
                        ],
                    },
                },
            ]

            resources = monitor.read_codex_resources(project, records, config)

        names = {(resource.kind, resource.name) for resource in resources}
        self.assertEqual(
            names,
            {
                ("agent", "planner"),
                ("agent", "reviewer"),
                ("skill", "accessibility"),
                ("skill", "prompt-engineer"),
                ("mcp", "github"),
                ("mcp", "postgres"),
            },
        )
        self.assertTrue(all(resource.estimated_tokens > 0 for resource in resources))

    def test_codex_instruction_object_is_sanitized_without_retaining_prompt_text(self):
        records = [
            {
                "type": "session_meta",
                "payload": {
                    "base_instructions": {
                        "text": "### Available skills\n- prompt-engineer: Private details\n"
                    }
                },
            }
        ]

        safe_records = monitor.sanitize_codex_records(records)

        self.assertIn("prompt-engineer", json.dumps(safe_records))
        self.assertNotIn("Private details", json.dumps(safe_records))


class OpenCodeTelemetryTests(unittest.TestCase):
    def test_reads_usage_context_and_visible_conversation_from_sqlite(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            database = root / "opencode.db"
            models = root / "models.json"
            connection = sqlite3.connect(str(database))
            connection.executescript(
                """
                CREATE TABLE session (
                    id TEXT PRIMARY KEY, directory TEXT, time_updated INTEGER,
                    agent TEXT, model TEXT, cost REAL, tokens_input INTEGER,
                    tokens_output INTEGER, tokens_reasoning INTEGER,
                    tokens_cache_read INTEGER, tokens_cache_write INTEGER
                );
                CREATE TABLE message (
                    id TEXT PRIMARY KEY, session_id TEXT, time_created INTEGER, data TEXT
                );
                CREATE TABLE part (
                    id TEXT PRIMARY KEY, message_id TEXT, session_id TEXT,
                    time_created INTEGER, data TEXT
                );
                """
            )
            connection.execute(
                "INSERT INTO session VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                (
                    "ses_safe",
                    str(root.resolve()),
                    2_000,
                    "build",
                    json.dumps({"id": "test-model", "providerID": "test", "variant": "high"}),
                    0.25,
                    100,
                    20,
                    5,
                    80,
                    0,
                ),
            )
            connection.execute(
                "INSERT INTO message VALUES (?,?,?,?)",
                ("user", "ses_safe", 1, json.dumps({"role": "user"})),
            )
            connection.execute(
                "INSERT INTO message VALUES (?,?,?,?)",
                (
                    "assistant",
                    "ses_safe",
                    2,
                    json.dumps(
                        {
                            "role": "assistant",
                            "tokens": {
                                "total": 210,
                                "input": 10,
                                "output": 20,
                                "reasoning": 5,
                                "cache": {"read": 175, "write": 0},
                            },
                        }
                    ),
                ),
            )
            connection.executemany(
                "INSERT INTO part VALUES (?,?,?,?,?)",
                [
                    ("p1", "user", "ses_safe", 1, json.dumps({"type": "text", "text": "question"})),
                    ("p2", "assistant", "ses_safe", 2, json.dumps({"type": "reasoning", "text": "private"})),
                    ("p3", "assistant", "ses_safe", 3, json.dumps({"type": "text", "text": "answer"})),
                ],
            )
            connection.commit()
            connection.close()
            models.write_text(
                json.dumps({"test": {"models": {"test-model": {"limit": {"context": 1_000}}}}}),
                encoding="utf-8",
            )

            snapshot, session_id, records = monitor.read_opencode_session(
                database, models, root, since=1
            )

        self.assertEqual(session_id, "ses_safe")
        self.assertEqual(snapshot.model, "test/test-model")
        self.assertEqual(snapshot.thinking_level, "high")
        self.assertEqual(snapshot.context_used, 210)
        self.assertEqual(snapshot.context_window, 1_000)
        self.assertEqual(snapshot.input_tokens, 100)
        self.assertEqual(snapshot.cached_tokens, 80)
        self.assertEqual(snapshot.output_tokens, 20)
        self.assertEqual(snapshot.cost_usd, 0.25)
        document = monitor._conversation_document(records, "opencode")
        self.assertEqual(document, "## You\n\nquestion\n\n## OpenCode\n\nanswer")
        self.assertNotIn("private", document)

    def test_discovers_opencode_resources_without_retaining_configuration_values(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            agent = root / ".opencode" / "agents" / "reviewer.md"
            skill = root / ".agents" / "skills" / "release" / "SKILL.md"
            agent.parent.mkdir(parents=True)
            skill.parent.mkdir(parents=True)
            agent.write_text("private agent prompt", encoding="utf-8")
            skill.write_text("private skill prompt", encoding="utf-8")
            config = root / "opencode.json"
            config.write_text(
                json.dumps({"mcp": {"github": {"environment": {"TOKEN": "not-retained"}}}}),
                encoding="utf-8",
            )

            resources = monitor.read_opencode_resources(root, [config])

        names = {(item.kind, item.name) for item in resources}
        self.assertIn(("agent", "reviewer"), names)
        self.assertIn(("skill", "release"), names)
        self.assertIn(("mcp", "github"), names)
        self.assertNotIn("not-retained", json.dumps([item.as_dict() for item in resources]))

    def test_conversation_reader_enforces_an_aggregate_text_budget(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            database = root / "opencode.db"
            models = root / "models.json"
            connection = sqlite3.connect(str(database))
            connection.executescript(
                """
                CREATE TABLE session (
                    id TEXT PRIMARY KEY, directory TEXT, time_updated INTEGER,
                    agent TEXT, model TEXT, cost REAL, tokens_input INTEGER,
                    tokens_output INTEGER, tokens_reasoning INTEGER,
                    tokens_cache_read INTEGER, tokens_cache_write INTEGER
                );
                CREATE TABLE message (
                    id TEXT PRIMARY KEY, session_id TEXT, time_created INTEGER, data TEXT
                );
                CREATE TABLE part (
                    id TEXT PRIMARY KEY, message_id TEXT, session_id TEXT,
                    time_created INTEGER, data TEXT
                );
                """
            )
            connection.execute(
                "INSERT INTO session VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                (
                    "ses_large",
                    str(root.resolve()),
                    2_000,
                    "build",
                    json.dumps({"id": "model", "providerID": "test"}),
                    0,
                    1,
                    1,
                    0,
                    0,
                    0,
                ),
            )
            connection.execute(
                "INSERT INTO message VALUES (?,?,?,?)",
                ("assistant", "ses_large", 1, json.dumps({"role": "assistant"})),
            )
            large_text = "x" * monitor.MAX_RESOURCE_CONTENT_CHARS
            connection.executemany(
                "INSERT INTO part VALUES (?,?,?,?,?)",
                [("p00", "assistant", "ses_large", 0, json.dumps({"type": "text", "text": "y" * (monitor.MAX_RESOURCE_CONTENT_CHARS + 1)}))]
                + [
                    ("p{:02d}".format(index), "assistant", "ses_large", index, json.dumps({"type": "text", "text": large_text}))
                    for index in range(1, 21)
                ],
            )
            connection.commit()
            connection.close()
            models.write_text("{}", encoding="utf-8")

            unused, unused_id, records = monitor.read_opencode_session(
                database, models, root, since=1, resources=[]
            )

        self.assertLessEqual(sum(len(record["text"]) for record in records), monitor.MAX_CONVERSATION_CHARS)
        self.assertTrue(records)
        self.assertTrue(all(record["text"] == large_text for record in records))

    def test_resource_discovery_skips_symlinks_that_escape_the_source_root(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            outside_agent = root / "outside-agent.md"
            outside_skill = root / "outside-skill.md"
            outside_agent.write_text("---\ndescription: private agent\n---\n", encoding="utf-8")
            outside_skill.write_text("---\ndescription: private skill\n---\n", encoding="utf-8")
            agent = root / "project" / ".opencode" / "agents" / "escaped.md"
            skill = root / "project" / ".agents" / "skills" / "escaped" / "SKILL.md"
            agent.parent.mkdir(parents=True)
            skill.parent.mkdir(parents=True)
            agent.symlink_to(outside_agent)
            skill.symlink_to(outside_skill)

            resources = monitor.read_opencode_resources(root / "project", [])

        names = {(item.kind, item.name) for item in resources}
        self.assertNotIn(("agent", "escaped"), names)
        self.assertNotIn(("skill", "escaped"), names)


class ResourceTelemetryTests(unittest.TestCase):
    def test_parses_claude_injected_resource_listings(self):
        records = [
            {
                "type": "attachment",
                "attachment": {
                    "type": "skill_listing",
                    "names": ["accessibility", "prompt-engineer"],
                    "content": "skill discovery metadata" * 10,
                },
            },
            {
                "type": "attachment",
                "attachment": {
                    "type": "agent_listing_delta",
                    "addedTypes": ["reviewer"],
                    "addedLines": ["reviewer metadata"],
                },
            },
        ]

        resources = monitor.parse_claude_resources(records)

        self.assertEqual([item.name for item in resources], ["accessibility", "prompt-engineer", "reviewer"])
        self.assertTrue(all(item.estimated_tokens > 0 for item in resources))
        self.assertTrue(all(item.accuracy == "estimated" for item in resources))

    def test_parses_mcp_listing_attachment(self):
        records = [
            {
                "type": "attachment",
                "attachment": {
                    "type": "mcp_listing",
                    "names": ["github", "postgres"],
                    "content": "mcp discovery metadata" * 5,
                },
            },
        ]

        resources = monitor.parse_claude_resources(records)

        self.assertEqual([item.name for item in resources], ["github", "postgres"])
        self.assertTrue(all(item.kind == "mcp" for item in resources))
        self.assertTrue(all(item.estimated_tokens > 0 for item in resources))

    def test_malformed_and_oversized_resources_are_bounded(self):
        malformed = [
            {"type": "attachment", "attachment": []},
            {"type": "attachment", "attachment": {"type": "skill_listing", "names": "not-a-list"}},
            {"type": "turn_context", "payload": []},
            {"type": "event_msg", "payload": {"type": "token_count", "info": []}},
        ]
        many_names = ["skill-{}".format(index) for index in range(monitor.MAX_RESOURCES + 20)]
        malformed.append(
            {
                "type": "attachment",
                "attachment": {
                    "type": "skill_listing",
                    "names": many_names,
                    "content": "x" * (monitor.MAX_RESOURCE_CONTENT_CHARS * 2),
                },
            }
        )

        claude = monitor.parse_claude_resources(malformed)
        codex = monitor.sanitize_codex_records(malformed)

        self.assertLessEqual(len(claude), monitor.MAX_RESOURCES)
        self.assertEqual(codex, [])
        self.assertLessEqual(
            sum(item.estimated_tokens for item in claude),
            (monitor.MAX_RESOURCE_CONTENT_CHARS + 3) // 4,
        )


class RenderingTests(unittest.TestCase):
    def test_compact_output_labels_estimated_cost(self):
        snapshot = monitor.Snapshot(
            provider="codex",
            model="gpt-5.6-codex",
            project="weather",
            input_tokens=70_400,
            cached_tokens=66_500,
            output_tokens=1_500,
            context_used=23_500,
            context_window=200_000,
            cost_usd=0.05,
            cost_label="list-price estimate",
        )

        rendered = monitor.render_compact(snapshot, color=False)

        self.assertIn("23.5k/200k", rendered)
        self.assertIn("12%", rendered)
        self.assertIn("$0.05~", rendered)

    def test_missing_metrics_are_explicit(self):
        snapshot = monitor.Snapshot(provider="codex", model="unknown")

        rendered = monitor.render_sidebar(snapshot, color=False)

        self.assertIn("unavailable", rendered)
        self.assertNotIn("$0.00", rendered)

    def test_thinking_level_appears_between_model_and_tokens(self):
        snapshot = monitor.Snapshot(
            provider="codex", model="gpt-5.6-sol", thinking_level="xhigh"
        )

        lines = monitor.render_sidebar(snapshot, color=False).splitlines()
        model_index = lines.index("Model   gpt-5.6-sol")

        self.assertEqual(lines[model_index + 1], "Thinking  Xhigh")
        self.assertEqual(lines[model_index + 2], "Tokens  unavailable")

    def test_terminal_control_sequences_are_removed_and_labels_are_bounded(self):
        snapshot = monitor.Snapshot(
            provider="codex",
            model="safe\x1b[31mred\x1b[0m\nspoofed",
            project="project\x1b]0;owned\x07\rname",
            branch="branch\x1b]8;;https://example.invalid\x1b\\link" + "x" * 100,
        )

        rendered = monitor.render_compact(snapshot, color=False)
        sidebar = monitor.render_sidebar(snapshot, color=False)

        for output in (rendered, sidebar):
            self.assertNotIn("\x1b", output)
            self.assertNotIn("\x07", output)
            self.assertNotIn("\r", output)
        self.assertNotIn("\nspoofed", rendered)
        self.assertNotIn("x" * 81, rendered)

    def test_context_warning_colors_apply_above_thresholds(self):
        cases = (
            (60, None),
            (61, "\x1b[33m"),
            (80, "\x1b[33m"),
            (81, "\x1b[31m"),
        )
        for percentage, expected_color in cases:
            with self.subTest(percentage=percentage):
                snapshot = monitor.Snapshot(
                    provider="codex",
                    model="gpt-5.6-sol",
                    context_used=percentage * 2_000,
                    context_window=200_000,
                )
                rendered = monitor.render_sidebar(snapshot, color=True)
                window_line = next(line for line in rendered.splitlines() if "Window" in line)
                bar_line = next(line for line in rendered.splitlines() if "[" in line)

                if expected_color:
                    self.assertTrue(window_line.startswith(expected_color))
                    self.assertTrue(bar_line.startswith(expected_color))
                    self.assertTrue(window_line.endswith("\x1b[0m"))
                    self.assertTrue(bar_line.endswith("\x1b[0m"))
                else:
                    self.assertNotIn("\x1b[", window_line + bar_line)

    def test_context_warning_colors_can_be_disabled(self):
        snapshot = monitor.Snapshot(
            provider="codex",
            model="gpt-5.6-sol",
            context_used=190_000,
            context_window=200_000,
        )

        rendered = monitor.render_sidebar(snapshot, color=False)

        self.assertNotIn("\x1b[", rendered)

    def test_mcp_resources_appear_in_sidebar_with_context_consumption(self):
        snapshot = monitor.Snapshot(
            provider="claude",
            model="Sonnet 5",
            context_window=200_000,
            resources=[
                monitor.ContextResource("mcp", "github", 2_000, "discovery metadata"),
                monitor.ContextResource("mcp", "postgres", 1_000, "discovery metadata"),
                monitor.ContextResource("skill", "accessibility", 500, "discovery metadata"),
            ],
        )

        expanded = monitor.render_sidebar(snapshot, color=False, resources_expanded=True)
        collapsed = monitor.render_sidebar(snapshot, color=False, resources_expanded=False)

        self.assertIn("MCPs", expanded)
        self.assertIn("MCPs", collapsed)
        self.assertIn("2%", expanded)
        self.assertIn("M github", expanded)
        self.assertIn("M postgres", expanded)
        self.assertNotIn("M github", collapsed)

    def test_resource_panel_expands_and_collapses(self):
        snapshot = monitor.Snapshot(
            provider="codex",
            model="gpt-5.6-sol",
            context_window=200_000,
            resources=[
                monitor.ContextResource("agent", "reviewer", 800, "active contribution"),
                monitor.ContextResource("skill", "accessibility", 1_200, "discovery metadata"),
            ],
        )

        expanded = monitor.render_sidebar(snapshot, color=False, resources_expanded=True)
        collapsed = monitor.render_sidebar(snapshot, color=False, resources_expanded=False)

        self.assertEqual(expanded.splitlines()[0], "Resources ▾")
        self.assertEqual(collapsed.splitlines()[0], "Resources ▸")
        self.assertIn("Agents 1", expanded)
        self.assertIn("Skills 1", expanded)
        self.assertIn("~800", expanded)
        self.assertIn("~1.2k", expanded)
        self.assertIn("1%", expanded)
        self.assertIn("reviewer", expanded)
        self.assertIn("accessibility", expanded)
        self.assertIn("Agents 1", collapsed)
        self.assertIn("Skills 1", collapsed)
        self.assertIn("~800", collapsed)
        self.assertIn("~1.2k", collapsed)
        self.assertNotIn("reviewer", collapsed)
        self.assertNotIn("accessibility", collapsed)
        self.assertNotIn("Ctrl-b u", expanded + collapsed)

    def test_resource_viewport_marks_selection_and_scrolls(self):
        resources = [
            monitor.ContextResource("skill", "skill-{}".format(index), 100, "discovery")
            for index in range(12)
        ]
        snapshot = monitor.Snapshot(
            provider="codex",
            model="gpt-5.6-sol",
            context_window=200_000,
            resources=resources,
        )

        rendered = monitor.render_sidebar(
            snapshot,
            color=False,
            resources_expanded=True,
            resource_selected=9,
            resource_offset=0,
            resource_limit=8,
        )

        self.assertIn("› S skill-9", rendered)
        self.assertNotIn("skill-0 ", rendered)
        self.assertIn("3–10 of 12", rendered)

    def test_resource_viewport_clamps_selection_and_offset(self):
        resources = [monitor.ContextResource("agent", "agent-{}".format(index), 10, "active") for index in range(3)]

        selected, offset, visible = monitor._resource_view(resources, 99, 99, 8)

        self.assertEqual(selected, 2)
        self.assertEqual(offset, 0)
        self.assertEqual([item.name for item in visible], ["agent-0", "agent-1", "agent-2"])


class StateTests(unittest.TestCase):
    def test_state_file_contains_metrics_but_not_source_payload(self):
        snapshot = monitor.Snapshot(
            provider="claude",
            model="Sonnet 5",
            thinking_level="high",
            transcript_path="/tmp/session.jsonl",
            input_tokens=10,
            output_tokens=2,
        )
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "state.json"
            monitor.write_state(path, snapshot)
            state = json.loads(path.read_text())

        self.assertEqual(state["provider"], "claude")
        self.assertEqual(state["thinking_level"], "high")
        self.assertEqual(state["transcript_path"], "/tmp/session.jsonl")
        self.assertNotIn("session_id", state)

    def test_extracts_latest_claude_answer_without_thinking(self):
        records = [
            {
                "type": "assistant",
                "message": {"content": [{"type": "text", "text": "older answer"}]},
            },
            {
                "type": "assistant",
                "message": {
                    "content": [
                        {"type": "thinking", "thinking": "private reasoning"},
                        {"type": "text", "text": "latest answer\nsecond line"},
                    ]
                },
            },
        ]

        answer = monitor._latest_answer(records, "claude")

        self.assertEqual(answer, "latest answer\nsecond line")
        self.assertNotIn("private reasoning", answer)

    def test_formats_claude_questions_and_answers_without_private_blocks(self):
        records = [
            {
                "type": "user",
                "message": {"role": "user", "content": "<system-reminder>private harness context</system-reminder>"},
            },
            {"type": "user", "message": {"role": "user", "content": "first question"}},
            {
                "type": "assistant",
                "message": {
                    "role": "assistant",
                    "content": [
                        {"type": "thinking", "thinking": "private reasoning"},
                        {"type": "text", "text": "first answer"},
                    ],
                },
            },
            {
                "type": "user",
                "message": {
                    "role": "user",
                    "content": [
                        {"type": "tool_result", "content": "private tool output"},
                        {"type": "text", "text": "second question"},
                    ],
                },
            },
            {
                "type": "assistant",
                "message": {
                    "role": "assistant",
                    "content": [
                        {"type": "text", "text": "intermediate progress"},
                        {"type": "tool_use", "name": "private_tool", "input": {}},
                    ],
                },
            },
            {
                "type": "assistant",
                "message": {"role": "assistant", "content": [{"type": "text", "text": "second answer"}]},
            },
        ]

        document = monitor._conversation_document(records, "claude")

        self.assertEqual(
            document,
            "## You\n\nfirst question\n\n## Claude\n\nfirst answer\n\n"
            "## You\n\nsecond question\n\n## Claude\n\nsecond answer",
        )
        self.assertNotIn("private reasoning", document)
        self.assertNotIn("private tool output", document)
        self.assertNotIn("private harness context", document)
        self.assertNotIn("intermediate progress", document)

    def test_hard_wraps_markdown_prose_at_the_requested_width(self):
        sample_width = (
            "Somewhere in La Mancha — a suburb whose name I'd rather not Google — "
            "there lived until recently one of"
        )
        long_code = "print('" + "x" * 110 + "')"
        document = (
            "## Claude\n\n"
            + sample_width
            + " additional people nearby.\n\n"
            + "- "
            + "word " * 30
            + "\n\n```python\n"
            + long_code
            + "\n```\n\n| Column | Value that remains unchanged |"
        )

        wrapped = monitor._hard_wrap_markdown(document)
        lines = wrapped.splitlines()

        self.assertEqual(lines[0], "## Claude")
        self.assertEqual(lines[2], sample_width)
        self.assertEqual(lines[3], "additional people nearby.")
        self.assertTrue(any(line.startswith("  word") for line in lines))
        self.assertIn(long_code, lines)
        self.assertIn("| Column | Value that remains unchanged |", lines)

    def test_hard_wrap_preserves_pipe_less_tables_and_nested_fence_markers(self):
        long_table_row = "Name | " + "table value " * 12
        long_code = "const value = '" + "x" * 110 + "';"
        document = (
            "Column | Value\n"
            "--- | ---\n"
            + long_table_row
            + "\n\n````markdown\n```\n"
            + long_code
            + "\n````"
        )

        wrapped = monitor._hard_wrap_markdown(document)

        self.assertIn("Column | Value\n--- | ---\n" + long_table_row, wrapped)
        self.assertIn("````markdown\n```\n" + long_code + "\n````", wrapped)

    def test_table_delimiter_does_not_prevent_preceding_prose_from_wrapping(self):
        prose = "ordinary prose " * 12

        wrapped = monitor._hard_wrap_markdown(prose + "\n--- | ---")

        self.assertNotIn(prose, wrapped)
        self.assertTrue(all(len(line) <= 102 for line in wrapped.splitlines()[:-1]))
        self.assertEqual(wrapped.splitlines()[-1], "--- | ---")

    def test_viewer_removes_terminal_controls_but_preserves_readable_layout(self):
        with tempfile.TemporaryDirectory() as directory:
            home = Path(directory)
            transcript = home / ".claude" / "projects" / "session.jsonl"
            transcript.parent.mkdir(parents=True)
            transcript.write_text(
                json.dumps(
                    {
                        "type": "assistant",
                        "message": {
                            "content": [
                                {
                                    "type": "text",
                                    "text": (
                                        "first\n\t\x1b[31mred\x1b[0m\rsecond"
                                        "\x1b]0;owned\x07\x1b]52;c;Y2xpcGJvYXJk\x1b\\"
                                    ),
                                }
                            ]
                        },
                    }
                )
                + "\n"
            )
            state = home / "state.json"
            project = home / "project"
            project.mkdir()
            monitor.write_state(
                state,
                monitor.Snapshot(provider="claude", model="Sonnet", transcript_path=str(transcript)),
            )
            args = monitor.argparse.Namespace(
                provider="claude", state=str(state), started=0, project_root=str(project)
            )

            with mock.patch.object(monitor.Path, "home", return_value=home), mock.patch.object(
                monitor, "_editor_command", side_effect=lambda path: ["editor", path]
            ), mock.patch.object(monitor.subprocess, "run") as run:
                monitor.command_viewer(args)

            conversation = (
                project.resolve()
                / "tmp"
                / "agent-usage-monitor-conversations"
                / "claude-session.md"
            )
            self.assertEqual(conversation.read_text(), "## Claude\n\nfirst\n\tredsecond")
            self.assertEqual(conversation.parent.stat().st_mode & 0o777, 0o700)
            self.assertEqual(conversation.stat().st_mode & 0o777, 0o600)
            run.assert_called_once_with(["editor", str(conversation)], check=False)

    def test_viewer_selects_the_host_editor_then_sublime_as_fallback(self):
        available = {
            "antigravity-ide": "/Applications/Antigravity IDE.app/bin/antigravity-ide",
            "code": "/Applications/Visual Studio Code.app/bin/code",
            "subl": "/usr/local/bin/subl",
        }

        with mock.patch.object(monitor.shutil, "which", side_effect=available.get):
            with mock.patch.dict(
                monitor.os.environ,
                {"VSCODE_CODE_CACHE_PATH": "/Library/Application Support/Antigravity IDE/CachedData"},
                clear=True,
            ):
                self.assertEqual(
                    monitor._editor_command("/tmp/conversation.md"),
                    [available["antigravity-ide"], "--reuse-window", "/tmp/conversation.md"],
                )
            with mock.patch.dict(monitor.os.environ, {"TERM_PROGRAM": "vscode"}, clear=True):
                self.assertEqual(
                    monitor._editor_command("/tmp/conversation.md"),
                    [available["code"], "--reuse-window", "/tmp/conversation.md"],
                )
            with mock.patch.dict(monitor.os.environ, {}, clear=True):
                self.assertEqual(
                    monitor._editor_command("/tmp/conversation.md"),
                    [available["subl"], "/tmp/conversation.md"],
                )

    def test_conversation_directory_cannot_escape_project_through_symlink(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "project"
            outside = Path(directory) / "outside"
            (root / "tmp").mkdir(parents=True)
            outside.mkdir()
            (root / "tmp" / "agent-usage-monitor-conversations").symlink_to(
                outside, target_is_directory=True
            )

            with self.assertRaisesRegex(ValueError, "leaves the project root"):
                monitor._write_conversation(
                    str(root), Path("session.jsonl"), "claude", "private conversation"
                )

            self.assertEqual(list(outside.iterdir()), [])

    def test_conversation_write_fails_closed_if_directory_is_replaced(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "project"
            target = root / "tmp" / "agent-usage-monitor-conversations"
            detached = root / "detached"
            outside = Path(directory) / "outside"
            target.mkdir(parents=True)
            outside.mkdir()
            original_fdopen = monitor.os.fdopen

            def replace_directory(descriptor, *args, **kwargs):
                target.rename(detached)
                target.symlink_to(outside, target_is_directory=True)
                return original_fdopen(descriptor, *args, **kwargs)

            with mock.patch.object(monitor.os, "fdopen", side_effect=replace_directory):
                with self.assertRaisesRegex(ValueError, "changed during conversation write"):
                    monitor._write_conversation(
                        str(root), Path("session.jsonl"), "claude", "private conversation"
                    )

            self.assertEqual(list(outside.iterdir()), [])
            self.assertEqual(list(detached.iterdir()), [])

    def test_conversation_writer_rejects_unknown_provider(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(ValueError, "unsupported provider"):
                monitor._write_conversation(
                    directory, Path("session.jsonl"), "../../outside", "private conversation"
                )

    def test_watch_saves_immediately_and_only_when_conversation_changes(self):
        transcript = Path("/trusted/session.jsonl")
        snapshot = monitor.Snapshot(
            provider="claude", model="Sonnet", transcript_path=str(transcript)
        )
        first = [
            {"type": "user", "message": {"role": "user", "content": "first question"}},
            {
                "type": "assistant",
                "message": {"role": "assistant", "content": [{"type": "text", "text": "first answer"}]},
            },
        ]
        changed = first + [
            {"type": "user", "message": {"role": "user", "content": "second question"}}
        ]
        args = monitor.argparse.Namespace(
            provider="claude", state="/tmp/state.json", project_root="/project"
        )

        with mock.patch.object(monitor, "read_state", return_value=snapshot), mock.patch.object(
            monitor, "_trusted_transcript_path", return_value=transcript
        ), mock.patch.object(
            monitor, "_read_bounded_json_records", side_effect=[first, first, changed]
        ), mock.patch.object(
            monitor, "_write_conversation"
        ) as write, mock.patch.object(
            monitor.signal, "signal"
        ), mock.patch.object(
            monitor.sys.stdout, "write"
        ), mock.patch.object(
            monitor.sys.stdout, "flush"
        ), mock.patch.object(
            monitor.time, "sleep", side_effect=[None, None, KeyboardInterrupt]
        ):
            with self.assertRaises(KeyboardInterrupt):
                monitor.command_watch(args)

        self.assertEqual(write.call_count, 2)
        self.assertEqual(write.call_args_list[0][0][:3], ("/project", transcript, "claude"))
        self.assertIn("first question", write.call_args_list[0][0][3])
        self.assertIn("second question", write.call_args_list[1][0][3])

    def test_codex_watch_continues_when_automatic_save_fails(self):
        transcript = Path("/trusted/rollout.jsonl")
        records = [
            {
                "type": "response_item",
                "payload": {
                    "type": "message",
                    "role": "user",
                    "content": [{"type": "input_text", "text": "question"}],
                },
            }
        ]
        args = monitor.argparse.Namespace(
            provider="codex", state="/tmp/state.json", project_root="/project"
        )

        with mock.patch.object(monitor, "newest_codex_session", return_value=transcript), mock.patch.object(
            monitor, "read_jsonl", return_value=[]
        ), mock.patch.object(
            monitor, "_trusted_transcript_path", return_value=transcript
        ), mock.patch.object(
            monitor, "_read_bounded_json_records", return_value=records
        ), mock.patch.object(
            monitor, "_write_conversation", side_effect=OSError("private path failure")
        ) as write, mock.patch.object(
            monitor.signal, "signal"
        ), mock.patch.object(
            monitor.sys.stdout, "write"
        ), mock.patch.object(
            monitor.sys.stdout, "flush"
        ), mock.patch.object(
            monitor.time, "sleep", side_effect=KeyboardInterrupt
        ):
            with self.assertRaises(KeyboardInterrupt):
                monitor.command_watch(args)

        self.assertEqual(write.call_count, 1)
        self.assertEqual(write.call_args[0][:3], ("/project", transcript, "codex"))

    def test_opencode_watch_saves_visible_conversation(self):
        snapshot = monitor.Snapshot(provider="opencode", model="test/model")
        records = [
            {"type": "opencode_message", "role": "user", "text": "question"},
            {"type": "opencode_message", "role": "assistant", "text": "answer"},
        ]
        args = monitor.argparse.Namespace(
            provider="opencode", state="/tmp/state.json", project_root="/project"
        )

        with mock.patch.object(
            monitor, "read_opencode_session", return_value=(snapshot, "ses_safe", records)
        ), mock.patch.object(
            monitor, "_write_conversation"
        ) as write, mock.patch.object(
            monitor.signal, "signal"
        ), mock.patch.object(
            monitor.sys.stdout, "write"
        ), mock.patch.object(
            monitor.sys.stdout, "flush"
        ), mock.patch.object(
            monitor.time, "sleep", side_effect=KeyboardInterrupt
        ):
            with self.assertRaises(KeyboardInterrupt):
                monitor.command_watch(args)

        self.assertEqual(write.call_args[0][:3], ("/project", Path("ses_safe.json"), "opencode"))
        self.assertIn("## You\n\nquestion", write.call_args[0][3])
        self.assertIn("## OpenCode\n\nanswer", write.call_args[0][3])

    def test_extracts_latest_codex_answer(self):
        records = [
            {
                "type": "response_item",
                "payload": {
                    "type": "message",
                    "role": "assistant",
                    "content": [{"type": "output_text", "text": "complete codex answer"}],
                },
            }
        ]

        self.assertEqual(monitor._latest_answer(records, "codex"), "complete codex answer")

    def test_formats_codex_conversation_without_injected_context_or_commentary(self):
        records = [
            {
                "type": "response_item",
                "payload": {
                    "type": "message",
                    "role": "user",
                    "content": [{"type": "input_text", "text": "# AGENTS.md instructions for /repo\nprivate"}],
                },
            },
            {
                "type": "response_item",
                "payload": {
                    "type": "message",
                    "role": "user",
                    "content": [{"type": "input_text", "text": "<environment_context>private</environment_context>"}],
                },
            },
            {
                "type": "response_item",
                "payload": {
                    "type": "message",
                    "role": "user",
                    "content": [
                        {
                            "type": "input_text",
                            "text": "# Files mentioned by the user:\nfile.png\n\n## My request:\nshow the full conversation",
                        },
                        {"type": "input_image", "image_url": "private-image"},
                    ],
                },
            },
            {
                "type": "response_item",
                "payload": {
                    "type": "message",
                    "role": "assistant",
                    "phase": "commentary",
                    "content": [{"type": "output_text", "text": "internal progress update"}],
                },
            },
            {
                "type": "response_item",
                "payload": {
                    "type": "message",
                    "role": "assistant",
                    "phase": "final_answer",
                    "content": [{"type": "output_text", "text": "complete response"}],
                },
            },
        ]

        document = monitor._conversation_document(records, "codex")

        self.assertEqual(
            document,
            "## You\n\nshow the full conversation\n\n## Codex\n\ncomplete response",
        )
        self.assertNotIn("AGENTS.md", document)
        self.assertNotIn("environment_context", document)
        self.assertNotIn("internal progress", document)
        self.assertNotIn("private-image", document)

    def test_transcript_path_must_stay_under_provider_session_root(self):
        with tempfile.TemporaryDirectory() as directory:
            home = Path(directory)
            transcript = home / ".claude" / "projects" / "session.jsonl"
            transcript.parent.mkdir(parents=True)
            transcript.write_text("{}\n")
            outside = home / "outside.jsonl"
            outside.write_text("{}\n")

            with mock.patch.object(monitor.Path, "home", return_value=home):
                self.assertEqual(
                    monitor._trusted_transcript_path(str(transcript), "claude"),
                    transcript.resolve(),
                )
                self.assertIsNone(monitor._trusted_transcript_path(str(outside), "claude"))

    def test_codex_reader_discards_conversation_content(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "session.jsonl"
            path.write_text(
                "\n".join(
                    [
                        json.dumps({"type": "response_item", "payload": {"text": "private prompt"}}),
                        json.dumps(
                            {
                                "type": "turn_context",
                                "payload": {"model": "gpt-5.6-sol", "effort": "high"},
                            }
                        ),
                    ]
                )
            )

            records = monitor.read_jsonl(path)

        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["type"], "turn_context")
        self.assertEqual(records[0]["payload"]["effort"], "high")
        self.assertNotIn("private prompt", json.dumps(records))

    def test_jsonl_reader_skips_oversized_and_malformed_records(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "session.jsonl"
            path.write_bytes(
                b'{"type":"response_item","payload":{"text":"'
                + b"x" * (monitor.MAX_JSONL_LINE_BYTES + 1)
                + b'"}}\n'
                + b'{"type":"turn_context","payload":[]}\n'
                + b'{"type":"turn_context","payload":{"model":"gpt-5.6-sol"}}\n'
            )

            records = monitor.read_jsonl(path)

        self.assertEqual(records, [{"type": "turn_context", "payload": {"model": "gpt-5.6-sol"}}])


class TmuxSafetyTests(unittest.TestCase):
    def test_tmux_commands_use_an_isolated_server(self):
        self.assertEqual(
            monitor._tmux_args("aum-123", "list-panes"),
            ["tmux", "-L", "aum-123", "list-panes"],
        )

    def test_pane_pid_must_be_a_canonical_positive_decimal(self):
        self.assertEqual(monitor._validated_pane_pid("12345\n"), "12345")
        for value in ("", "0", "-1", "12; touch /tmp/pwn", "1 2", "99999999999"):
            with self.subTest(value=value):
                with self.assertRaises(RuntimeError):
                    monitor._validated_pane_pid(value)

    def test_mouse_binding_targets_only_resource_row_in_dashboard_pane(self):
        binding = monitor._mouse_binding("%7", "12345")
        rendered = " ".join(binding)

        self.assertEqual(binding[:3], ["bind-key", "-n", "MouseDown1Pane"])
        self.assertIn("#{mouse_pane}", rendered)
        self.assertIn("%7", rendered)
        self.assertIn("#{mouse_y}", rendered)
        self.assertIn(",0}", rendered)
        self.assertIn("kill -USR1 12345", rendered)
        self.assertIn("select-pane -t=", rendered)
        self.assertIn("bind-key -n Up", rendered)
        self.assertIn("bind-key -n Down", rendered)
        self.assertIn("unbind-key -n Up", rendered)
        self.assertIn("unbind-key -n Down", rendered)

    def test_mouse_binding_rejects_untrusted_pane_or_pid(self):
        for pane, pid in (("7", "123"), ("%7; run-shell bad", "123"), ("%7", "1; bad")):
            with self.subTest(pane=pane, pid=pid):
                with self.assertRaises(RuntimeError):
                    monitor._mouse_binding(pane, pid)

    def test_navigation_bindings_scope_keys_and_wheel_to_dashboard(self):
        bindings = monitor._navigation_bindings("%7", "12345")
        rendered = "\n".join(" ".join(binding) for binding in bindings)

        self.assertIn("Escape", rendered)
        self.assertIn("WheelUpPane", rendered)
        self.assertIn("WheelDownPane", rendered)
        self.assertNotIn("Up", [binding[2] for binding in bindings])
        self.assertNotIn("Down", [binding[2] for binding in bindings])
        self.assertIn("unbind-key -n Up", rendered)
        self.assertIn("unbind-key -n Down", rendered)
        self.assertIn("select-pane -L", rendered)
        self.assertNotIn("DoubleClick1Pane", rendered)
        self.assertNotIn("PageUp", rendered)
        self.assertTrue(all("#{pane_id}" in " ".join(item) or "#{mouse_pane}" in " ".join(item) for item in bindings))

    def test_navigation_bindings_wheel_up_enters_copy_mode_on_main_pane(self):
        bindings = monitor._navigation_bindings("%7", "12345")
        wheel_up = next(b for b in bindings if "WheelUpPane" in b)
        rendered = " ".join(wheel_up)

        self.assertIn("copy-mode -e", rendered)
        self.assertIn("send-keys -M", rendered)

    def test_scroll_viewer_bindings_open_editor_when_sidebar_is_not_targeted(self):
        viewer = "agent-usage-monitor viewer claude --state /tmp/state.json"
        bindings = monitor._scroll_viewer_bindings("%7", viewer)
        rendered = "\n".join(" ".join(b) for b in bindings)

        double_click, page_up = bindings
        self.assertEqual(double_click[-2], "select-pane -t=")
        self.assertTrue(double_click[-1].startswith("run-shell -b "))
        self.assertEqual(page_up[-2], "send-keys PageUp")
        self.assertTrue(page_up[-1].startswith("run-shell -b "))
        self.assertIn("DoubleClick1Pane", rendered)
        self.assertIn("PageUp", rendered)
        self.assertIn("run-shell -b", rendered)
        self.assertNotIn("-K", rendered)
        self.assertNotIn("display-popup", rendered)
        self.assertNotIn("less", rendered)
        self.assertIn("agent-usage-monitor viewer claude", rendered)
        self.assertNotIn("session.log", rendered)
        self.assertIn("#{mouse_pane}", rendered)
        self.assertIn("#{pane_id}", rendered)

    def test_scroll_viewer_bindings_reject_untrusted_pane(self):
        for pane in ("%7; bad", "7"):
            with self.subTest(pane=pane):
                with self.assertRaises(RuntimeError):
                    monitor._scroll_viewer_bindings(pane, "viewer command")

    def test_write_log_filter_strips_ansi_and_handles_carriage_returns(self):
        import subprocess as sp
        with tempfile.TemporaryDirectory() as directory:
            script = Path(directory) / "filter.py"
            monitor._write_log_filter(script)
            result = sp.run(
                ["python3", str(script)],
                # \r mid-line: only the last overwrite ("final text") should survive
                # ANSI codes should be stripped; line2 should appear
                input="\033[31mpartial\rred\033[0m final text\r\nline2\r\n",
                capture_output=True,
                text=True,
            )
        self.assertNotIn("\033", result.stdout)
        self.assertIn("final text", result.stdout)
        self.assertNotIn("partial", result.stdout)
        self.assertIn("line2", result.stdout)

    def test_copy_bindings_pipe_to_pbcopy(self):
        bindings = monitor._copy_bindings()
        rendered = "\n".join(" ".join(b) for b in bindings)

        self.assertIn("copy-mode", rendered)
        self.assertIn("pbcopy", rendered)
        self.assertIn("copy-pipe-and-cancel", rendered)
        self.assertIn("MouseDragEnd1Pane", rendered)
        self.assertIn("Enter", rendered)

    def test_navigation_bindings_reject_untrusted_pane_or_pid(self):
        for pane, pid in (("%7; bad", "123"), ("%7", "123; bad")):
            with self.subTest(pane=pane, pid=pid):
                with self.assertRaises(RuntimeError):
                    monitor._navigation_bindings(pane, pid)


class InstallerTests(unittest.TestCase):
    def test_installers_preserve_unrelated_settings_and_create_backups(self):
        with tempfile.TemporaryDirectory() as directory:
            home = Path(directory)
            (home / ".claude").mkdir()
            (home / ".codex").mkdir()
            (home / ".claude/settings.json").write_text(
                json.dumps({"theme": "dark"})
            )
            (home / ".codex/config.toml").write_text(
                'model = "gpt-5.6-sol"\n\n[tui]\nanimations = false\n'
            )

            with mock.patch.object(monitor.Path, "home", return_value=home):
                claude_backup = monitor._install_claude(Path("/tmp/aum"))
                codex_backup = monitor._install_codex()

            claude = json.loads((home / ".claude/settings.json").read_text())
            codex = (home / ".codex/config.toml").read_text()
            self.assertEqual(claude["theme"], "dark")
            self.assertEqual(claude["statusLine"]["type"], "command")
            self.assertIn('model = "gpt-5.6-sol"', codex)
            self.assertIn("animations = false", codex)
            self.assertIn("status_line =", codex)
            self.assertTrue(claude_backup.exists())
            self.assertTrue(codex_backup.exists())


if __name__ == "__main__":
    unittest.main()
