#!/usr/bin/env python3
"""Safely write a redacted handoff into a project's ignored tmp directory."""

import argparse
import ctypes
import errno
import os
from pathlib import Path
import re
import sys


SECRET_LINE = re.compile(
    r"(?im)^(\s*(?:api[_-]?key|access[_-]?token|token|password|secret|authorization)\s*[:=]\s*).+$"
)
PRIVATE_KEY = re.compile(
    r"-----BEGIN [^-]*PRIVATE KEY-----.*?-----END [^-]*PRIVATE KEY-----",
    re.DOTALL,
)
LIBC = ctypes.CDLL(None, use_errno=True)
LIBC.openat.argtypes = (ctypes.c_int, ctypes.c_char_p, ctypes.c_int, ctypes.c_uint)
LIBC.openat.restype = ctypes.c_int
LIBC.mkdirat.argtypes = (ctypes.c_int, ctypes.c_char_p, ctypes.c_uint)
LIBC.mkdirat.restype = ctypes.c_int


def redact(content):
    content = PRIVATE_KEY.sub("[REDACTED PRIVATE KEY]", content)
    return SECRET_LINE.sub(r"\1[REDACTED]", content)


def validate_filename(filename):
    if Path(filename).name != filename or not filename.endswith(".md"):
        raise ValueError("filename must be a plain Markdown filename")


def open_at(parent_fd, name, flags, mode=0):
    descriptor = LIBC.openat(parent_fd, name.encode("utf-8"), flags, mode)
    if descriptor == -1:
        error = ctypes.get_errno()
        raise OSError(error, os.strerror(error), name)
    return descriptor


def open_directory(parent_fd, name):
    if LIBC.mkdirat(parent_fd, name.encode("utf-8"), 0o700) == -1:
        error = ctypes.get_errno()
        if error != errno.EEXIST:
            raise OSError(error, os.strerror(error), name)
    flags = os.O_RDONLY | os.O_DIRECTORY
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    descriptor = open_at(parent_fd, name, flags)
    os.fchmod(descriptor, 0o700)
    return descriptor


def write_handoff(project_root, filename, content):
    validate_filename(filename)
    root = Path(project_root).resolve(strict=True)
    directory_flags = os.O_RDONLY | os.O_DIRECTORY
    if hasattr(os, "O_NOFOLLOW"):
        directory_flags |= os.O_NOFOLLOW
    root_fd = os.open(str(root), directory_flags)
    temporary_fd = None
    handoffs_fd = None
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    try:
        temporary_fd = open_directory(root_fd, "tmp")
        handoffs_fd = open_directory(temporary_fd, "handoffs")
        descriptor = open_at(handoffs_fd, filename, flags, 0o600)
        os.fchmod(descriptor, 0o600)
        with os.fdopen(descriptor, "w", encoding="utf-8") as output:
            output.write(redact(content))
    finally:
        if handoffs_fd is not None:
            os.close(handoffs_fd)
        if temporary_fd is not None:
            os.close(temporary_fd)
        os.close(root_fd)
    return root / "tmp/handoffs" / filename


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project-root", required=True)
    parser.add_argument("--filename", required=True)
    args = parser.parse_args()
    try:
        destination = write_handoff(
            args.project_root, args.filename, sys.stdin.read()
        )
    except (OSError, ValueError) as error:
        print("write-handoff: {}".format(error), file=sys.stderr)
        return 1
    print(str(destination))
    return 0


if __name__ == "__main__":
    sys.exit(main())
