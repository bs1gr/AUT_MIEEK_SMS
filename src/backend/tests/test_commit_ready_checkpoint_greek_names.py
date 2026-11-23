"""The gate's checkpoint reads a Greek file name right in any console (plan todo 79).

COMMIT_READY ends by recording a fingerprint of the tree it validated, and the pre-commit hook
refuses a commit whose tree has another (scripts/ENFORCE_COMMIT_READY_GUARD.ps1). The fingerprint
pairs each changed path with a hash of its content. git prints the paths in UTF-8, and PowerShell
read them in the console's code page: in a new console on a Greek Windows (code page 737) the
name "docs/user/ΟΔΗΓΟΣ_ΧΡΗΣΗΣ.md" came back garbled, the file was not found and was recorded as
deleted, its content never hashed. On 2026-11-23 a gate run in such a console (a detached gate
gets one) therefore wrote a checkpoint that a commit from a UTF-8 console could never match:
"COMMIT BLOCKED: the code changed after it was validated", with nothing changed.

Each check runs the guard in a console of its own, which starts in the OEM code page the way a
plain terminal does (737 on a Greek system, 437 on many others). With the console the tests run
in, which may already be UTF-8, the name would be read right whether or not the guard asks for
UTF-8. On Linux there is no such console and the checks pass either way.
"""

import json
import shutil
import subprocess
from pathlib import Path

import pytest

PWSH = shutil.which("pwsh") or ""
GIT = shutil.which("git") or ""
needs_pwsh_and_git = pytest.mark.skipif(not (PWSH and GIT), reason="pwsh and git are required")

REPO_ROOT = Path(__file__).resolve().parents[3]
GUARD = REPO_ROOT / "scripts" / "ENFORCE_COMMIT_READY_GUARD.ps1"
GREEK = "docs/user/ΟΔΗΓΟΣ_ΧΡΗΣΗΣ.md"
_OWN_CONSOLE = getattr(subprocess, "CREATE_NO_WINDOW", 0)


def _git(cwd: Path, *args: str) -> None:
    subprocess.run(
        [GIT, "-c", "user.name=Test", "-c", "user.email=test@example.com", "-c", "commit.gpgsign=false", *args],
        cwd=cwd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=True,
    )


def _write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(text.encode("utf-8"))


def _repo(tmp_path: Path) -> Path:
    """A repository whose Greek-named guide is changed and not yet committed."""
    repo = tmp_path / "repo"
    repo.mkdir()
    _git(repo, "init", "-q")
    _git(repo, "config", "core.autocrlf", "false")
    # git's default, whatever this machine's: the guard must ask for plain names itself.
    _git(repo, "config", "core.quotepath", "true")
    _write(repo / GREEK, "# Οδηγός\n")
    _write(repo / "plan.md", "# Plan\n")
    _git(repo, "add", "-A")
    _git(repo, "commit", "-q", "-m", "initial")
    _write(repo / GREEK, "# Οδηγός\n\nΝέο κείμενο.\n")
    return repo


def _guard(repo: Path, *args: str, utf8_first: bool = False) -> str:
    """Run the guard in a console of its own, from the repository; its standard output."""
    command = f"& '{GUARD}' {' '.join(args)}"
    if utf8_first:
        command = "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; " + command
    result = subprocess.run(
        [PWSH, "-NoProfile", "-NonInteractive", "-Command", command],
        cwd=repo,
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=120,
        creationflags=_OWN_CONSOLE,
    )
    return result.stdout.strip()


@needs_pwsh_and_git
def test_the_fingerprint_does_not_depend_on_the_console_code_page(tmp_path):
    repo = _repo(tmp_path)

    assert _guard(repo, "-PrintFingerprint") == _guard(repo, "-PrintFingerprint", utf8_first=True)


@needs_pwsh_and_git
def test_a_greek_named_file_is_fingerprinted_by_its_content(tmp_path):
    repo = _repo(tmp_path)
    before = _guard(repo, "-PrintFingerprint")

    _write(repo / GREEK, "# Οδηγός\n\nΆλλο κείμενο.\n")  # the same files changed, other content

    assert _guard(repo, "-PrintFingerprint") != before, "an edit after validation must void the checkpoint"


@needs_pwsh_and_git
def test_the_checkpoint_names_a_greek_file_readably(tmp_path):
    repo = _repo(tmp_path)

    _guard(repo, "-Mode", "quick")

    checkpoint = json.loads((repo / ".commit-ready-validated").read_text(encoding="utf-8-sig"))
    assert GREEK in checkpoint["files"], checkpoint["files"]
