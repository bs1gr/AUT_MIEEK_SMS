#!/usr/bin/env python3
"""Markdown lint & auto-fix utility for the Student Management System.

Features:
 1. Scan all .md files for:
    - Unlabeled fenced code blocks (``` without language)
    - Missing blank lines around headings (MD022)
    - Missing blank lines around lists (MD032) (heuristic)
    - Missing blank lines around fenced code blocks (MD031)
 2. Produce a report summarizing issues.
 3. Optional --fix mode to auto-insert language tags and blank lines.

Heuristics for language tagging:
  - If first non-empty line inside fence starts with '#!' or contains 'python' import: python
  - Lines starting with 'docker', 'pwsh', 'Invoke-', '.\\', './', 'netstat', 'copy', 'curl', 'ipconfig' -> powershell
  - Presence of '{' and ':' and appears JSON -> json
  - Presence of 'version:' and 'services:' -> yaml
  - Presence of '<' and '>' typical HTML tags -> html
  - Otherwise: text

Usage:
  python tools/lint/markdown_lint.py              # scan only (report)
  python tools/lint/markdown_lint.py --fix        # apply automatic fixes
  python tools/lint/markdown_lint.py --include docs/user --fix

Writes report to: docs/markdown_lint_report.md

Limitations:
  - Does not implement full markdown spec parsing; relies on simple state machine.
  - Auto-fixes are conservative; existing language tags are preserved.
  - Does NOT re-flow paragraphs or alter content order.
"""

from __future__ import annotations
import argparse
import re
from pathlib import Path
from typing import List, Optional
from dataclasses import dataclass

ROOT = Path(__file__).resolve().parents[2]
REPORT_PATH = ROOT / "docs" / "markdown_lint_report.md"
FENCE_PATTERN = re.compile(r"^```(.*)$")
HEADING_PATTERN = re.compile(r"^(#{1,6})\s+.+")
LIST_PATTERN = re.compile(r"^\s*[-*+]\s+")

LANG_DETECTORS = [
    (
        "python",
        lambda lines: any(
            re.search(r"\bimport\s+\w+", line) or "def " in line for line in lines[:5]
        ),
    ),
    (
        "json",
        lambda lines: all(
            (
                line.strip().startswith("{")
                or line.strip().startswith("}")
                or ":" in line
            )
            for line in lines
            if line.strip()
        )
        and "{" in "".join(lines)
        and "}" in "".join(lines),
    ),
    (
        "yaml",
        lambda lines: any(
            "version:" in line and "services:" in "".join(lines) for line in lines
        ),
    ),
    ("html", lambda lines: any(re.search(r"<\w+.*?>", line) for line in lines)),
    (
        "powershell",
        lambda lines: any(
            re.match(r"(\.\\|\./|docker |Invoke-|ipconfig|netstat|copy )", line.strip())
            for line in lines[:3]
        ),
    ),
]


def detect_language(block_lines: List[str]) -> str:
    for lang, fn in LANG_DETECTORS:
        try:
            if fn(block_lines):
                return lang
        except Exception:
            continue
    return "text"


@dataclass
class Issue:
    file: Path
    line: int
    code: str
    message: str


