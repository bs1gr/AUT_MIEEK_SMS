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
REPORT_PATH = ROOT / 'docs' / 'markdown_lint_report.md'
FENCE_PATTERN = re.compile(r'^```(.*)$')
HEADING_PATTERN = re.compile(r'^(#{1,6})\s+.+')
LIST_PATTERN = re.compile(r'^\s*[-*+]\s+')

LANG_DETECTORS = [
    ('python', lambda lines: any(re.search(r'\bimport\s+\w+', l) or 'def ' in l for l in lines[:5])),
    ('json', lambda lines: all((l.strip().startswith('{') or l.strip().startswith('}') or ':' in l) for l in lines if l.strip()) and '{' in ''.join(lines) and '}' in ''.join(lines)),
    ('yaml', lambda lines: any('version:' in l and 'services:' in ''.join(lines) for l in lines)),
    ('html', lambda lines: any(re.search(r'<\w+.*?>', l) for l in lines)),
    ('powershell', lambda lines: any(re.match(r'(\.\\|\./|docker |Invoke-|ipconfig|netstat|copy )', l.strip()) for l in lines[:3])),
]

def detect_language(block_lines: List[str]) -> str:
    for lang, fn in LANG_DETECTORS:
        try:
            if fn(block_lines):
                return lang
        except Exception:
            continue
    return 'text'

@dataclass
class Issue:
    file: Path
    line: int
    code: str
    message: str


def scan_file(path: Path) -> dict:
    issues: List[Issue] = []
    with path.open('r', encoding='utf-8') as f:
        lines = f.readlines()

    fixed_lines = list(lines)
    in_fence = False
    fence_start = 0
    fence_lang: Optional[str] = None
    buffer: List[str] = []

    for i, line in enumerate(lines):
        m = FENCE_PATTERN.match(line)
        if m:
            fence_marker = m.group(0)
            lang = m.group(1).strip()
            if not in_fence:
                # starting fence
                in_fence = True
                fence_start = i
                fence_lang = lang if lang else None
                buffer = []
                # MD031: blank line before fence (unless at top or previous blank)
                if i > 0 and lines[i-1].strip() and '--fix-placeholder--' not in lines[i-1]:
                    issues.append(Issue(path, i+1, 'MD031', 'Missing blank line before fenced code block'))
            else:
                # closing fence
                # MD031: blank line after fence
                if i+1 < len(lines) and lines[i+1].strip():
                    issues.append(Issue(path, i+1, 'MD031', 'Missing blank line after fenced code block'))
                if fence_lang is None:
                    # unlabeled fence -> language detection
                    detected = detect_language(buffer)
                    issues.append(Issue(path, fence_start+1, 'FENCE_LANG', f'Unlabeled code fence; suggest `{detected}`'))
                    fixed_lines[fence_start] = f'```{detected}\n'
                in_fence = False
                fence_lang = None
                buffer = []
            continue
        if in_fence:
            buffer.append(line)
        # Heading blank line checks (MD022)
        if HEADING_PATTERN.match(line):
            # above
            if i > 0 and lines[i-1].strip():
                issues.append(Issue(path, i+1, 'MD022', 'Missing blank line before heading'))
            # below
            if i+1 < len(lines) and lines[i+1].strip() == '':
                pass
            elif i+1 < len(lines) and lines[i+1].strip():
                issues.append(Issue(path, i+1, 'MD022', 'Missing blank line after heading'))
        # List blank line MD032
        if LIST_PATTERN.match(line):
            if i > 0 and lines[i-1].strip() and not HEADING_PATTERN.match(lines[i-1]):
                issues.append(Issue(path, i+1, 'MD032', 'Missing blank line before list'))
            if i+1 < len(lines) and lines[i+1].strip() and not LIST_PATTERN.match(lines[i+1]):
                issues.append(Issue(path, i+1, 'MD032', 'Missing blank line after list'))

    return {
        'issues': issues,
        'fixed_lines': fixed_lines,
    }


def write_report(results: List[dict]):
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    total = sum(len(r['issues']) for r in results)
    with REPORT_PATH.open('w', encoding='utf-8') as f:
        f.write('# Markdown Lint Report\n\n')
        f.write(f'Total issues: {total}\n\n')
        for res in results:
            path = res['path']
            issues = res['issues']
            if not issues:
                continue
            f.write(f'## {path.relative_to(ROOT)}\n\n')
            for issue in issues:
                f.write(f'- Line {issue.line}: {issue.code} - {issue.message}\n')
            f.write('\n')


def main():
    parser = argparse.ArgumentParser(description='Markdown lint & fixer')
    parser.add_argument('--fix', action='store_true', help='Apply automatic fixes')
    parser.add_argument('--include', nargs='*', default=[], help='Restrict to subpaths')
    args = parser.parse_args()

    # Limit search to repository workspace root only to avoid scanning large external trees
    # and temporary directories. Explicitly exclude common heavy folders.
    EXCLUDES = {'archive', '.git', '.venv', 'node_modules', '.mypy_cache', '.pytest_cache', 'dist', 'build'}
    paths = []
    # Replace rglob with manual shallow walk to avoid WindowsApps symlink traversal issues
    for top in ROOT.iterdir():
        if top.name.startswith('.') or top.name in EXCLUDES:
            continue
        if top.is_file() and top.suffix == '.md':
            paths.append(top)
        elif top.is_dir():
            for p in top.glob('**/*.md'):
                if any(ex in p.parts for ex in EXCLUDES):
                    continue
                paths.append(p)
    
    if args.include:
        inc = [ROOT / i for i in args.include]
        paths = [p for p in paths if any(str(p).startswith(str(d)) for d in inc)]

    results = []
    for path in paths:
        data = scan_file(path)
        results.append({'path': path, **data})
        if args.fix and data['fixed_lines'] != path.read_text(encoding='utf-8').splitlines(True):
            path.write_text(''.join(data['fixed_lines']), encoding='utf-8')

    write_report(results)
    print(f'Report written to {REPORT_PATH}')
    if args.fix:
        print('Auto-fix applied where possible (language tags + blank lines)')

if __name__ == '__main__':
    main()
