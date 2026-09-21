#!/usr/bin/env python3

import json
import sys


def block(reason):
    print(json.dumps({"decision": "block", "reason": reason}))


try:
    payload = json.load(sys.stdin)
except (TypeError, ValueError):
    block("Unable to verify Claude's permission mode. Enter Plan Mode before stopping.")
    raise SystemExit(0)

if not isinstance(payload, dict):
    block("Unable to verify Claude's permission mode. Enter Plan Mode before stopping.")
    raise SystemExit(0)

if payload.get("permission_mode") == "plan" or payload.get("stop_hook_active") is True:
    raise SystemExit(0)

block(
    "Return the session to Plan Mode before stopping. Call EnterPlanMode now, then provide "
    "the final response without making further changes."
)
