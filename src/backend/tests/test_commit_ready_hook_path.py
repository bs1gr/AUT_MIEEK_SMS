"""COMMIT_READY.ps1 finds the pre-commit hook through git, so it also works in a git worktree.

Its hook-install step used to build "$PROJECT_ROOT\\.git\\hooks\\pre-commit". In a linked worktree
.git is a file, so the script stopped with "Could not find a part of the path" before it ran a
single check, and a worktree could not be used to work on a migration while the native dev server
(which applies every migration it sees to the shared database) runs from the main checkout.

Get-PreCommitHookPath is taken from COMMIT_READY.ps1 itself and run under pwsh.
"""

import itertools
import json
import os
import shutil
import subprocess
from pathlib import Path

import pytest

PWSH = shutil.which("pwsh")
GIT = shutil.which("git")
pytestmark = pytest.mark.skipif(PWSH is None or GIT is None, reason="pwsh and git are required")

COMMIT_READY = Path(__file__).resolve().parents[3] / "infra" / "scripts" / "ops" / "COMMIT_READY.ps1"

HARNESS = r"""
param([string]$Script, [string]$Root, [string]$ResultFile)
$ErrorActionPreference = 'Stop'

$tokens = $null; $parseErrors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($Script, [ref]$tokens, [ref]$parseErrors)
$def = $ast.Find({ param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -eq 'Get-PreCommitHookPath' }, $true)
if (-not $def) { throw 'Get-PreCommitHookPath was not found in COMMIT_READY.ps1' }
. ([scriptblock]::Create($def.Extent.Text))

$path = Get-PreCommitHookPath -ProjectRoot $Root
[pscustomobject]@{ path = $path } | ConvertTo-Json | Set-Content -Path $ResultFile -Encoding utf8
"""

_counter = itertools.count()


def _git(cwd: Path, *args: str) -> None:
    subprocess.run(
        [GIT, "-c", "user.name=Test", "-c", "user.email=test@example.com", "-c", "commit.gpgsign=false", *args],
        cwd=cwd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=True,
    )


def _init_repo(path: Path) -> Path:
    path.mkdir(parents=True)
    _git(path, "init", "-q")
    (path / "file.txt").write_text("x", encoding="utf-8")
    _git(path, "add", "-A")
    _git(path, "commit", "-q", "-m", "initial")
    return path


def _hook_path(tmp_path: Path, root: Path):
    harness = tmp_path / "harness.ps1"
    harness.write_text(HARNESS, encoding="utf-8")
    result_file = tmp_path / f"result{next(_counter)}.json"
    subprocess.run(
        [
            PWSH,
            "-NoProfile",
            "-NonInteractive",
            "-File",
            str(harness),
            "-Script",
            str(COMMIT_READY),
            "-Root",
            str(root),
            "-ResultFile",
            str(result_file),
        ],
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
        timeout=120,
    )
    return json.loads(result_file.read_text(encoding="utf-8-sig"))["path"]


def _same(left, right) -> bool:
    return os.path.normcase(os.path.realpath(str(left))) == os.path.normcase(os.path.realpath(str(right)))


def test_a_normal_checkout_uses_its_own_hooks_directory(tmp_path):
    repo = _init_repo(tmp_path / "repo")

    assert _same(_hook_path(tmp_path, repo), repo / ".git" / "hooks" / "pre-commit")


def test_a_linked_worktree_uses_the_hooks_it_shares_with_the_main_checkout(tmp_path):
    repo = _init_repo(tmp_path / "repo")
    worktree = tmp_path / "worktree"
    _git(repo, "worktree", "add", "-q", str(worktree), "-b", "feature")
    assert (worktree / ".git").is_file(), "in a worktree .git is a file: why the old path could not work"

    hook = _hook_path(tmp_path, worktree)

    assert _same(hook, repo / ".git" / "hooks" / "pre-commit")
    assert not _same(hook, worktree / ".git" / "hooks" / "pre-commit")


def test_a_configured_hooks_path_is_honoured_and_created(tmp_path):
    repo = _init_repo(tmp_path / "repo")
    _git(repo, "config", "core.hooksPath", "custom-hooks")

    hook = _hook_path(tmp_path, repo)

    assert _same(hook, repo / "custom-hooks" / "pre-commit")
    assert (repo / "custom-hooks").is_dir()


def test_outside_a_repository_nothing_is_returned_and_nothing_throws(tmp_path):
    plain = tmp_path / "plain"
    plain.mkdir()

    assert _hook_path(tmp_path, plain) is None
