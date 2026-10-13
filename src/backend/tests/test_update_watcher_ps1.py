"""The Docker host updater task (scripts/update-watcher.ps1) installs only a verified release.

The Control Panel's Update writes a request from inside the container; the task on the host then
downloads the latest release's installer and runs it with administrator rights. So it must only
ever run an installer that matches the release's published SHA-256 and is signed by AUT MIEEK,
and must take nothing from the request but a well-formed job id.

The script's own functions run under pwsh, with GitHub, the download, the signature check and
Start-Process replaced by recorders.
"""

import hashlib
import json
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

PWSH = shutil.which("pwsh")
# The task runs on Windows Docker hosts and uses Windows paths (data\.triggers).
pytestmark = pytest.mark.skipif(
    PWSH is None or sys.platform != "win32", reason="Windows host tool; needs pwsh on Windows"
)

WATCHER = Path(__file__).resolve().parents[3] / "scripts" / "update-watcher.ps1"
INSTALLER_BYTES = b"pretend signed installer"
GOOD_DIGEST = hashlib.sha256(INSTALLER_BYTES).hexdigest()
JOB = "0123456789abcdef0123456789abcdef"

HARNESS = r"""
param([string]$Watcher, [string]$Root, [string]$Scenario, [string]$ResultFile)
$ErrorActionPreference = 'Stop'
$tokens = $null; $errs = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($Watcher, [ref]$tokens, [ref]$errs)
$wanted = 'Write-Log', 'Write-StatusFile', 'Get-InstalledVersion', 'Get-PowerShellForDocker', 'Install-LatestRelease', 'Process-UpdateRequests'
foreach ($def in $ast.FindAll({ param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $wanted -contains $n.Name }, $true)) {
    . ([scriptblock]::Create($def.Extent.Text))
}
$PROJECT_ROOT = $Root
$TRIGGER_DIR = Join-Path $Root 'data\.triggers'
$TRIGGER_PATTERN = 'update_request_*.json'
$LOG_FILE = Join-Path $Root 'logs\update-watcher.log'
$DOWNLOAD_DIR = Join-Path $Root 'data\updates'
$RELEASE_API = 'https://example.invalid/releases/latest'
$SIGNER_PATTERN = 'CN=AUT MIEEK\b'
$JOB_ID_PATTERN = '^[0-9a-f]{32}$'
$cfg = Get-Content (Join-Path $Root 'scenario.json') -Raw | ConvertFrom-Json
$script:started = @()
$script:downloads = 0

function Invoke-RestMethod { param($Uri, $Headers)
    [pscustomobject]@{ tag_name = $cfg.tag; assets = @([pscustomobject]@{ name = 'SMS_Installer_9.9.9.exe'; browser_download_url = 'https://example.invalid/i.exe'; digest = $cfg.digest }) } }
function Invoke-WebRequest { param($Uri, $OutFile, [switch]$UseBasicParsing)
    $script:downloads++; [IO.File]::WriteAllBytes($OutFile, [Convert]::FromBase64String($cfg.payload)) }
function Get-AuthenticodeSignature { param($FilePath)
    [pscustomobject]@{ Status = $cfg.sigStatus; SignerCertificate = [pscustomobject]@{ Subject = $cfg.signer } } }
function Start-Process { param($FilePath, [switch]$Wait, [switch]$PassThru, $ArgumentList, $WorkingDirectory, $WindowStyle)
    $script:started += , (@([string]$FilePath) + @($ArgumentList | ForEach-Object { [string]$_ }))
    [pscustomobject]@{ ExitCode = 0 } }
function Write-Host { }

$updated = Process-UpdateRequests
$status = $null
$statusFile = Join-Path $TRIGGER_DIR "update_status_$($cfg.job).json"
if (Test-Path $statusFile) { $status = Get-Content $statusFile -Raw | ConvertFrom-Json }
[pscustomobject]@{
    updated = [bool]$updated
    started = @($script:started | ForEach-Object { $_ -join ' ' })
    downloads = $script:downloads
    status = $status
    requests_left = @(Get-ChildItem $TRIGGER_DIR -Filter 'update_request_*.json').Count
    installer_kept = Test-Path (Join-Path $DOWNLOAD_DIR 'SMS_Installer_9.9.9.exe')
} | ConvertTo-Json -Depth 6 | Set-Content -Path $ResultFile -Encoding utf8
"""


