#!/usr/bin/env python3
"""Calculate transparent workload, storage, bandwidth, and growth scenarios."""

from __future__ import annotations

import argparse
import json
import sys
from typing import Any, Dict


SECONDS_PER_DAY = 86_400


def number(data: Dict[str, Any], key: str, default: float = 0.0) -> float:
    value = data.get(key, default)
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{key} must be a number")
    if value < 0:
        raise ValueError(f"{key} must be non-negative")
    return float(value)


def calculate(payload: Dict[str, Any]) -> Dict[str, Any]:
    workload = payload.get("workload")
    if not isinstance(workload, dict):
        raise ValueError("input must contain a workload object")

    active_users = number(workload, "active_users")
    actions_per_day = number(workload, "actions_per_user_per_day")
    supplied_average_rps = workload.get("average_rps")
    if supplied_average_rps is None:
        average_rps = active_users * actions_per_day / SECONDS_PER_DAY
        rps_source = "derived_from_daily_activity"
    else:
        average_rps = number(workload, "average_rps")
        rps_source = "supplied"

    peak_factor = number(workload, "peak_factor", 1.0)
    stress_factor = number(workload, "stress_factor", 1.0)
    peak_rps = average_rps * peak_factor
    stress_rps = peak_rps * stress_factor

    latency_seconds = number(workload, "average_latency_ms") / 1000
    concurrency = {
        "average": average_rps * latency_seconds,
        "peak": peak_rps * latency_seconds,
        "stress": stress_rps * latency_seconds,
    }

    items_per_day = number(workload, "items_ingested_per_day")
    item_bytes = number(workload, "item_size_bytes")
    retention_days = number(workload, "retention_days")
    compression_ratio = number(workload, "compression_ratio", 1.0)
    index_ratio = number(workload, "index_overhead_ratio")
    replica_copies = number(workload, "replica_copies", 1.0)
    backup_copies = number(workload, "backup_copies")
    if not replica_copies.is_integer() or not backup_copies.is_integer():
        raise ValueError("replica_copies and backup_copies must be whole numbers")
    log_bytes_per_day = number(workload, "log_bytes_per_day")
    log_retention_days = number(workload, "log_retention_days")

    logical_bytes = items_per_day * item_bytes * retention_days
    primary_bytes = logical_bytes * compression_ratio
    index_bytes = primary_bytes * index_ratio
    indexed_primary_bytes = primary_bytes + index_bytes
    replicated_bytes = indexed_primary_bytes * replica_copies
    backup_bytes = indexed_primary_bytes * backup_copies
    log_bytes = log_bytes_per_day * log_retention_days
    total_bytes = replicated_bytes + backup_bytes + log_bytes

    response_bytes = number(workload, "response_size_bytes")
    wire_overhead_ratio = number(workload, "wire_overhead_ratio")
    peak_wire_bps = peak_rps * response_bytes * 8 * (1 + wire_overhead_ratio)
    stress_wire_bps = stress_rps * response_bytes * 8 * (1 + wire_overhead_ratio)

    growth_rate = number(workload, "annual_growth_rate")
    planning_years = number(workload, "planning_years")
    growth_multiplier = (1 + growth_rate) ** planning_years

    def rounded(value: float) -> float:
        return round(value, 4)

    return {
        "request_rate_rps": {
            "source": rps_source,
            "average": rounded(average_rps),
            "peak": rounded(peak_rps),
            "stress": rounded(stress_rps),
        },
        "estimated_concurrency": {key: rounded(value) for key, value in concurrency.items()},
        "storage_bytes": {
            "logical_raw": rounded(logical_bytes),
            "compressed_primary": rounded(primary_bytes),
            "indexes_and_metadata": rounded(index_bytes),
            "replicated_primary_and_indexes": rounded(replicated_bytes),
            "additional_backups": rounded(backup_bytes),
            "logs": rounded(log_bytes),
            "total_current": rounded(total_bytes),
            "total_at_horizon": rounded(total_bytes * growth_multiplier),
        },
        "wire_bandwidth_bits_per_second": {
            "peak": rounded(peak_wire_bps),
            "stress": rounded(stress_wire_bps),
        },
        "growth": {
            "annual_rate": growth_rate,
            "planning_years": planning_years,
            "multiplier": rounded(growth_multiplier),
        },
        "warnings": [
            "Concurrency uses average latency and does not model tail latency or queueing.",
            "Replica and backup inputs are full-copy equivalents; adjust for incremental backup retention and deduplication.",
            "Validate results with measured peak distributions, component benchmarks, quotas, and load tests.",
        ],
    }


def human_bytes(value: float) -> str:
    units = ["B", "KiB", "MiB", "GiB", "TiB", "PiB", "EiB"]
    index = 0
    while abs(value) >= 1024 and index < len(units) - 1:
        value /= 1024
        index += 1
    return f"{value:.2f} {units[index]}"


def format_text(result: Dict[str, Any]) -> str:
    rates = result["request_rate_rps"]
    concurrency = result["estimated_concurrency"]
    storage = result["storage_bytes"]
    bandwidth = result["wire_bandwidth_bits_per_second"]
    lines = [
        "SYSTEM CAPACITY ESTIMATE",
        f"Average / peak / stress RPS: {rates['average']:.2f} / {rates['peak']:.2f} / {rates['stress']:.2f}",
        f"Estimated concurrency: {concurrency['average']:.2f} / {concurrency['peak']:.2f} / {concurrency['stress']:.2f}",
        f"Current retained storage: {human_bytes(storage['total_current'])}",
        f"Horizon retained storage: {human_bytes(storage['total_at_horizon'])}",
        f"Peak / stress wire bandwidth: {bandwidth['peak'] / 1_000_000:.2f} / {bandwidth['stress'] / 1_000_000:.2f} Mbit/s",
        "Warnings:",
    ]
    lines.extend(f"- {warning}" for warning in result["warnings"])
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input_file", help="JSON file containing a workload object")
    parser.add_argument("--format", choices=("text", "json"), default="text")
    args = parser.parse_args()

    try:
        with open(args.input_file, "r", encoding="utf-8") as handle:
            payload = json.load(handle)
        result = calculate(payload)
    except (OSError, json.JSONDecodeError, ValueError) as error:
        print(f"Error: {error}", file=sys.stderr)
        raise SystemExit(1)

    print(json.dumps(result, indent=2) if args.format == "json" else format_text(result))


if __name__ == "__main__":
    main()
