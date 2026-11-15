"""COMMIT_READY.ps1 names every Markdown file its auto-fix rewrote, and no longer makes headings.

The gate runs `markdownlint --fix` over every Markdown file in the repository and then lists the
files that pass changed, so that nothing lands in a commit unannounced. It compared
`git diff HEAD --numstat` before and after: the added and deleted line counts of each file. A
rewrite of a line that the commit already changes leaves both counts as they were, so it was
never listed.

That is how three lines of the work plan became level-1 headings on 2026-11-13 without a word
from the gate. A wrapped line began with a PR number ("#378, #379: ..."); rule MD018 ("no space
after hash on atx style heading") took it for a heading written badly and its fix made it one
("# 378, #379: ..."). The lines were new in the commits being prepared.

Two changes, both checked here. Get-MarkdownState (taken from COMMIT_READY.ps1 itself and run
under pwsh in a scratch repository) now carries the contents of a changed file. And MD018 is off
in config/.markdownlint.json: "#378" at the start of a line is plain text in Markdown, and a
heading that really lacks its space shows as plain text in any preview.
"""

import itertools
import json
import shutil
import subprocess
from pathlib import Path

import pytest

PWSH = shutil.which("pwsh") or ""
GIT = shutil.which("git") or ""
needs_pwsh_and_git = pytest.mark.skipif(not (PWSH and GIT), reason="pwsh and git are required")

REPO_ROOT = Path(__file__).resolve().parents[3]
COMMIT_READY = REPO_ROOT / "infra" / "scripts" / "ops" / "COMMIT_READY.ps1"
MARKDOWNLINT_CONFIG = REPO_ROOT / "config" / ".markdownlint.json"

HARNESS = r"""
param([string]$Script, [string]$Root, [string]$ResultFile)
$ErrorActionPreference = 'Stop'

$tokens = $null; $parseErrors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($Script, [ref]$tokens, [ref]$parseErrors)
$def = $ast.Find({ param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -eq 'Get-MarkdownState' }, $true)
if (-not $def) { throw 'Get-MarkdownState was not found in COMMIT_READY.ps1' }
. ([scriptblock]::Create($def.Extent.Text))

Set-Location -LiteralPath $Root
$state = Get-MarkdownState
$entries = @($state.Keys | ForEach-Object { [pscustomobject]@{ path = [string]$_; entry = [string]$state[$_] } })
ConvertTo-Json -InputObject $entries -Depth 3 | Set-Content -LiteralPath $ResultFile -Encoding utf8
"""

_counter = itertools.count()

# On Windows the harness gets a console of its own, which starts in the OEM code page (737 on a
# Greek system, 437 on many others) the way a plain terminal does. With the console the tests
# themselves run in, which may already be UTF-8, the Greek file name would be read correctly
# whether or not the function switches to UTF-8 for git's output.
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


def _repo_with(tmp_path: Path, files: dict[str, str]) -> Path:
    repo = tmp_path / "repo"
    repo.mkdir()
    _git(repo, "init", "-q")
    _git(repo, "config", "core.autocrlf", "false")
    # git's default, whatever the machine's own setting: a name outside ASCII is printed quoted
    # and escaped ("docs/user/\316\237...") unless the caller asks otherwise.
    _git(repo, "config", "core.quotepath", "true")
    for name, text in files.items():
        _write(repo / name, text)
    _git(repo, "add", "-A")
    _git(repo, "commit", "-q", "-m", "initial")
    return repo


def _markdown_state(tmp_path: Path, repo: Path) -> dict[str, str]:
    """What the gate records about the Markdown files of `repo`, as {path: entry}."""
    harness = tmp_path / "harness.ps1"
    harness.write_text(HARNESS, encoding="utf-8")
    result_file = tmp_path / f"state{next(_counter)}.json"
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
            str(repo),
            "-ResultFile",
            str(result_file),
        ],
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=120,
        creationflags=_OWN_CONSOLE,
    )
    entries = json.loads(result_file.read_text(encoding="utf-8-sig"))
    return {item["path"]: item["entry"] for item in entries}


def _rewritten(before: dict[str, str], after: dict[str, str]) -> set[str]:
    """The gate's own comparison: the files it would list as rewritten by the fix pass."""
    changed = {path for path, entry in after.items() if before.get(path) != entry}
    return changed | {path for path in before if path not in after}


PARAGRAPH = "It ships the privacy round (todo 50, #377,\n#378, #379: off by default) and the reload (#375).\n"


@needs_pwsh_and_git
def test_a_rewrite_of_a_line_the_commit_already_changes_is_listed(tmp_path):
    repo = _repo_with(tmp_path, {"plan.md": "# Plan\n\nOlder text.\n"})
    _write(repo / "plan.md", "# Plan\n\nOlder text.\n\n" + PARAGRAPH)
    _git(repo, "add", "-A")  # the commit being prepared: this is the tree the gate is run on
    before = _markdown_state(tmp_path, repo)

    # what `markdownlint --fix` did to the second line of that paragraph (MD018)
    _write(repo / "plan.md", "# Plan\n\nOlder text.\n\n" + PARAGRAPH.replace("\n#378,", "\n# 378,"))
    after = _markdown_state(tmp_path, repo)

    assert _rewritten(before, after) == {"plan.md"}, "same line counts, other contents: it must be listed"


