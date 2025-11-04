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
    data['stdout'] = stdout_path.read_text()
    lines = [l.rstrip('\n') for l in data['stdout'].splitlines() if l.strip()]
else:
    lines = []

pat = re.compile(r'^(.*?):(\d+):(\d+):\s*([^\s]+)\s*(.*)$')
for ln in lines:
    m = pat.match(ln)
    if m:
        file, line, col, code, msg = m.groups()
        data['issues'].append({'path': file, 'line': int(line), 'col': int(col), 'code': code, 'message': msg})
    else:
        if ln.strip():
            data['issues'].append({'raw': ln})

out.write_text(json.dumps(data, indent=2))
print('Wrote ruff combined JSON with', len(data['issues']), 'issues')
