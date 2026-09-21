#!/usr/bin/env bash
set -euo pipefail

RAW_BASE="https://raw.githubusercontent.com/diegosfb/antigravity-task-runner/main"
DEST_DIR="test-setup"

mkdir -p "$DEST_DIR"
cd "$DEST_DIR"

echo "Creating directory structure from project-structure-list.txt ..."
mkdir -p \
  ".gemini/agents" \
  ".opencode/agents" \
  "evals/cases" \
  "out" \
  "plugins/agent-usage-monitor/scripts" \
  "plugins/agent-usage-monitor/.claude-plugin" \
  "plugins/agent-usage-monitor/.codex-plugin" \
  "resources" \
  "Knowhow" \
  "tests" \
  "src" \
  "tmp" \
  ".agents/documentation/Tools & Plugins" \
  ".agents/documentation/Agentic Platforms Info" \
  ".agents/documentation/Agentic Workflows/Auxiliary Agents" \
  ".agents/documentation/Agentic Workflows/SDLC Agents" \
  ".agents/documentation/Agentic Workflows/workflow-design" \
  ".agents/workflows" \
  ".agents/agents" \
  ".agents/skills" \
  ".agents/guidelines" \
  ".agents/agentic-libraries/helper-scripts" \
  ".claude/agents" \
  ".claude/hooks" \
  ".claude/commands" \
  "docs/specs" \
  "docs/backlog" \
  "docs/TODO" \
  "docs/project_description" \
  "docs/ux" \
  "docs/architecture/architecture_guidelines" \
  "docs/architecture/adrs" \
  "docs/architecture/documents" \
  "docs/estimation" \
  "docs/agents-folder" \
  "docs/vault/Context-History" \
  "docs/vault/Test-Cases" \
  "docs/vault/Action-Log" \
  "docs/vault/Implementation-Plans" \
  "docs/vault/Specs" \
  "docs/vault/Backlog" \
  "docs/vault/.obsidian" \
  "docs/vault/UX" \
  "docs/vault/Architecture" \
  "docs/vault/Notes" \
  "docs/vault/Estimation" \
  "docs/vault/PRD" \
  "docs/vault/ADRs" \
  "docs/vault/MOCs" \
  "docs/vault/Reviews" \
  ".codex/agents" \
  ".codex/rules" \
  "scripts/helper-scripts" \
  ".github/workflows" \
  ".vscode"

echo "Downloading listed files from GitHub ..."
while IFS= read -r f; do
  mkdir -p "$(dirname "$f")"
  curl -fsSL "$RAW_BASE/$f" -o "$f" 2>/dev/null || touch "$f"
