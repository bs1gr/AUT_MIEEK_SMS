"""A database outage during a write must answer 503 DATABASE_UNAVAILABLE, not 500.

The frontend keeps student, attendance and grade changes in its offline queue on that code
and sends them once the database is back (owner, 2026-10-05: Docker while QNAP is
unreachable). Most routers turn every exception into internal_server_error(), which used to
make an outage a generic 500 - and the change was lost.
"""

from datetime import date

import pytest
from sqlalchemy.exc import OperationalError

from backend.services import AttendanceService, GradeService


def _outage(*_args, **_kwargs):
    raise OperationalError("INSERT ...", {}, Exception("connection to server at 172.16.0.2 failed"))


def _bug(*_args, **_kwargs):
    raise ValueError("an application bug")


ATTENDANCE = {"student_id": 1, "course_id": 1, "date": str(date.today()), "status": "Present"}
GRADE = {"student_id": 1, "course_id": 1, "assignment_name": "Test", "category": "Exam", "grade": 15, "max_grade": 20}


@pytest.mark.parametrize(
    ("service", "method", "path", "payload"),
    [
        (AttendanceService, "create_attendance", "/api/v1/attendance/", ATTENDANCE),
        (GradeService, "create_grade", "/api/v1/grades/", GRADE),
    ],
)
def test_database_outage_during_a_write_is_503_database_unavailable(client, admin_headers, monkeypatch, service, method, path, payload):
    monkeypatch.setattr(service, method, _outage)
    response = client.post(path, json=payload, headers=admin_headers)
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "DATABASE_UNAVAILABLE"


@pytest.mark.parametrize(
    ("service", "method", "path", "payload"),
    [
        (AttendanceService, "create_attendance", "/api/v1/attendance/", ATTENDANCE),
        (GradeService, "create_grade", "/api/v1/grades/", GRADE),
    ],
)
def test_other_errors_are_still_500(client, admin_headers, monkeypatch, service, method, path, payload):
    monkeypatch.setattr(service, method, _bug)
    response = client.post(path, json=payload, headers=admin_headers)
    assert response.status_code == 500
    assert response.json()["error"]["code"] != "DATABASE_UNAVAILABLE"
