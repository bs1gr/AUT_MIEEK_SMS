"""An installer takes tracked files only, whoever builds it and wherever.

A wildcard line of the installer script (``Source: "..\\..\\..\\src\\backend\\*"``) takes every
file in its folder, tracked by git or not. The published installers are built by a workflow
from a clean checkout, which holds tracked files only. An installer built by hand on the
developer's PC is built from a folder that also holds what the application and the developer
left there. Found on 18 November 2026, while the installation guide was read against the
script: by the script's own rules such a build packed ``config\\.env`` and
``config\\environments\\production.env`` (the PC's secret key and database password),
``src\\backend\\.keys\\master.key`` (the key of the encrypted backups) and several hundred
generated reports, exports and uploaded import files. Nine such builds lay in
``infra\\installer\\dist``; none was published (the published v1.18.73 is another file, by
size and digest).

Two changes, both checked here:

1. ``scripts/validate_installer_release_inputs.ps1``, the gate's "Installer Input Guard",
   fails when a wildcard line would take a file that git does not track and the line does not
   exclude. It used to look for database files only. It is run here against a throwaway
   repository.
2. ``SMS_Installer.iss`` excludes those files on its two lines, so that a build by hand takes
   what a build by the workflow takes.
"""

import re
import shutil
import subprocess
from pathlib import Path

import pytest

PWSH = shutil.which("pwsh") or ""
GIT = shutil.which("git") or ""
needs_pwsh_and_git = pytest.mark.skipif(not (PWSH and GIT), reason="pwsh and git are required")

REPO_ROOT = Path(__file__).resolve().parents[3]
VALIDATOR = REPO_ROOT / "scripts" / "validate_installer_release_inputs.ps1"
INSTALLER_SCRIPT = REPO_ROOT / "infra" / "installer" / "windows" / "SMS_Installer.iss"


def _git(cwd: Path, *args: str) -> None:
    subprocess.run(
        [GIT, "-c", "user.name=Test", "-c", "user.email=test@example.com", "-c", "commit.gpgsign=false", *args],
        cwd=cwd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=True,
    )


def _write(path: Path, text: str = "x\n") -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(text.encode("utf-8"))


def _repository(root: Path, lines: list[str]) -> Path:
    """A repository with an application folder, a settings folder and an installer script that
    takes both with the given lines. The script is where the real one is, three folders down."""
    _write(root / "app" / "main.py")
    _write(root / "app" / "routers" / "students.py")
    _write(root / "app" / "tests" / "test_students.py")
    _write(root / "settings" / ".env.example", "SECRET_KEY=change-me\n")
    _write(root / "settings" / "environments" / "production.env.example")
    _write(root / ".gitignore", ".env\n*.env\n.keys/\nreports/\n__pycache__/\n")
    script = root / "infra" / "installer" / "windows" / "Setup.iss"
    _write(script, "[Files]\n" + "\n".join(lines) + "\n")
    _git(root, "init", "-q")
    _git(root, "add", "-A")
    _git(root, "commit", "-q", "-m", "tracked files")
    return script


def _check(root: Path, script: Path) -> subprocess.CompletedProcess:
    return subprocess.run(
        [PWSH, "-NoProfile", "-File", str(VALIDATOR), "-InstallerScriptPath", str(script), "-RepoRoot", str(root)],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=120,
    )


APP = r'Source: "..\..\..\app\*"; DestDir: "{app}\backend"; Flags: ignoreversion recursesubdirs createallsubdirs'
SETTINGS = (
    r'Source: "..\..\..\settings\*"; DestDir: "{app}\config"; Flags: ignoreversion recursesubdirs createallsubdirs'
)


@needs_pwsh_and_git
def test_a_checkout_with_tracked_files_only_passes(tmp_path: Path):
    script = _repository(tmp_path, [APP, SETTINGS])

    done = _check(tmp_path, script)

    assert done.returncode == 0, done.stdout + done.stderr


