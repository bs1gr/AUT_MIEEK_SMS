"""COMMIT_READY.ps1 runs the markdownlint-cli version package-lock.json pins, and never waits.

The gate ran a bare `npx markdownlint-cli`. On a PC without the root node_modules npx then asks
the registry for the newest release, and when that one is not in its cache it asks "Need to
install the following packages ... Ok to proceed?" on a console nobody sees: on 2026-11-22, the
day markdownlint-cli 0.50.1 came out, the gate stood still there until its watchdog stopped it.
Every gate of that day needed a junction to a cached copy.

Get-MarkdownlintPackage is taken from COMMIT_READY.ps1 itself and run under pwsh.
"""

import json
import re
import shutil
import subprocess
from pathlib import Path

import pytest

PWSH = shutil.which("pwsh") or ""
needs_pwsh = pytest.mark.skipif(not PWSH, reason="pwsh is required")

REPO_ROOT = Path(__file__).resolve().parents[3]
COMMIT_READY = REPO_ROOT / "infra" / "scripts" / "ops" / "COMMIT_READY.ps1"
LOCKFILE = REPO_ROOT / "package-lock.json"

HARNESS = r"""
param([string]$Script, [string]$LockPath)
$ErrorActionPreference = 'Stop'
$tokens = $null; $parseErrors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($Script, [ref]$tokens, [ref]$parseErrors)
$def = $ast.Find({ param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -eq 'Get-MarkdownlintPackage' }, $true)
if (-not $def) { throw 'Get-MarkdownlintPackage was not found in COMMIT_READY.ps1' }
. ([scriptblock]::Create($def.Extent.Text))
Get-MarkdownlintPackage -LockPath $LockPath
"""


def _package_for(tmp_path: Path, lock_path: Path) -> str:
    harness = tmp_path / "harness.ps1"
    harness.write_text(HARNESS, encoding="utf-8")
    result = subprocess.run(
        [PWSH, "-NoProfile", "-NonInteractive", "-File", str(harness), str(COMMIT_READY), str(lock_path)],
        capture_output=True,
        text=True,
        encoding="utf-8",
        timeout=60,
    )
    assert result.returncode == 0, result.stdout + result.stderr
    return result.stdout.strip()


@needs_pwsh
def test_the_gate_runs_the_version_the_lockfile_pins(tmp_path):
    pinned = json.loads(LOCKFILE.read_text(encoding="utf-8"))["packages"]["node_modules/markdownlint-cli"]["version"]

    assert _package_for(tmp_path, LOCKFILE) == f"markdownlint-cli@{pinned}"


@needs_pwsh
def test_without_a_pinned_version_it_names_the_package_alone(tmp_path):
    lock = tmp_path / "package-lock.json"
    lock.write_text(json.dumps({"packages": {"": {"name": "x"}}}), encoding="utf-8")

    assert _package_for(tmp_path, lock) == "markdownlint-cli"
    assert _package_for(tmp_path, tmp_path / "missing.json") == "markdownlint-cli"


def test_every_markdownlint_call_says_yes_and_uses_the_pinned_package():
    script = COMMIT_READY.read_text(encoding="utf-8")
    code = [line.strip() for line in script.splitlines() if not line.strip().startswith("#")]

    bare = [line for line in code if re.search(r"npx\s+markdownlint-cli\b", line)]
    assert not bare, f"a bare npx call can wait at npx's install prompt: {bare}"
    assert "$mdArgs = @('--yes', $mdPackage, '**/*.md')" in code
    assert len([line for line in code if line.startswith("$") and "= npx @mdArgs" in line]) == 2
