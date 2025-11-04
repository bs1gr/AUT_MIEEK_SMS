import json
from pathlib import Path
import subprocess
import sys


def _write(tmp_path, data):
    backend = tmp_path / "backend"
    backend.mkdir()
    p = backend / "ruff-report.json"
    p.write_text(json.dumps(data))
    return p


def test_validate_happy(tmp_path):
    # Arrange: write a minimal valid report
    data = {"ruff_version": "0.0.0", "issues": []}
    _write(tmp_path, data)

    # Run validator with cwd set to tmp_path
    script = Path(__file__).resolve().parents[2] / ".github" / "scripts" / "validate_ruff_report.py"
    cmd = [sys.executable, str(script)]
    res = subprocess.run(cmd, cwd=tmp_path, capture_output=True, text=True)
    assert res.returncode == 0, res.stderr
    assert "VALID" in res.stdout


def test_validate_missing(tmp_path):
    # No file -> validator should exit with code 2
    script = Path(__file__).resolve().parents[2] / ".github" / "scripts" / "validate_ruff_report.py"
    cmd = [sys.executable, str(script)]
    res = subprocess.run(cmd, cwd=tmp_path, capture_output=True, text=True)
    assert res.returncode == 2
    assert "Missing expected artifact" in res.stderr


def test_validate_malformed(tmp_path):
    backend = tmp_path / "backend"
    backend.mkdir()
    (backend / "ruff-report.json").write_text("not-json")
    script = Path(__file__).resolve().parents[2] / ".github" / "scripts" / "validate_ruff_report.py"
    cmd = [sys.executable, str(script)]
    res = subprocess.run(cmd, cwd=tmp_path, capture_output=True, text=True)
    assert res.returncode == 2
    assert "Failed to parse JSON" in res.stderr
