#!/usr/bin/env python3
"""Sync release facts from the repo into a checked-out GitHub wiki.

Run by .github/workflows/wiki-sync.yml after every release (and daily as a
catch-up, because release assets are uploaded after the release is created).

The wiki opts in to automation with marker pairs, which render invisibly:

    <!-- wiki-sync:version -->v1.18.46<!-- /wiki-sync:version -->

Everything between a pair is replaced; everything outside is left alone, so
hand-written prose never gets overwritten. A marker whose value is unknown
(e.g. an asset that has not been uploaded yet) keeps its current contents.

Additionally, the first table under "## Release Milestones" in
Release-History.md gets a new row for the release if it has none yet; rows
already present (including hand-edited ones) are never touched.

Stdlib only - it runs on a bare ubuntu runner.
"""

from __future__ import annotations

import argparse
import re
import sys
from datetime import date
from pathlib import Path

MARKER = re.compile(
    r"<!-- wiki-sync:(?P<key>[a-z0-9-]+) -->(?P<body>.*?)<!-- /wiki-sync:(?P=key) -->",
    re.S,
)
VERSION_RE = re.compile(r"^v?(\d+)\.(\d+)\.(\d+)$")
CHANGELOG_HEADER = re.compile(r"^## \[(?P<ver>\d+\.\d+\.\d+)\](?: - (?P<date>\d{4}-\d{2}-\d{2}))?", re.M)

# Changelog sections worth showing to wiki readers, in display order.
USER_FACING_SECTIONS = ("Features", "Security", "Bug Fixes", "Performance", "Localization", "Refactoring")
RECENT_RELEASE_COUNT = 8
MILESTONE_ITEMS = 3


def parse_changelog(text: str) -> list[dict]:
    """Return releases newest-first: {version, date, sections: {name: [items]}}."""
    headers = list(CHANGELOG_HEADER.finditer(text))
    releases = []
    for i, m in enumerate(headers):
        end = headers[i + 1].start() if i + 1 < len(headers) else len(text)
        body = text[m.end() : end]
        sections: dict[str, list[str]] = {}
        current = None
        for line in body.splitlines():
            if line.startswith("### "):
                current = line[4:].strip()
                sections.setdefault(current, [])
            elif current and line.startswith("- "):
                sections[current].append(line[2:].strip())
        releases.append({"version": m.group("ver"), "date": m.group("date"), "sections": sections})
    return releases


def _split(item: str) -> tuple[str | None, str]:
    """'**lite**: stop X - long detail' -> ('lite', 'Stop X'); detail after ' - ' is dropped."""
    item = item.split(" - ", 1)[0].strip()
    scope = None
    m = re.match(r"\*\*(?P<scope>[^*]+)\*\*:\s*(?P<rest>.*)", item)
    if m:
        scope, item = m.group("scope").replace(",", ", "), m.group("rest")
    return scope, item[:1].upper() + item[1:]


def _plain(item: str) -> str:
    """Changelog entry as a sentence with its scope as a trailing tag: 'Stop X *(lite)*'."""
    scope, text = _split(item)
    return f"{text} *({scope})*" if scope else text


def _fmt_date(iso: str | None, fmt: str) -> str:
    return date.fromisoformat(iso).strftime(fmt).lstrip("0") if iso else "unreleased"


def render_recent_releases(releases: list[dict]) -> str:
    out = []
    for rel in releases[:RECENT_RELEASE_COUNT]:
        out.append(f"### v{rel['version']} — {_fmt_date(rel['date'], '%d %B %Y')}")
        out.append("")
        items = [
            f"- **{name}** — {_plain(item)}"
            for name in USER_FACING_SECTIONS
            for item in rel["sections"].get(name, [])
        ]
        out.extend(items or ["- Maintenance release (documentation and tooling only)"])
        out.append("")
    return "\n".join(out).rstrip()


