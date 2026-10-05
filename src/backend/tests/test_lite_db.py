"""SMS Lite never falls back to a local database when it is set up for QNAP (owner, 2026-10-05).

It used to switch to local SQLite "for this session" whenever QNAP was unreachable, so data
entered that day never reached QNAP and disappeared from view once QNAP was back.
"""

import importlib
import json
import os
import sys

import pytest

from backend import lite_db

SQLITE_URL = "sqlite:///./data/sms_lite.db"
CREDS = {"host": "172.16.0.2", "port": 55433, "dbname": "student_management", "user": "sms user", "password": "p@ss:w/rd"}


def _creds_file(tmp_path, data=CREDS):
    path = tmp_path / "qnap-credentials.json"
    path.write_text(json.dumps(data) if isinstance(data, dict) else data, encoding="utf-8")
    return path


def _never_asked(message):
    raise AssertionError(f"should not ask to retry: {message}")


def test_without_credentials_lite_is_standalone_on_sqlite():
    assert lite_db.select_database(None, SQLITE_URL, _never_asked) == (SQLITE_URL, None)


def test_reachable_qnap_is_used_with_credentials_url_encoded(tmp_path):
    url, sslmode = lite_db.select_database(_creds_file(tmp_path), SQLITE_URL, _never_asked, probe_fn=lambda creds: None)
    assert url == "postgresql+psycopg://sms+user:p%40ss%3Aw%2Frd@172.16.0.2:55433/student_management"
    assert sslmode == "disable"


def test_unreachable_qnap_stops_lite_instead_of_falling_back(tmp_path):
    def unreachable(creds):
        raise lite_db.QnapUnavailable("QNAP PostgreSQL at 172.16.0.2:55433 is unreachable (timeout)")

    asked = []
    with pytest.raises(SystemExit):
        lite_db.select_database(_creds_file(tmp_path), SQLITE_URL, lambda m: asked.append(m) or False, probe_fn=unreachable)
    assert len(asked) == 1
    assert "172.16.0.2:55433 is unreachable" in asked[0]
    assert "Επανάληψη" in asked[0]  # the message is bilingual


def test_retry_connects_once_qnap_is_back(tmp_path):
    attempts = []

    def flaky(creds):
        attempts.append(1)
        if len(attempts) < 3:
            raise lite_db.QnapUnavailable("unreachable")

    url, _ = lite_db.select_database(_creds_file(tmp_path), SQLITE_URL, lambda m: True, probe_fn=flaky)
    assert url.startswith("postgresql+psycopg://")
    assert len(attempts) == 3


@pytest.mark.parametrize(
    ("content", "expected"),
    [("{not json", "could not be read"), (json.dumps({"host": "h", "port": 1}), "missing: dbname, user, password")],
)
def test_unusable_credentials_also_stop_lite(tmp_path, content, expected):
    asked = []
    with pytest.raises(SystemExit):
        lite_db.select_database(_creds_file(tmp_path, content), SQLITE_URL, lambda m: asked.append(m) or False, probe_fn=_never_asked)
    assert expected in asked[0]


def test_entrypoint_selects_the_database_through_lite_db(monkeypatch):
    calls = []

    def fake_select(creds_file, sqlite_url, ask_retry, probe_fn=None):
        calls.append((creds_file, sqlite_url))
        return "sqlite:///./data/from-test.db", None

    monkeypatch.setattr(lite_db, "select_database", fake_select)
    monkeypatch.delenv("DATABASE_URL", raising=False)
    saved = dict(os.environ)
    try:
        sys.modules.pop("backend.lite_simple_entrypoint", None)  # run its module code exactly once
        importlib.import_module("backend.lite_simple_entrypoint")
        assert os.environ["DATABASE_URL"] == "sqlite:///./data/from-test.db"
    finally:
        os.environ.clear()
        os.environ.update(saved)
    assert len(calls) == 1
    assert calls[0][1] == SQLITE_URL
