from __future__ import annotations

from datetime import date, timedelta

import pytest
from pydantic import ValidationError

from backend.schemas.students import StudentCreate, StudentUpdate


def test_student_create_normalizes_empty_optional_fields():
    payload: dict[str, object] = {
        "first_name": "Alice",
        "last_name": "Smith",
        "email": "alice@example.com",
        "student_id": "ALC001",
        "father_name": " ",
        "mobile_phone": "+30123456789",
        "phone": "",
        "note": "",
    }
    student = StudentCreate.model_validate(payload)
    assert student.father_name is None
    assert student.phone is None
    assert student.mobile_phone == "+30123456789"


@pytest.mark.parametrize(
    "field,value",
    [
        ("student_id", "bad id"),
        ("mobile_phone", "123"),
        ("study_year", 7),
    ],
)
def test_student_create_field_validators_raise(field: str, value):
    payload: dict[str, object] = {
        "first_name": "Bob",
        "last_name": "Jones",
        "email": "bob@example.com",
        "student_id": "BOB001",
    }
    payload[field] = value
    with pytest.raises(ValidationError):
        StudentCreate.model_validate(payload)


def test_student_create_rejects_future_enrollment_date():
    payload = {
        "first_name": "Carla",
        "last_name": "Doe",
        "email": "carla@example.com",
        "student_id": "CRL001",
        "enrollment_date": date.today() + timedelta(days=1),
    }
    with pytest.raises(ValidationError):
        StudentCreate.model_validate(payload)


def test_student_update_normalizes_strings():
    update = StudentUpdate.model_validate(
        {
            "first_name": " ",
            "student_id": " STUD002 ",
            "mobile_phone": " +49123456789 ",
            "study_year": 2,
        }
    )
    assert update.first_name is None
    assert update.student_id == "STUD002"
    assert update.mobile_phone == "+49123456789"


@pytest.mark.parametrize(
    "field,value",
    [
        ("student_id", "bad id"),
        ("mobile_phone", "abc"),
        ("study_year", 0),
    ],
)
def test_student_update_validators(field: str, value):
    kwargs = {field: value}
    with pytest.raises(ValidationError):
        StudentUpdate.model_validate(kwargs)


def test_student_update_rejects_future_enrollment():
    with pytest.raises(ValidationError):
        StudentUpdate.model_validate(
            {"enrollment_date": date.today() + timedelta(days=2)}
        )