done << 'FILELIST'
constitution.md
.gemini/settings.json
validate-registry.py
evals/run-evals.py
evals/README.md
LICENSE
plugins/agent-usage-monitor/README.md
plugins/agent-usage-monitor/scripts/agent-usage-monitor.py
plugins/agent-usage-monitor/.claude-plugin/plugin.json
plugins/agent-usage-monitor/.codex-plugin/plugin.json
project-setup.sh
.opencode/opencode.json
.agents/documentation/Tools & Plugins/Tools & Plugins.md
.agents/documentation/Agentic Platforms Info/codex-toml-definitions.md
.agents/documentation/Agentic Platforms Info/evals info.md
.agents/documentation/Agentic Platforms Info/Antigravity.md
.agents/documentation/Agentic Platforms Info/agent-creation-guidelines.md
.agents/documentation/Agentic Platforms Info/Codex.md
.agents/documentation/Agentic Platforms Info/Gemini.md
.agents/documentation/Agentic Platforms Info/Claude.md
.agents/documentation/Librery design.md
.agents/documentation/context-budget-recommendations.md
.agents/documentation/Agentic Workflows/agent-audit-report.md
.agents/documentation/Agentic Workflows/orchestration-explanation.md
.agents/documentation/Agentic Workflows/Auxiliary Agents/OBSIDIAN-VAULT-AGENT.md
.agents/documentation/Agentic Workflows/Auxiliary Agents/LLM-JUDGE-AGENT.md
.agents/documentation/Agentic Workflows/Auxiliary Agents/SPEC-VALIDATION-AGENT.md
.agents/documentation/Agentic Workflows/Auxiliary Agents/AUTORESEARCH-RUNNER.md
.agents/documentation/Agentic Workflows/Auxiliary Agents/CONSULTANT-AGENT.md
.agents/documentation/Agentic Workflows/README.md
.agents/documentation/Agentic Workflows/SDLC Agents/CODE-REVIEW-AGENT.md
.agents/documentation/Agentic Workflows/SDLC Agents/TEST-AGENT.md
.agents/documentation/Agentic Workflows/SDLC Agents/SDLC-ORCHESTRATOR.md
.agents/documentation/Agentic Workflows/SDLC Agents/PRODUCT-AGENT.md
.agents/documentation/Agentic Workflows/SDLC Agents/BA-AGENT.md
.agents/documentation/Agentic Workflows/SDLC Agents/PROJECT-PLANNER-AGENT.md
.agents/documentation/Agentic Workflows/SDLC Agents/ARCHITECT-AGENT.md
.agents/documentation/Agentic Workflows/SDLC Agents/ARCHITECTURE-REVIEW-AGENT.md
.agents/documentation/Agentic Workflows/SDLC Agents/DEVELOPER-AGENT.md
.agents/documentation/Agentic Workflows/SDLC Agents/UX-AGENT.md
.agents/documentation/Agentic Workflows/SDLC Agents/DEPLOYMENT-AGENT.md
.agents/documentation/Agentic Workflows/SDLC Agents/DOCUMENTATION-AGENT.md
.agents/documentation/Agentic Workflows/SDLC Agents/MEETING-EVIDENCE-WITH-PRODUCT-AGENT.md
.agents/documentation/Agentic Workflows/workflow-design/agent-sdlc-roles-and-artifacts.docx
.agents/documentation/Agentic Workflows/workflow-design/agent-orchestrated-sdlc-preview.md
.agents/documentation/Agentic Workflows/workflow-design/ADLC-design.md
.agents/documentation/Agentic Workflows/workflow-design/agent-orchestrated-sdlc.pptx
.agents/documentation/Agentic Workflows/workflow-design/agent-orchestrated-sdlc.mmd
.agents/documentation/AGENTS & SKILLS.md
.agents/workflows/project-definition-workflow.md
.agents/workflows/red-team-workflow.md
.agents/workflows/backlog-implementation-workflow.md
.agents/readme.md
.agents/hooks.json
.agents/guidelines/monitoring-and-logging.md
.agents/guidelines/infrastructure-management.md
.agents/guidelines/readme.md
.agents/guidelines/github-flow.md
.agents/guidelines/jira-flow.md
.agents/guidelines/security.md
.agents/agentic-libraries/clean-deployed-libs.sh
.agents/agentic-libraries/context-budget.py
.agents/agentic-libraries/deploy-all-libs.sh
.agents/agentic-libraries/deploy-sdlc-lib.sh
.agents/agentic-libraries/deploy-general-purpose-lib.sh
.agents/agentic-libraries/helper-scripts/deploy-agents.sh
.agents/agentic-libraries/library-deployment-matrix.md
.agents/agentic-libraries/deploy-technical-advisor-lib.sh
.agents/agentic-libraries/deploy-extended-sdlc-lib.sh
.agents/agentic-libraries/deploy-business-finance-lib.sh
.agents/agentic-libraries/deploy-professional-services-lib.sh
.claude/settings.json
.claude/settings.local.json
.claude/readme.md
.claude/hooks/return-to-plan-mode.py
docs/USAGE.md
docs/vault/.obsidian/workspace.json
docs/vault/.obsidian/app.json
docs/vault/.obsidian/core-plugins.json
docs/vault/.obsidian/graph.json
docs/vault/.obsidian/appearance.json
docs/vault/00-index.md
README.md
ADLC_workflow_settings.json
CODEX.md
.gitignore
package-lock.json
package.json
routing-registry.yaml
scripts/bump-version.sh
scripts/switch-env.sh
scripts/context-budget.py
scripts/todo-done.sh
scripts/build-artifacts.sh
scripts/helper-scripts/vault-sync.sh
scripts/helper-scripts/vault-event.py
scripts/helper-scripts/eval-capture.py
scripts/todo-add.sh
scripts/speak-plan.sh
scripts/docker-warmup.sh
scripts/open-obsidian-vault.sh
scripts/build-version.sh
.github/workflows/cd.yml
.github/workflows/ci.yml
routerconfig.example.json
tsconfig.json
GEMINI.md
.env.example
AGENTS.md
.vscode/settings.json
.vscode/arduino.json
.vscode/settings.example.json
.vscode/extensions.json
eslint.config.mjs
CLAUDE.md
FILELIST

echo "Installing npm dependencies ..."
npm install

echo "Setup complete. Project is in ./$DEST_DIR"
