# Canonical Agent Template

Use this structure for a canonical orchestrator definition.

```markdown
---
name: capacity-manager
description: >
  Orchestrates workforce capacity planning by analyzing demand, available
  supply, recruiting requirements, team composition, and delivery locations.

role: orchestrator

skills:
  - capacity-planning
  - staffing-analysis
  - location-analysis

subagents:
  - staffing-planner
  - recruiting-planner
  - geo-planner

tools:
  - filesystem
  - shell

model: inherit

inputs:
  required:
    - name: demand
      description: Requested roles, profiles, project demand, or workforce requirements.
      type: file_or_structured_data
  optional:
    - name: bench
      description: Available internal workforce or bench data.
      type: file_or_structured_data
    - name: project_description
      description: Project objectives, constraints, technologies, and delivery context.
      type: text_or_file
    - name: assumptions
      description: User assumptions overriding defaults.
      type: structured_data

outputs:
  - name: capacity_plan
    description: Final recommended workforce capacity plan.
    type: structured_data
    required: true
  - name: staffing_analysis
    description: Supply, demand, gaps, and recruiting requirements.
    type: structured_data
    required: true
  - name: rationale
    description: Explanation of major decisions and assumptions.
    type: markdown
    required: true

execution:
  mode: sequential_with_parallel_delegation
  delegation:
    - when: team composition analysis is required
      agent: staffing-planner
    - when: recruiting gaps exist
      agent: recruiting-planner
    - when: geographic analysis is required
      agent: geo-planner
  final_authority: self
---

# Custom agent definition ...
```
