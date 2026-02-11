"""
Export GitHub issues, PRs, comments, and discussions into feedback import JSON.

Usage examples:
  python scripts/utils/github_feedback_exporter.py --repo bs1gr/AUT_MIEEK_SMS --types issues,issue_comments,prs
  python scripts/utils/github_feedback_exporter.py --repo bs1gr/AUT_MIEEK_SMS --types discussions --output feedback.json

Auth:
  - Uses GITHUB_TOKEN env var if present (recommended for higher rate limits).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

DEFAULT_TYPES = "issues,issue_comments,prs,review_comments,discussions,discussion_comments"


def _request_json(url: str, token: str | None, accept: str = "application/vnd.github+json") -> tuple[list[dict], str | None]:
    headers = {"Accept": accept, "User-Agent": "sms-feedback-exporter"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = Request(url, headers=headers)
    try:
        with urlopen(req, timeout=30) as response:
            data = json.loads(response.read().decode("utf-8"))
            link = response.headers.get("Link")
            return data if isinstance(data, list) else [data], link
    except HTTPError as exc:
        if exc.code == 404:
            return [], None
        raise


def _paginate(url: str, token: str | None) -> Iterable[dict]:
    next_url = url
    while next_url:
        data, link_header = _request_json(next_url, token)
        for item in data:
            yield item
        next_url = _parse_next_link(link_header)


def _parse_next_link(link_header: str | None) -> str | None:
    if not link_header:
        return None
    parts = [part.strip() for part in link_header.split(",")]
    for part in parts:
        if "rel=\"next\"" in part:
            url_part = part.split(";", 1)[0].strip()
            return url_part.strip("<>")
    return None


def _parse_number_from_url(url: str | None) -> str | None:
    if not url:
        return None
    trimmed = url.rstrip("/")
    number = trimmed.split("/")[-1]
    return number if number.isdigit() else None


def _base_item(kind: str, title: str, payload: dict, repo: str) -> dict:
    return {
        "kind": kind,
        "title": title,
        "body": payload.get("body"),
        "url": payload.get("html_url"),
        "author": (payload.get("user") or {}).get("login"),
        "created_at": payload.get("created_at"),
        "repository": repo,
        "source_id": str(payload.get("id")) if payload.get("id") is not None else None,
        "metadata": {"number": payload.get("number"), "state": payload.get("state")},
    }


def _issue_to_item(issue: dict, repo: str) -> dict:
    return _base_item("issue", issue.get("title") or "Issue", issue, repo)


def _pr_to_item(pr: dict, repo: str) -> dict:
    return _base_item("pr", pr.get("title") or "Pull request", pr, repo)


def _issue_comment_to_item(comment: dict, repo: str) -> dict:
    issue_num = _parse_number_from_url(comment.get("issue_url"))
    title = f"Issue Comment #{issue_num}" if issue_num else "Issue Comment"
    return {
        "kind": "issue_comment",
        "title": title,
        "body": comment.get("body"),
        "url": comment.get("html_url"),
        "author": (comment.get("user") or {}).get("login"),
        "created_at": comment.get("created_at"),
        "repository": repo,
        "source_id": str(comment.get("id")) if comment.get("id") is not None else None,
        "metadata": {"issue_url": comment.get("issue_url")},
    }


def _review_comment_to_item(comment: dict, repo: str) -> dict:
    pr_num = _parse_number_from_url(comment.get("pull_request_url"))
    title = f"PR Review Comment #{pr_num}" if pr_num else "PR Review Comment"
    return {
        "kind": "review_comment",
        "title": title,
        "body": comment.get("body"),
        "url": comment.get("html_url"),
        "author": (comment.get("user") or {}).get("login"),
        "created_at": comment.get("created_at"),
        "repository": repo,
        "source_id": str(comment.get("id")) if comment.get("id") is not None else None,
        "metadata": {"pull_request_url": comment.get("pull_request_url")},
    }


def _discussion_to_item(discussion: dict, repo: str) -> dict:
    title = discussion.get("title") or "Discussion"
    return {
        "kind": "discussion",
        "title": title,
        "body": discussion.get("body"),
        "url": discussion.get("html_url"),
        "author": (discussion.get("user") or {}).get("login"),
        "created_at": discussion.get("created_at"),
        "repository": repo,
        "source_id": str(discussion.get("id")) if discussion.get("id") is not None else None,
        "metadata": {"number": discussion.get("number"), "category": (discussion.get("category") or {}).get("name")},
    }


def _discussion_comment_to_item(comment: dict, repo: str) -> dict:
    discussion_num = _parse_number_from_url(comment.get("discussion_url"))
    title = f"Discussion Comment #{discussion_num}" if discussion_num else "Discussion Comment"
    return {
        "kind": "discussion_comment",
        "title": title,
        "body": comment.get("body"),
        "url": comment.get("html_url"),
        "author": (comment.get("user") or {}).get("login"),
        "created_at": comment.get("created_at"),
        "repository": repo,
        "source_id": str(comment.get("id")) if comment.get("id") is not None else None,
        "metadata": {"discussion_url": comment.get("discussion_url")},
    }


def _build_url(base: str, params: dict) -> str:
    return f"{base}?{urlencode(params)}"


def export_feedback(repo: str, types: set[str], token: str | None, limit: int) -> list[dict]:
    owner, name = repo.split("/", 1)
    api_base = "https://api.github.com"
    items: list[dict] = []

    if "issues" in types:
        url = _build_url(
            f"{api_base}/repos/{owner}/{name}/issues",
            {"state": "all", "per_page": limit},
        )
        for issue in _paginate(url, token):
            if "pull_request" in issue:
                continue
            items.append(_issue_to_item(issue, repo))

    if "issue_comments" in types:
        url = _build_url(
            f"{api_base}/repos/{owner}/{name}/issues/comments",
            {"per_page": limit},
        )
        for comment in _paginate(url, token):
            items.append(_issue_comment_to_item(comment, repo))

    if "prs" in types:
        url = _build_url(
            f"{api_base}/repos/{owner}/{name}/pulls",
            {"state": "all", "per_page": limit},
        )
        for pr in _paginate(url, token):
            items.append(_pr_to_item(pr, repo))

    if "review_comments" in types:
        url = _build_url(
            f"{api_base}/repos/{owner}/{name}/pulls/comments",
            {"per_page": limit},
        )
        for comment in _paginate(url, token):
            items.append(_review_comment_to_item(comment, repo))

    if "discussions" in types:
        url = _build_url(
            f"{api_base}/repos/{owner}/{name}/discussions",
            {"per_page": limit, "state": "all"},
        )
        for discussion in _paginate(url, token):
            items.append(_discussion_to_item(discussion, repo))

    if "discussion_comments" in types:
        url = _build_url(
            f"{api_base}/repos/{owner}/{name}/discussions/comments",
            {"per_page": limit},
        )
        for comment in _paginate(url, token):
            items.append(_discussion_comment_to_item(comment, repo))

    return items


def main() -> int:
    parser = argparse.ArgumentParser(description="Export GitHub items into feedback import JSON.")
    parser.add_argument("--repo", required=True, help="GitHub repository in owner/name format")
    parser.add_argument(
        "--types",
        default=DEFAULT_TYPES,
        help=f"Comma-separated types (default: {DEFAULT_TYPES})",
    )
    parser.add_argument("--limit", type=int, default=50, help="Items per type (per page) to fetch")
    parser.add_argument("--output", help="Optional output file path")
    parser.add_argument("--token", help="Optional GitHub token (otherwise uses GITHUB_TOKEN env)")

    args = parser.parse_args()
    token = args.token or os.getenv("GITHUB_TOKEN")
    types = {t.strip() for t in args.types.split(",") if t.strip()}

    try:
        items = export_feedback(args.repo, types, token, args.limit)
    except (HTTPError, URLError) as exc:
        print(f"Failed to fetch GitHub data: {exc}", file=sys.stderr)
        return 1

    payload = json.dumps(items, ensure_ascii=False, indent=2)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as handle:
            handle.write(payload)
    else:
        print(payload)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