@needs_pwsh_and_git
def test_a_local_settings_file_or_key_that_a_line_would_take_fails_the_check_and_is_named(tmp_path: Path):
    script = _repository(tmp_path, [APP, SETTINGS])
    # What a developer's PC holds: ignored by git, and so in no clean checkout.
    _write(tmp_path / "settings" / ".env", "SECRET_KEY=the-real-one\n")
    _write(tmp_path / "settings" / "environments" / "production.env")
    _write(tmp_path / "app" / ".keys" / "master.key")
    _write(tmp_path / "app" / "reports" / "report_1.pdf")
    # And a file nobody ignored: untracked is enough.
    _write(tmp_path / "app" / "notes.txt")

    done = _check(tmp_path, script)

    assert done.returncode == 1, done.stdout + done.stderr
    said = done.stdout
    for name in (r"settings\.env", r"settings\environments\production.env", r"app\.keys\master.key"):
        assert name in said, said
    assert "would pack 3 file(s)" in said and "would pack 2 file(s)" in said, said
    # It used to pass: none of them is a database file.


@needs_pwsh_and_git
def test_what_the_line_excludes_is_not_counted(tmp_path: Path):
    app = APP + r'; Excludes: "tests,reports,.keys,*.txt,logs\*,__pycache__"'
    settings = SETTINGS + '; Excludes: ".env,*.env"'
    script = _repository(tmp_path, [app, settings])
    _write(tmp_path / "settings" / ".env")
    _write(tmp_path / "settings" / "environments" / "production.env")
    _write(tmp_path / "app" / ".keys" / "master.key")
    _write(tmp_path / "app" / "reports" / "2026" / "report_1.pdf")  # a folder name leaves out all it holds
    _write(tmp_path / "app" / "notes.txt")
    _write(tmp_path / "app" / "routers" / "__pycache__" / "students.cpython-313.pyc")
    _write(tmp_path / "app" / "logs" / "app.log")
    _write(tmp_path / "app" / "tests" / "output.xml")

    done = _check(tmp_path, script)

    assert done.returncode == 0, done.stdout + done.stderr


@needs_pwsh_and_git
def test_a_line_without_recursesubdirs_takes_the_top_folder_only(tmp_path: Path):
    top_only = r'Source: "..\..\..\app\*"; DestDir: "{app}\backend"; Flags: ignoreversion'
    script = _repository(tmp_path, [top_only])
    _write(tmp_path / "app" / "reports" / "report_1.pdf")
    assert _check(tmp_path, script).returncode == 0

    _write(tmp_path / "app" / "local.json")
    done = _check(tmp_path, script)

    assert done.returncode == 1 and r"app\local.json" in done.stdout, done.stdout


def _excludes_of(source_folder: str) -> list[str]:
    for line in INSTALLER_SCRIPT.read_text(encoding="utf-8-sig").splitlines():
        if line.lstrip().startswith(";"):
            continue
        if f'Source: "..\\..\\..\\{source_folder}\\*"' in line:
            found = re.search(r'Excludes:\s*"([^"]*)"', line)
            return [pattern.strip() for pattern in found.group(1).split(",")] if found else []
    raise AssertionError(f"SMS_Installer.iss has no wildcard line for {source_folder}")


def test_the_installer_leaves_the_settings_of_the_build_pc_out():
    excludes = _excludes_of("config")

    # config\.env, config\environments\production.env and its .SECURE copy; the *.example
    # templates must stay, DOCKER.ps1 makes config\.env from one.
    assert {".env", "*.env", "*.env.SECURE"} <= set(excludes), excludes
    assert not any(pattern in excludes for pattern in (".env.example", "*.example", ".env.*", "*")), excludes


def test_the_installer_leaves_out_what_the_application_wrote_into_the_backend_folder():
    excludes = _excludes_of(r"src\backend")

    for folder in (".keys", "reports", "exports", "data", "test-results", ".mypy_cache", ".env"):
        assert folder in excludes, f"{folder} is not excluded: {excludes}"
    # None of these names is a folder of the application's own code.
    backend = REPO_ROOT / "src" / "backend"
    tracked = (
        subprocess.run(
            [GIT, "-C", str(REPO_ROOT), "ls-files", "--", "src/backend"],
            capture_output=True,
            text=True,
            encoding="utf-8",
        ).stdout.splitlines()
        if GIT
        else []
    )
    for folder in ("reports", "exports", "data", "test-results", ".keys", ".mypy_cache"):
        inside = [name for name in tracked if f"/{folder}/" in f"/{name}" and "/tests/" not in name]
        assert not inside, f"the installer would leave out tracked files of {backend / folder}: {inside[:3]}"


@needs_pwsh_and_git
def test_this_checkout_passes_the_check():
    done = subprocess.run(
        [PWSH, "-NoProfile", "-File", str(VALIDATOR)],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=300,
    )

    assert done.returncode == 0, done.stdout[-3000:] + done.stderr[-1000:]
