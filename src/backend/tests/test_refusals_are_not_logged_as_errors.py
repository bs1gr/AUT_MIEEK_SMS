"""A refusal the code decided itself is not written to the log as an error.

Once the server's log worked again (#387) two things filled it: every refused login was
written with a full traceback, and `backend.db.utils.transaction` wrote every 409 and every
retried unique-key conflict at ERROR, the conflict with its SQL statement and parameters.
Real errors keep their ERROR line and their traceback.
"""

import logging

import pytest
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError, OperationalError

from backend import models
from backend.config import settings
from backend.db.utils import transaction
from backend.security.password_hash import get_password_hash

DB_UTILS = "backend.db.utils"
AUTH = "backend.routers.routers_auth"


class FakeSession:
    """`transaction` only commits or rolls back; this records which."""

    def __init__(self):
        self.calls = []

    def commit(self):
        self.calls.append("commit")

    def rollback(self):
        self.calls.append("rollback")


def _records(caplog, logger_name: str, at_least: int = logging.DEBUG):
    return [r for r in caplog.records if r.name == logger_name and r.levelno >= at_least]


# --- transaction() ----------------------------------------------------------------------


def test_a_transaction_that_succeeds_commits_and_logs_nothing(caplog):
    session = FakeSession()

    with caplog.at_level(logging.DEBUG, logger=DB_UTILS):
        with transaction(session):
            pass

    assert session.calls == ["commit"]
    assert _records(caplog, DB_UTILS) == []


@pytest.mark.parametrize("status_code", [400, 403, 404, 409, 422])
def test_a_refused_request_rolls_back_without_an_error_line(caplog, status_code):
    session = FakeSession()

    with caplog.at_level(logging.DEBUG, logger=DB_UTILS):
        with pytest.raises(HTTPException) as raised:
            with transaction(session):
                raise HTTPException(status_code=status_code, detail={"message": "refused"})

    assert raised.value.status_code == status_code
    assert session.calls == ["rollback"]
    assert _records(caplog, DB_UTILS, at_least=logging.INFO) == []


def test_a_server_error_raised_inside_a_transaction_is_still_an_error(caplog):
    session = FakeSession()

    with caplog.at_level(logging.DEBUG, logger=DB_UTILS):
        with pytest.raises(HTTPException):
            with transaction(session):
                raise HTTPException(status_code=500, detail="it broke")

    assert session.calls == ["rollback"]
    assert [r.levelno for r in _records(caplog, DB_UTILS)] == [logging.ERROR]


def test_a_broken_unique_key_is_one_short_line_without_statement_or_values(db, caplog):
    db.add(models.User(email="first@example.com", hashed_password="x", role="teacher"))
    db.commit()

    with caplog.at_level(logging.DEBUG, logger=DB_UTILS):
        with pytest.raises(IntegrityError):
            with transaction(db):
                db.add(models.User(email="first@example.com", hashed_password="secret-hash", role="teacher"))

    records = _records(caplog, DB_UTILS)
    assert [r.levelno for r in records] == [logging.INFO]
    line = records[0].getMessage()
    assert line == "Transaction rolled back: integrity conflict (UNIQUE constraint failed: users.email)"
    assert "first@example.com" not in line and "secret-hash" not in line


def test_a_postgres_constraint_line_leaves_the_row_values_out(caplog):
    session = FakeSession()
    postgres_says = Exception(
        'duplicate key value violates unique constraint "uq_attendance_live_slot"\n'
        "DETAIL:  Key (student_id, course_id, date, period_number)=(12, 3, 2026-11-15, 1) already exists."
    )

    with caplog.at_level(logging.DEBUG, logger=DB_UTILS):
        with pytest.raises(IntegrityError):
            with transaction(session):
                raise IntegrityError(
                    "INSERT INTO attendances (student_id, course_id, date) VALUES (%(student_id)s, ...)",
                    {"student_id": 12, "course_id": 3},
                    postgres_says,
                )

    assert session.calls == ["rollback"]
    records = _records(caplog, DB_UTILS)
    assert [r.levelno for r in records] == [logging.INFO]
    assert records[0].getMessage() == (
        "Transaction rolled back: integrity conflict "
        '(duplicate key value violates unique constraint "uq_attendance_live_slot")'
    )


