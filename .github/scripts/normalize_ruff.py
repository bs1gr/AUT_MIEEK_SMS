#!/usr/bin/env python3
"""Normalize Ruff outputs into a stable JSON artifact.

Reads backend/ruff-version.txt, backend/ruff-stdout.txt, backend/ruff-stderr.txt,
backend/ruff-report.err and writes backend/ruff-report.json as:
{
  "ruff_version": "...",
  "issues": [ ... ],
  "stderr": "...",
  "stdout": "..."
}

This script is safe to run even if some files are missing.
"""
from __future__ import annotations
import json
import re
from pathlib import Path

root = Path('backend')
out = root / 'ruff-report.json'
version_file = root / 'ruff-version.txt'
stdout_path = root / 'ruff-stdout.txt'
stderr_path = root / 'ruff-stderr.txt'
err_path = root / 'ruff-report.err'

version = version_file.read_text().strip() if version_file.exists() else ''

data = {'ruff_version': version, 'issues': [], 'stderr': '', 'stdout': ''}

if err_path.exists() and err_path.stat().st_size > 0:
    data['stderr'] = err_path.read_text()

if stderr_path.exists() and stderr_path.stat().st_size > 0:
    data['stderr'] = (data['stderr'] + '\n' + stderr_path.read_text()).strip()

if stdout_path.exists() and stdout_path.stat().st_size > 0:
    data["stdout"] = stdout_path.read_text()
    lines = [line.rstrip("\n") for line in data["stdout"].splitlines() if line.strip()]
else:
    lines = []

pat = re.compile(r"^(.*?):(\d+):(\d+):\s*([^\s]+)\s*(.*)$")
for text_line in lines:
    match = pat.match(text_line)
    if match:
        file_path, line_str, col_str, code, msg = match.groups()
        data["issues"].append({"path": file_path, "line": int(line_str), "col": int(col_str), "code": code, "message": msg})
    else:
        if text_line.strip():
            data["issues"].append({"raw": text_line})

out.write_text(json.dumps(data, indent=2))
print('Wrote ruff combined JSON with', len(data['issues']), 'issues')