def milestone_row(rel: dict) -> str:
    items = [_split(i)[1] for name in USER_FACING_SECTIONS for i in rel["sections"].get(name, [])]
    summary = " · ".join(items[:MILESTONE_ITEMS]) or "Maintenance release"
    summary = summary.replace("|", "\\|")
    return f"| v{rel['version']} | {_fmt_date(rel['date'], '%b %Y')} | {summary} |"


def add_milestone_row(text: str, rel: dict) -> str:
    """Insert a row for rel directly under the Release Milestones table header."""
    if re.search(rf"^\|\s*\**v{re.escape(rel['version'])}\**\s*\|", text, re.M):
        return text
    heading = text.find("## Release Milestones")
    if heading == -1:
        return text
    sep = re.compile(r"^\|(?:\s*:?-+:?\s*\|)+\s*$", re.M).search(text, heading)
    if not sep:
        return text
    insert_at = sep.end() + 1
    return text[:insert_at] + milestone_row(rel) + "\n" + text[insert_at:]


def human_size(num_bytes: int) -> str:
    mib = num_bytes / (1024 * 1024)
    return f"{mib:.1f} MB" if mib < 10 else f"{mib:.0f} MB"


def build_values(version: str, releases: list[dict], installer_bytes: int | None, apk_bytes: int | None) -> dict:
    m = VERSION_RE.match(version)
    if not m:
        raise ValueError(f"version must look like v1.x.x, got {version!r}")
    major, minor, patch = (int(g) for g in m.groups())
    bare = f"{major}.{minor}.{patch}"
    rel = next((r for r in releases if r["version"] == bare), None)
    if rel is None:
        raise ValueError(f"CHANGELOG.md has no '## [{bare}]' section")
    values = {
        "version": f"v{bare}",
        "version-bare": bare,
        "release-date": _fmt_date(rel["date"], "%d %B %Y"),
        "android-version-code": str(major * 100000 + minor * 1000 + patch),
        "recent-releases": render_recent_releases([r for r in releases if r["date"]]),
    }
    if installer_bytes:
        values["installer-size"] = human_size(installer_bytes)
    if apk_bytes:
        values["apk-size"] = human_size(apk_bytes)
    return values


def apply_markers(text: str, values: dict, unknown: set) -> str:
    def repl(m: re.Match) -> str:
        key, body = m.group("key"), m.group("body")
        if key not in values:
            unknown.add(key)
            return m.group(0)
        value = values[key]
        if "\n" in body:  # block marker: keep the value on its own lines
            value = f"\n{value}\n"
        return f"<!-- wiki-sync:{key} -->{value}<!-- /wiki-sync:{key} -->"

    return MARKER.sub(repl, text)


def sync(wiki_dir: Path, values: dict, release: dict) -> list[str]:
    changed: list[str] = []
    unknown: set[str] = set()
    for page in sorted(wiki_dir.glob("*.md")):
        old = page.read_text(encoding="utf-8")
        new = apply_markers(old, values, unknown)
        if page.name == "Release-History.md":
            new = add_milestone_row(new, release)
        if new != old:
            page.write_text(new, encoding="utf-8", newline="\n")
            changed.append(page.name)
    # Keys legitimately absent until assets are uploaded are not worth a warning.
    for key in sorted(unknown - {"installer-size", "apk-size"}):
        print(f"warning: no value for marker '{key}'", file=sys.stderr)
    return changed


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--wiki-dir", required=True, type=Path)
    ap.add_argument("--version", required=True, help="release tag, e.g. v1.18.46")
    ap.add_argument("--changelog", type=Path, default=Path("CHANGELOG.md"))
    ap.add_argument("--installer-bytes", type=int, default=None)
    ap.add_argument("--apk-bytes", type=int, default=None)
    args = ap.parse_args(argv)

    releases = parse_changelog(args.changelog.read_text(encoding="utf-8"))
    values = build_values(args.version, releases, args.installer_bytes, args.apk_bytes)
    release = next(r for r in releases if r["version"] == values["version-bare"])
    changed = sync(args.wiki_dir, values, release)
    print(f"wiki-sync {values['version']}: " + (", ".join(changed) if changed else "already up to date"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
