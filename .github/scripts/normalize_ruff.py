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

root = Path("backend")
out = root / "ruff-report.json"
version_file = root / "ruff-version.txt"
stdout_path = root / "ruff-stdout.txt"
stderr_path = root / "ruff-stderr.txt"
err_path = root / "ruff-report.err"
raw_json_path = root / "ruff-raw.json"

version = version_file.read_text().strip() if version_file.exists() else ""

data = {"ruff_version": version, "issues": [], "stderr": "", "stdout": ""}

if err_path.exists() and err_path.stat().st_size > 0:
    data["stderr"] = err_path.read_text()

if stderr_path.exists() and stderr_path.stat().st_size > 0:
    data["stderr"] = (data["stderr"] + "\n" + stderr_path.read_text()).strip()

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
        data["issues"].append(
            {"path": file_path, "line": int(line_str), "col": int(col_str), "code": code, "message": msg}
        )
    else:
        if text_line.strip():
            data["issues"].append({"raw": text_line})

# If Ruff produced a JSON report, prefer to parse that and merge its entries.
if raw_json_path.exists() and raw_json_path.stat().st_size > 0:
    try:
        raw = json.loads(raw_json_path.read_text())
        parsed = []
        # Ruff JSON format may vary slightly between versions; be flexible.
        for item in raw:
            # Common keys: 'path' or 'filename'; location may be an object or 'line'/'column'
            path = item.get("path") or item.get("filename") or item.get("file")
            line = None
            col = None
            if "location" in item and isinstance(item["location"], dict):
                line = item["location"].get("row") or item["location"].get("line")
                col = item["location"].get("col") or item["location"].get("column")
            else:
                line = item.get("line") or item.get("row")
                col = item.get("column") or item.get("col")
            code = item.get("code") or item.get("rule")
            message = item.get("message") or item.get("msg") or ""
            entry = {}
            if path:
                entry["path"] = path
            if line is not None:
                try:
                    entry["line"] = int(line)
                except Exception:
                    entry["line"] = line
            if col is not None:
                try:
                    entry["col"] = int(col)
                except Exception:
                    entry["col"] = col
            if code:
                entry["code"] = code
            if message:
                entry["message"] = message
            if not entry:
                entry = {"raw_item": item}
            parsed.append(entry)
        # Prefer parsed JSON issues; append any textual ones afterwards for completeness.
        data["issues"] = parsed + data["issues"]
    except Exception:
        # If parsing failed, preserve textual parsing results and include raw JSON as stderr for debugging
        data["stderr"] = (data.get("stderr", "") + "\n" + raw_json_path.read_text()).strip()

out.write_text(json.dumps(data, indent=2))
print("Wrote ruff combined JSON with", len(data["issues"]), "issues")
