#!/usr/bin/env python3
"""Validate routing-registry.yaml against the files on disk.

Checks:
  1. every targets.agents[*].path exists
  2. every route.target is a registered agent
  3. every workflow.artifacts key is a registered agent
Exits non-zero on any failure. No third-party deps (hand-rolled minimal parse).
"""
import sys, re, pathlib

ROOT = pathlib.Path(__file__).parent
REG = ROOT / "routing-registry.yaml"
text = REG.read_text()

# --- collect registered agent names and their paths ---
paths = {}          # agent -> path string
in_agents = False
for line in text.splitlines():
    if re.match(r"^\s*agents:\s*$", line):
        in_agents = True
        continue
    if in_agents:
        # leave the block when we hit a top-level or same-level key that's not an agent entry
        if re.match(r"^\s{0,2}\w[\w-]*:\s*$", line) and "path:" not in line:
            in_agents = False
            continue
        m = re.match(r"\s*([\w-]+):\s*\{.*path:\s*([^,}]+)", line)
        if m:
            paths[m.group(1)] = m.group(2).strip()

# --- collect route targets ---
route_targets = re.findall(r"target:\s*([\w-]+)", text)

# --- collect workflow.artifacts keys ---
artifact_keys = []
in_art = False
for line in text.splitlines():
    if re.match(r"^\s*artifacts:\s*$", line):
        in_art = True
        continue
    if in_art:
        m = re.match(r"\s{4,}([\w-]+):\s*\{", line)
        if m:
            artifact_keys.append(m.group(1))
        elif re.match(r"^\s{0,4}\w[\w-]*:\s*$", line):
            in_art = False

errors = []

for agent, p in paths.items():
    if not (ROOT / p).exists():
        errors.append(f"MISSING FILE: target '{agent}' -> {p}")

for t in route_targets:
    if t not in paths:
        errors.append(f"UNREGISTERED ROUTE TARGET: '{t}' has a route but no targets.agents entry")

for k in artifact_keys:
    if k not in paths:
        errors.append(f"UNREGISTERED ARTIFACT PRODUCER: workflow.artifacts.'{k}' is not a registered agent")

print(f"registered agents: {len(paths)}")
print(f"route targets:     {len(set(route_targets))}")
print(f"artifact producers:{len(artifact_keys)}")
if errors:
    print("\nFAILED:")
    for e in errors:
        print("  -", e)
    sys.exit(1)
print("\nAll registry checks PASSED.")
