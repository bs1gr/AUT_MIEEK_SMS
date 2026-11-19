"""Control Panel > Maintenance > Import/Export does what it offers (plan todo 62).

Found by the smoke test before v1.18.73 and by the reading of the panel's old guide; repaired
on the owner's go-ahead of 19 November 2026. As it was:

- whatever format was asked for, the file was an Excel file (the endpoint wrote the format of a
  query parameter the page never sent), and the job was stored under the other name;
- with the format in the address, CSV and PDF failed, and so did every kind but students: the
  generators were written against columns the models do not have;
- a job for "attendance" or "dashboard" stayed "processing" for ever: nothing wrote it;
- a teacher could start a job and download its file, and was refused its state;
- an import whose file had faults was "ready" all the same, a commit that failed half-way kept
  the rows before the failure, and students were matched by e-mail address alone.
"""

# The fixture strict_auth is imported from test_two_roles_model: a test that takes it as an
# argument is not redefining it.
# ruff: noqa: F811

import io

import pytest
from openpyxl import load_workbook

from backend import models
from backend.tests.test_two_roles_model import _headers, strict_auth  # noqa: F401

BASE = "/api/v1/import-export"
TODAY = "2026-11-19"


@pytest.fixture(autouse=True)
def scratch_folders(tmp_path, monkeypatch):
    """The files of the jobs go to the test's own folder, not next to the code."""
    from backend.routers import routers_import_export
    from backend.services import import_export_service

    (tmp_path / "exports").mkdir()
    (tmp_path / "imports").mkdir()
    monkeypatch.setattr(routers_import_export.async_export_service, "exports_dir", str(tmp_path / "exports"))
    monkeypatch.setattr(import_export_service, "UPLOAD_DIR", tmp_path / "imports")


@pytest.fixture
def school(client, admin_headers):
    """One course, two students (one with a Greek name), two grades of one assignment in two
    categories, and a day's attendance."""
    ids = {}
    for code, first, last in (("PNL001", "Μαρία", "Παπαδοπούλου"), ("PNL002", "John", "Smith")):
        made = client.post(
            "/api/v1/students/",
            json={"student_id": code, "first_name": first, "last_name": last, "email": f"{code.lower()}@example.com"},
            headers=admin_headers,
        )
        assert made.status_code == 201, made.text
        ids[code] = made.json()["id"]
    course = client.post(
        "/api/v1/courses/",
        json={"course_code": "PNL101", "course_name": "Αυτοματισμοί", "semester": "Fall 2026", "credits": 4},
        headers=admin_headers,
    )
    assert course.status_code == 201, course.text
    course_id = course.json()["id"]
    enrolled = client.post(
        f"/api/v1/enrollments/course/{course_id}", json={"student_ids": list(ids.values())}, headers=admin_headers
    )
    assert enrolled.status_code == 200, enrolled.text
    for category, value in (("Midterm Exam", 61.0), ("Final Exam", 82.0)):
        grade = client.post(
            "/api/v1/grades/",
            json={
                "student_id": ids["PNL001"],
                "course_id": course_id,
                "assignment_name": "Project",
                "category": category,
                "grade": value,
                "max_grade": 100.0,
                "weight": 1.0,
                "date_assigned": TODAY,
            },
            headers=admin_headers,
        )
        assert grade.status_code == 201, grade.text
    sheet = client.post(
        "/api/v1/attendance/sheet",
        json={
            "course_id": course_id,
            "date": TODAY,
            "attendance": [
                {"student_id": ids["PNL001"], "period_number": 1, "status": "Present"},
                {"student_id": ids["PNL002"], "period_number": 1, "status": "Absent"},
            ],
        },
        headers=admin_headers,
    )
    assert sheet.status_code == 200, sheet.text
    return {"course_id": course_id, **ids}


def _export(client, headers, kind: str, file_format: str) -> dict:
    """Asks for a job. The background work runs before the test client hands the answer back."""
    started = client.post(f"{BASE}/exports", json={"export_type": kind, "file_format": file_format}, headers=headers)
    assert started.status_code == 200, started.text
    body = started.json()
    assert body["success"] is True, body
    job = client.get(f"{BASE}/exports/{body['data']['id']}", headers=headers)
    assert job.status_code == 200, job.text
    return job.json()["data"]


def _table(content: bytes, file_format: str) -> list[list[str]]:
    """The rows of a downloaded file as texts (a PDF: its text is not read, only that it is one)."""
    if file_format == "xlsx":
        sheet = load_workbook(io.BytesIO(content)).active
        return [["" if cell is None else str(cell) for cell in row] for row in sheet.iter_rows(values_only=True)]
    if file_format == "csv":
        import csv

        return [row for row in csv.reader(io.StringIO(content.decode("utf-8-sig")))]
    assert content.startswith(b"%PDF"), content[:20]
    return []