def scan_file(path: Path, apply_fixes: bool = False) -> dict:
    issues: List[Issue] = []
    with path.open("r", encoding="utf-8") as f:
        lines = f.readlines()

    new_lines: List[str] = []
    in_fence = False
    fence_lang: Optional[str] = None
    fence_start_new_index: Optional[int] = None
    buffer: List[str] = []
    in_list_block = False
    prev_was_heading = False

    total_lines = len(lines)
    for i, line in enumerate(lines):
        next_line = lines[i + 1] if i + 1 < total_lines else None
        m = FENCE_PATTERN.match(line)
        if m:
            lang = m.group(1).strip()
            if not in_fence:
                # starting fence
                if new_lines and new_lines[-1].strip():
                    issues.append(
                        Issue(
                            path,
                            i + 1,
                            "MD031",
                            "Missing blank line before fenced code block",
                        )
                    )
                    if apply_fixes:
                        new_lines.append("\n")
                in_fence = True
                fence_lang = lang if lang else None
                buffer = []
                fence_start_new_index = len(new_lines)
                new_lines.append(line)
                prev_was_heading = False
            else:
                # closing fence
                new_lines.append(line)
                if next_line is not None and next_line.strip():
                    issues.append(
                        Issue(
                            path,
                            i + 1,
                            "MD031",
                            "Missing blank line after fenced code block",
                        )
                    )
                    if apply_fixes:
                        new_lines.append("\n")
                if fence_lang is None and fence_start_new_index is not None:
                    detected = detect_language(buffer)
                    issues.append(
                        Issue(
                            path,
                            i + 1,
                            "FENCE_LANG",
                            f"Unlabeled code fence; suggest `{detected}`",
                        )
                    )
                    new_lines[fence_start_new_index] = f"```{detected}\n"
                in_fence = False
                fence_lang = None
                buffer = []
                fence_start_new_index = None
            continue
        if in_fence:
            buffer.append(line)
            new_lines.append(line)
            continue

        # Heading checks and fixes (MD022)
        if HEADING_PATTERN.match(line):
            if new_lines and new_lines[-1].strip():
                issues.append(
                    Issue(path, i + 1, "MD022", "Missing blank line before heading")
                )
                if apply_fixes:
                    new_lines.append("\n")
            new_lines.append(line)
            if next_line is not None and next_line.strip():
                issues.append(
                    Issue(path, i + 1, "MD022", "Missing blank line after heading")
                )
                if apply_fixes:
                    new_lines.append("\n")
            prev_was_heading = True
            in_list_block = False
            continue

        # List blank line MD032 (before and after contiguous list blocks)
        if LIST_PATTERN.match(line):
            if not in_list_block:
                # entering a list block
                if new_lines and new_lines[-1].strip() and not prev_was_heading:
                    issues.append(
                        Issue(path, i + 1, "MD032", "Missing blank line before list")
                    )
                    if apply_fixes:
                        new_lines.append("\n")
                in_list_block = True
            new_lines.append(line)
            # Determine if list block ends after this line
            if (
                next_line is not None
                and next_line.strip()
                and not LIST_PATTERN.match(next_line)
            ):
                issues.append(
                    Issue(path, i + 1, "MD032", "Missing blank line after list")
                )
                if apply_fixes:
                    new_lines.append("\n")
                in_list_block = False
            prev_was_heading = False
            continue

        # regular line
        new_lines.append(line)
        prev_was_heading = False
        in_list_block = False

    return {
        "issues": issues,
        "fixed_lines": new_lines,
    }


def write_report(results: List[dict]):
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    total = sum(len(r["issues"]) for r in results)
    with REPORT_PATH.open("w", encoding="utf-8") as f:
        f.write("# Markdown Lint Report\n\n")
        f.write(f"Total issues: {total}\n\n")
        for res in results:
            path = res["path"]
            issues = res["issues"]
            if not issues:
                continue
            f.write(f"## {path.relative_to(ROOT)}\n\n")
            for issue in issues:
                f.write(f"- Line {issue.line}: {issue.code} - {issue.message}\n")
            f.write("\n")


def main():
    parser = argparse.ArgumentParser(description="Markdown lint & fixer")
    parser.add_argument("--fix", action="store_true", help="Apply automatic fixes")
    parser.add_argument("--include", nargs="*", default=[], help="Restrict to subpaths")
    args = parser.parse_args()

    # Limit search to repository workspace root only to avoid scanning large external trees
    # and temporary directories. Explicitly exclude common heavy folders.
    EXCLUDES = {
        "archive",
        ".git",
        ".venv",
        "node_modules",
        ".mypy_cache",
        ".pytest_cache",
        "dist",
        "build",
    }
    paths = []
    # Replace rglob with manual shallow walk to avoid WindowsApps symlink traversal issues
    for top in ROOT.iterdir():
        if top.name.startswith(".") or top.name in EXCLUDES:
            continue
        if top.is_file() and top.suffix == ".md":
            paths.append(top)
        elif top.is_dir():
            for p in top.glob("**/*.md"):
                if any(ex in p.parts for ex in EXCLUDES):
                    continue
                paths.append(p)

    if args.include:
        inc = [ROOT / i for i in args.include]
        paths = [p for p in paths if any(str(p).startswith(str(d)) for d in inc)]

    results = []
    for path in paths:
        data = scan_file(path, apply_fixes=args.fix)
        results.append({"path": path, **data})
        if args.fix:
            original = path.read_text(encoding="utf-8")
            updated = "".join(data["fixed_lines"])
            if updated != original:
                path.write_text(updated, encoding="utf-8")

    write_report(results)
    print(f"Report written to {REPORT_PATH}")
    if args.fix:
        print(
            "Auto-fix applied where possible (language tags + blank lines for headings/lists/fences)"
        )


if __name__ == "__main__":
    main()
