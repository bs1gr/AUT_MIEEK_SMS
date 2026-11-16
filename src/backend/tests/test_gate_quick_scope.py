"""COMMIT_READY.ps1 runs the changed test files alone only when nothing but test files changed.

In quick mode the gate ran "the changed tests only" whenever any changed file looked like a test
file, whatever else the commit changed. On the backend nobody noticed, because the pattern asked
for "test_" twice in the path and matched none of the 166 test files: every quick gate ran the
whole suite. Then a file was named test_test_run_backups_folder.py (#409, 2026-11-16). The gate
for a commit that changed conftest.py and three source files ran that one file, in 89 seconds,
and passed. On the frontend the pattern worked, so a component changed together with any test
file was checked by that test file alone.

Get-QuickTestScope and Get-ChangedFiles are taken from COMMIT_READY.ps1 itself and run under
pwsh, on scratch trees and scratch repositories.
"""

import itertools
import json
import shutil
import subprocess
from pathlib import Path

import pytest

PWSH = shutil.which("pwsh") or ""
GIT = shutil.which("git") or ""
needs_pwsh = pytest.mark.skipif(not PWSH, reason="pwsh is required")
needs_pwsh_and_git = pytest.mark.skipif(not (PWSH and GIT), reason="pwsh and git are required")

REPO_ROOT = Path(__file__).resolve().parents[3]
COMMIT_READY = REPO_ROOT / "infra" / "scripts" / "ops" / "COMMIT_READY.ps1"

HARNESS = r"""
param([string]$Script, [string]$Root, [string]$CasesFile, [string]$ResultFile)
$ErrorActionPreference = 'Stop'

$tokens = $null; $parseErrors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($Script, [ref]$tokens, [ref]$parseErrors)
foreach ($wanted in 'Test-CommandAvailable', 'Get-ChangedFiles', 'Get-QuickTestScope') {
    $def = $ast.FindAll({ param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] }, $true) |
        Where-Object { $_.Name -eq $wanted } | Select-Object -First 1
    if (-not $def) { throw "$wanted was not found in COMMIT_READY.ps1" }
    . ([scriptblock]::Create($def.Extent.Text))
}

$results = [ordered]@{}
if ($CasesFile) {
    # Each case: a name and the changed files the gate would have been given.
    $cases = Get-Content -LiteralPath $CasesFile -Raw -Encoding utf8 | ConvertFrom-Json -AsHashtable
    foreach ($name in $cases.Keys) {
        $changed = @($cases[$name])
        $scope = Get-QuickTestScope -ChangedFiles $changed -ProjectRoot $Root
        $results[$name] = [ordered]@{ changed = $changed; backend = $scope.Backend; frontend = $scope.Frontend }
    }
}
else {
    # What the gate does: ask git, in the repository, then decide.
    Set-Location -LiteralPath $Root
    $changed = @(Get-ChangedFiles)
    $scope = Get-QuickTestScope -ChangedFiles $changed -ProjectRoot $Root
    $results['git'] = [ordered]@{ changed = $changed; backend = $scope.Backend; frontend = $scope.Frontend }
}
ConvertTo-Json -InputObject $results -Depth 6 | Set-Content -LiteralPath $ResultFile -Encoding utf8
"""

_counter = itertools.count()

BACKEND = "src/backend/tests"
FRONTEND = "src/frontend/src"


def _run_harness(tmp_path: Path, root: Path, cases: dict[str, list[str]] | None) -> dict:
    number = next(_counter)
    harness = tmp_path / "harness.ps1"
    harness.write_text(HARNESS, encoding="utf-8")
    result_file = tmp_path / f"scope{number}.json"
    arguments = [PWSH, "-NoProfile", "-NonInteractive", "-File", str(harness)]
    arguments += ["-Script", str(COMMIT_READY), "-Root", str(root), "-ResultFile", str(result_file)]
    if cases is not None:
        cases_file = tmp_path / f"cases{number}.json"
        cases_file.write_text(json.dumps(cases), encoding="utf-8")
        arguments += ["-CasesFile", str(cases_file)]
    done = subprocess.run(arguments, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=180)
    assert done.returncode == 0, done.stderr or done.stdout
    return json.loads(result_file.read_text(encoding="utf-8-sig"))


def _tree(tmp_path: Path, files: dict[str, str] | list[str]) -> Path:
    """A scratch project folder with these files (a list: each with a line of its own)."""
    root = tmp_path / "project"
    contents = files if isinstance(files, dict) else {name: f"# {name}\n" for name in files}
    for name, text in contents.items():
        target = root / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(text.encode("utf-8"))
    (root / BACKEND).mkdir(parents=True, exist_ok=True)
    return root


