"""Authentication load testing scenarios."""

import random
import time
from locust import TaskSet, task


class AuthScenarios(TaskSet):
    """Authentication-related load testing scenarios."""

    @task(3)
    def login_logout_cycle(self):
        """Complete login/logout cycle with different user types."""
        users = [
            {
                "email": "admin@example.com",
                "password": "admin123",  # pragma: allowlist secret
            },
            {
                "email": "teacher@example.com",
                "password": "teacher123",  # pragma: allowlist secret
            },
            {
                "email": "student@example.com",
                "password": "student123",  # pragma: allowlist secret
            },
        ]
        user = random.choice(users)
        # Login
        response = self.client.post("/api/v1/auth/login", json=user)
        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token")  # pragma: allowlist secret
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
            "email": "student@example.com",
            "password": "student123",  # pragma: allowlist secret
        }  # pragma: allowlist secret
        # Initial login
        response = self.client.post("/api/v1/auth/login", json=user)
        if response.status_code == 200:
            data = response.json()
            data.get("access_token")  # pragma: allowlist secret
            refresh_token = data.get("refresh_token")  # pragma: allowlist secret
            if refresh_token:
                # Wait a bit to simulate token expiration
                time.sleep(random.uniform(1.0, 3.0))
                # Attempt token refresh
                refresh_data = {
                    "refresh_token": refresh_token
                }  # pragma: allowlist secret
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
                "email": "nonexistent@example.com",  # pragma: allowlist secret
                "password": "wrongpass",  # pragma: allowlist secret
            },
            {
                "email": "student@example.com",
                "password": "wrongpass",  # pragma: allowlist secret
            },  # pragma: allowlist secret
            {"email": "", "password": "admin123"},  # pragma: allowlist secret
            {"email": "admin@example.com", "password": ""},  # pragma: allowlist secret
        ]
        for attempt in random.sample(failed_attempts, k=random.randint(1, 3)):
            self.client.post(
                "/api/v1/auth/login", json=attempt
            )  # pragma: allowlist secret
            time.sleep(random.uniform(0.1, 0.5))  # Brief delay between attempts

    @task(1)
    def concurrent_sessions(self):
        """Test multiple concurrent login sessions."""
        user = {
            "email": "student@example.com",
            "password": "student123",  # pragma: allowlist secret
        }  # pragma: allowlist secret
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
