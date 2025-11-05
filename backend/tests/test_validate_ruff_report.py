import json
import subprocess
import sys
from pathlib import Path

import pytest


SCRIPT = Path(__file__).resolve().parents[2] / ".github" / "scripts" / "validate_ruff_report.py"


def run_validator(cwd: Path):
    """Run the validator script using the same Python interpreter.

    Returns subprocess.CompletedProcess
    """
    proc = subprocess.run([sys.executable, str(SCRIPT)], cwd=str(cwd), capture_output=True, text=True)
    return proc


def test_valid_report(tmp_path: Path):
    # Create repo layout with a valid normalized artifact
    backend_dir = tmp_path / "backend"
    backend_dir.mkdir()
    data = {"ruff_version": "ruff 0.14.3", "issues": []}
    (backend_dir / "ruff-report.json").write_text(json.dumps(data))

    proc = run_validator(tmp_path)
    assert proc.returncode == 0, proc.stderr + proc.stdout
    assert "VALID" in proc.stdout


def test_missing_file(tmp_path: Path):
    # No backend/ruff-report.json present
    proc = run_validator(tmp_path)
    assert proc.returncode == 2
    assert "Missing expected artifact" in proc.stderr


def test_malformed_json(tmp_path: Path):
    backend_dir = tmp_path / "backend"
    backend_dir.mkdir()
    # write invalid JSON
    (backend_dir / "ruff-report.json").write_text("{ not: valid json }")

    proc = run_validator(tmp_path)
    assert proc.returncode == 2
    assert "Failed to parse JSON" in proc.stderr


def test_schema_failure_when_jsonschema_present(tmp_path: Path):
    # This test requires jsonschema to be installed; skip if not present
    pytest.importorskip("jsonschema")

    # Create a schema that requires ruff_version to be a number
    schema_dir = tmp_path / ".github" / "schema"
    schema_dir.mkdir(parents=True)
    schema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {"ruff_version": {"type": "number"}},
        "required": ["ruff_version", "issues"],
    }
    (schema_dir / "ruff-report.schema.json").write_text(json.dumps(schema))

    # Create artifact that violates schema (ruff_version is string)
    backend_dir = tmp_path / "backend"
    backend_dir.mkdir()
    data = {"ruff_version": "0.14.3", "issues": []}
    (backend_dir / "ruff-report.json").write_text(json.dumps(data))

    proc = run_validator(tmp_path)
    assert proc.returncode == 2
    assert "JSON Schema validation failed" in proc.stderr