def _scopes(tmp_path: Path, root: Path, cases: dict[str, list[str]]) -> dict:
    return _run_harness(tmp_path, root, cases)


def _git(cwd: Path, *args: str) -> None:
    subprocess.run(
        [GIT, "-c", "user.name=Test", "-c", "user.email=test@example.com", "-c", "commit.gpgsign=false", *args],
        cwd=cwd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=True,
    )


def _repository(tmp_path: Path, files: list[str]) -> Path:
    root = _tree(tmp_path, files)
    _git(root, "init", "-q")
    _git(root, "config", "core.autocrlf", "false")
    _git(root, "add", "-A")
    _git(root, "commit", "-q", "-m", "initial")
    return root


# --- the commit that showed it ----------------------------------------------------------------


@needs_pwsh
def test_a_test_file_among_other_changes_does_not_narrow_the_run(tmp_path):
    """The first commit of #409, by its files: the gate ran test_test_run_backups_folder.py only."""
    changed = [
        "src/backend/db/query_profiler.py",
        "src/backend/routers/routers_diagnostics.py",
        "src/backend/services/maintenance_scheduler.py",
        f"{BACKEND}/conftest.py",
        f"{BACKEND}/test_diagnostics_router.py",
        f"{BACKEND}/test_test_run_backups_folder.py",
        "docs/plans/UNIFIED_WORK_PLAN.md",
    ]
    root = _tree(tmp_path, changed)

    scope = _scopes(tmp_path, root, {"pr409": changed})["pr409"]

    assert scope["backend"]["Scope"] == "all"
    assert scope["backend"]["Files"] == []
    assert "5 of the 7 changed file(s) are not test files" in scope["backend"]["Reason"]
    assert scope["frontend"]["Scope"] == "all"


@needs_pwsh
def test_test_files_alone_are_run_alone_whatever_they_are_called(tmp_path):
    """The old pattern wanted "test_" twice: an ordinary name never matched, the odd one did."""
    names = [f"{BACKEND}/test_diagnostics_router.py", f"{BACKEND}/test_test_run_backups_folder.py"]
    nested = f"{BACKEND}/api/test_nested.py"
    root = _tree(tmp_path, [*names, nested])

    scopes = _scopes(
        tmp_path,
        root,
        {"ordinary": names[:1], "odd": names[1:], "both": names, "nested": [nested]},
    )

    assert scopes["ordinary"]["backend"] == {"Scope": "changed", "Files": names[:1], "Reason": None}
    assert scopes["odd"]["backend"] == {"Scope": "changed", "Files": names[1:], "Reason": None}
    assert scopes["both"]["backend"]["Files"] == names
    assert scopes["nested"]["backend"] == {"Scope": "changed", "Files": [nested], "Reason": None}
    # Nothing of the frontend changed: its suite runs whole, as it always did.
    assert scopes["ordinary"]["frontend"]["Scope"] == "all"
    assert scopes["ordinary"]["frontend"]["Reason"] == "no frontend test file changed"


@needs_pwsh
def test_any_file_that_is_not_a_test_file_means_the_whole_suites(tmp_path):
    backend_test = f"{BACKEND}/test_students.py"
    frontend_test = f"{FRONTEND}/components/Foo.test.tsx"
    not_tests = [
        f"{BACKEND}/conftest.py",  # every test loads it
        f"{BACKEND}/db_setup.py",  # a helper of the tests
        f"{BACKEND}/testing_utils.py",  # looks a little like a test file
        "src/backend/pytest.ini",
        "src/backend/routers/routers_students.py",
        "infra/scripts/ops/COMMIT_READY.ps1",  # tests drive it
        "docs/plans/UNIFIED_WORK_PLAN.md",
        "VERSION",
        f"{FRONTEND}/components/Foo.tsx",
        f"{FRONTEND}/test-utils/render.tsx",
        "src/frontend/tests/e2e/login.spec.ts",  # Playwright, not vitest
        f"{FRONTEND}/__e2e__/login.spec.ts",
        "src/frontend/package.json",
    ]
    root = _tree(tmp_path, [backend_test, frontend_test, *not_tests])

    scopes = _scopes(tmp_path, root, {other: [backend_test, frontend_test, other] for other in not_tests})

    for other, scope in scopes.items():
        assert scope["backend"]["Scope"] == "all", other
        assert scope["frontend"]["Scope"] == "all", other
        assert f"for example {other}" in scope["backend"]["Reason"], other
        assert scope["backend"]["Reason"] == scope["frontend"]["Reason"], other