def test_any_other_database_error_is_still_an_error(caplog):
    session = FakeSession()

    with caplog.at_level(logging.DEBUG, logger=DB_UTILS):
        with pytest.raises(OperationalError):
            with transaction(session):
                raise OperationalError("SELECT 1", {}, Exception("server closed the connection"))

    assert session.calls == ["rollback"]
    records = _records(caplog, DB_UTILS)
    assert [r.levelno for r in records] == [logging.ERROR]
    assert "server closed the connection" in records[0].getMessage()


def test_any_other_exception_is_still_an_error(caplog):
    session = FakeSession()

    with caplog.at_level(logging.DEBUG, logger=DB_UTILS):
        with pytest.raises(RuntimeError):
            with transaction(session):
                raise RuntimeError("a bug")

    assert session.calls == ["rollback"]
    records = _records(caplog, DB_UTILS)
    assert [r.levelno for r in records] == [logging.ERROR]
    assert "a bug" in records[0].getMessage()


# --- login ------------------------------------------------------------------------------


def _account(db, email: str, password: str = "Passw0rd!", **fields) -> None:
    db.add(models.User(email=email, hashed_password=get_password_hash(password), role="teacher", **fields))
    db.commit()


def _login(client, email: str, password: str):
    return client.post("/api/v1/auth/login", json={"email": email, "password": password})


def _tracebacks(caplog):
    return [r for r in caplog.records if r.exc_info]


def test_a_wrong_password_is_one_line_without_a_traceback(client, db, caplog):
    _account(db, "wrong@example.com")

    with caplog.at_level(logging.DEBUG):
        response = _login(client, "wrong@example.com", "not-the-password")

    assert response.status_code == 400
    assert _tracebacks(caplog) == []
    assert _records(caplog, AUTH, at_least=logging.WARNING) == []
    assert "Invalid login attempt" in [r.getMessage() for r in _records(caplog, AUTH)]


def test_an_inactive_account_is_one_line_without_a_traceback(client, db, caplog):
    _account(db, "inactive@example.com", is_active=False)

    with caplog.at_level(logging.DEBUG):
        response = _login(client, "inactive@example.com", "Passw0rd!")

    assert response.status_code == 403
    assert _tracebacks(caplog) == []
    assert _records(caplog, AUTH, at_least=logging.WARNING) == []
    assert "Login refused: account inactive" in [r.getMessage() for r in _records(caplog, AUTH)]


def test_a_locked_out_login_says_so_in_one_warning_without_a_traceback(client, db, caplog, monkeypatch):
    monkeypatch.setattr(settings, "AUTH_ENABLED", True, raising=False)
    monkeypatch.setattr(settings, "AUTH_MODE", "strict", raising=False)
    monkeypatch.setattr(settings, "AUTH_LOGIN_MAX_ATTEMPTS", 2, raising=False)
    monkeypatch.setattr(settings, "AUTH_LOGIN_LOCKOUT_SECONDS", 300, raising=False)
    monkeypatch.setattr(settings, "AUTH_LOGIN_TRACKING_WINDOW_SECONDS", 300, raising=False)
    _account(db, "locked@example.com")

    with caplog.at_level(logging.DEBUG):
        assert _login(client, "locked@example.com", "wrong-1").status_code == 400
        # The second failure starts the lockout.
        assert _login(client, "locked@example.com", "wrong-2").status_code == 429
        caplog.clear()
        # From here on the attempt is refused before the password is looked at, even the
        # right one. This refusal had no line of its own: only the traceback recorded it.
        response = _login(client, "locked@example.com", "Passw0rd!")

    assert response.status_code == 429
    assert _tracebacks(caplog) == []
    warnings = [r.getMessage() for r in _records(caplog, AUTH, at_least=logging.WARNING)]
    assert len(warnings) == 1
    assert warnings[0].startswith("Login refused: ")
    assert "too many failed attempts" in warnings[0]


def test_a_server_error_during_login_keeps_its_traceback(client, db, caplog, monkeypatch):
    _account(db, "broken@example.com")

    def broken_verify(*_args, **_kwargs):
        raise RuntimeError("hashing library fell over")

    monkeypatch.setattr("backend.routers.routers_auth.verify_password", broken_verify)

    with caplog.at_level(logging.DEBUG):
        response = _login(client, "broken@example.com", "Passw0rd!")

    assert response.status_code == 500
    messages = [r.getMessage() for r in _tracebacks(caplog) if r.name == AUTH]
    assert "Password verification error" in messages
    assert "Login failed with a server error" in messages
