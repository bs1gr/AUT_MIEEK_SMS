"""After DOCKER.ps1's cleanup, SMS can be brought back: recreated, or updated to the installed
version.

-Prune, -PruneAll and -DeepClean call Docker's own cleanup, which reaches every project on the
PC. -DeepClean also stopped and removed the SMS container, and left SMS down: nothing started it
again and nothing said how. Now every cleanup ends with the two commands that bring SMS back
(-Start recreates the container and builds a removed image again; -Update makes a backup and
rebuilds from the installed files), and -DeepClean starts SMS again by itself when it was
running before.

The real function is taken out of DOCKER.ps1 and run with Docker and the rest of the script
replaced by stubs that record what was asked: no Docker command runs.
"""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

import pytest

PWSH = shutil.which("pwsh") or ""
pytestmark = pytest.mark.skipif(not PWSH, reason="pwsh is required")

REPO_ROOT = Path(__file__).resolve().parents[3]
DOCKER_PS1 = REPO_ROOT / "infra" / "scripts" / "dev" / "DOCKER.ps1"

RUNNER = r"""
param([string]$Script, [string]$Mode, [string]$Running)
$ErrorActionPreference = 'Stop'
$ast = [System.Management.Automation.Language.Parser]::ParseFile($Script, [ref]$null, [ref]$null)
$function = $ast.Find({ param($node)
    $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Invoke-DockerCleanup'
}, $true)
if (-not $function) { throw 'Invoke-DockerCleanup is not in DOCKER.ps1' }

$script:calls = [System.Collections.Generic.List[string]]::new()
$CONTAINER_NAME = 'sms-app'
$VOLUME_NAME = 'sms_data'
function docker { $script:calls.Add('docker ' + ($args -join ' ')); $global:LASTEXITCODE = 0 }
function Test-DockerAvailable { $true }
function Get-ContainerStatus { if ($Running -eq 'yes') { @{ IsRunning = $true; IsHealthy = $true } } else { $null } }
function Start-Application { $script:calls.Add('Start-Application'); 0 }
function Read-Host { 'yes' }
function Write-Header { param($m) }
function Write-Info { param($m) [Console]::WriteLine("INFO $m") }
function Write-Success { param($m) }
function Write-Warning { param($m) }
function Write-Error-Message { param($m) [Console]::WriteLine("ERROR $m") }
function Write-Host { param($Object) [Console]::WriteLine("HOST $Object") }
Invoke-Expression $function.Extent.Text

$code = switch ($Mode) {
    'deep' { Invoke-DockerCleanup -Deep }
    'all' { Invoke-DockerCleanup -All }
    default { Invoke-DockerCleanup }
}
$script:calls | ForEach-Object { "CALL $_" }
"EXIT $(@($code)[-1])"
"""


def _run(tmp_path: Path, mode: str, running: bool) -> tuple[list[str], list[str], str]:
    runner = tmp_path / "run.ps1"
    runner.write_text(RUNNER, encoding="utf-8")
    done = subprocess.run(
        [PWSH, "-NoProfile", "-File", str(runner), str(DOCKER_PS1), mode, "yes" if running else "no"],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=120,
    )
    assert done.returncode == 0, done.stdout + done.stderr
    lines = done.stdout.splitlines()
    calls = [line[5:] for line in lines if line.startswith("CALL ")]
    exit_line = [line for line in lines if line.startswith("EXIT ")][-1]
    return lines, calls, exit_line[5:]


@pytest.mark.parametrize("mode", ["prune", "all", "deep"])
def test_every_cleanup_says_how_to_bring_sms_back(tmp_path: Path, mode: str):
    lines, _calls, code = _run(tmp_path, mode, running=False)
    text = "\n".join(lines)

    assert code == "0"
    assert "Your data is kept (volume 'sms_data')" in text
    assert ".\\DOCKER.ps1 -Start" in text and "recreate the container" in text
    assert ".\\DOCKER.ps1 -Update" in text and "rebuild from the installed version" in text


def test_deep_clean_starts_sms_again_when_it_was_running(tmp_path: Path):
    _lines, calls, code = _run(tmp_path, "deep", running=True)

    assert "docker stop sms-app" in calls and "docker rm sms-app" in calls
    assert "docker volume prune" not in " ".join(calls)  # the data volumes are never pruned
    # The way back comes after the cleanup, not before it.
    assert calls[-1] == "Start-Application"
    assert calls.index("docker image prune -af") < calls.index("Start-Application")
    assert code == "0"


def test_deep_clean_leaves_sms_down_when_it_was_down(tmp_path: Path):
    _lines, calls, _code = _run(tmp_path, "deep", running=False)

    assert "Start-Application" not in calls


@pytest.mark.parametrize("mode", ["prune", "all"])
def test_a_light_cleanup_does_not_touch_the_sms_container(tmp_path: Path, mode: str):
    _lines, calls, _code = _run(tmp_path, mode, running=True)

    assert not any("sms-app" in call for call in calls)
    assert "Start-Application" not in calls
    assert "docker volume prune" not in " ".join(calls)


def test_start_rebuilds_a_removed_image_and_recreates_the_container():
    """The way back that the message names: -Start builds the image when it is missing and runs
    a new container when there is none."""
    script = DOCKER_PS1.read_text(encoding="utf-8-sig")
    start = script[script.index("function Start-Application {") : script.index("function Stop-Application {")]

    assert "$imageExists = docker images -q $IMAGE_TAG" in start
    assert "Invoke-DockerBuildWithProgress -Tag $IMAGE_TAG" in start
    assert '"run", "-d",' in start and '"--name", $CONTAINER_NAME,' in start
    update = script[script.index("function Update-Application {") : script.index("function Show-AccessInfo {")]
    assert 'Backup-Database -Reason "before-update"' in update and "$startResult = Start-Application" in update
