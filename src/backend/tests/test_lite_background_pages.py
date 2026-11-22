"""Plan todo 67 (the owner, 2026-11-22: "set 5 hours open"): SMS Lite and pages in the background.

Every SMS page beats every 10 s and Lite exited 90 s after the last beat. A browser can slow down
or freeze a page in the background (Edge does both), and a frozen page sends nothing, so Lite
stopped under a page that was still open (2026-11-21, 15:25:35). Each page now sends its id and
its state: in the background it counts as open for up to 5 hours; closed, it counts no longer
and Lite exits 30 s later unless another page beats. A page without an id (an older version)
keeps the 90 s rule. Logout's 30 s exit is untouched (`_shutdown_after`).
"""

import importlib
import os
import sys

import pytest

from backend import lite_db


@pytest.fixture
def lite(monkeypatch):
    monkeypatch.setattr(lite_db, "select_database", lambda *args, **kwargs: ("sqlite:///./data/from-test.db", None))
    saved = dict(os.environ)
    try:
        sys.modules.pop("backend.lite_simple_entrypoint", None)
        module = importlib.import_module("backend.lite_simple_entrypoint")
        module._pages.clear()
        module._last_api_request = 0.0
        yield module
    finally:
        os.environ.clear()
        os.environ.update(saved)
        sys.modules.pop("backend.lite_simple_entrypoint", None)


START = 1_000_000.0


def test_a_visible_page_keeps_lite_up_for_90_s_after_its_last_beat(lite):
    lite._note_heartbeat("page-a", "visible", START)
    assert lite._open_until(START) == START + 90
    lite._note_heartbeat("page-a", "visible", START + 10)
    assert lite._open_until(START + 10) == START + 100


def test_a_page_in_the_background_counts_as_open_for_5_hours(lite):
    lite._note_heartbeat("page-a", "visible", START)
    lite._note_heartbeat("page-a", "hidden", START + 20)  # the teacher switched to Explorer

    # Frozen: no beat at all. Before todo 67 Lite stopped 90 s later.
    assert lite._open_until(START + 15 * 60) == START + 20 + 5 * 60 * 60
    end = START + 20 + 5 * 60 * 60
    assert end >= lite._open_until(end)  # after the 5 hours Lite stops
    assert lite.HIDDEN_PAGE_TIMEOUT_SECS == 5 * 60 * 60


def test_a_closed_page_ends_and_lite_stops_30_s_later_unless_another_page_beats(lite):
    lite._last_api_request = START  # the page was in use a moment ago
    lite._note_heartbeat("page-a", "visible", START)

    lite._note_heartbeat("page-a", "closed", START + 2)

    assert "page-a" not in lite._pages
    assert lite._open_until(START + 2) == START + 2 + 30

    # A reload: the new page beats within those 30 s and Lite stays.
    lite._note_heartbeat("page-b", "visible", START + 5)
    assert lite._open_until(START + 5) == START + 95


def test_closing_one_of_two_pages_keeps_lite_up_for_the_other(lite):
    lite._note_heartbeat("pc", "hidden", START)
    lite._note_heartbeat("phone", "visible", START)

    lite._note_heartbeat("phone", "closed", START + 1)

    assert lite._open_until(START + 60 * 60) == START + 5 * 60 * 60


def test_a_closed_signal_for_a_page_lite_does_not_know_changes_nothing(lite):
    # The heartbeat needs no sign-in and answers the LAN: an unknown id cannot shorten anything.
    lite._last_api_request = START
    lite._note_heartbeat("someone-else", "closed", START + 1)
    assert lite._open_until(START + 1) == START + 90


def test_a_page_without_an_id_keeps_the_90_s_rule(lite):
    lite._note_heartbeat(None, None, START)
    assert lite._pages == {}
    assert lite._open_until(START) == START + 90


def test_the_endpoint_records_the_page_and_other_requests_count_as_activity(lite, monkeypatch):
    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    app = FastAPI()
    lite._add_lite_lifecycle(app)

    @app.get("/api/v1/students/")
    def _students():
        return []

    clock = {"now": START}
    monkeypatch.setattr(lite.time, "time", lambda: clock["now"])
    client = TestClient(app)

    assert client.get("/api/v1/lite/heartbeat", params={"page": "p1", "state": "hidden"}).status_code == 200
    assert lite._pages == {"p1": START + 5 * 60 * 60}
    assert lite._last_api_request == 0.0  # a heartbeat records itself, not as a request

    clock["now"] = START + 3
    client.get("/api/v1/students/")
    assert lite._last_api_request == START + 3

    # The page is closed right after a request: Lite stops 30 s later, not 90.
    clock["now"] = START + 4
    client.get("/api/v1/lite/heartbeat", params={"page": "p1", "state": "closed"})
    assert lite._open_until(START + 4) == START + 4 + 30

    # A page of an older version sends no id: every beat keeps Lite up for 90 s, as before.
    clock["now"] = START + 10
    client.get("/api/v1/lite/heartbeat")
    assert lite._open_until(START + 10) == START + 100
