"""
Authentication load testing scenarios.
"""

import random
import time
from locust import TaskSet, task
import os


# Honor CI skip flag so this module doesn't run auth scenarios when AUTH is
# disabled in the target environment. This mirrors the SKIP_AUTH logic used
# in the main `locustfile.py`.
SKIP_AUTH = (
    os.getenv("AUTH_MODE", "").lower() == "disabled"
    or os.getenv("AUTH_ENABLED", "").lower() in ("false", "0")
    or os.getenv("CI_SKIP_AUTH", "").lower() == "true"
)

if SKIP_AUTH:
    # Provide a no-op TaskSet so Locust will not schedule authentication traffic
    class AuthScenarios(TaskSet):
        pass

    # Export only the inert class when SKIP_AUTH; this prevents discovery of
    # any auth-heavy users that would otherwise spawn.
    __all__ = ["AuthScenarios"]
    # Early exit: nothing more to define
    # (Locust will import this module and find the inert AuthScenarios)

else:

    class AuthScenarios(TaskSet):
        """Authentication-related load testing scenarios."""

        @task(3)
        def login_logout_cycle(self):
            """Complete login/logout cycle with different user types."""
            users = [
                {
                    "email": os.getenv("LOCUST_TEST_ADMIN_EMAIL", "admin@example.com"),
                    "password": os.getenv("LOCUST_TEST_ADMIN_PASSWORD", "admin123"),
                },
                {
                    "email": os.getenv(
                        "LOCUST_TEST_TEACHER_EMAIL", "teacher@example.com"
                    ),
                    "password": os.getenv("LOCUST_TEST_TEACHER_PASSWORD", "teacher123"),
                },
                {
                    "email": os.getenv("LOCUST_TEST_USER_EMAIL", "student@example.com"),
                    "password": os.getenv("LOCUST_TEST_USER_PASSWORD", "student123"),
                },
            ]

            user = random.choice(users)

            # Login
            response = self.client.post("/api/v1/auth/login", json=user)

            if response.status_code == 200:
                data = response.json()
                token = data.get("access_token")

                if token:
                    # Set token for authenticated requests
                    self.client.headers.update({"Authorization": f"Bearer {token}"})

                    # Simulate some activity while authenticated
                    time.sleep(random.uniform(0.5, 2.0))

                    # Get user profile
                    self.client.get("/api/v1/auth/me")

                    # Small delay before logout
                    time.sleep(random.uniform(0.2, 1.0))

                    # Logout
                    self.client.post("/api/v1/auth/logout")

                    # Clear token
                    self.client.headers.pop("Authorization", None)

        @task(1)
        def token_refresh_cycle(self):
            """Test token refresh functionality."""
            user = {
                "email": os.getenv("LOCUST_TEST_USER_EMAIL", "student@example.com"),
                "password": os.getenv("LOCUST_TEST_USER_PASSWORD", "student123"),
            }

            # Initial login
            response = self.client.post("/api/v1/auth/login", json=user)

            if response.status_code == 200:
                data = response.json()
                refresh_token = data.get("refresh_token")

                if refresh_token:
                    # Wait a bit to simulate token expiration
                    time.sleep(random.uniform(1.0, 3.0))

                    # Attempt token refresh
                    refresh_data = {"refresh_token": refresh_token}
                    refresh_response = self.client.post(
                        "/api/v1/auth/refresh", json=refresh_data
                    )

                    if refresh_response.status_code == 200:
                        new_data = refresh_response.json()
                        new_token = new_data.get("access_token")

                        if new_token:
                            # Update authorization header with new token
                            self.client.headers.update(
                                {"Authorization": f"Bearer {new_token}"}
                            )

                            # Verify new token works
                            self.client.get("/api/v1/auth/me")

                            # Clean up
                            self.client.headers.pop("Authorization", None)

        @task(1)
        def failed_login_attempts(self):
            """Test failed login scenarios."""
            failed_attempts = [
                {
                    "email": os.getenv(
                        "LOCUST_TEST_NONEXISTENT_EMAIL", "nonexistent@example.com"
                    ),
                    "password": os.getenv("LOCUST_TEST_WRONG_PASSWORD", ""),
                },
                {
                    "email": os.getenv("LOCUST_TEST_USER_EMAIL", "student@example.com"),
                    "password": os.getenv("LOCUST_TEST_WRONG_PASSWORD", ""),
                },
                {"email": "", "password": os.getenv("LOCUST_TEST_ADMIN_PASSWORD", "")},
                {
                    "email": os.getenv("LOCUST_TEST_ADMIN_EMAIL", "admin@example.com"),
                    "password": "",
                },
            ]

            for attempt in random.sample(failed_attempts, k=random.randint(1, 3)):
                self.client.post("/api/v1/auth/login", json=attempt)
                time.sleep(random.uniform(0.1, 0.5))  # Brief delay between attempts

        @task(1)
        def concurrent_sessions(self):
            """Test multiple concurrent login sessions."""
            user = {
                "email": os.getenv("LOCUST_TEST_USER_EMAIL", "student@example.com"),
                "password": os.getenv("LOCUST_TEST_USER_PASSWORD", "student123"),
            }

            # Create multiple sessions
            tokens = []
            for _ in range(random.randint(2, 5)):
                response = self.client.post("/api/v1/auth/login", json=user)
                if response.status_code == 200:
                    data = response.json()
                    token = data.get("access_token")
                    if token:
                        tokens.append(token)

            # Use different tokens for requests
            for token in tokens:
                self.client.headers.update({"Authorization": f"Bearer {token}"})
                self.client.get("/api/v1/auth/me")
                time.sleep(random.uniform(0.1, 0.3))

            # Clean up all sessions
            self.client.headers.pop("Authorization", None)
