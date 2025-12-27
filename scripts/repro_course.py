import uuid

from backend.app_factory import create_app
from fastapi.testclient import TestClient

app = create_app()
client = TestClient(app)
# register and login as ci-admin
client.post(
    "/api/v1/auth/register",
    json={
        "email": "ci-admin@example.com",
        "password": "P@ssword123",  # pragma: allowlist secret
        "full_name": "CI Admin",
    },
)
resp = client.post(
    "/api/v1/auth/login",
    json={
        "email": "ci-admin@example.com",
        "password": "P@ssword123",  # pragma: allowlist secret
    },
)
print("login", resp.status_code, resp.text)
token = resp.json().get("access_token")
if token:
    client.headers.update({"Authorization": f"Bearer {token}"})
# Create course

code = f"CS-{uuid.uuid4().hex[:8]}"
payload = {
    "course_code": code,
    "course_name": "Course 1",
    "semester": "Fall 2025",
    "credits": 3,
    "description": "Desc",
    "hours_per_week": 3.0,
    "absence_penalty": 0.0,
}
resp1 = client.post("/api/v1/courses/", json=payload)
print("create1", resp1.status_code, resp1.text)
course = resp1.json()
# Update
update_data = {
    "course_name": "Updated Course Name",
    "credits": 4,
    "description": "Updated description",
    "hours_per_week": 4.5,
    "absence_penalty": 5.0,
}
resp2 = client.put(f"/api/v1/courses/{course['id']}", json=update_data)
print("update", resp2.status_code, resp2.text)
# Create again
resp3 = client.post("/api/v1/courses/", json=payload)
print("create2", resp3.status_code, resp3.text)
