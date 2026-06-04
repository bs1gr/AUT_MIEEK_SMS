#!/usr/bin/env python3
"""
Load testing script for SMS backend using Locust.
Measures API performance under concurrent user load.
"""

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path
import requests
from locust import HttpUser, task, between, events
from locust.env import Environment
from locust.stats import StatsEntry

class TeacherUser(HttpUser):
    """Simulates a teacher using the SMS system."""

    wait_time = between(1, 2)
    weight = 60  # 60% of users are teachers

    def on_start(self):
        """Initialize teacher session."""
        self._login("teacher@example.com", "Teacher123!")

    def _login(self, email, password):
        """Helper to login."""
        try:
            response = self.client.post(
                "/api/v1/auth/login",
                json={"email": email, "password": password},
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                self.client.headers.update({
                    "Authorization": f"Bearer {data.get('access_token', '')}"
                })
                return True
        except Exception as e:
            print(f"Login warning: {e}")
        return False

    @task(25)
    def list_students(self):
        """Teachers frequently view student lists."""
        self.client.get("/api/v1/students?skip=0&limit=20")

    @task(15)
    def search_students(self):
        """Teachers search for specific students."""
        self.client.get("/api/v1/students/search?q=test&limit=10")

    @task(20)
    def view_grades(self):
        """Teachers review grades."""
        self.client.get("/api/v1/grades?student_id=1&skip=0&limit=20")

    @task(15)
    def update_grades(self):
        """Teachers enter/update grades (write-intensive)."""
        self.client.post(
            "/api/v1/grades",
            json={
                "student_id": 1,
                "subject": "Math",
                "score": 85,
                "date": "2026-06-04"
            }
        )

    @task(10)
    def analytics_dashboard(self):
        """Teachers view class analytics."""
        self.client.get("/api/v1/analytics/dashboard")

    @task(5)
    def generate_report(self):
        """Teachers generate reports."""
        self.client.get("/api/v1/reports/grades?format=json")


class AdminUser(HttpUser):
    """Simulates an administrator."""

    wait_time = between(2, 4)
    weight = 20  # 20% of users are admins

    def on_start(self):
        """Initialize admin session."""
        try:
            response = self.client.post(
                "/api/v1/auth/login",
                json={
                    "email": "admin@sms-lite.app",
                    "password": "AdminPassword123!"
                }
            )
            if response.status_code == 200:
                data = response.json()
                self.client.headers.update({
                    "Authorization": f"Bearer {data.get('access_token', '')}"
                })
        except Exception as e:
            print(f"Admin login warning: {e}")

    @task(15)
    def analytics_dashboard(self):
        """Admins view system analytics."""
        self.client.get("/api/v1/analytics/dashboard")

    @task(10)
    def list_users(self):
        """Admins manage users."""
        self.client.get("/api/v1/users?skip=0&limit=20")

    @task(10)
    def list_courses(self):
        """Admins manage courses."""
        self.client.get("/api/v1/courses?skip=0&limit=20")

    @task(5)
    def system_health(self):
        """Admins check system health."""
        self.client.get("/health")

    @task(5)
    def export_data(self):
        """Admins export data."""
        self.client.get("/api/v1/reports/export?type=students&format=json")

    @task(3)
    def audit_log(self):
        """Admins review audit logs."""
        self.client.get("/api/v1/audit?skip=0&limit=50")


class StudentUser(HttpUser):
    """Simulates a student."""

    wait_time = between(2, 5)
    weight = 20  # 20% of users are students

    def on_start(self):
        """Initialize student session."""
        try:
            response = self.client.post(
                "/api/v1/auth/login",
                json={
                    "email": "student@example.com",
                    "password": "Student123!"
                }
            )
            if response.status_code == 200:
                data = response.json()
                self.client.headers.update({
                    "Authorization": f"Bearer {data.get('access_token', '')}"
                })
        except Exception as e:
            print(f"Student login warning: {e}")

    @task(30)
    def view_own_grades(self):
        """Students frequently view their grades."""
        self.client.get("/api/v1/students/me/grades")

    @task(20)
    def view_schedule(self):
        """Students view their schedule."""
        self.client.get("/api/v1/students/me/schedule")

    @task(15)
    def notifications(self):
        """Students check notifications."""
        self.client.get("/api/v1/notifications?skip=0&limit=10")

    @task(10)
    def announcements(self):
        """Students view announcements."""
        self.client.get("/api/v1/announcements?skip=0&limit=10")

    @task(10)
    def view_assignments(self):
        """Students view assignments."""
        self.client.get("/api/v1/students/me/assignments")

    @task(5)
    def health_check(self):
        """Baseline health check."""
        self.client.get("/health")


def run_load_test(host: str, users: int = 50, spawn_rate: float = 10, duration: int = 60, output: str = None):
    """
    Run load test against the SMS backend.

    Args:
        host: Base URL of the backend (e.g., http://localhost:8000)
        users: Number of concurrent users to simulate
        spawn_rate: Users spawned per second
        duration: Test duration in seconds
        output: Path to save results JSON
    """
    print(f"📊 Starting load test...")
    print(f"   Host: {host}")
    print(f"   Users: {users}")
    print(f"   Spawn rate: {spawn_rate} users/second")
    print(f"   Duration: {duration} seconds")
    print()

    # Create environment
    env = Environment(user_classes=[SMSUser], host=host)
    stats = env.stats

    # Collect metrics
    metrics_data = {
        "timestamp": datetime.utcnow().isoformat(),
        "host": host,
        "config": {
            "users": users,
            "spawn_rate": spawn_rate,
            "duration": duration
        },
        "results": {}
    }

    def on_test_stop(environment, **kwargs):
        """Called when test stops - collect results."""
        print("\n📊 Load Test Results:")
        print("=" * 80)

        # Collect detailed metrics per endpoint
        for endpoint, entry in stats.entries.items():
            if entry.num_requests == 0:
                continue

            metrics_data["results"][endpoint] = {
                "num_requests": entry.num_requests,
                "num_failures": entry.num_failures,
                "min_response_time_ms": round(entry.min_response_time, 2),
                "avg_response_time_ms": round(entry.avg_response_time, 2),
                "max_response_time_ms": round(entry.max_response_time, 2),
                "median_response_time_ms": round(entry.get_response_time_percentile(0.5), 2),
                "p75_response_time_ms": round(entry.get_response_time_percentile(0.75), 2),
                "p90_response_time_ms": round(entry.get_response_time_percentile(0.90), 2),
                "p95_response_time_ms": round(entry.get_response_time_percentile(0.95), 2),
                "p99_response_time_ms": round(entry.get_response_time_percentile(0.99), 2),
                "requests_per_second": round(entry.total_rps, 2),
                "failure_rate_percent": round((entry.num_failures / entry.num_requests * 100) if entry.num_requests > 0 else 0, 2),
                "success_rate_percent": round(((entry.num_requests - entry.num_failures) / entry.num_requests * 100) if entry.num_requests > 0 else 0, 2)
            }

            result = metrics_data["results"][endpoint]
            print(f"\n{endpoint}")
            print(f"  ✓ Requests: {result['num_requests']} ({result['requests_per_second']:.2f} req/s)")
            print(f"  ✗ Failures: {result['num_failures']} ({result['failure_rate_percent']:.1f}%)")
            print(f"  Response times (ms):")
            print(f"    Min:    {result['min_response_time_ms']:8.0f}")
            print(f"    Median: {result['median_response_time_ms']:8.0f}")
            print(f"    Avg:    {result['avg_response_time_ms']:8.0f}")
            print(f"    P95:    {result['p95_response_time_ms']:8.0f}")
            print(f"    P99:    {result['p99_response_time_ms']:8.0f}")
            print(f"    Max:    {result['max_response_time_ms']:8.0f}")

        print("\n" + "=" * 80)

        # Determine pass/fail
        total_requests = sum(e.num_requests for e in stats.entries.values())
        total_failures = sum(e.num_failures for e in stats.entries.values())
        failure_rate = (total_failures / total_requests * 100) if total_requests > 0 else 0

        # Calculate overall P95 and P99
        all_times = []
        for entry in stats.entries.values():
            for _ in range(entry.num_requests):
                # Approximate using available percentiles
                all_times.append(entry.avg_response_time)

        print(f"\n📊 Overall Statistics:")
        print(f"   Total Requests: {total_requests}")
        print(f"   Total Failures: {total_failures}")
        print(f"   Success Rate: {100 - failure_rate:.1f}%")
        print(f"   Failure Rate: {failure_rate:.1f}%")

        metrics_data["summary"] = {
            "total_requests": total_requests,
            "total_failures": total_failures,
            "success_rate_percent": round(100 - failure_rate, 2),
            "failure_rate_percent": round(failure_rate, 2),
            "duration_seconds": duration
        }

        if output:
            Path(output).parent.mkdir(parents=True, exist_ok=True)
            with open(output, 'w') as f:
                json.dump(metrics_data, f, indent=2)
            print(f"\n✅ Results saved to {output}")

        # Determine pass/fail with reasonable thresholds
        regressions = []

        # Check failure rate
        if failure_rate > 2.0:
            regressions.append(f"Failure rate {failure_rate:.1f}% exceeds 2% threshold")

        # Check P95 for any endpoint
        for endpoint, result in metrics_data["results"].items():
            if result.get("p95_response_time_ms", 0) > 2000:  # >2s is slow
                regressions.append(f"{endpoint} P95 {result['p95_response_time_ms']:.0f}ms exceeds 2000ms")

        if regressions:
            print(f"\n⚠️  Performance issues detected:")
            for issue in regressions[:5]:  # Show first 5
                print(f"   - {issue}")
            if len(regressions) > 5:
                print(f"   ... and {len(regressions) - 5} more")

        # Overall result
        if failure_rate > 2.0:
            print(f"\n❌ Test failed: Failure rate {failure_rate:.1f}% exceeds threshold")
            return False

        print(f"\n✅ Load test passed!")
        return True

    env.events.test_stop.add_listener(on_test_stop)

    # Run the test
    try:
        runner = env.create_local_runner()
        runner.spawn_locusts(user_count=users, spawn_rate=spawn_rate, wait=False)
        runner.start_hatching(wait=False)

        # Wait for specified duration
        import time
        time.sleep(duration)

        # Stop the runner
        runner.stop()
        runner.quit()

        print("\n✅ Load test completed successfully")
        return True

    except KeyboardInterrupt:
        print("\n⚠️  Load test interrupted by user")
        return False
    except Exception as e:
        print(f"\n❌ Load test failed with error: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Load test the SMS backend")
    parser.add_argument("--host", default="http://localhost:8000", help="Backend host URL")
    parser.add_argument("--users", type=int, default=50, help="Number of concurrent users")
    parser.add_argument("--spawn-rate", type=float, default=10, help="Users spawned per second")
    parser.add_argument("--duration", type=int, default=60, help="Test duration in seconds")
    parser.add_argument("--output", help="Output JSON file for results")

    args = parser.parse_args()

    success = run_load_test(
        host=args.host,
        users=args.users,
        spawn_rate=args.spawn_rate,
        duration=args.duration,
        output=args.output
    )

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
