"""Tests for infra/scripts/release/sync_wiki.py (the post-release wiki updater)."""

import importlib.util
from pathlib import Path

import pytest

_SCRIPT = Path(__file__).resolve().parents[3] / "infra" / "scripts" / "release" / "sync_wiki.py"
_spec = importlib.util.spec_from_file_location("sync_wiki", _SCRIPT)
assert _spec is not None and _spec.loader is not None
sync_wiki = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(sync_wiki)

CHANGELOG = """# Changelog

## [Unreleased]

## [1.18.47] - 2026-10-01

### Features
- **system**: add a thing

### Bug Fixes
- **lite**: fix a | pipe - with a long explanation after the dash

### Documentation
- **plan**: not shown to wiki readers

## [1.18.46] - 2026-09-22

### Documentation
- docs only
"""

RELEASE_HISTORY = """# Release History

<!-- wiki-sync:recent-releases -->
old
<!-- /wiki-sync:recent-releases -->

## Release Milestones

| Version | Date | Key Milestone |
|---|---|---|
| v1.18.46 | Sep 2026 | Hand-written summary |
"""


def _wiki(tmp_path: Path) -> Path:
    tmp_path.mkdir()
    (tmp_path / "Home.md").write_text(
        "**Version**: <!-- wiki-sync:version -->v1.0.0<!-- /wiki-sync:version --> · "
        "installer <!-- wiki-sync:installer-size -->? MB<!-- /wiki-sync:installer-size -->\n",
        encoding="utf-8",
    )
    (tmp_path / "Release-History.md").write_text(RELEASE_HISTORY, encoding="utf-8")
    return tmp_path


def _run(tmp_path: Path, version: str, **extra) -> Path:
    wiki = _wiki(tmp_path / "wiki") if not (tmp_path / "wiki").exists() else tmp_path / "wiki"
    changelog = tmp_path / "CHANGELOG.md"
    changelog.write_text(CHANGELOG, encoding="utf-8")
    args = ["--wiki-dir", str(wiki), "--version", version, "--changelog", str(changelog)]
    for key, value in extra.items():
        args += [f"--{key.replace('_', '-')}", str(value)]
    assert sync_wiki.main(args) == 0
    return wiki


def test_parse_changelog_skips_unreleased_and_groups_sections():
    releases = sync_wiki.parse_changelog(CHANGELOG)
    assert [r["version"] for r in releases] == ["1.18.47", "1.18.46"]
    assert releases[0]["sections"]["Features"] == ["**system**: add a thing"]


def test_inline_markers_replaced_and_unknown_sizes_left_alone(tmp_path):
    wiki = _run(tmp_path, "v1.18.47")
    home = (wiki / "Home.md").read_text(encoding="utf-8")
    assert "<!-- wiki-sync:version -->v1.18.47<!-- /wiki-sync:version -->" in home
    assert "? MB" in home  # no installer size known yet -> untouched


def test_asset_size_is_filled_when_known(tmp_path):
    wiki = _run(tmp_path, "v1.18.47", installer_bytes=79896328)
    assert "installer-size -->76 MB<!--" in (wiki / "Home.md").read_text(encoding="utf-8")


def test_recent_releases_block_and_new_milestone_row(tmp_path):
    wiki = _run(tmp_path, "v1.18.47")
    text = (wiki / "Release-History.md").read_text(encoding="utf-8")
    assert "### v1.18.47 — 1 October 2026" in text
    assert "- **Features** — Add a thing *(system)*" in text
    assert "not shown to wiki readers" not in text
    assert "- Maintenance release (documentation and tooling only)" in text  # 1.18.46
    # New row goes directly under the header; the pipe is escaped; the text after " - " is dropped.
    assert "|---|---|---|\n| v1.18.47 | Oct 2026 | Add a thing · Fix a \\| pipe |\n" in text
    assert "| v1.18.46 | Sep 2026 | Hand-written summary |" in text


def test_sync_is_idempotent(tmp_path):
    wiki = _run(tmp_path, "v1.18.47")
    first = {p.name: p.read_text(encoding="utf-8") for p in wiki.glob("*.md")}
    _run(tmp_path, "v1.18.47")
    assert first == {p.name: p.read_text(encoding="utf-8") for p in wiki.glob("*.md")}


def test_rejects_version_missing_from_changelog(tmp_path):
    with pytest.raises(ValueError, match="no '## \\[1.18.99\\]'"):
        _run(tmp_path, "v1.18.99")
