"""RUN_TESTS_BATCH.ps1 retries a batch whose interpreter died, and only then.

The commit gate failed three times (2026-09-16, 2026-10-07, 2026-10-08) with a batch that
exited -1 (0xFFFFFFFF) and no traceback. The runner only retried a batch that had printed
nothing, but the second and third time the dots were already on screen, so the run failed
without a retry and `-RetestFailed` then passed the same files. A death is now recognised by an
exit code pytest never returns (outside 0-5), whatever was printed. A reported test failure
(exit 1) is never retried.

The runner is run under pwsh with a stub `python` that plays back a scripted list of
`<exit code or "abort">:<out|quiet>` steps. The runner uses Windows-style paths, so this is
Windows-only.
"""

import shutil
import subprocess
import sys
from pathlib import Path

import pytest

PWSH = shutil.which("pwsh")
pytestmark = pytest.mark.skipif(
    PWSH is None or sys.platform != "win32",
    reason="the batch runner is a Windows-only local tool and needs pwsh",
)

RUNNER = Path(__file__).resolve().parents[3] / "infra" / "scripts" / "testing" / "RUN_TESTS_BATCH.ps1"

HARNESS = r"""
param([string]$Runner, [string]$FailureFile, [string]$LogFile, [string]$Plan, [string]$CallsFile)
$global:FakePlan = @($Plan -split ',')
$global:FakeCalls = 0
function python {
    $step = $global:FakePlan[[Math]::Min($global:FakeCalls, $global:FakePlan.Count - 1)]
    $global:FakeCalls++
    $code, $kind = $step -split ':'
    if ($kind -eq 'out') { '..........'; '.... [ 45%]' }
    # "abort" is the -1 / 0xFFFFFFFF the gate saw (a value starting with "-" would be read
    # as a parameter name on the command line)
    $global:LASTEXITCODE = if ($code -eq 'abort') { -1 } else { [int]$code }
}
& $Runner -RetestFailed -FailureFile $FailureFile -LogFile $LogFile -InterBatchDelaySeconds 0 *> $null
$runnerExit = $LASTEXITCODE
Set-Content -Path $CallsFile -Value $global:FakeCalls
exit $runnerExit
"""


def _run_batch(tmp_path, plan):
    """Run the real runner over one test file; return (runner exit code, python calls, log)."""
    harness = tmp_path / "harness.ps1"
    harness.write_text(HARNESS, encoding="utf-8")
    failure_file = tmp_path / "failures.txt"
    failure_file.write_text(Path(__file__).name, encoding="utf-8")
    log_file = tmp_path / "run.log"
    calls_file = tmp_path / "calls.txt"
    proc = subprocess.run(
        [
            PWSH,
            "-NoProfile",
            "-NonInteractive",
            "-File",
            str(harness),
            "-Runner",
            str(RUNNER),
            "-FailureFile",
            str(failure_file),
            "-LogFile",
            str(log_file),
            "-Plan",
            plan,
            "-CallsFile",
            str(calls_file),
        ],
        capture_output=True,
        text=True,
        timeout=120,
    )
    assert calls_file.exists(), proc.stdout + proc.stderr
    return proc.returncode, int(calls_file.read_text().strip()), log_file.read_text(encoding="utf-8")


def test_abort_part_way_through_a_run_is_retried(tmp_path):
    exit_code, calls, log = _run_batch(tmp_path, "abort:out,0:out")

    assert calls == 2
    assert exit_code == 0
    assert "aborted part-way through the run (exit code -1 / 0xFFFFFFFF) - retrying once" in log
    assert "Last output before the abort: .... [ 45%]" in log
    assert "Batch 1 completed successfully" in log


def test_abort_with_no_output_is_still_retried(tmp_path):
    exit_code, calls, log = _run_batch(tmp_path, "abort:quiet,0:out")

    assert calls == 2
    assert exit_code == 0
    assert "aborted with no output" in log


def test_reported_test_failure_is_not_retried(tmp_path):
    exit_code, calls, log = _run_batch(tmp_path, "1:out,0:out")

    assert calls == 1
    assert exit_code == 1
    assert "retrying once" not in log
    assert "exit code 1 / 0x00000001 - tests failed" in log


def test_batch_that_dies_twice_still_fails_the_run(tmp_path):
    exit_code, calls, log = _run_batch(tmp_path, "abort:out,abort:out")

    assert calls == 2
    assert exit_code == 1
    assert "failed twice" in log