EXPECTED = {
    # kind: (the header's first columns, the number of rows, a text that must be in the file)
    "students": (["Student ID", "First Name", "Last Name"], 2, "Παπαδοπούλου"),
    "courses": (["Course Code", "Course Name", "Semester"], 1, "Αυτοματισμοί"),
    "grades": (["Student ID", "Student", "Course Code", "Assignment", "Category"], 2, "Midterm Exam"),
    "attendance": (["Date", "Course Code", "Student ID", "Student", "Period", "Status"], 2, "Absent"),
}


@pytest.mark.parametrize("file_format", ["xlsx", "csv", "pdf"])
@pytest.mark.parametrize("kind", sorted(EXPECTED))
def test_every_kind_in_every_format_is_the_file_it_is_called(client, admin_headers, school, kind, file_format):
    job = _export(client, admin_headers, kind, file_format)

    headers, count, needle = EXPECTED[kind]
    assert (job["status"], job["file_format"], job["total_records"]) == ("completed", file_format, count), job
    download = client.get(f"{BASE}/exports/{job['id']}/download", headers=admin_headers)
    assert download.status_code == 200, download.text
    assert f"{kind}_export_{job['id']}.{file_format}" in download.headers["content-disposition"]
    content = download.content
    assert content[:4] == {"xlsx": b"PK\x03\x04", "pdf": b"%PDF"}.get(file_format, content[:4])
    rows = _table(content, file_format)
    if file_format != "pdf":
        assert rows[0][: len(headers)] == headers
        assert len(rows) == count + 1
        assert any(needle in cell for row in rows for cell in row), rows


def test_the_grades_file_has_both_grades_of_one_assignment(client, admin_headers, school):
    job = _export(client, admin_headers, "grades", "csv")

    rows = _table(client.get(f"{BASE}/exports/{job['id']}/download", headers=admin_headers).content, "csv")

    assert sorted((row[3], row[4], row[5]) for row in rows[1:]) == [
        ("Project", "Final Exam", "82.0"),
        ("Project", "Midterm Exam", "61.0"),
    ]


def test_the_file_is_in_the_format_of_the_request_not_of_the_address(client, admin_headers, school):
    """The page sends the format in the body. The endpoint wrote the format of a query
    parameter, "excel" when nothing was given: every file was an Excel file."""
    started = client.post(
        f"{BASE}/exports?export_format=excel",
        json={"export_type": "students", "file_format": "csv"},
        headers=admin_headers,
    )
    job_id = started.json()["data"]["id"]

    content = client.get(f"{BASE}/exports/{job_id}/download", headers=admin_headers).content

    assert not content.startswith(b"PK")
    assert content.decode("utf-8-sig").splitlines()[0].startswith("Student ID,First Name")


def test_excel_is_read_as_xlsx(client, admin_headers, school):
    """What the page's dialog used to send, and was refused (422)."""
    job = _export(client, admin_headers, "students", "excel")

    assert (job["status"], job["file_format"]) == ("completed", "xlsx")


@pytest.mark.parametrize(
    "payload", [{"export_type": "dashboard", "file_format": "xlsx"}, {"export_type": "students", "file_format": "docx"}]
)
def test_what_nothing_writes_is_refused_at_the_door(client, admin_headers, payload):
    """A job for "dashboard" was accepted, and stayed "processing" for ever."""
    assert client.post(f"{BASE}/exports", json=payload, headers=admin_headers).status_code == 422


def test_a_job_whose_file_cannot_be_written_ends_as_failed(client, admin_headers, school, monkeypatch):
    from backend.services import async_export_service

    def no_room(*args, **kwargs):
        raise OSError("no space left on device")

    monkeypatch.setattr(async_export_service, "_write_csv", no_room)

    job = _export(client, admin_headers, "students", "csv")

    assert job["status"] == "failed"
    refused = client.get(f"{BASE}/exports/{job['id']}/download", headers=admin_headers).json()
    assert refused["success"] is False


def test_the_newest_job_is_first_in_the_list(client, admin_headers, school):
    first = _export(client, admin_headers, "students", "csv")
    second = _export(client, admin_headers, "courses", "pdf")

    listed = client.get(f"{BASE}/exports", headers=admin_headers).json()["data"]["exports"]

    assert [job["id"] for job in listed[:2]] == [second["id"], first["id"]]