@needs_pwsh
def test_a_component_changed_with_its_test_runs_the_whole_frontend_suite(tmp_path):
    """The frontend half of the same rule; its pattern worked, so this one was live."""
    component = f"{FRONTEND}/components/NotificationItem.tsx"
    its_test = f"{FRONTEND}/components/NotificationItem.test.tsx"
    in_tests_folder = f"{FRONTEND}/features/operations/__tests__/DevToolsPanel.restore.test.tsx"
    root = _tree(tmp_path, [component, its_test, in_tests_folder])

    scopes = _scopes(
        tmp_path,
        root,
        {"with": [component, its_test], "alone": [its_test, in_tests_folder]},
    )

    assert scopes["with"]["frontend"]["Scope"] == "all"
    assert scopes["alone"]["frontend"] == {"Scope": "changed", "Files": [its_test, in_tests_folder], "Reason": None}
    # A change of frontend test files alone still runs the whole backend suite, as before.
    assert scopes["alone"]["backend"]["Scope"] == "all"
    assert scopes["alone"]["backend"]["Reason"] == "no backend test file changed"


@needs_pwsh
def test_test_files_of_both_sides_are_each_run_alone(tmp_path):
    backend_test = f"{BACKEND}/test_students.py"
    frontend_test = f"{FRONTEND}/api/client.spec.ts"
    root = _tree(tmp_path, [backend_test, frontend_test])

    scope = _scopes(tmp_path, root, {"both": [frontend_test, backend_test]})["both"]

    assert scope["backend"] == {"Scope": "changed", "Files": [backend_test], "Reason": None}
    assert scope["frontend"] == {"Scope": "changed", "Files": [frontend_test], "Reason": None}


@needs_pwsh
def test_nothing_changed_means_the_whole_suites(tmp_path):
    root = _tree(tmp_path, [f"{BACKEND}/test_students.py"])

    scope = _scopes(tmp_path, root, {"none": []})["none"]

    assert scope["backend"]["Scope"] == scope["frontend"]["Scope"] == "all"
    assert scope["backend"]["Reason"] == "no changed files were found"


@needs_pwsh
def test_paths_with_backslashes_are_understood(tmp_path):
    root = _tree(tmp_path, [f"{BACKEND}/test_students.py"])

    scope = _scopes(tmp_path, root, {"windows": ["src\\backend\\tests\\test_students.py"]})["windows"]

    assert scope["backend"] == {"Scope": "changed", "Files": [f"{BACKEND}/test_students.py"], "Reason": None}


# --- test files that cannot be run alone ----------------------------------------------------------


@needs_pwsh
def test_a_test_file_that_is_gone_means_the_whole_suite(tmp_path):
    kept = f"{BACKEND}/test_students.py"
    root = _tree(tmp_path, [kept])  # test_removed.py is in the change, not in the folder

    scope = _scopes(tmp_path, root, {"gone": [kept, f"{BACKEND}/test_removed.py"]})["gone"]

    assert scope["backend"]["Scope"] == "all"
    assert scope["backend"]["Reason"] == f"a test file was removed or renamed: {BACKEND}/test_removed.py"
    assert scope["frontend"]["Scope"] == "all"


@needs_pwsh
def test_a_test_file_that_another_one_names_means_the_whole_suite(tmp_path):
    """Three test modules import helpers from another test module today."""
    root = _tree(
        tmp_path,
        {
            f"{BACKEND}/test_rbac_enforcement.py": "def build_app_with_auth_enabled():\n    return None\n",
            f"{BACKEND}/test_lite_security_defaults.py": (
                "from backend.tests.test_rbac_enforcement import build_app_with_auth_enabled\n"
            ),
            f"{BACKEND}/test_rbac.py": "# its own name, test_rbac, in its own file does not count\n",
            f"{BACKEND}/test_students.py": "def test_x():\n    assert True\n",
            f"{BACKEND}/__pycache__/leftover.py": "import test_students\n",
        },
    )

    scopes = _scopes(
        tmp_path,
        root,
        {
            "imported": [f"{BACKEND}/test_rbac_enforcement.py"],
            "importer": [f"{BACKEND}/test_lite_security_defaults.py"],
            "shorter_name": [f"{BACKEND}/test_rbac.py"],
            "not_named": [f"{BACKEND}/test_students.py"],
        },
    )

    assert scopes["imported"]["backend"]["Scope"] == "all"
    assert scopes["imported"]["backend"]["Reason"] == (
        "test_rbac_enforcement.py is named in test_lite_security_defaults.py, which may depend on it"
    )
    # The file that imports is not imported itself.
    assert scopes["importer"]["backend"]["Scope"] == "changed"
    # test_rbac is not named by a file that names test_rbac_enforcement.
    assert scopes["shorter_name"]["backend"]["Scope"] == "changed"
    # A cache folder is not a file of the tests.
    assert scopes["not_named"]["backend"]["Scope"] == "changed"


