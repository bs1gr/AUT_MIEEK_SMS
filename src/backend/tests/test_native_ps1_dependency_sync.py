"""NATIVE.ps1 keeps the dev backend's packages in step with requirements.txt, and narrows hot reload.

Two things went wrong with `NATIVE.ps1 -Start`:

* It only checked that `src/backend/.venv` existed. Packages were installed by `-Setup` alone, so
  the dev backend kept running whatever had been installed months earlier (SQLAlchemy 2.0.44 and
  PyJWT 2.13.0 against pins of 2.1.8 and 2.15.1): a stack that no test run and no release used.
  A successful install now records the SHA-256 of requirements.txt in the venv, and a start whose
  record is missing or different installs first.
* `uvicorn --reload` watched the whole project root, so pip updating a package in a virtualenv, or
  any script being edited, restarted the backend (and each restart re-runs the migrations).

The script's own functions run under pwsh; what uvicorn makes of the arguments is checked with the
installed uvicorn, so an upgrade that drops or renames an option fails here and not on the dev PC.
"""

import json
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

PWSH = shutil.which("pwsh")
needs_pwsh = pytest.mark.skipif(
    PWSH is None or sys.platform != "win32", reason="Windows dev tool; needs pwsh on Windows"
)

NATIVE = Path(__file__).resolve().parents[3] / "infra" / "scripts" / "dev" / "NATIVE.ps1"

HARNESS_HEAD = r"""
param([string]$Native, [string]$Work)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$tokens = $null; $errs = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($Native, [ref]$tokens, [ref]$errs)
$wantedNames = 'Write-Info', 'Write-Success', 'Write-Warning', 'Test-BackendDependenciesCurrent',
    'Set-BackendDependenciesStamp', 'Sync-BackendDependencies', 'Get-BackendUvicornArguments'
foreach ($wanted in $wantedNames) {
    $def = $ast.Find({ param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -eq $wanted }.GetNewClosure(), $true)
    if (-not $def) { throw "function $wanted not found in NATIVE.ps1" }
    . ([scriptblock]::Create($def.Extent.Text))
}
$venv = Join-Path $Work 'venv'
New-Item -ItemType Directory -Path $venv | Out-Null
$req = Join-Path $Work 'requirements.txt'
$stamp = Join-Path $venv '.sms-requirements.sha256'
$calls = [System.Collections.Generic.List[string]]::new()
# What pip looks like to the script: it writes to the pipeline, then its exit code is returned.
$succeeds = { param($python, $requirements) $calls.Add("$python|$requirements"); 'Requirement already satisfied'; return 0 }
$fails = { param($python, $requirements) $calls.Add('failed'); 'ERROR: could not find a version'; return 1 }
$throws = { param($python, $requirements) $calls.Add('threw'); throw 'python.exe is missing' }
"""

HARNESS_TAIL = r"""
$result | ConvertTo-Json -Compress -Depth 5
"""


def _run(tmp_path: Path, body: str) -> dict:
    harness = tmp_path / "harness.ps1"
    harness.write_text(HARNESS_HEAD + body + HARNESS_TAIL, encoding="utf-8")
    work = tmp_path / "work"
    work.mkdir()
    result = subprocess.run(
        [str(PWSH), "-NoProfile", "-NonInteractive", "-File", str(harness), str(NATIVE), str(work)],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=120,
    )
    assert result.returncode == 0, result.stdout + result.stderr
    return json.loads(result.stdout.strip().splitlines()[-1])


