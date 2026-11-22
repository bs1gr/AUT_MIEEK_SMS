"""The gate and CI lint `scripts/` with the backend's ruff rules, not only `src/backend`.

`scripts/` holds tools that CI and the releases run: the load test, the SARIF merge, the backup
checks. Neither COMMIT_READY.ps1 nor CI's "Backend Linting (Python)" job looked there, and the
load test sent nothing but POSTs to "/GET" for months without anyone noticing (2026-11-22,
plan todo 73). Seven findings were waiting there when the lint was added.
"""

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
COMMIT_READY = REPO_ROOT / "infra" / "scripts" / "ops" / "COMMIT_READY.ps1"
WORKFLOW = REPO_ROOT / ".github" / "workflows" / "ci-cd-pipeline.yml"


def test_the_gate_lints_the_scripts_folder():
    parts = COMMIT_READY.read_text(encoding="utf-8").split('Write-Section "Scripts: Ruff Linting"', 1)
    assert len(parts) == 2, "the gate has no scripts lint step"
    step = parts[1].split("Write-Section", 1)[0]

    assert "Push-Location $PROJECT_ROOT" in step
    assert "$ruffArgs += @('--config', 'config/ruff.toml', 'scripts')" in step
    assert "$allPassed = $false" in step, "a finding must fail the gate"


def test_ci_lints_the_scripts_folder():
    workflow = WORKFLOW.read_text(encoding="utf-8")
    job = workflow.split("\n  lint-backend:", 1)[1].split("\n  lint-frontend:", 1)[0]

    assert re.search(r"run: ruff check scripts --config=config/ruff\.toml", job), "CI's lint job skips scripts/"
