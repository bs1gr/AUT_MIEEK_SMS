#!/usr/bin/env python3
"""
Load testing script for SMS backend.
Measures API performance under concurrent user load using simple threading.
No external concurrency library needed - portable and simple.
"""

import argparse
import json
import sys
import time
import random
import threading
from datetime import datetime
from pathlib import Path
from collections import defaultdict
import requests

class LoadTestMetrics:
    """Collect and analyze load test metrics."""

    def __init__(self):
        self.lock = threading.Lock()
        self.requests = []
        self.start_time = None
        self.end_time = None

    def record_request(self, method, endpoint, status_code, response_time_ms):
        """Record a single request."""
        with self.lock:
            self.requests.append({
                "method": method,
                "endpoint": endpoint,
                "status_code": status_code,
                "response_time_ms": response_time_ms,
                "success": 200 <= status_code < 300,
                "timestamp": time.time()
            })

    def get_endpoint_metrics(self):
        """Calculate metrics per endpoint."""
        endpoint_data = defaultdict(list)

        with self.lock:
            for req in self.requests:
                key = f"{req['method']} {req['endpoint']}"
                endpoint_data[key].append(req)

        results = {}
        for endpoint, requests_list in endpoint_data.items():
            times = [r['response_time_ms'] for r in requests_list]
            times.sort()

            failures = sum(1 for r in requests_list if not r['success'])
            successes = len(requests_list) - failures

            results[endpoint] = {
                "num_requests": len(requests_list),
                "num_failures": failures,
                "min_response_time_ms": round(min(times), 2) if times else 0,
                "avg_response_time_ms": round(sum(times) / len(times), 2) if times else 0,
                "max_response_time_ms": round(max(times), 2) if times else 0,
                "median_response_time_ms": round(times[len(times)//2], 2) if times else 0,
                "p75_response_time_ms": round(times[int(len(times)*0.75)], 2) if times else 0,
                "p90_response_time_ms": round(times[int(len(times)*0.90)], 2) if times else 0,
                "p95_response_time_ms": round(times[int(len(times)*0.95)], 2) if times else 0,
                "p99_response_time_ms": round(times[int(len(times)*0.99)], 2) if times else 0,
                "requests_per_second": round(len(requests_list) / max(self.duration, 1), 2),
                "failure_rate_percent": round((failures / len(requests_list) * 100) if requests_list else 0, 2),
                "success_rate_percent": round((successes / len(requests_list) * 100) if requests_list else 0, 2)
            }

        return results

    def get_summary(self):
        """Get overall test summary."""
        with self.lock:
            total_requests = len(self.requests)
            total_failures = sum(1 for r in self.requests if not r['success'])

        return {
            "total_requests": total_requests,
            "total_failures": total_failures,
            "success_rate_percent": round(((total_requests - total_failures) / total_requests * 100) if total_requests > 0 else 0, 2),
            "failure_rate_percent": round((total_failures / total_requests * 100) if total_requests > 0 else 0, 2),
            "duration_seconds": round(self.duration, 2)
        }

    @property
    def duration(self):
        """Get test duration."""
        if self.start_time and self.end_time:
            return self.end_time - self.start_time
        return 0


class LoadTestUser(threading.Thread):
    """Simulates a single user making requests."""

    def __init__(self, user_id, host, metrics, duration, user_type="teacher"):
        super().__init__(daemon=True)
        self.user_id = user_id
        self.host = host
        self.metrics = metrics
        self.duration = duration
        self.user_type = user_type
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": f"LoadTest-{user_type}-{user_id}"})

    def run(self):
        """Run the user's load test."""
        start = time.time()

        # Try to login
        try:
            resp = self.session.post(
                urljoin(self.host, "/api/v1/auth/login"),
                json={"email": "test@example.com", "password": "test"},
                timeout=5
            )
            if resp.status_code == 200:
                data = resp.json()
                token = data.get('access_token', '')
                if token:
                    self.session.headers.update({"Authorization": f"Bearer {token}"})
        except Exception:
            pass  # Auth may be disabled

        # Make requests until duration elapsed
        while time.time() - start < self.duration:
            try:
                # Select endpoint based on user type
                endpoint, method = self._select_endpoint()

                # Make request
                request_start = time.time()
                try:
                    if method == "GET":
                        resp = self.session.get(urljoin(self.host, endpoint), timeout=10)
                    else:
                        resp = self.session.post(urljoin(self.host, endpoint), json={}, timeout=10)

                    response_time_ms = (time.time() - request_start) * 1000
                    self.metrics.record_request(method, endpoint, resp.status_code, response_time_ms)
                except requests.Timeout:
                    response_time_ms = (time.time() - request_start) * 1000
                    self.metrics.record_request(method, endpoint, 504, response_time_ms)
                except Exception as e:
                    response_time_ms = (time.time() - request_start) * 1000
                    self.metrics.record_request(method, endpoint, 500, response_time_ms)

                # Think time
                time.sleep(random.uniform(0.5, 2))
            except Exception:
                time.sleep(0.1)

    def _select_endpoint(self):
        """Select endpoint based on user type."""
        # Weighted random selection of endpoints
        if self.user_type == "teacher":
            choices = [
                ("GET", "/api/v1/students"),
                ("GET", "/api/v1/students"),
                ("GET", "/api/v1/students/search?q=test"),
                ("GET", "/api/v1/grades"),
                ("POST", "/api/v1/grades"),
                ("GET", "/api/v1/analytics/dashboard"),
                ("GET", "/api/v1/reports/grades"),
                ("GET", "/health"),
            ]
        elif self.user_type == "admin":
            choices = [
                ("GET", "/api/v1/analytics/dashboard"),
                ("GET", "/api/v1/users"),
                ("GET", "/api/v1/courses"),
                ("GET", "/health"),
                ("GET", "/api/v1/audit"),
            ]
        else:  # student
            choices = [
                ("GET", "/api/v1/students/me/grades"),
                ("GET", "/api/v1/students/me/schedule"),
                ("GET", "/api/v1/notifications"),
                ("GET", "/api/v1/announcements"),
                ("GET", "/api/v1/students/me/assignments"),
                ("GET", "/health"),
            ]

        return random.choice(choices)


def run_load_test(host: str, users: int = 50, spawn_rate: float = 10, duration: int = 60, output: str | None = None):
    """
    Run load test against the SMS backend.

    Args:
        host: Base URL of the backend (e.g., http://localhost:8000)
        users: Number of concurrent users to simulate
        spawn_rate: Users spawned per second (approximate)
        duration: Test duration in seconds
        output: Path to save results JSON
    """
    print(f"📊 Starting load test...")
    print(f"   Host: {host}")
    print(f"   Users: {users}")
    print(f"   Spawn rate: {spawn_rate} users/second")
    print(f"   Duration: {duration} seconds")
    print()

    metrics = LoadTestMetrics()
    metrics.start_time = time.time()

    # Spawn users gradually
    user_threads = []
    spawn_interval = 1.0 / spawn_rate if spawn_rate > 0 else 0.1

    try:
        for i in range(users):
            # Select user type based on weight
            rand = random.random()
            if rand < 0.6:
                user_type = "teacher"
            elif rand < 0.8:
                user_type = "admin"
            else:
                user_type = "student"

            user = LoadTestUser(i, host, metrics, duration, user_type)
            user.start()
            user_threads.append(user)

            # Spawn rate control
            if i < users - 1:
                time.sleep(spawn_interval)

        # Wait for all users to complete
        for user in user_threads:
            user.join()

        metrics.end_time = time.time()

        # Collect and display results
        print("\n📊 Load Test Results:")
        print("=" * 80)

        results = metrics.get_endpoint_metrics()
        for endpoint in sorted(results.keys()):
            result = results[endpoint]
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

        summary = metrics.get_summary()
        print(f"\n📊 Overall Statistics:")
        print(f"   Total Requests: {summary['total_requests']}")
        print(f"   Total Failures: {summary['total_failures']}")
        print(f"   Success Rate: {summary['success_rate_percent']:.1f}%")
        print(f"   Failure Rate: {summary['failure_rate_percent']:.1f}%")

        # Save results
        if output:
            Path(output).parent.mkdir(parents=True, exist_ok=True)
            output_data = {
                "timestamp": datetime.utcnow().isoformat(),
                "host": host,
                "config": {
                    "users": users,
                    "spawn_rate": spawn_rate,
                    "duration": duration
                },
                "results": results,
                "summary": summary
            }
            with open(output, 'w') as f:
                json.dump(output_data, f, indent=2)
            print(f"\n✅ Results saved to {output}")

        # Determine pass/fail
        failure_rate = summary['failure_rate_percent']
        if failure_rate > 2.0:
            print(f"\n❌ Test failed: Failure rate {failure_rate:.1f}% exceeds 2% threshold")
            return False

        print(f"\n✅ Load test passed!")
        return True

    except KeyboardInterrupt:
        print("\n⚠️  Load test interrupted by user")
        return False
    except Exception as e:
        print(f"\n❌ Load test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False


def urljoin(base, path):
    """Simple URL join."""
    base = base.rstrip('/')
    path = path.lstrip('/')
    return f"{base}/{path}"


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
