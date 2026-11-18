"""What an account keeps when its roles are revoked under Assign Role to User.

Until 18 November 2026 revoking the only role of an account took nothing away. The row went,
the page answered "revoked", and the account went on as before: the word in its Role column
stayed (for an administrator it became "teacher"), and an account without role rows gets the
built-in permissions of that word (``backend.rbac._default_role_permissions``). A teacher
whose Teacher role was revoked still read, added and exported students, and "Initialize RBAC
Defaults" gave the role back, because it gives every account the role its Role column names.

The note the owner sent on 18 November 2026 settles what such an account is: one without a
role is denied by default. The Role column now follows the roles the account still holds, and reads "none" when the last
is gone. "none" is not a role: nothing is built in for it, so every permission check and
every role check refuses the account. It can still sign in.
"""

from fastapi.testclient import TestClient

from backend.tests.test_account_role_leftovers import (  # noqa: F401
    Headers,
    _create,
    _session,
    _sign_in,
    rbac_client,
    school,
)

STUDENT = {"first_name": "Nikos", "last_name": "Pavlou", "email": "nikos@example.com", "student_id": "S-100"}


def _revoke(client: TestClient, admin: Headers, user_id: int, role: str) -> dict:
    answer = client.post("/api/v1/admin/rbac/revoke-role", json={"user_id": user_id, "role_name": role}, headers=admin)
    assert answer.status_code == 200, answer.text
    return answer.json()


def _assign(client: TestClient, admin: Headers, user_id: int, role: str) -> None:
    answer = client.post("/api/v1/admin/rbac/assign-role", json={"user_id": user_id, "role_name": role}, headers=admin)
    assert answer.status_code == 200, answer.text


def _role_word(client: TestClient, admin: Headers, user_id: int) -> str:
    accounts = client.get("/api/v1/admin/users", headers=admin).json()
    return next(account["role"] for account in accounts if account["id"] == user_id)


def _reads_and_writes(client: TestClient, headers: Headers) -> tuple[int, int]:
    """The answers to reading the students and to adding one."""
    read = client.get("/api/v1/students/", headers=headers).status_code
    write = client.post("/api/v1/students/", json=STUDENT, headers=headers).status_code
    return read, write


def test_revoking_a_teachers_only_role_leaves_the_account_with_nothing(
    school: tuple[TestClient, Headers],  # noqa: F811
) -> None:
    client, admin = school
    teacher_id = _create(client, admin, "teacher@example.com", "teacher")
    teacher = _sign_in(client, "teacher@example.com")
    assert _reads_and_writes(client, teacher) == (200, 201)

    answer = _revoke(client, admin, teacher_id, "teacher")

    assert answer == {"status": "revoked", "role": "none"}
    assert _role_word(client, admin, teacher_id) == "none"
    # The sign-in the account already has is refused at once, for reading as for writing.
    assert _reads_and_writes(client, teacher) == (403, 403)
    # It can still sign in, and is told what it is.
    again = _sign_in(client, "teacher@example.com")
    me = client.get("/api/v1/auth/me", headers=again)
    assert me.status_code == 200, me.text
    assert me.json()["role"] == "none"
    assert _reads_and_writes(client, again) == (403, 403)


def test_initialize_defaults_does_not_give_the_role_back(school: tuple[TestClient, Headers]) -> None:  # noqa: F811
    client, admin = school
    teacher_id = _create(client, admin, "teacher@example.com", "teacher")
    teacher = _sign_in(client, "teacher@example.com")
    _revoke(client, admin, teacher_id, "teacher")

    seeded = client.post("/api/v1/admin/rbac/ensure-defaults", headers=admin)

    assert seeded.status_code == 200, seeded.text
    assert _role_word(client, admin, teacher_id) == "none"
    assert _reads_and_writes(client, teacher) == (403, 403)