def _run(tmp_path, *, job=JOB, tag="v9.9.9", digest=f"sha256:{GOOD_DIGEST}", payload=INSTALLER_BYTES,
         sig_status="Valid", signer="CN=AUT MIEEK, O=AUT MIEEK, C=CY", installed="v1.18.56"):
    import base64

    root = tmp_path / "app"
    (root / "data" / ".triggers").mkdir(parents=True)
    (root / "logs").mkdir()
    (root / "VERSION").write_text(installed, encoding="utf-8")
    (root / "data" / ".triggers" / f"update_request_{job}.json").write_text(
        json.dumps({"job_id": job, "command": "Remove-Item C:\\ -Recurse"}), encoding="utf-8"
    )
    (root / "scenario.json").write_text(json.dumps({
        "job": job, "tag": tag, "digest": digest, "payload": base64.b64encode(payload).decode(),
        "sigStatus": sig_status, "signer": signer,
    }), encoding="utf-8")
    harness = tmp_path / "harness.ps1"
    harness.write_text(HARNESS, encoding="utf-8")
    result = tmp_path / "result.json"
    proc = subprocess.run(
        [PWSH, "-NoProfile", "-NonInteractive", "-File", str(harness), "-Watcher", str(WATCHER),
         "-Root", str(root), "-Scenario", "x", "-ResultFile", str(result)],
        capture_output=True, text=True, timeout=120,
    )
    assert proc.returncode == 0, proc.stdout + proc.stderr
    return json.loads(result.read_text(encoding="utf-8-sig"))


def test_verified_release_is_installed_as_docker_edition_then_rebuilt(tmp_path):
    out = _run(tmp_path)
    assert out["updated"] is True
    installer, rebuild = out["started"]
    assert installer.split()[0].endswith("SMS_Installer_9.9.9.exe")
    for switch in ("/VERYSILENT", "/SUPPRESSMSGBOXES", "/EDITION=docker"):
        assert switch in installer
    assert rebuild.endswith("DOCKER.ps1 -Update")
    assert (out["status"]["status"], out["status"]["target_version"]) == ("completed", "9.9.9")
    assert out["requests_left"] == 0
    assert "Remove-Item" not in " ".join(out["started"])  # nothing from the request is run


def test_sha256_mismatch_installs_nothing(tmp_path):
    out = _run(tmp_path, payload=b"tampered installer")
    assert out["started"] == []
    assert out["status"]["status"] == "failed" and "SHA-256 mismatch" in out["status"]["message"]
    assert out["installer_kept"] is False


def test_installer_not_signed_by_aut_mieek_installs_nothing(tmp_path):
    out = _run(tmp_path, signer="CN=Someone Else")
    assert out["started"] == []
    assert "not validly signed by AUT MIEEK" in out["status"]["message"]
    assert out["installer_kept"] is False


def test_release_without_a_digest_installs_nothing(tmp_path):
    out = _run(tmp_path, digest="")
    assert out["started"] == [] and out["downloads"] == 0
    assert "publishes no SHA-256" in out["status"]["message"]


def test_same_version_is_left_alone(tmp_path):
    out = _run(tmp_path, tag="v1.18.56")
    assert out["updated"] is False and out["started"] == [] and out["downloads"] == 0
    assert out["status"]["phase"] == "up_to_date"


def test_request_with_a_malformed_job_id_is_ignored(tmp_path):
    # Matches update_request_*.json, but the id is not 32 hex digits: it would be used to build the
    # status file name, so the request is dropped unprocessed.
    out = _run(tmp_path, job="zz" * 16)
    assert out["started"] == [] and out["downloads"] == 0
    assert out["status"] is None
    assert out["requests_left"] == 0  # removed, never processed