@pytest.mark.auth_required
def test_a_teacher_follows_the_job_it_started(client, db, strict_auth, tmp_path) -> None:
    """A teacher holds exports:generate and exports:download and not exports:view: the job was
    started, its file could be downloaded, and its state and the list answered 403."""
    teacher = _headers(db, "teacher@example.com", "teacher")
    nobody = _headers(db, "former@example.com", "none")

    job = _export(client, teacher, "students", "xlsx")

    assert job["status"] == "completed"
    assert client.get(f"{BASE}/exports", headers=teacher).status_code == 200
    assert client.get(f"{BASE}/exports/{job['id']}/download", headers=teacher).status_code == 200
    # An account without a role: none of it.
    assert (
        client.post(
            f"{BASE}/exports", json={"export_type": "students", "file_format": "csv"}, headers=nobody
        ).status_code
        == 403
    )
    assert client.get(f"{BASE}/exports/{job['id']}", headers=nobody).status_code == 403
    assert client.get(f"{BASE}/exports", headers=nobody).status_code == 403
    assert client.get(f"{BASE}/exports/{job['id']}/download", headers=nobody).status_code == 403


# --- imports --------------------------------------------------------------------------------------


def _upload(client, headers, kind: str, text: str, name: str = "file.csv") -> dict:
    """Uploads a file. The check runs before the test client hands the answer back."""
    files = {"file": (name, text.encode("utf-8"), "text/csv")}
    started = client.post(f"{BASE}/imports/{kind}", files=files, headers=headers)
    assert started.status_code == 200, started.text
    job = client.get(f"{BASE}/imports/{started.json()['data']['id']}", headers=headers)
    assert job.status_code == 200, job.text
    return job.json()["data"]


def _commit(client, headers, job_id: int) -> tuple[dict, dict]:
    answer = client.post(f"{BASE}/imports/{job_id}/commit", headers=headers).json()
    return answer, client.get(f"{BASE}/imports/{job_id}", headers=headers).json()["data"]


def _students(db) -> dict[str, tuple[str, str, str]]:
    db.expire_all()
    rows = db.query(models.Student).filter(models.Student.deleted_at.is_(None)).all()
    return {str(row.student_id): (str(row.first_name), str(row.last_name), str(row.email)) for row in rows}


STUDENTS = "student_id,first_name,last_name,email\nIMP001,Ελένη,Γεωργίου,imp001@example.com\nIMP002,Nikos,Ioannou,imp002@example.com\n"


def test_a_file_with_faults_is_not_ready_and_cannot_be_committed(client, admin_headers, db):
    text = STUDENTS + "IMP003,Third,Student,\nIMP002,Again,Ioannou,not-an-address\n"

    job = _upload(client, admin_headers, "students", text)

    # It used to be "ready": the check stopped nothing.
    assert (job["status"], job["total_rows"], job["successful_rows"], job["failed_rows"]) == ("invalid", 4, 2, 2)
    assert job["validation_errors"] == {
        "4": ["Missing email"],
        "5": ["Invalid email format", "The same student_id as row 3"],
    }
    answer, after = _commit(client, admin_headers, job["id"])
    assert answer["success"] is False and "must be 'ready'" in str(answer)
    assert after["status"] == "invalid"
    assert _students(db) == {}


def test_a_file_without_a_column_it_needs_says_which(client, admin_headers):
    job = _upload(client, admin_headers, "students", "first_name,last_name,email\nA,B,a@example.com\n")

    assert job["status"] == "invalid"
    assert job["validation_errors"] == {"global": "Missing required columns: student_id"}


def test_a_checked_file_is_stored_when_it_is_committed_and_not_before(client, admin_headers, db):
    job = _upload(client, admin_headers, "students", STUDENTS)

    assert (job["status"], job["successful_rows"], job["failed_rows"]) == ("ready", 2, 0)
    assert _students(db) == {}  # checked, nothing stored

    answer, after = _commit(client, admin_headers, job["id"])

    assert answer["success"] is True
    assert after["status"] == "completed"
    assert _students(db) == {
        "IMP001": ("Ελένη", "Γεωργίου", "imp001@example.com"),
        "IMP002": ("Nikos", "Ioannou", "imp002@example.com"),
    }


def test_a_student_who_is_there_is_updated_not_made_again(client, admin_headers, db):
    """With the rule of Utils > Imports: the same student ID, or the same e-mail address. It
    used to look at the e-mail address alone, also among deleted students, and to change nothing."""
    first = _upload(client, admin_headers, "students", STUDENTS)
    _commit(client, admin_headers, first["id"])

    changed = "student_id,first_name,last_name,email\nIMP001,Ελένη,Γεωργίου-Νικολάου,new-address@example.com\n"
    second = _upload(client, admin_headers, "students", changed)
    _commit(client, admin_headers, second["id"])

    assert _students(db) == {
        "IMP001": ("Ελένη", "Γεωργίου-Νικολάου", "new-address@example.com"),
        "IMP002": ("Nikos", "Ioannou", "imp002@example.com"),
    }


