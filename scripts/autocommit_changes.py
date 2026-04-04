#!/usr/bin/env python3
"""Auto-commit checkpoints when the working tree changes.

Usage:
  ./scripts/autocommit_changes.py start
  ./scripts/autocommit_changes.py stop

Each detected change is committed and pushed to the configured remote.
"""

import os
import subprocess
import signal
import sys
import time
from datetime import datetime
from typing import List

INTERVAL = float(os.getenv("AGENTIC_CHECKPOINT_INTERVAL", "2.0"))


def get_git_dir() -> str:
    res = run(["git", "rev-parse", "--git-dir"])
    git_dir = res.stdout.decode(errors="replace").strip()
    return git_dir or ".git"


def pid_path() -> str:
    return os.path.join(get_git_dir(), ".agentic_autocommit.pid")


def run(cmd: List[str]) -> subprocess.CompletedProcess:
    env = os.environ.copy()
    # Never prompt; fail fast if git would ask for input.
    env["GIT_TERMINAL_PROMPT"] = "0"
    return subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env)


def get_changed_paths() -> List[str]:
    # -z keeps filenames safe; porcelain v1 is easy to parse.
    res = run(["git", "status", "--porcelain=v1", "-z"])
    data = res.stdout
    if not data:
        return []

    parts = data.split(b"\0")
    paths: List[str] = []
    i = 0
    while i < len(parts):
        entry = parts[i]
        if not entry:
            i += 1
            continue
        # Format: XY<space>path
        status = entry[:2].decode(errors="replace")
        path = entry[3:].decode(errors="replace")

        if status[0] in ("R", "C") or status[1] in ("R", "C"):
            # Rename/copy: next NUL contains the new path.
            if i + 1 < len(parts) and parts[i + 1]:
                new_path = parts[i + 1].decode(errors="replace")
                paths.append(new_path)
                i += 2
                continue
        paths.append(path)
        i += 1

    # De-duplicate while preserving order.
    seen = set()
    unique_paths = []
    for p in paths:
        if p not in seen:
            seen.add(p)
            unique_paths.append(p)
    return unique_paths


def build_description(paths: List[str]) -> str:
    if not paths:
        return "updated files"
    if len(paths) == 1:
        return f"updated {paths[0]}"
    if len(paths) == 2:
        return f"updated {paths[0]}, {paths[1]}"
    return f"updated {len(paths)} files: {paths[0]}, {paths[1]}"


def timestamp() -> str:
    now = datetime.now()
    return f"{now.month:02d}{now.day:02d}{now.hour:02d}{now.minute:02d}{now.second:02d}"


def commit_checkpoint(paths: List[str]) -> None:
    run(["git", "add", "-A"])
    # If nothing is staged, skip.
    if run(["git", "diff", "--cached", "--quiet"]).returncode == 0:
        return
    message = f"[AGENTIC DEV CHECKPOINT] - {timestamp()}"
    # --no-gpg-sign avoids interactive pinentry prompts.
    commit_res = run(["git", "commit", "--no-gpg-sign", "-m", message])
    if commit_res.returncode == 0:
        # Best-effort push to GitHub after each checkpoint commit.
        upstream = run(["git", "rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"])
        if upstream.returncode == 0:
            run(["git", "push"])
        else:
            run(["git", "push", "-u", "origin", "HEAD"])


def print_usage() -> None:
    print("Usage:")
    print("  autocommit_changes.py start  # Start background auto-commit + push")
    print("  autocommit_changes.py stop   # Stop the background process")


def is_running(pid: int) -> bool:
    try:
        os.kill(pid, 0)
    except OSError:
        return False
    return True


def start_daemon() -> None:
    pidfile = pid_path()
    if os.path.exists(pidfile):
        try:
            existing = int(open(pidfile, "r").read().strip())
        except Exception:
            existing = None
        if existing and is_running(existing):
            print(f"Already running (pid {existing}).")
            return
        try:
            os.remove(pidfile)
        except OSError:
            pass

    # Spawn detached child running the loop.
    env = os.environ.copy()
    env["GIT_TERMINAL_PROMPT"] = "0"
    proc = subprocess.Popen(
        [sys.executable, os.path.abspath(__file__), "run"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        stdin=subprocess.DEVNULL,
        env=env,
        start_new_session=True,
    )
    with open(pidfile, "w") as f:
        f.write(str(proc.pid))
    print(f"Started (pid {proc.pid}).")


def stop_daemon() -> None:
    pidfile = pid_path()
    if not os.path.exists(pidfile):
        print("Not running.")
        return
    try:
        pid = int(open(pidfile, "r").read().strip())
    except Exception:
        print("Could not read pidfile; removing it.")
        os.remove(pidfile)
        return

    if not is_running(pid):
        print("Process not running; removing stale pidfile.")
        os.remove(pidfile)
        return

    os.kill(pid, signal.SIGTERM)
    os.remove(pidfile)
    print("Stopped.")


def run_loop() -> None:
    while True:
        paths = get_changed_paths()
        if paths:
            commit_checkpoint(paths)
        time.sleep(INTERVAL)


def main() -> None:
    if len(sys.argv) < 2:
        print_usage()
        sys.exit(1)
    cmd = sys.argv[1].lower()
    if cmd == "start":
        start_daemon()
    elif cmd == "stop":
        stop_daemon()
    elif cmd == "run":
        run_loop()
    else:
        print_usage()
        sys.exit(1)


if __name__ == "__main__":
    main()
