"""Auto-import courses on first startup if database is empty."""

import logging
import sys
import time

import httpx

logger = logging.getLogger(__name__)


def wait_for_server(
    url: str = "http://localhost:8000/health", timeout: int = 60, interval: int = 2
):
    """Wait for the backend server to be ready."""
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            response = httpx.get(url, timeout=5.0)
            if response.status_code == 200:
                return True
        except httpx.RequestError:
            pass
        time.sleep(interval)
    return False


def check_and_import_courses(api_url: str = "http://localhost:8000/api/v1"):
    """Check if courses exist, and import if database is empty."""
    try:
        # Check if courses exist
        response = httpx.get(f"{api_url}/courses/", timeout=10.0)
        if response.status_code == 200:
            courses = response.json()
            if len(courses) == 0:
                print("No courses found in database - importing from templates...")
                # Import courses
                import_response = httpx.post(
                    f"{api_url}/imports/courses?source=template",
                    headers={"Content-Type": "application/json"},
                    timeout=60.0,
                )
                if import_response.status_code == 200:
                    data = import_response.json()
                    print(
                        f"✓ Auto-import completed: {data.get('created', 0)} created, {data.get('updated', 0)} updated"
                    )
                    return True
                else:
                    print(
                        f"⚠ Auto-import failed with status {import_response.status_code}"
                    )
                    return False
            else:
                print(
                    f"Courses already exist in database ({len(courses)} courses) - skipping auto-import"
                )
                return True
    except Exception as e:
        print(f"⚠ Auto-import check failed: {e}")
        return False


if __name__ == "__main__":
    print("Waiting for backend server to be ready...")
    if wait_for_server():
        print("Backend server is ready - checking courses...")
        check_and_import_courses()
    else:
        print("⚠ Backend server did not become ready in time")
        sys.exit(1)
