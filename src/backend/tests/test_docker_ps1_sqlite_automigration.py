"""DOCKER.ps1 must not merge a host's SQLite database into a PostgreSQL that already has data.

On start with a PostgreSQL profile, Invoke-SqliteToPostgresMigration copies a local SQLite
database it finds into PostgreSQL. It used to pass --no-truncate, which appends every row whose
id is free: the first remote start of a laptop that had run on SQLite merged its own users,
students and grades into the shared QNAP database. Now the tool's default applies (copy only
into an empty database, exit 4 otherwise) and startup leaves the SQLite file alone.

The functions are taken from DOCKER.ps1 itself and run under pwsh with a stub `docker`.
"""

import json
import shutil
import subprocess
from pathlib import Path

import pytest

PWSH = shutil.which("pwsh")
pytestmark = pytest.mark.skipif(PWSH is None, reason="pwsh is not installed")

DOCKER_PS1 = Path(__file__).resolve().parents[3] / "infra" / "scripts" / "dev" / "DOCKER.ps1"

HARNESS = r"""
param([string]$DockerScript, [string]$ProjectRoot, [int]$MigrationExit, [int]$Runs, [string]$ResultFile)
$ErrorActionPreference = 'Stop'

$tokens = $null; $parseErrors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($DockerScript, [ref]$tokens, [ref]$parseErrors)
$wanted = 'Invoke-SqliteToPostgresMigration', 'Skip-SqliteMigrationIntoOccupiedDatabase'
$defs = @($ast.FindAll({ param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $wanted -contains $n.Name }, $true))
if ($defs.Count -ne $wanted.Count) { throw "Expected $($wanted.Count) functions in DOCKER.ps1, found $($defs.Count)" }
foreach ($def in $defs) { . ([scriptblock]::Create($def.Extent.Text)) }

$PROJECT_ROOT = $ProjectRoot
$IMAGE_TAG = 'sms-fullstack:test'
$ROOT_ENV = Join-Path $ProjectRoot 'config.env'
$script:EffectiveDatabaseUrl = 'postgresql://sms_user:secret@172.16.0.2:55433/student_management'
$script:SingleModeNetworkName = $null
$script:SelectedSmsDataVolume = $null

function Set-ComposeVolumeEnvironment {}
function Find-VolumeSqliteDatabase { param($VolumeName) $null }
function Get-EnvVarValue { param($Name) $null }
function Invoke-SingleModePostgresCredentialRepair { $false }
function Write-Info { param($Message) }
function Write-Success { param($Message) }
function Write-Error-Message { param($Message) }
function docker {
    if ($args[0] -eq 'images') { $global:LASTEXITCODE = 0; return 'image-id' }
    $script:migrateCalls += , @($args)
    $global:LASTEXITCODE = $MigrationExit
    'migration output'
}

$results = @()
for ($i = 0; $i -lt $Runs; $i++) {
    $script:migrateCalls = @()
    $out = @(Invoke-SqliteToPostgresMigration 3>&1)
    $results += [pscustomobject]@{
        returned = @($out | Where-Object { $_ -isnot [System.Management.Automation.WarningRecord] })
        warnings = @($out | Where-Object { $_ -is [System.Management.Automation.WarningRecord] } | ForEach-Object { $_.Message })
        migrateCalls = @($script:migrateCalls | ForEach-Object { $_ -join ' ' })
    }
}
$results | ConvertTo-Json -Depth 5 -AsArray | Set-Content -Path $ResultFile -Encoding utf8
"""


@pytest.fixture
def project(tmp_path):
    root = tmp_path / "project"
    (root / "data").mkdir(parents=True)
    (root / "data" / "student_management.db").write_bytes(b"local sqlite data" * 128)
    return root


def _start(tmp_path, project, migration_exit, runs=1):
    harness = tmp_path / "harness.ps1"
    harness.write_text(HARNESS, encoding="utf-8")
    result_file = tmp_path / "result.json"
    proc = subprocess.run(
        [
            PWSH,
            "-NoProfile",
            "-NonInteractive",
            "-File",
            str(harness),
            "-DockerScript",
            str(DOCKER_PS1),
            "-ProjectRoot",
            str(project),
            "-MigrationExit",
            str(migration_exit),
            "-Runs",
            str(runs),
            "-ResultFile",
            str(result_file),
        ],
        capture_output=True,
        text=True,
        timeout=120,
    )
    assert proc.returncode == 0, proc.stdout + proc.stderr
    return json.loads(result_file.read_text(encoding="utf-8-sig"))


def test_copies_into_an_empty_database_without_appending(tmp_path, project):
    (run,) = _start(tmp_path, project, migration_exit=0)

    assert run["returned"] == [True]
    (call,) = run["migrateCalls"]
    assert "backend.scripts.migrate_sqlite_to_postgres" in call
    assert "--no-truncate" not in call
    assert "--truncate" not in call
    # A completed copy archives the SQLite file and records the source snapshot.
    assert not (project / "data" / "student_management.db").exists()
    assert list((project / "data").glob("student_management.db.migrated_*"))
    assert (project / "data" / ".triggers" / "sqlite_to_postgres.auto.migrated").exists()


def test_database_with_data_leaves_sqlite_alone_and_is_not_retried(tmp_path, project):
    sqlite_file = project / "data" / "student_management.db"
    before = sqlite_file.read_bytes()

    first, second = _start(tmp_path, project, migration_exit=4, runs=2)

    # Startup continues, the SQLite file stays where it was, and the operator is told.
    assert first["returned"] == [True]
    assert len(first["migrateCalls"]) == 1
    assert any("NOT copied" in w for w in first["warnings"])
    assert sqlite_file.read_bytes() == before
    assert not (project / "data" / ".triggers" / "sqlite_to_postgres.auto.migrated").exists()
    assert (project / "data" / ".triggers" / "sqlite_to_postgres.auto.skipped").exists()

    # The same source is not offered to PostgreSQL again on the next start.
    assert second["returned"] == [True]
    assert second["migrateCalls"] == []


def test_other_migration_failures_still_stop_startup(tmp_path, project):
    (run,) = _start(tmp_path, project, migration_exit=1)

    assert run["returned"] == [False]
    assert (project / "data" / "student_management.db").exists()
    assert not (project / "data" / ".triggers").exists()
