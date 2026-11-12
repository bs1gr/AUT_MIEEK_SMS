"""GENERATE_RELEASE_DOCS.ps1 files Dependabot's "deps:" commits instead of dropping them.

v1.18.66 was made only of dependency updates. The generator did not know the "deps" commit type, so
it reported them as "unrecognized": the CHANGELOG entry and the GitHub release body left them out
and the body's "What's Included" section came out empty. These tests run the real generator, and
the helper that writes the GitHub body, against a throwaway git repository.
"""

import shutil
import subprocess
from pathlib import Path

import pytest

PWSH = shutil.which("pwsh")
GIT = shutil.which("git")
pytestmark = pytest.mark.skipif(PWSH is None or GIT is None, reason="pwsh and git are required")

REPO_ROOT = Path(__file__).resolve().parents[3]
GENERATOR = REPO_ROOT / "infra" / "scripts" / "release" / "GENERATE_RELEASE_DOCS.ps1"
HELPER = REPO_ROOT / "scripts" / "generate-release-github-description.ps1"


def _git(cwd: Path, *args: str) -> None:
    subprocess.run(
        [GIT, "-c", "user.name=Test", "-c", "user.email=test@example.com", "-c", "commit.gpgsign=false", *args],
        cwd=cwd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=True,
    )


def _make_release_repo(tmp_path: Path, subjects: list[str]) -> Path:
    """A repository tagged v1.0.0, followed by one commit per subject."""
    repo = tmp_path / "repo"
    repo.mkdir()
    _git(repo, "init", "-q")
    (repo / "VERSION").write_text("v1.0.0\n", encoding="utf-8")
    _git(repo, "add", "-A")
    _git(repo, "commit", "-q", "-m", "chore: initial")
    _git(repo, "tag", "v1.0.0")
    for index, subject in enumerate(subjects):
        (repo / f"change{index}.txt").write_text(subject, encoding="utf-8")
        _git(repo, "add", "-A")
        _git(repo, "commit", "-q", "-m", subject)
    # The generator looks for this helper relative to the directory it runs in.
    (repo / "scripts").mkdir()
    shutil.copy(HELPER, repo / "scripts" / HELPER.name)
    return repo


def _generate(repo: Path) -> subprocess.CompletedProcess:
    return subprocess.run(
        [PWSH, "-NoProfile", "-NonInteractive", "-File", str(GENERATOR), "-Version", "1.0.1"],
        cwd=repo,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=180,
    )


def _read(repo: Path, relative: str) -> str:
    return (repo / relative).read_text(encoding="utf-8")


def test_dependency_updates_are_listed_everywhere_instead_of_dropped(tmp_path):
    repo = _make_release_repo(
        tmp_path,
        [
            "feat(attendance): lesson log",
            "deps: bump foo from 1.0 to 2.0 in /src (#10)",
            "deps: bump the npm-minor-patch group across 1 directory with 92 updates (#11)",
            "docs(plan): record the release",
        ],
    )

    result = _generate(repo)

    assert result.returncode == 0, result.stdout + result.stderr
    assert "unrecognized" not in result.stdout

    notes = _read(repo, "docs/releases/RELEASE_NOTES_v1.0.1.md")
    assert "Dependencies" in notes
    assert "bump foo from 1.0 to 2.0 in /src (#10)" in notes
    assert "Other Changes" not in notes

    changelog = _read(repo, "CHANGELOG.md")
    assert "### Dependencies" in changelog
    assert "- bump foo from 1.0 to 2.0 in /src (#10)" in changelog
    assert "- bump the npm-minor-patch group across 1 directory with 92 updates (#11)" in changelog

    body = _read(repo, ".github/RELEASE_NOTES_v1.0.1.md")
    assert "**1 new feature" in body
    assert "**2 dependency updates**" in body
    assert "Maintenance release" not in body


def test_a_release_of_only_dependency_updates_does_not_publish_an_empty_section(tmp_path):
    # This is v1.18.66 exactly: nothing but Dependabot merges and a CI/docs commit.
    repo = _make_release_repo(
        tmp_path,
        [
            "deps: bump @types/node from 24.19.2 to 25.9.9 in /src/frontend (#361)",
            "ci(gitleaks): retry the download",
            "docs(plan): record the release",
        ],
    )

    assert _generate(repo).returncode == 0

    body = _read(repo, ".github/RELEASE_NOTES_v1.0.1.md")
    included = body.split("What's Included in v1.0.1", 1)[1].split("###", 1)[0]
    assert "**1 dependency update**" in included  # singular
    assert included.strip(), "the What's Included section must not be empty"
    assert "- bump @types/node from 24.19.2 to 25.9.9 in /src/frontend (#361)" in _read(repo, "CHANGELOG.md")


def test_a_release_with_nothing_user_facing_says_so(tmp_path):
    repo = _make_release_repo(tmp_path, ["docs(plan): wording", "ci: tidy a workflow"])

    assert _generate(repo).returncode == 0

    body = _read(repo, ".github/RELEASE_NOTES_v1.0.1.md")
    included = body.split("What's Included in v1.0.1", 1)[1].split("###", 1)[0]
    assert "Maintenance release" in included