@needs_pwsh
def test_more_test_files_than_one_run_takes_go_to_the_batch_runner(tmp_path):
    names = [f"{BACKEND}/test_file_{number:02d}.py" for number in range(11)]
    root = _tree(tmp_path, names)

    scopes = _scopes(tmp_path, root, {"ten": names[:10], "eleven": names})

    assert scopes["ten"]["backend"]["Scope"] == "changed"
    assert len(scopes["ten"]["backend"]["Files"]) == 10
    assert scopes["eleven"]["backend"]["Scope"] == "all"
    assert "11 backend test files changed" in scopes["eleven"]["backend"]["Reason"]


# --- with git, as the gate asks ------------------------------------------------------------------


@needs_pwsh_and_git
def test_from_a_repository_staged_unstaged_and_new_files_all_count(tmp_path):
    root = _repository(tmp_path, [f"{BACKEND}/test_students.py", "src/backend/routers/routers_students.py"])
    (root / BACKEND / "test_students.py").write_text("# changed\n", encoding="utf-8")
    _git(root, "add", "-A")  # staged: a test file
    (root / "src/backend/routers/routers_students.py").write_text("# changed\n", encoding="utf-8")  # not staged

    scope = _run_harness(tmp_path, root, None)["git"]

    assert scope["changed"] == ["src/backend/routers/routers_students.py", f"{BACKEND}/test_students.py"]
    assert scope["backend"]["Scope"] == "all"

    _git(root, "checkout", "--", "src/backend/routers/routers_students.py")
    (root / BACKEND / "test_new.py").write_text("# not tracked yet\n", encoding="utf-8")

    scope = _run_harness(tmp_path, root, None)["git"]

    assert scope["changed"] == [f"{BACKEND}/test_new.py", f"{BACKEND}/test_students.py"]
    assert scope["backend"] == {"Scope": "changed", "Files": scope["changed"], "Reason": None}


@needs_pwsh_and_git
def test_a_renamed_test_file_is_a_file_that_went(tmp_path):
    """git would report the new name alone; a module that imports the old one would not be run."""
    root = _repository(tmp_path, [f"{BACKEND}/test_old_name.py", f"{BACKEND}/test_students.py"])
    _git(root, "mv", f"{BACKEND}/test_old_name.py", f"{BACKEND}/test_new_name.py")

    scope = _run_harness(tmp_path, root, None)["git"]

    assert scope["changed"] == [f"{BACKEND}/test_new_name.py", f"{BACKEND}/test_old_name.py"]
    assert scope["backend"]["Scope"] == "all"
    assert scope["backend"]["Reason"] == f"a test file was removed or renamed: {BACKEND}/test_old_name.py"


# --- the gate uses it -----------------------------------------------------------------------------


def test_the_gate_decides_with_this_function_and_says_what_it_decided():
    script = COMMIT_READY.read_text(encoding="utf-8")
    suite = script[script.index("function Invoke-TestSuite") :]
    suite = suite[: suite.index("# Frontend: Playwright E2E")]

    assert suite.count("Get-QuickTestScope -ChangedFiles @(Get-ChangedFiles) -ProjectRoot $PROJECT_ROOT") == 2
    assert ".Backend" in suite and ".Frontend" in suite
    assert "Whole backend suite: $($backendScope.Reason)" in suite
    assert "Whole frontend suite: $($frontendScope.Reason)" in suite
    # The old rule: any changed file that matched, and the pattern that asked for "test_" twice.
    assert "$changedBackendTests" not in script
    assert "$changedFrontendTests" not in script
    assert "tests/.+test_.*" not in script


def test_the_pattern_is_the_one_pytest_collects_by():
    pytest_ini = (REPO_ROOT / "src" / "backend" / "pytest.ini").read_text(encoding="utf-8")
    script = COMMIT_READY.read_text(encoding="utf-8")

    assert "python_files = test_*.py" in pytest_ini
    assert r"'^src/backend/tests/(?:.+/)?test_[^/]+\.py$'" in script
