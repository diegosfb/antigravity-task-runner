#!/usr/bin/env python3
"""Verify normalized VTU option arithmetic without interpreting a SOW."""
import argparse
import json
import math
from pathlib import Path

def ceil_half(value):
    return math.ceil(value * 2.0) / 2.0

def calculate(data):
    duration = float(data["duration_months"])
    multiplier = float(data["complexity"]) * float(data["risk"]) * float(data["environment"])
    ai = float(data.get("ai_capacity_multiplier", 1.0))
    demand, token_units = {}, 0.0
    for item in data["artifacts"]:
        count, base = float(item["count"]), float(item["base_vtus"])
        token_units += count * float(item.get("tokens_per_unit", 0)) * multiplier
        allocations = item["allocations"]
        if abs(sum(float(a["allocation_percent"]) for a in allocations) - 100.0) > 0.001:
            raise ValueError("allocations must sum to 100 for " + item["artifact_key"])
        for allocation in allocations:
            key = allocation["expert_key"]
            demand[key] = demand.get(key, 0.0) + count * base * multiplier * float(allocation["allocation_percent"]) / 100.0
    team, talent = [], 0.0
    for key, vtus in sorted(demand.items()):
        expert = data["experts"][key]
        active = float(expert.get("active_months", duration))
        if active <= 0 or active > duration:
            raise ValueError("active_months must be > 0 and <= duration")
        expert_months = vtus / (float(expert["vtu_capacity_per_month"]) * ai)
        fte = ceil_half(expert_months / active)
        utilization = expert_months / (fte * active) if fte else 0.0
        if utilization > 0.95 + 1e-9:
            raise ValueError("overloaded expert after rounding: " + key)
        cost = fte * float(expert["monthly_rate_usd"]) * active
        talent += cost
        team.append({"expert_key": key, "vtus": round(vtus, 4), "expert_months": round(expert_months, 4), "active_months": active, "fte": fte, "utilization": round(utilization, 4), "talent_cost": round(cost, 2)})
    management = talent * float(data.get("management_rate", 0.05))
    tokens = token_units * float(data.get("token_buffer", 1.2)) * float(data.get("token_cost_per_million", 10.0)) / 1000000.0
    platform = float(data.get("platform_fee_per_expert_month", 50.0)) * len(team) * duration
    internal = talent + management + tokens + platform
    return {"duration_months": duration, "cre_multiplier": round(multiplier, 6), "team": team, "talent_cost": round(talent, 2), "management_cost": round(management, 2), "token_cost": round(tokens, 2), "platform_fee": round(platform, 2), "internal_cost": round(internal, 2), "subscription": round(internal * float(data.get("subscription_multiplier", 2.5)), 2)}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    result = calculate(json.loads(args.input.read_text(encoding="utf-8")))
    rendered = json.dumps(result, indent=2, sort_keys=True) + "\n"
    if args.output:
        args.output.write_text(rendered, encoding="utf-8")
    else:
        print(rendered, end="")

if __name__ == "__main__":
    main()