@needs_pwsh_and_git
def test_the_same_holds_when_the_change_is_not_staged(tmp_path):
    repo = _repo_with(tmp_path, {"plan.md": "# Plan\n\nOlder text.\n"})
    _write(repo / "plan.md", "# Plan\n\nOlder text.\n\n" + PARAGRAPH)
    before = _markdown_state(tmp_path, repo)

    _write(repo / "plan.md", "# Plan\n\nOlder text.\n\n" + PARAGRAPH.replace("\n#378,", "\n# 378,"))
    after = _markdown_state(tmp_path, repo)

    assert _rewritten(before, after) == {"plan.md"}


@needs_pwsh_and_git
def test_a_rewrite_of_a_file_the_commit_does_not_touch_is_listed(tmp_path):
    repo = _repo_with(tmp_path, {"plan.md": "# Plan\n", "guide.md": "# Guide\n\n* one\n* two\n"})
    _write(repo / "plan.md", "# Plan\n\nNew text.\n")
    before = _markdown_state(tmp_path, repo)
    assert "guide.md" not in before

    _write(repo / "guide.md", "# Guide\n\n- one\n- two\n")  # MD004: dashes for list markers
    after = _markdown_state(tmp_path, repo)

    assert _rewritten(before, after) == {"guide.md"}


@needs_pwsh_and_git
def test_a_rewrite_of_a_new_file_that_git_does_not_track_yet_is_listed(tmp_path):
    repo = _repo_with(tmp_path, {"plan.md": "# Plan\n"})
    _write(repo / "docs" / "new.md", "# New\n\n" + PARAGRAPH)
    before = _markdown_state(tmp_path, repo)
    assert "docs/new.md" in before

    _write(repo / "docs" / "new.md", "# New\n\n" + PARAGRAPH.replace("\n#378,", "\n# 378,"))
    after = _markdown_state(tmp_path, repo)

    assert _rewritten(before, after) == {"docs/new.md"}


@needs_pwsh_and_git
def test_a_file_with_a_greek_name_is_followed_like_any_other(tmp_path):
    name = "docs/user/ΟΔΗΓΟΣ_ΧΡΗΣΗΣ.md"
    repo = _repo_with(tmp_path, {name: "# Οδηγός\n\nΠαλιό κείμενο.\n"})
    _write(repo / name, "# Οδηγός\n\nΠαλιό κείμενο.\n\n" + PARAGRAPH)
    _git(repo, "add", "-A")
    before = _markdown_state(tmp_path, repo)
    assert name in before, f"the path must come back readable, not quoted or garbled: {sorted(before)}"

    _write(repo / name, "# Οδηγός\n\nΠαλιό κείμενο.\n\n" + PARAGRAPH.replace("\n#378,", "\n# 378,"))
    after = _markdown_state(tmp_path, repo)

    assert _rewritten(before, after) == {name}


@needs_pwsh_and_git
def test_a_new_file_with_a_greek_name_is_followed_too(tmp_path):
    name = "docs/user/ΝΕΟΣ_ΟΔΗΓΟΣ.md"
    repo = _repo_with(tmp_path, {"plan.md": "# Plan\n"})
    _write(repo / name, "# Νέος οδηγός\n\n" + PARAGRAPH)
    before = _markdown_state(tmp_path, repo)
    assert name in before, f"the path must come back readable, not quoted or garbled: {sorted(before)}"

    _write(repo / name, "# Νέος οδηγός\n\n" + PARAGRAPH.replace("\n#378,", "\n# 378,"))
    after = _markdown_state(tmp_path, repo)

    assert _rewritten(before, after) == {name}


@needs_pwsh_and_git
def test_two_looks_at_a_tree_nobody_touched_agree(tmp_path):
    repo = _repo_with(
        tmp_path,
        {
            "plan.md": "# Plan\n",
            "gone.md": "# Gone\n",
            "old name.md": "# Renamed\n\nSome text.\n",
            "code.py": "x = 1\n",
        },
    )
    _write(repo / "plan.md", "# Plan\n\n" + PARAGRAPH)
    (repo / "gone.md").unlink()
    _git(repo, "mv", "old name.md", "new name.md")
    _write(repo / "untracked.md", "# Untracked\n")
    _write(repo / "code.py", "x = 2\n")

    before = _markdown_state(tmp_path, repo)
    after = _markdown_state(tmp_path, repo)

    assert _rewritten(before, after) == set()
    assert set(before) == {"plan.md", "gone.md", "old name.md", "new name.md", "untracked.md"}, (
        "Markdown only; a rename is a file that went and a file that came"
    )


@needs_pwsh_and_git
def test_a_clean_tree_has_nothing_to_report(tmp_path):
    repo = _repo_with(tmp_path, {"plan.md": "# Plan\n", "docs/guide.md": "# Guide\n"})

    assert _markdown_state(tmp_path, repo) == {}


def test_the_rule_that_made_a_heading_of_a_pr_number_is_off():
    config = json.loads(MARKDOWNLINT_CONFIG.read_text(encoding="utf-8"))

    assert config.get("MD018") is False, (
        "MD018's auto-fix turns a line that starts with '#378' into the heading '# 378'; "
        "the gate applies every auto-fix to every Markdown file"
    )
