#!/usr/bin/env python3
import argparse, csv, json, os, random, re, shlex, shutil, subprocess, sys, tempfile
from datetime import datetime, timezone
from io import StringIO
from pathlib import Path

SUPPORTED = ("codex", "claude", "gemini", "ollama")
DEFAULT_COMMANDS = {
    "codex": "codex exec - < {prompt_file}",
    "claude": 'claude -p "$(cat {prompt_file})"',
    "gemini": 'gemini -p "$(cat {prompt_file})"',
    "ollama": "ollama run llama3.2 < {prompt_file}",
}

def evidence(folder):
    out = []
    for path in sorted(Path(folder).rglob("*")):
        if path.is_file() and path.stat().st_size < 2_000_000:
            try: out.append(f"FILE: {path.name}\n" + path.read_text(errors="replace"))
            except Exception: pass
    return "\n\n".join(out)

def load_config(path):
    cfg, config_path = {}, Path(path)
    if not config_path.is_file(): raise FileNotFoundError(f"Config file not found: {config_path}")
    for number, raw in enumerate(config_path.read_text(errors="replace").splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"): continue
        if "=" not in line: raise ValueError(f"Invalid config line {number}: expected KEY=VALUE")
        key, value = (part.strip() for part in line.split("=", 1))
        if not re.fullmatch(r"[A-Z][A-Z0-9_]*", key): raise ValueError(f"Invalid config key on line {number}: {key}")
        cfg[key] = value
    return cfg

def scalar(value):
    value = (value or "").strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "'\"": return value[1:-1].strip()
    return value

def value_list(value):
    return [scalar(item).lower() for item in (value or "").split(",") if scalar(item)]

def on_off(value, key, default="off"):
    value = scalar(value).lower() or default
    if value in {"on", "off"}: return value == "on"
    raise ValueError(f"{key} must be On or Off.")

def task_fields(task):
    try:
        value = json.loads(task)
        if isinstance(value, dict): return value
    except (json.JSONDecodeError, TypeError): pass
    try:
        rows = list(csv.DictReader(StringIO(task)))
        if len(rows) == 1: return rows[0]
    except (csv.Error, TypeError): pass
    return {}

def final_fields(final):
    fields = {}
    for line in final.strip().splitlines():
        if ": " in line:
            key, value = line.split(": ", 1); fields[key] = value
    required = ("Story Points", "Confidence", "Closest historical analogs", "Rationale")
    if any(not fields.get(key) for key in required): raise ValueError("Chairman response is missing one or more required output fields.")
    if fields["Story Points"] not in {"1", "2", "3", "5", "8", "13", "21"}: raise ValueError("Chairman response contains an invalid story-point value.")
    if fields["Confidence"] not in {"High", "Medium", "Low"}: raise ValueError("Chairman response contains an invalid confidence value.")
    return fields

def output_path(config_path, output_folder):
    folder = Path(output_folder).expanduser()
    if not folder.is_absolute(): folder = Path(config_path).resolve().parent / folder
    folder.mkdir(parents=True, exist_ok=True)
    return folder

def append_report(config_path, output_folder, task, final, run_at):
    report = output_path(config_path, output_folder) / "estimation-output.csv"
    metadata, result = task_fields(task), final_fields(final)
    columns = ("timestamp", "task_id", "title", "task_description", "estimated_story_points", "confidence", "closest_historical_analogs", "rationale")
    row = {
        "timestamp": run_at.isoformat(), "task_id": metadata.get("test_id") or metadata.get("task_id") or metadata.get("id") or "",
        "title": metadata.get("title") or "", "task_description": metadata.get("description") or metadata.get("task_description") or "",
        "estimated_story_points": result["Story Points"], "confidence": result["Confidence"],
        "closest_historical_analogs": result["Closest historical analogs"], "rationale": result["Rationale"],
    }
    write_header = not report.exists() or report.stat().st_size == 0
    with report.open("a", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns)
        if write_header: writer.writeheader()
        writer.writerow(row)

def write_debate(config_path, output_folder, task, providers, first, reviews, chairman, final, run_at):
    folder, metadata, result = output_path(config_path, output_folder), task_fields(task), final_fields(final)
    task_id = metadata.get("test_id") or metadata.get("task_id") or metadata.get("id") or "UNKNOWN"
    safe_id = re.sub(r"[^A-Za-z0-9._-]+", "_", str(task_id)).strip("._") or "UNKNOWN"
    artifact = {
        "timestamp": run_at.isoformat(), "task_id": task_id, "title": metadata.get("title") or "",
        "estimations": [{"provider": p, "status": "succeeded" if p in first else "failed", "output": first.get(p)} for p in providers],
        "peer_reviews": [{"provider": p, "status": "succeeded" if p in reviews else "failed", "output": reviews.get(p)} for p in providers],
        "final_result": {"chairman_provider": chairman, "story_points": result["Story Points"], "confidence": result["Confidence"], "closest_historical_analogs": result["Closest historical analogs"], "rationale": result["Rationale"]},
    }
    path = folder / f'{safe_id}_council_{run_at.strftime("%Y%m%dT%H%M%SZ")}.json'
    path.write_text(json.dumps(artifact, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

def methodology():
    return (Path(__file__).resolve().parent.parent / "references" / "estimation-methodology.md").read_text(errors="replace")

def command_for(provider, cfg):
    return scalar(cfg.get(f"{provider.upper()}_COUNCIL_CMD")) or DEFAULT_COMMANDS[provider]

def run_provider(provider, prompt, cfg):
    with tempfile.NamedTemporaryFile("w", delete=False, suffix=".txt", encoding="utf-8") as handle:
        handle.write(prompt); prompt_file = handle.name
    try:
        template = command_for(provider, cfg)
        if "{prompt_file}" not in template: raise ValueError(f"{provider.upper()}_COUNCIL_CMD must contain {{prompt_file}}.")
        result = subprocess.run(template.format(prompt_file=shlex.quote(prompt_file)), shell=True, text=True, capture_output=True, timeout=240)
        if result.returncode: raise RuntimeError(result.stderr[-1000:] or f"command exited with status {result.returncode}")
        if not result.stdout.strip(): raise RuntimeError("command returned no output")
        return result.stdout.strip()
    finally: os.unlink(prompt_file)

def configured_providers(cfg, override):
    providers = value_list(override) if override else value_list(cfg.get("STORYPOINT_COUNCIL_PROVIDERS"))
    unknown = [p for p in providers if p not in SUPPORTED]
    if unknown: raise ValueError("Unsupported providers: " + ", ".join(unknown))
    if len(providers) != len(set(providers)): raise ValueError("STORYPOINT_COUNCIL_PROVIDERS must not contain duplicates.")
    if len(providers) < 2: raise ValueError("Configure at least two council providers.")
    for provider in providers:
        executable = shlex.split(command_for(provider, cfg))[0]
        if not shutil.which(executable): raise ValueError(f"Configured provider '{provider}' executable was not found on PATH: {executable}")
    return providers

def main():
    parser = argparse.ArgumentParser(); parser.add_argument("--history", required=True); parser.add_argument("--task", required=True)
    default_config = Path(__file__).resolve().parent.parent / "storypoints-council.local.conf"
    parser.add_argument("--config", default=default_config); parser.add_argument("--providers")
    gate = parser.add_mutually_exclusive_group(); gate.add_argument("--clarifications-complete", action="store_true"); gate.add_argument("--continue-without-clarifications", action="store_true")
    args = parser.parse_args()
    try:
        cfg = load_config(args.config); providers = configured_providers(cfg, args.providers)
        output_folder = scalar(cfg.get("OUTPUT_FOLDER"))
        if not output_folder: raise ValueError("set OUTPUT_FOLDER in the config file.")
        debate_output = on_off(cfg.get("COUNCIL_DEBATE_OUTPUT"), "COUNCIL_DEBATE_OUTPUT")
        clarification_gate = on_off(cfg.get("ASK_CLARIFICATION_QUESTIONS_FOR_ESTIMATION"), "ASK_CLARIFICATION_QUESTIONS_FOR_ESTIMATION")
        chairman = scalar(cfg.get("STORYPOINT_CHAIRMAN_PROVIDER")).lower() or "codex"
        if chairman not in providers: raise ValueError("STORYPOINT_CHAIRMAN_PROVIDER must be one of STORYPOINT_COUNCIL_PROVIDERS.")
    except Exception as error: sys.exit(f"Configuration error: {error}")
    if clarification_gate and not (args.clarifications_complete or args.continue_without_clarifications):
        sys.exit("Clarification preflight required. Rerun with --clarifications-complete after questions are answered or none are generated, or with --continue-without-clarifications only after the user explicitly confirms the unchanged task should proceed.")
    task = Path(args.task).read_text(errors="replace") if Path(args.task).is_file() else args.task
    history = evidence(args.history); contract = methodology() + "\n\nIMPORTANT COUNCIL RESPONSE RULE: Give concise conclusions and evidence only; do not expose hidden chain-of-thought."
    first = {}
    for provider in providers:
        try: first[provider] = run_provider(provider, f"{contract}\nNEW TASK:\n{task}\nHISTORY:\n{history}\nReturn proposed points, confidence, up to 3 analog IDs with points, and concise rationale.", cfg)
        except Exception as error: print(f"WARN {provider}: {error}", file=sys.stderr)
    if len(first) < 2: sys.exit("Fewer than two estimators succeeded.")
    if chairman not in first: sys.exit(f"Configured chairman provider '{chairman}' did not produce a successful estimate.")
    labels = {provider: chr(65 + index) for index, provider in enumerate(first)}; reviews = {}
    for reviewer in first:
        peers = [(labels[p], output) for p, output in first.items() if p != reviewer]; random.shuffle(peers)
        proposals = "\n\n".join(f"Proposal {label}:\n{output}" for label, output in peers)
        try: reviews[reviewer] = run_provider(reviewer, f"{contract}\nBlindly review and rank these proposals by consistency with historical anchors. Flag missed scope/uncertainty/dependencies/integration/testing/risk and productivity-driven deflation.\n{proposals}", cfg)
        except Exception as error: print(f"WARN review {reviewer}: {error}", file=sys.stderr)
    packet = "\n\n".join(f'Proposal {labels[p]}:\n{output}\nReview by reviewer {labels[p]}:\n{reviews.get(p, "Unavailable")}' for p, output in first.items())
    try:
        final = run_provider(chairman, f'''{contract}\nYou are chairman. Synthesize; do not mechanically average or majority-vote. A minority may win if it found decisive overlooked complexity. Confidence combines historical evidence quality and convergence. Output EXACTLY four lines:\nStory Points: <1|2|3|5|8|13|21>\nConfidence: <High|Medium|Low>\nClosest historical analogs: <up to 3 real IDs with points, or None>\nRationale: <concise auditable synthesis>\nNEW TASK:\n{task}\nHISTORY:\n{history}\nCOUNCIL:\n{packet}''', cfg)
        run_at = datetime.now(timezone.utc); append_report(args.config, output_folder, task, final, run_at)
        if debate_output: write_debate(args.config, output_folder, task, providers, first, reviews, chairman, final, run_at)
    except Exception as error: sys.exit(f"Council completion error: {error}")
    print(json.dumps({"providers": list(first), "chairman": chairman, "first": first, "reviews": reviews}, indent=2), file=sys.stderr)
    print(final.strip())

if __name__ == "__main__": main()