@needs_pwsh
def test_a_venv_without_a_record_is_updated_once_and_then_left_alone(tmp_path):
    state = _run(
        tmp_path,
        r"""
Set-Content -LiteralPath $req -Value 'fastapi==1.0'
$before = Test-BackendDependenciesCurrent -VenvPath $venv -RequirementsPath $req
$first = Sync-BackendDependencies -VenvPath $venv -RequirementsPath $req -Installer $succeeds
$second = Sync-BackendDependencies -VenvPath $venv -RequirementsPath $req -Installer $succeeds
$result = @{
    before = $before; first = $first; second = $second; calls = @($calls)
    after = (Test-BackendDependenciesCurrent -VenvPath $venv -RequirementsPath $req)
    python = (Join-Path $venv 'Scripts\python.exe'); req = $req
}
""",
    )

    assert state["before"] is False  # a venv from before this check, like the one on the dev PC
    assert state["first"] == "updated"
    assert state["second"] == "current"
    assert state["after"] is True
    # The venv's own interpreter, the real requirements file, and only one install.
    assert state["calls"] == [f"{state['python']}|{state['req']}"]


@needs_pwsh
def test_a_changed_requirements_file_is_installed_again(tmp_path):
    state = _run(
        tmp_path,
        r"""
Set-Content -LiteralPath $req -Value 'sqlalchemy==2.0.44'
$first = Sync-BackendDependencies -VenvPath $venv -RequirementsPath $req -Installer $succeeds
Set-Content -LiteralPath $req -Value 'sqlalchemy==2.1.8'
$stale = Test-BackendDependenciesCurrent -VenvPath $venv -RequirementsPath $req
$second = Sync-BackendDependencies -VenvPath $venv -RequirementsPath $req -Installer $succeeds
$result = @{ first = $first; stale = $stale; second = $second; installs = $calls.Count }
""",
    )

    assert state == {"first": "updated", "stale": False, "second": "updated", "installs": 2}


@needs_pwsh
def test_a_failed_install_records_nothing_so_the_next_start_tries_again(tmp_path):
    state = _run(
        tmp_path,
        r"""
Set-Content -LiteralPath $req -Value 'fastapi==1.0'
$failed = Sync-BackendDependencies -VenvPath $venv -RequirementsPath $req -Installer $fails
$stampAfterFailure = Test-Path -LiteralPath $stamp
$threw = Sync-BackendDependencies -VenvPath $venv -RequirementsPath $req -Installer $throws
$stampAfterThrow = Test-Path -LiteralPath $stamp
$retried = Sync-BackendDependencies -VenvPath $venv -RequirementsPath $req -Installer $succeeds
$result = @{
    failed = $failed; stampAfterFailure = $stampAfterFailure
    threw = $threw; stampAfterThrow = $stampAfterThrow
    retried = $retried; calls = @($calls)
}
""",
    )

    assert state["failed"] == "failed"
    assert state["stampAfterFailure"] is False
    assert state["threw"] == "failed"
    assert state["stampAfterThrow"] is False
    assert state["retried"] == "updated"
    assert [call.split("|")[0] for call in state["calls"][:2]] == ["failed", "threw"]
    assert len(state["calls"]) == 3


@needs_pwsh
def test_setup_records_the_install_and_no_requirements_file_means_nothing_to_do(tmp_path):
    state = _run(
        tmp_path,
        r"""
$noFile = Sync-BackendDependencies -VenvPath $venv -RequirementsPath $req -Installer $succeeds
Set-Content -LiteralPath $req -Value 'fastapi==1.0'
# What -Setup does after its own pip install succeeds.
Set-BackendDependenciesStamp -VenvPath $venv -RequirementsPath $req
$afterSetup = Sync-BackendDependencies -VenvPath $venv -RequirementsPath $req -Installer $succeeds
$result = @{
    noFile = $noFile; afterSetup = $afterSetup; installs = $calls.Count
    recorded = (Get-Content -LiteralPath $stamp -Raw).Trim()
    expected = (Get-FileHash -LiteralPath $req -Algorithm SHA256).Hash
}
""",
    )

    assert state["noFile"] == "current"
    assert state["afterSetup"] == "current"
    assert state["installs"] == 0
    assert state["recorded"] == state["expected"]


def _expected_arguments(backend_dir: str, *, quoted: bool = False, venv: bool = True) -> list[str]:
    def shown(path: str) -> str:
        return f'"{path}"' if quoted else path

    exclude = ["--reload-exclude", shown(backend_dir + r"\.venv")] if venv else []
    return [
        "backend.main:app",
        "--reload",
        "--reload-dir",
        shown(backend_dir),
        *exclude,
        "--host",
        "0.0.0.0",
        "--port",
        "8000",
    ]