def test_a_role_given_again_brings_the_access_back(school: tuple[TestClient, Headers]) -> None:  # noqa: F811
    client, admin = school
    teacher_id = _create(client, admin, "teacher@example.com", "teacher")
    teacher = _sign_in(client, "teacher@example.com")
    _revoke(client, admin, teacher_id, "teacher")

    _assign(client, admin, teacher_id, "teacher")

    assert _role_word(client, admin, teacher_id) == "teacher"
    assert _reads_and_writes(client, teacher) == (200, 201)
    # And through User Accounts > Edit as well.
    _revoke(client, admin, teacher_id, "teacher")
    _revoke(client, admin, teacher_id, "viewer")
    assert _revoke(client, admin, teacher_id, "guest")["role"] == "none"
    edited = client.patch(f"/api/v1/admin/users/{teacher_id}", json={"role": "teacher"}, headers=admin)
    assert edited.status_code == 200, edited.text
    assert client.get("/api/v1/students/", headers=teacher).status_code == 200


def test_the_role_column_steps_down_as_the_roles_go(school: tuple[TestClient, Headers]) -> None:  # noqa: F811
    client, admin = school
    account = _create(client, admin, "teacher@example.com", "teacher")
    _assign(client, admin, account, "teacher")  # brings Viewer and Guest with it
    teacher = _sign_in(client, "teacher@example.com")

    # A role below the highest one changes nothing.
    assert _revoke(client, admin, account, "guest")["role"] == "teacher"
    assert _reads_and_writes(client, teacher) == (200, 201)

    # Without Teacher the account is a Viewer: it reads and cannot change.
    assert _revoke(client, admin, account, "teacher")["role"] == "viewer"
    assert client.get("/api/v1/students/", headers=teacher).status_code == 200
    assert client.post("/api/v1/students/", json={**STUDENT, "student_id": "S-101"}, headers=teacher).status_code == 403

    assert _revoke(client, admin, account, "viewer")["role"] == "none"
    assert client.get("/api/v1/students/", headers=teacher).status_code == 403
    # Nothing left to revoke.
    assert _revoke(client, admin, account, "viewer") == {"status": "not_assigned"}


def test_an_administrator_left_without_roles_is_not_a_teacher(school: tuple[TestClient, Headers]) -> None:  # noqa: F811
    """It became "teacher" in the Role column, and with that word a teacher in all but name."""
    client, admin = school
    second = _create(client, admin, "second@example.com", "admin")
    other = _sign_in(client, "second@example.com")
    assert client.get("/api/v1/admin/users", headers=other).status_code == 200

    assert _revoke(client, admin, second, "admin")["role"] == "none"

    assert client.get("/api/v1/admin/users", headers=other).status_code == 403
    assert _reads_and_writes(client, other) == (403, 403)
    # What asks for the administrator's role, and not for a permission, refuses as well.
    assert client.get("/api/v1/semester-archive/semesters", headers=other).status_code == 403
    # The one administrator that is left keeps the role.
    last = client.post("/api/v1/admin/rbac/revoke-role", json={"user_id": 1, "role_name": "admin"}, headers=admin)
    assert last.status_code == 400, last.text


def test_a_permission_granted_to_the_account_itself_stays(school: tuple[TestClient, Headers]) -> None:  # noqa: F811
    client, admin = school
    teacher_id = _create(client, admin, "teacher@example.com", "teacher")
    teacher = _sign_in(client, "teacher@example.com")
    granted = client.post(
        "/api/v1/permissions/users/grant",
        json={"user_id": teacher_id, "permission_key": "students:view"},
        headers=admin,
    )
    assert granted.status_code == 200, granted.text

    assert _revoke(client, admin, teacher_id, "teacher")["role"] == "none"

    # A grant to the account is the administrator's own word about that account.
    assert _reads_and_writes(client, teacher) == (200, 403)


def test_a_student_account_keeps_its_word(school: tuple[TestClient, Headers]) -> None:  # noqa: F811
    """Roles given to a Student account and taken again leave it a Student, not "none"."""
    from backend import models

    client, admin = school
    pupil = _create(client, admin, "pupil@example.com", "student")
    with _session(client) as db:  # a role row beside the word "student": only the database can make this
        viewer = db.query(models.Role).filter(models.Role.name == "viewer").one()
        db.add(models.UserRole(user_id=pupil, role_id=viewer.id))
        db.commit()

    assert _revoke(client, admin, pupil, "viewer")["role"] == "student"
    assert _role_word(client, admin, pupil) == "student"
