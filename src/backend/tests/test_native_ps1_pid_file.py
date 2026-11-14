"""NATIVE.ps1 recognises the stack it already started (Get-ProcessFromPidFile).

The function used to assign to `$pid`, PowerShell's read-only automatic variable. That threw, the
catch returned nothing, and so every `-Start` took a running backend and frontend for stopped and
restarted them. Now that the PID file is believed, it must also not be believed blindly: after a
reboot the same PID belongs to some unrelated process.

The script's own function runs under pwsh against PID files written by the test.
"""

import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

import pytest

PWSH = shutil.which("pwsh")
pytestmark = pytest.mark.skipif(
    PWSH is None or sys.platform != "win32", reason="Windows dev tool; needs pwsh on Windows"
)

NATIVE = Path(__file__).resolve().parents[3] / "infra" / "scripts" / "dev" / "NATIVE.ps1"

HARNESS = r"""
param([string]$Native, [string]$PidFile)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$tokens = $null; $errs = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($Native, [ref]$tokens, [ref]$errs)
$def = $ast.Find({ param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -eq 'Get-ProcessFromPidFile' }, $true)
. ([scriptblock]::Create($def.Extent.Text))
$process = Get-ProcessFromPidFile -PidFile $PidFile
[pscustomobject]@{ found = [bool]$process; id = if ($process) { $process.Id } else { 0 } } | ConvertTo-Json -Compress
"""


def _lookup(tmp_path: Path, pid_file: Path) -> dict:
    harness = tmp_path / "harness.ps1"
    harness.write_text(HARNESS, encoding="utf-8")
    result = subprocess.run(
        [str(PWSH), "-NoProfile", "-NonInteractive", "-File", str(harness), str(NATIVE), str(pid_file)],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=60,
    )
    assert result.returncode == 0, result.stdout + result.stderr
    return json.loads(result.stdout.strip().splitlines()[-1])


def test_a_running_process_named_by_the_pid_file_is_found(tmp_path):
    pid_file = tmp_path / ".backend.pid"
    pid_file.write_text(str(os.getpid()), encoding="utf-8")

    assert _lookup(tmp_path, pid_file) == {"found": True, "id": os.getpid()}


def test_a_pid_file_older_than_the_process_is_not_believed(tmp_path):
    # What a reboot leaves behind: yesterday's file, and today some other process with that PID.
    pid_file = tmp_path / ".backend.pid"
    pid_file.write_text(str(os.getpid()), encoding="utf-8")
    yesterday = time.time() - 86400
    os.utime(pid_file, (yesterday, yesterday))

    assert _lookup(tmp_path, pid_file) == {"found": False, "id": 0}


def test_a_pid_that_is_no_longer_running_is_not_found(tmp_path):
    gone = subprocess.Popen([sys.executable, "-c", "pass"])
    gone.wait()
    pid_file = tmp_path / ".backend.pid"
    pid_file.write_text(str(gone.pid), encoding="utf-8")

    assert _lookup(tmp_path, pid_file) == {"found": False, "id": 0}


def test_a_missing_pid_file_is_not_found(tmp_path):
    assert _lookup(tmp_path, tmp_path / ".backend.pid") == {"found": False, "id": 0}