@needs_pwsh
def test_hot_reload_watches_the_backend_source_only(tmp_path):
    state = _run(
        tmp_path,
        r"""
$backend = Join-Path $Work 'proj\src\backend'
$spaced = Join-Path $Work 'Program Files\SMS\src\backend'
$bare = Join-Path $Work 'bare\src\backend'
New-Item -ItemType Directory -Path (Join-Path $backend '.venv'), (Join-Path $spaced '.venv'), $bare | Out-Null
$result = @{
    backend = $backend; spacedDir = $spaced; bareDir = $bare
    reload = @(Get-BackendUvicornArguments -Module 'backend.main:app' -BackendHost '0.0.0.0' -Port 8000 -BackendDir $backend)
    plain = @(Get-BackendUvicornArguments -Module 'backend.main:app' -BackendHost '127.0.0.1' -Port 8000 -BackendDir $backend -NoReload)
    spaced = @(Get-BackendUvicornArguments -Module 'backend.main:app' -BackendHost '0.0.0.0' -Port 8000 -BackendDir $spaced)
    bare = @(Get-BackendUvicornArguments -Module 'backend.main:app' -BackendHost '0.0.0.0' -Port 8000 -BackendDir $bare)
}
""",
    )

    assert state["reload"] == _expected_arguments(state["backend"])
    # Start-Process does not quote: an install under "Program Files" must not split the path.
    assert " " in state["spacedDir"]
    assert state["spaced"] == _expected_arguments(state["spacedDir"], quoted=True)
    # No virtualenv there, so nothing to leave out: uvicorn refuses to start when it is given an
    # absolute --reload-exclude that is not a directory ("Non-relative patterns are unsupported").
    assert state["bare"] == _expected_arguments(state["bareDir"], venv=False)
    assert state["plain"] == ["backend.main:app", "--host", "127.0.0.1", "--port", "8000"]
    # NATIVE.ps1 finds its own backend by "uvicorn backend.main:app": the module stays first.
    for key in ("reload", "plain", "spaced", "bare"):
        assert state[key][0] == "backend.main:app"


def test_uvicorn_reads_those_arguments_as_backend_source_minus_its_virtualenv(tmp_path):
    pytest.importorskip("watchfiles")  # --reload-exclude needs it (uvicorn[standard])
    import importlib

    from uvicorn.config import Config
    from uvicorn.supervisors.watchfilesreload import FileFilter

    backend_dir = tmp_path / "src" / "backend"
    (backend_dir / ".venv" / "Lib" / "site-packages" / "sqlalchemy").mkdir(parents=True)
    (backend_dir / "routers").mkdir()

    arguments = [
        "backend.main:app",
        "--reload",
        "--reload-dir",
        str(backend_dir),
        "--reload-exclude",
        str(backend_dir / ".venv"),
        "--host",
        "0.0.0.0",
        "--port",
        "8000",
    ]
    # The same shape NATIVE.ps1 produces (checked above on Windows).
    assert [a for a in arguments if a.startswith("--")] == [a for a in _expected_arguments("x") if a.startswith("--")]

    # uvicorn's command line parser itself (the package attribute `uvicorn.main` is this command,
    # which hides the module of the same name, hence import_module).
    command = importlib.import_module("uvicorn.main").main
    params = command.make_context("uvicorn", list(arguments)).params
    assert params["reload"] is True

    config = Config(
        app=params["app"],
        reload=params["reload"],
        reload_dirs=params["reload_dirs"],
        reload_excludes=params["reload_excludes"],
        log_config=None,
    )
    assert [path.resolve() for path in config.reload_dirs] == [backend_dir.resolve()]

    restarts_for = FileFilter(config)
    assert restarts_for(backend_dir / "routers" / "routers_students.py") is True
    assert restarts_for(backend_dir / ".venv" / "Lib" / "site-packages" / "sqlalchemy" / "orm.py") is False
