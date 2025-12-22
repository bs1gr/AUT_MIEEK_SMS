"""Integration test for final grade calculation including absence penalties."""

from __future__ import annotations

from datetime import date


def test_final_grade_with_absence_penalty(client, admin_token, bootstrap_admin):
    # Use admin token for protected endpoints
    # Create a real admin user in the test DB and get a token

    # Login as bootstrap admin
    admin_email = bootstrap_admin["email"]
    admin_password = bootstrap_admin["password"]
    login_resp = client.post(
        "/api/v1/auth/login", json={"email": admin_email, "password": admin_password}
    )
    print("BOOTSTRAP ADMIN LOGIN RESPONSE:", login_resp.status_code, login_resp.text)
    admin_token_val = login_resp.json().get("access_token")
    assert (
        admin_token_val
    ), f"Bootstrap admin login failed: {login_resp.status_code} {login_resp.text}"
    headers = {"Authorization": f"Bearer {admin_token_val}"}

    # Register a new admin via API using bootstrap admin token
    new_admin_email = "admin_grade_test@example.com"  # pragma: allowlist secret
    new_admin_password = "AdminPass123!"  # pragma: allowlist secret
    client.post(
        "/api/v1/auth/register",
        json={
            "email": new_admin_email,
            "password": new_admin_password,
            "full_name": "Admin",
            "role": "admin",
        },
        headers=headers,
    )

    # Login as the new admin
    login_resp2 = client.post(
        "/api/v1/auth/login",
        json={"email": new_admin_email, "password": new_admin_password},
    )
    admin_token_val2 = login_resp2.json()["access_token"]
    headers2 = {"Authorization": f"Bearer {admin_token_val2}"}

    # Create student as new admin
    student_id = client.post(
        "/api/v1/students/",
        json={
            "first_name": "Alice",
            "last_name": "Smith",
            "email": "alice@example.com",
            "student_id": "S1001",
        },
        headers=headers2,
    ).json()["id"]

    # Create course as new admin
    course_id = client.post(
        "/api/v1/courses/",
        json={
            "course_code": "MATH101",
            "course_name": "Math",
            "semester": "Fall 2025",
            "credits": 3,
            "evaluation_rules": [{"category": "Homework", "weight": 100}],
            "absence_penalty": 5.0,
        },
        headers=headers2,
    ).json()["id"]

    # Add one homework grade: 90/100
    grade_payload = {
        "student_id": student_id,
        "course_id": course_id,
        "assignment_name": "HW1",
        "category": "Homework",
        "grade": 90.0,
        "max_grade": 100.0,
        "component_type": "Homework",
        "weight": 1.0,  # Use default allowed weight
    }
    grade_resp = client.post(
        "/api/v1/grades/",
        json=grade_payload,
        headers=headers2,
    )
    print("GRADE CREATE RESPONSE:", grade_resp.status_code, grade_resp.text)
    assert grade_resp.status_code in (
        200,
        201,
    ), f"Grade creation failed: {grade_resp.status_code} {grade_resp.text}"

    # Add two absences
    for d in [date(2025, 9, 10), date(2025, 9, 17)]:
        client.post(
            "/api/v1/attendance/",
            json={
                "student_id": student_id,
                "course_id": course_id,
                "date": d.isoformat(),
                "status": "Absent",
                "period_number": 1,
            },
            headers=headers,
        )

    # Calculate final grade
    resp = client.get(
        f"/api/v1/analytics/student/{student_id}/course/{course_id}/final-grade",
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["final_grade"] == 80.0
    assert data["absence_penalty"] == 5.0
    assert data["unexcused_absences"] == 2
