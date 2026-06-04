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

class SMSUser(HttpUser):
    """Simulates a normal SMS user performing common operations."""

    wait_time = between(1, 3)

    def on_start(self):
        """Initialize user session."""
        # Try to login (optional, as auth may be disabled in CI)
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
            print(f"Login warning: {e}")

    @task(10)
    def health_check(self):
        """Frequent health check (baseline metric)."""
        self.client.get("/health")

    @task(5)
    def list_students(self):
        """List students endpoint."""
        self.client.get("/api/v1/students?skip=0&limit=10")

    @task(3)
    def list_courses(self):
        """List courses endpoint."""
        self.client.get("/api/v1/courses?skip=0&limit=10")

    @task(2)
    def analytics_dashboard(self):
        """Dashboard analytics endpoint."""
        self.client.get("/api/v1/analytics/dashboard")

    @task(1)
    def search_endpoint(self):
        """Search functionality."""
        self.client.get("/api/v1/students/search?q=test&limit=10")


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
        print("=" * 70)

        for endpoint, entry in stats.entries.items():
            if entry.num_requests == 0:
                continue

            metrics_data["results"][endpoint] = {
                "num_requests": entry.num_requests,
                "num_failures": entry.num_failures,
                "avg_response_time": entry.avg_response_time,
                "min_response_time": entry.min_response_time,
                "max_response_time": entry.max_response_time,
                "p50": entry.get_response_time_percentile(0.5),
                "p95": entry.get_response_time_percentile(0.95),
                "p99": entry.get_response_time_percentile(0.99),
                "requests_per_second": entry.total_rps,
                "failure_rate": (entry.num_failures / entry.num_requests * 100) if entry.num_requests > 0 else 0
            }

            result = metrics_data["results"][endpoint]
            print(f"\n{endpoint}")
            print(f"  Requests: {result['num_requests']} ({result['requests_per_second']:.2f} req/s)")
            print(f"  Failures: {result['num_failures']} ({result['failure_rate']:.1f}%)")
            print(f"  Response times (ms):")
            print(f"    Min: {result['min_response_time']:.0f}")
            print(f"    Avg: {result['avg_response_time']:.0f}")
            print(f"    Max: {result['max_response_time']:.0f}")
            print(f"    P50: {result['p50']:.0f}")
            print(f"    P95: {result['p95']:.0f}")
            print(f"    P99: {result['p99']:.0f}")

        print("\n" + "=" * 70)

        # Determine pass/fail
        total_requests = sum(e.num_requests for e in stats.entries.values())
        total_failures = sum(e.num_failures for e in stats.entries.values())
        failure_rate = (total_failures / total_requests * 100) if total_requests > 0 else 0

        print(f"\n📊 Overall Statistics:")
        print(f"   Total Requests: {total_requests}")
        print(f"   Total Failures: {total_failures}")
        print(f"   Failure Rate: {failure_rate:.1f}%")

        if output:
            Path(output).parent.mkdir(parents=True, exist_ok=True)
            with open(output, 'w') as f:
                json.dump(metrics_data, f, indent=2)
            print(f"\n✅ Results saved to {output}")

        # Exit with appropriate code
        if failure_rate > 5.0:  # Fail if >5% failure rate
            print(f"\n❌ Test failed: Failure rate {failure_rate:.1f}% exceeds 5% threshold")
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
