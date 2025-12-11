#!/usr/bin/env python3
"""
Release/versioning helper for Student Management System

- Bumps version (patch/minor/major or explicit) in:
  - backend/main.py (create_app version string)
  - backend/config.py (APP_VERSION if present)
- Creates a conventional commit and an annotated Git tag vX.Y.Z
- Optional push

Usage examples:
  python scripts/utils/release.py --level patch
  python scripts/utils/release.py --level minor --push
  python scripts/utils/release.py --set-version 3.1.0 --no-tag

Exit code is non-zero on error.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Tuple

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_MAIN = PROJECT_ROOT / "backend" / "main.py"
BACKEND_CONFIG = PROJECT_ROOT / "backend" / "config.py"
VERSION_FILE = PROJECT_ROOT / "VERSION"
FRONTEND_PACKAGE = PROJECT_ROOT / "frontend" / "package.json"
FRONTEND_LOCK = PROJECT_ROOT / "frontend" / "package-lock.json"

VERSION_REGEXES = [
    # backend/main.py -> version="x.y.z" in FastAPI app factory or startup logs
    (BACKEND_MAIN, re.compile(r'(version\s*=\s*")(?P<ver>\d+\.\d+\.\d+)(")')),
    # backend/config.py -> APP_VERSION = "x.y.z" (if present)
    (BACKEND_CONFIG, re.compile(r'(APP_VERSION\s*=\s*")(?P<ver>\d+\.\d+\.\d+)(")')),
]


def read_file_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return ""


def write_file_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def find_versions() -> Tuple[str | None, dict[Path, str]]:
    found_version: str | None = None
    per_file: dict[Path, str] = {}
    for path, rx in VERSION_REGEXES:
        if not path.exists():
            continue
        text = read_file_text(path)
        m = rx.search(text)
        if m:
            v = m.group("ver")
            per_file[path] = v
            if not found_version:
                found_version = v
    if VERSION_FILE.exists():
        version_text = read_file_text(VERSION_FILE).strip()
        if version_text:
            per_file[VERSION_FILE] = version_text
            if not found_version:
                found_version = version_text
    if FRONTEND_PACKAGE.exists():
        try:
            package_data = json.loads(read_file_text(FRONTEND_PACKAGE) or "{}")
        except json.JSONDecodeError:
            package_data = None
        if isinstance(package_data, dict):
            pkg_version = package_data.get("version")
            if isinstance(pkg_version, str):
                per_file[FRONTEND_PACKAGE] = pkg_version
                if not found_version:
                    found_version = pkg_version
    if FRONTEND_LOCK.exists():
        try:
            lock_data = json.loads(read_file_text(FRONTEND_LOCK) or "{}")
        except json.JSONDecodeError:
            lock_data = None
        if isinstance(lock_data, dict):
            lock_version = lock_data.get("version")
            if isinstance(lock_version, str):
                per_file[FRONTEND_LOCK] = lock_version
                if not found_version:
                    found_version = lock_version
    return found_version, per_file


def bump_version(ver: str, level: str) -> str:
    major, minor, patch = map(int, ver.split("."))
    if level == "major":
        return f"{major + 1}.0.0"
    if level == "minor":
        return f"{major}.{minor + 1}.0"
    if level == "patch":
        return f"{major}.{minor}.{patch + 1}"
    raise ValueError(f"Unknown level: {level}")


def update_versions(new_version: str) -> list[Path]:
    updated: list[Path] = []
    for path, rx in VERSION_REGEXES:
        if not path.exists():
            continue
        text = read_file_text(path)
        if not text:
            continue

        def _repl(m: re.Match) -> str:
            return f"{m.group(1)}{new_version}{m.group(3)}"

        new_text, n = rx.subn(_repl, text, count=1)
        if n:
            write_file_text(path, new_text)
            updated.append(path)
    if VERSION_FILE.exists():
        current = read_file_text(VERSION_FILE).strip()
        if current != new_version:
            write_file_text(VERSION_FILE, f"{new_version}\n")
            updated.append(VERSION_FILE)
    if FRONTEND_PACKAGE.exists():
        try:
            package_data = json.loads(read_file_text(FRONTEND_PACKAGE) or "{}")
        except json.JSONDecodeError:
            package_data = None
        if isinstance(package_data, dict):
            if package_data.get("version") != new_version:
                package_data["version"] = new_version
                write_file_text(FRONTEND_PACKAGE, json.dumps(package_data, indent=2) + "\n")
                updated.append(FRONTEND_PACKAGE)
    if FRONTEND_LOCK.exists():
        try:
            lock_data = json.loads(read_file_text(FRONTEND_LOCK) or "{}")
        except json.JSONDecodeError:
            lock_data = None
        if isinstance(lock_data, dict):
            changed = False
            if lock_data.get("version") != new_version:
                lock_data["version"] = new_version
                changed = True
            packages = lock_data.get("packages")
            if isinstance(packages, dict):
                root_pkg = packages.get("")
                if isinstance(root_pkg, dict) and root_pkg.get("version") != new_version:
                    root_pkg["version"] = new_version
                    changed = True
            if changed:
                write_file_text(FRONTEND_LOCK, json.dumps(lock_data, indent=2) + "\n")
                updated.append(FRONTEND_LOCK)
    return updated


def run(cmd: list[str], cwd: Path | None = None, check: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, cwd=cwd, check=check)


def git_available() -> bool:
    try:
        subprocess.run(["git", "--version"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
        return True
    except Exception:
        return False


def in_git_repo() -> bool:
    try:
        cp = subprocess.run(
            ["git", "rev-parse", "--is-inside-work-tree"],
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            check=False,
            text=True,
        )
        return cp.returncode == 0 and cp.stdout.strip() == "true"
    except Exception:
        return False


def git_commit_and_tag(version: str, do_tag: bool, push: bool) -> None:
    if not git_available():
        print("[WARN] Git not available on PATH. Skipping commit/tag.")
        return
    if not in_git_repo():
        print("[WARN] Current directory is not a Git repository. Skipping commit/tag.")
        return
    # stage files
    run(["git", "add", str(BACKEND_MAIN)])
    if BACKEND_CONFIG.exists():
        run(["git", "add", str(BACKEND_CONFIG)])
    # commit
    msg = f"chore(release): v{version}"
    run(["git", "commit", "-m", msg])
    # tag
    if do_tag:
        run(["git", "tag", "-a", f"v{version}", "-m", msg])
    # optional push
    if push:
        run(["git", "push"])  # branch
        if do_tag:
            run(["git", "push", "--tags"])  # tags


def main() -> int:
    ap = argparse.ArgumentParser(description="Release/versioning helper")
    g = ap.add_mutually_exclusive_group(required=False)
    g.add_argument("--level", choices=["patch", "minor", "major"], help="SemVer bump level")
    g.add_argument("--set-version", dest="set_version", help="Explicit version to set, e.g., 3.2.0")
    ap.add_argument("--no-tag", action="store_true", help="Do not create a git tag")
    ap.add_argument("--push", action="store_true", help="Also push the commit and tags")
    args = ap.parse_args()

    current, per_file = find_versions()
    if not current:
        print("[ERROR] Could not find a current version in files.")
        return 1

    if args.set_version:
        target = args.set_version
    else:
        level = args.level or "patch"
        target = bump_version(current, level)

    print(f"Current: {current}\nTarget:  {target}")

    updated = update_versions(target)
    if not updated:
        print("[WARN] No files updated. Exiting.")
        return 0
    print("Updated files:")
    for p in updated:
        print(f" - {p.relative_to(PROJECT_ROOT)}")

    try:
        git_commit_and_tag(target, do_tag=(not args.no_tag), push=args.push)
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] Git operation failed: {e}")
        return e.returncode or 1

    print("Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