def test_a_commit_that_fails_stores_nothing_of_the_file(tmp_path, monkeypatch):
    """A row that cannot be stored: the rows before it stayed, with the job marked "failed".

    On a database of its own: the session the other tests share is inside one transaction, and
    taking the rows back would take the job back with them.
    """
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    from backend.services.import_export_service import ImportExportService
    from backend.services.import_service import ImportService

    engine = create_engine(f"sqlite:///{(tmp_path / 'own.db').as_posix()}")
    models.Base.metadata.create_all(bind=engine)
    uploaded = tmp_path / "students.csv"
    uploaded.write_text(STUDENTS, encoding="utf-8")
    real = ImportService.create_or_update_student

    def second_row_fails(session, data):
        if data.get("student_id") == "IMP002":
            return False, "the database refused the row"
        return real(session, data)

    monkeypatch.setattr(ImportService, "create_or_update_student", staticmethod(second_row_fails))
    try:
        with sessionmaker(bind=engine)() as session:
            job = models.ImportJob(
                file_name="students.csv",
                file_type="csv",
                import_type="students",
                status="ready",
                total_rows=2,
                file_path=str(uploaded),
            )
            session.add(job)
            session.commit()
            job_id = int(job.id)

            ImportExportService().commit_import_job(session, job_id)

        with sessionmaker(bind=engine)() as session:
            after = session.get(models.ImportJob, job_id)
            assert after.status == "failed"
            assert after.validation_errors == {"commit_error": "Row 3: the database refused the row"}
            # The first row had been written when the second failed.
            assert session.query(models.Student).count() == 0
    finally:
        engine.dispose()


def test_a_file_of_courses_makes_and_updates_them(client, admin_headers, db):
    first = _upload(
        client, admin_headers, "courses", "course_code,course_name,semester,credits\nIMPC1,Ηλεκτρολογία,Fall 2026,5\n"
    )
    _commit(client, admin_headers, first["id"])
    second = _upload(client, admin_headers, "courses", "course_code,course_name,credits\nIMPC1,Ηλεκτρολογία ΙΙ,six\n")
    assert second["status"] == "invalid" and second["validation_errors"] == {"2": ["credits is not a number"]}
    third = _upload(client, admin_headers, "courses", "course_code,course_name,credits\nIMPC1,Ηλεκτρολογία ΙΙ,6\n")
    _commit(client, admin_headers, third["id"])

    db.expire_all()
    courses = [(row.course_code, row.course_name, row.semester, row.credits) for row in db.query(models.Course).all()]
    assert courses == [("IMPC1", "Ηλεκτρολογία ΙΙ", "Fall 2026", 6)]


def test_a_file_of_grades_needs_its_students_and_courses_and_knows_a_grade_by_its_category(
    client, admin_headers, school, db
):
    unknown = "student_id,course_code,assignment,category,grade\nNOBODY,PNL101,Project,Final Exam,90\nPNL001,NOCOURSE,Project,Final Exam,ninety\n"
    refused = _upload(client, admin_headers, "grades", unknown)
    assert refused["status"] == "invalid"
    assert refused["validation_errors"] == {
        "2": ["No student with this student ID"],
        "3": ["No course with this course code", "grade is not a number"],
    }

    rows = "student_id,course_code,assignment,category,grade\nPNL001,PNL101,Project,Final Exam,90\nPNL002,PNL101,Project,Final Exam,70\n"
    job = _upload(client, admin_headers, "grades", rows)
    assert job["status"] == "ready"
    _commit(client, admin_headers, job["id"])

    db.expire_all()
    stored = sorted(
        (int(grade.student_id), grade.category, grade.grade)
        for grade in db.query(models.Grade).filter(models.Grade.deleted_at.is_(None))
    )
    # The final exam of the first student is updated, the midterm of the same name is left
    # alone, and the second student gets a grade.
    assert stored == sorted(
        [
            (school["PNL001"], "Midterm Exam", 61.0),
            (school["PNL001"], "Final Exam", 90.0),
            (school["PNL002"], "Final Exam", 70.0),
        ]
    )


def test_the_newest_import_is_first_in_the_list(client, admin_headers):
    first = _upload(client, admin_headers, "students", STUDENTS)
    second = _upload(client, admin_headers, "courses", "course_code,course_name\nLST1,One\n")

    listed = client.get(f"{BASE}/imports", headers=admin_headers).json()["data"]["jobs"]

    assert [job["id"] for job in listed[:2]] == [second["id"], first["id"]]
