from locust import HttpUser, task, between

class WebsiteUser(HttpUser):
    wait_time = between(1, 3)

    @task(2)
    def index(self):
        self.client.get("/api/v1/health")

    @task(4)
    def login(self):
        self.client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "securepassword123"}
        )

    @task(1)
    def list_students(self):
        # This assumes a valid token is available; for demo, we skip auth
        self.client.get("/api/v1/students?skip=0&limit=10")

    # Add more tasks as needed for your API
