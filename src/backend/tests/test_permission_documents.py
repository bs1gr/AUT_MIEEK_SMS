"""The three permission documents under docs/admin say what the code does.

For most of a year they did not. PERMISSION_REFERENCE.md and RBAC_ADMIN_GUIDE.md named a
permission "notifications:broadcast" for administrators only, while the code asks for
``notifications:manage`` and gives it to teachers too; PERMISSION_MATRIX.md listed what three
roles would get before any of it was built. Nothing compared the documents with the code, so
nothing noticed. These tests do the comparing:

- a permission named in one of the documents is one the code has;
- the reference names every permission the code has, and sorts the ones no endpoint asks for,
  and the ones that are asked for without being in the database, under the right heading;
- what the reference says the roles hold is what a new database gets;
- the table of endpoints in the matrix is what the application's route table says now.

When the last one fails after a change to an endpoint, refresh the table:

    cd src/backend
    python -m backend.scripts.endpoint_requirements --write
"""

import re
from pathlib import Path

import pytest

from backend.scripts import endpoint_requirements

DOCS = Path(__file__).resolve().parents[3] / "docs" / "admin"
REFERENCE = DOCS / "PERMISSION_REFERENCE.md"
MATRIX = DOCS / "PERMISSION_MATRIX.md"
GUIDE = DOCS / "RBAC_ADMIN_GUIDE.md"

WILDCARD = "*:*"


def _keys_in(text: str) -> set[str]:
    """The permissions a text names: an area and an action, in code font."""
    return set(endpoint_requirements.KEY_IN_CODE_FONT.findall(text))


def _keys_in_first_column(section: str) -> set[str]:
    """The permissions in the first cell of each table row: the ones the row is about."""
    return {key for line in section.splitlines() if line.startswith("| `") for key in _keys_in(line.split("|")[1])}


def _section(document: str, heading: str) -> str:
    """The text under ``heading`` up to the next heading of the same or a higher level."""
    start = document.index(heading)
    level = len(heading) - len(heading.lstrip("#"))
    following = re.compile(rf"^#{{1,{level}}} ", re.MULTILINE).search(document, start + len(heading))
    return document[start : following.start() if following else len(document)]


def _row(document: str, first_cell: str) -> str:
    for line in document.splitlines():
        if line.startswith(f"| {first_cell} |"):
            return line
    raise AssertionError(f"no table row that begins with {first_cell}")


@pytest.fixture(scope="module")
def asked() -> set[str]:
    """Every permission an endpoint of the application asks for."""
    from backend.main import app

    return endpoint_requirements.permission_keys_asked(app)


@pytest.fixture()
def new_database(db):
    """A database with the roles, permissions and grants the application makes at its first start."""
    from backend.routers.routers_rbac import _seed_defaults

    _seed_defaults(db)
    return db


def _in_the_database(db) -> set[str]:
    from backend import models

    return {str(key) for (key,) in db.query(models.Permission.key)}


def _held_by(db, role_name: str) -> set[str]:
    from backend import models

    rows = (
        db.query(models.Permission.key)
        .join(models.RolePermission, models.RolePermission.permission_id == models.Permission.id)
        .join(models.Role, models.Role.id == models.RolePermission.role_id)
        .filter(models.Role.name == role_name)
    )
    return {str(key) for (key,) in rows}


@pytest.mark.parametrize("document", [REFERENCE, MATRIX, GUIDE], ids=lambda path: path.name)
def test_a_document_names_no_permission_the_code_does_not_have(document: Path, asked, new_database):
    real = asked | _in_the_database(new_database)

    invented = _keys_in(document.read_text(encoding="utf-8")) - real

    assert not invented, f"{document.name} names permissions the code does not have: {sorted(invented)}"


def test_the_reference_names_every_permission_the_code_has(asked, new_database):
    real = asked | _in_the_database(new_database)

    missing = real - _keys_in(REFERENCE.read_text(encoding="utf-8"))

    assert not missing, f"PERMISSION_REFERENCE.md says nothing about: {sorted(missing)}"


def test_the_reference_lists_the_permissions_that_open_nothing(asked, new_database):
    reference = REFERENCE.read_text(encoding="utf-8")
    open_nothing = _in_the_database(new_database) - asked - {WILDCARD}

    listed = _keys_in_first_column(_section(reference, "### In the list, opening nothing"))

    assert listed == open_nothing, (
        "the section 'In the list, opening nothing' and the code differ: "
        f"only in the document {sorted(listed - open_nothing)}, only in the code {sorted(open_nothing - listed)}"
    )


def test_the_reference_lists_the_permissions_that_are_asked_for_and_not_in_the_database(asked, new_database):
    reference = REFERENCE.read_text(encoding="utf-8")
    not_in_the_list = asked - _in_the_database(new_database)

    listed = _keys_in_first_column(_section(reference, "## Asked for by an endpoint, not in the list"))

    assert listed == not_in_the_list, (
        "the section 'Asked for by an endpoint, not in the list' and the code differ: "
        f"only in the document {sorted(listed - not_in_the_list)}, only in the code {sorted(not_in_the_list - listed)}"
    )


@pytest.mark.parametrize("role", ["teacher", "viewer"])
def test_the_reference_says_what_a_role_holds_in_a_new_database(role: str, new_database):
    reference = REFERENCE.read_text(encoding="utf-8")
    roles_table = _section(reference, "## The roles and what they hold")

    assert _keys_in(_row(roles_table, f"`{role}`")) - {WILDCARD} == _held_by(new_database, role)


def test_guest_holds_what_viewer_holds_and_the_administrator_holds_everything(new_database):
    # The reference says both in words, not in a list.
    assert _held_by(new_database, "guest") == _held_by(new_database, "viewer")
    assert WILDCARD in _held_by(new_database, "admin")
    assert _held_by(new_database, "teacher") <= _held_by(new_database, "admin")


def test_the_number_of_permissions_the_documents_give_is_the_number_in_a_new_database(new_database):
    count = len(_in_the_database(new_database))

    for document in (REFERENCE, GUIDE):
        text = document.read_text(encoding="utf-8")
        assert f"{count} permissions" in text or f"These {count} are" in text, (
            f"{document.name} does not give the number of permissions as {count}"
        )


def test_the_table_of_endpoints_in_the_matrix_is_the_applications_own():
    from backend.main import app

    written = endpoint_requirements.block_in(MATRIX.read_text(encoding="utf-8"))

    assert written == endpoint_requirements.render(app), (
        "docs/admin/PERMISSION_MATRIX.md is behind the application. Refresh it: "
        "cd src/backend; python -m backend.scripts.endpoint_requirements --write"
    )


def test_every_endpoint_whose_check_is_described_by_hand_still_exists():
    from backend.main import app

    there = {(endpoint.method, endpoint.path) for endpoint in endpoint_requirements.endpoints(app)}

    gone = set(endpoint_requirements.INSIDE) - there

    assert not gone, f"endpoint_requirements.INSIDE describes endpoints the application no longer has: {sorted(gone)}"


def test_the_table_lists_the_whole_api():
    # A guard on the reading of the route table itself: FastAPI keeps included routers nested,
    # and a walk that misses them finds seventeen routes and calls it a day.
    from backend.main import app

    listed = endpoint_requirements.endpoints(app)

    assert len(listed) > 300
    assert {"/api/v1/students/", "/api/v1/admin/users", "/control/api/status"} <= {endpoint.path for endpoint in listed}
