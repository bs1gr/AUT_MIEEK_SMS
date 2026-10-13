"""New-release announcement shown to every signed-in user (owner, 2026-10-13)."""

from __future__ import annotations

import pytest

from backend.routers.control import maintenance
from backend.services import release_announcement as ra


@pytest.fixture(autouse=True)
def _fresh_cache():
    ra.reset_cache()
    yield
    ra.reset_cache()


def _github(monkeypatch, releases):
    """Answer each GitHub call with the next item of `releases` and count the calls."""
    calls = []

    def fake_fetch(channel="stable"):
        calls.append(channel)
        return releases[min(len(calls), len(releases)) - 1]

    monkeypatch.setattr(maintenance, "_fetch_github_release", fake_fetch)
    monkeypatch.setattr(maintenance, "_get_version", lambda: "1.18.57")
    return calls


def _release(tag):
    return {"tag_name": tag, "name": f"SMS {tag}", "html_url": f"https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/{tag}"}


def test_newer_stable_release_is_announced(monkeypatch):
    _github(monkeypatch, [_release("v1.18.58")])
    assert ra.get_release_announcement(now=0) == {
        "current_version": "1.18.57",
        "latest_version": "1.18.58",
        "update_available": True,
        "release_name": "SMS v1.18.58",
        "release_url": "https://github.com/bs1gr/AUT_MIEEK_SMS/releases/tag/v1.18.58",
    }


def test_installed_release_is_not_announced(monkeypatch):
    _github(monkeypatch, [_release("v1.18.57")])
    assert ra.get_release_announcement(now=0)["update_available"] is False


def test_github_is_asked_once_per_interval_for_everyone(monkeypatch):
    calls = _github(monkeypatch, [_release("v1.18.57"), _release("v1.18.58")])
    ra.get_release_announcement(now=0)
    ra.get_release_announcement(now=ra.CHECK_INTERVAL_SECONDS - 1)
    assert calls == ["stable"]
    assert ra.get_release_announcement(now=ra.CHECK_INTERVAL_SECONDS)["latest_version"] == "1.18.58"
    assert len(calls) == 2


def test_unreachable_github_is_retried_sooner_and_announces_nothing(monkeypatch):
    calls = _github(monkeypatch, [None, _release("v1.18.58")])
    assert ra.get_release_announcement(now=0)["update_available"] is False
    ra.get_release_announcement(now=ra.RETRY_AFTER_FAILURE_SECONDS - 1)
    assert len(calls) == 1
    assert ra.get_release_announcement(now=ra.RETRY_AFTER_FAILURE_SECONDS)["update_available"] is True


def test_endpoint_is_open_to_any_signed_in_user(client, monkeypatch):
    _github(monkeypatch, [_release("v1.18.58")])
    r = client.get("/api/v1/notifications/release-announcement")
    assert r.status_code == 200, r.text
    assert r.json()["latest_version"] == "1.18.58"
