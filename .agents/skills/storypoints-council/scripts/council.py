#!/usr/bin/env python3
"""Dispatch the Story Points Council to a local-CLI or OpenRouter backend."""

import subprocess
import sys
from pathlib import Path

VALID_MODES = {"local": "local-cli", "local-cli": "local-cli", "openrouter": "openrouter"}


def read_selector(path):
    values = {}
    if not path.is_file():
        return values
    for number, raw in enumerate(path.read_text(errors="replace").splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            raise ValueError(f"Invalid selector line {number}: expected KEY=VALUE")
        key, value = (part.strip() for part in line.split("=", 1))
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "'\"":
            value = value[1:-1].strip()
        values[key] = value
    return values


def resolve_relative(value, base):
    path = Path(value).expanduser()
    return path if path.is_absolute() else base / path


def parse_dispatch_args(argv):
    mode = None
    backend_config = None
    selector_config = None
    show_selection = False
    forwarded = []
    index = 0
    while index < len(argv):
        arg = argv[index]
        if arg in {"--mode", "--config", "--selector-config"}:
            if index + 1 >= len(argv):
                raise ValueError(f"{arg} requires a value")
            value = argv[index + 1]
            if arg == "--mode":
                mode = value.lower()
            elif arg == "--config":
                backend_config = Path(value).expanduser()
            else:
                selector_config = Path(value).expanduser()
            index += 2
            continue
        if arg == "--show-selection":
            show_selection = True
            index += 1
            continue
        forwarded.append(arg)
        index += 1
    return mode, backend_config, selector_config, show_selection, forwarded


def select(argv):
    skill_dir = Path(__file__).resolve().parent.parent
    mode, backend_config, selector_config, show_selection, forwarded = parse_dispatch_args(argv)
    selector_path = selector_config or skill_dir / "storypoints-council.conf"
    selector = read_selector(selector_path)
    requested_mode = mode or selector.get("MODE") or "local-cli"
    selected_mode = VALID_MODES.get(requested_mode.lower())
    if not selected_mode:
        raise ValueError("MODE must be local-cli or openrouter")

    if selected_mode == "local-cli":
        backend = skill_dir / "scripts" / "local_council.py"
        configured = selector.get("LOCAL_CLI_CONFIG")
        default_config = skill_dir / "storypoints-council.local.conf"
    else:
        backend = skill_dir / "scripts" / "openrouter_council.py"
        configured = selector.get("OPENROUTER_CONFIG")
        default_config = skill_dir / "storypoints-council.openrouter.conf"

    if backend_config is None:
        backend_config = resolve_relative(configured, selector_path.resolve().parent) if configured else default_config
    return selected_mode, backend, backend_config, show_selection, forwarded


def main():
    try:
        mode, backend, config, show_selection, forwarded = select(sys.argv[1:])
    except Exception as error:
        sys.exit(f"Council selection error: {error}")

    if show_selection:
        print(f"mode={mode}")
        print(f"backend={backend}")
        print(f"config={config}")
        return

    result = subprocess.run([sys.executable, str(backend), "--config", str(config), *forwarded])
    raise SystemExit(result.returncode)


if __name__ == "__main__":
    main()
