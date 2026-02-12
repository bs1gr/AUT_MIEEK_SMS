#!/usr/bin/env python3
"""
Load Testing Runner Script for Student Management System

This script provides a comprehensive interface for running load tests
against the SMS application using Locust.
"""

import argparse
import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict

# Add the root directory to Python path (contains locust package)
sys.path.insert(0, str(Path(__file__).parent.parent / "root"))
# Add the locust directory to Python path for config imports
sys.path.insert(0, str(Path(__file__).parent.parent / "root" / "locust"))

from config.base_config import LoadTestConfig


class LoadTestRunner:
    """Main load testing runner class."""

    def __init__(self, args: argparse.Namespace):
        self.args = args
        self.config = self._load_config()
        # Get the load-testing directory (parent of scripts)
        load_testing_dir = Path(__file__).parent.parent
        self.results_dir = load_testing_dir / "results"
        self.results_dir.mkdir(exist_ok=True)

    def _load_config(self) -> LoadTestConfig:
        """Load environment-specific configuration."""
        env = self.args.env or "development"

        try:
            if env == "development":
                from config.environments.development import DevelopmentConfig

                return DevelopmentConfig()
            elif env == "staging":
                from config.environments.staging import StagingConfig

                return StagingConfig()
            elif env == "production":
                from config.environments.production import ProductionConfig

                return ProductionConfig()
            else:
                raise ValueError(f"Unknown environment: {env}")
        except ImportError as e:
            print(f"Error loading configuration for environment '{env}': {e}")
            sys.exit(1)

    def validate_environment(self) -> bool:
        """Validate that the target environment is accessible."""
        import requests

        print(f"🔍 Validating target environment: {self.config.HOST}")

        try:
            # Test basic connectivity
            response = requests.get(f"{self.config.HOST}/health", timeout=10)
            if response.status_code == 200:
                print("✅ Environment is accessible")
                return True
            else:
                print(f"❌ Environment returned status code: {response.status_code}")
                return False
        except requests.exceptions.RequestException as e:
            print(f"❌ Cannot connect to environment: {e}")
            return False

    def _locust_env(self) -> Dict[str, str]:
        """Build a safe environment for Locust subprocesses."""
        proc_env = os.environ.copy()
        pythonpath = proc_env.get("PYTHONPATH", "")
        if pythonpath:
            cleaned_parts = []
            for part in pythonpath.split(":"):
                normalized = part.replace("\\", "/")
                if normalized.endswith("/root/locust"):
                    continue
                cleaned_parts.append(part)
            proc_env["PYTHONPATH"] = ":".join(p for p in cleaned_parts if p)

        if self.args.ci or proc_env.get("CI_SKIP_AUTH", "").lower() == "true":
            proc_env["CI_SKIP_AUTH"] = "true"

        return proc_env

    def run_smoke_test(self) -> bool:
        """Run a quick smoke test to verify basic functionality."""
        print("🚬 Running smoke test...")

        scenario_config = self.config.get_scenario_config("smoke")
        cmd = [
            "locust",
            "-f",
            "locust/locustfile.py",
            "--host",
            self.config.HOST,
            "--users",
            str(scenario_config["users"]),
            "--spawn-rate",
            str(scenario_config["spawn_rate"]),
            "--run-time",
            scenario_config["run_time"],
            "--headless",
            "--only-summary",
            "--class",
            "SmokeUser",  # Only use SmokeUser for smoke tests
        ]

        if self.args.verbose:
            cmd.append("--loglevel")
            cmd.append("INFO")

        try:
            # Propagate environment flags to the Locust subprocess so locustfile can
            # detect CI mode and skip auth users when requested.
            proc_env = self._locust_env()

            result = subprocess.run(
                cmd, capture_output=True, text=True, timeout=300, env=proc_env
            )
            if result.returncode == 0:
                print("✅ Smoke test passed")
                return True
            else:
                print("❌ Smoke test failed")
                if self.args.verbose:
                    print("STDOUT:", result.stdout)
                    print("STDERR:", result.stderr)
                return False
        except subprocess.TimeoutExpired:
            print("❌ Smoke test timed out")
            return False

    def run_load_test(self) -> bool:
        """Run the main load test."""
        scenario = self.args.scenario or "medium"
        scenario_config = self.config.get_scenario_config(scenario)

        print(f"🚀 Starting load test: {scenario}")
        print(f"   Users: {scenario_config['users']}")
        print(f"   Spawn Rate: {scenario_config['spawn_rate']} users/sec")
        print(f"   Duration: {scenario_config['run_time']}")
        print(f"   Target: {self.config.HOST}")

        # Generate unique test run ID
        test_id = f"{scenario}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        cmd = [
            "locust",
            "-f",
            "locust/locustfile.py",
            "--host",
            self.config.HOST,
            "--users",
            str(scenario_config["users"]),
            "--spawn-rate",
            str(scenario_config["spawn_rate"]),
            "--run-time",
            scenario_config["run_time"],
            "--headless",
            "--csv",
            str(self.results_dir / f"results_{test_id}"),
            "--html",
            str(self.results_dir / f"report_{test_id}.html"),
        ]

        if self.args.verbose:
            cmd.extend(["--loglevel", "INFO"])

        try:
            print("⏳ Running load test...")
            start_time = time.time()

            # Ensure CI flags are visible to the Locust process so it excludes auth users
            proc_env = self._locust_env()

            result = subprocess.run(
                cmd,
                timeout=self.config.CI_TIMEOUT if self.config.CI_MODE else None,
                env=proc_env,
            )

            end_time = time.time()
            duration = end_time - start_time

            if result.returncode == 0:
                print(f"✅ Load test completed successfully in {duration:.1f}s")
                self._analyze_results(test_id)
                return True
            else:
                print("❌ Load test failed")
                return False

        except subprocess.TimeoutExpired:
            print("❌ Load test timed out")
            return False

    def _analyze_results(self, test_id: str):
        """Analyze and summarize test results."""
        csv_file = self.results_dir / f"results_{test_id}_stats.csv"

        if csv_file.exists():
            print("📊 Analyzing results...")
            # Basic analysis - could be enhanced with pandas
            try:
                import pandas as pd

                df = pd.read_csv(csv_file)

                # Helper to find a suitable column name from a list of candidates
                def _find_col(df, candidates):
                    for c in candidates:
                        if c in df.columns:
                            return c
                    # try case-insensitive fuzzy match
                    lowcols = [c.lower() for c in df.columns]
                    for cand in candidates:
                        cand_low = cand.lower()
                        for idx, col in enumerate(lowcols):
                            if all(tok in col for tok in cand_low.split()):
                                return df.columns[idx]
                    return None

                total_req_col = _find_col(
                    df,
                    [
                        "Total Request Count",
                        "Total Requests",
                        "Request Count",
                        "Requests",
                    ],
                )

                avg_rt_col = _find_col(
                    df, ["Average Response Time", "Avg Response Time", "Average"]
                )
                median_rt_col = _find_col(df, ["Median Response Time", "Median"])
                p95_col = _find_col(df, ["95%ile Response Time", "95%ile"])
                p99_col = _find_col(df, ["99%ile Response Time", "99%ile"])
                total_fail_col = _find_col(
                    df, ["Total Failure Count", "Total Failures", "Failures"]
                )

                total_requests = df[total_req_col].sum() if total_req_col else 0
                total_failures = df[total_fail_col].sum() if total_fail_col else 0

                summary = {
                    "total_requests": int(total_requests),
                    "avg_response_time": df[avg_rt_col].mean() if avg_rt_col else 0.0,
                    "median_response_time": df[median_rt_col].median()
                    if median_rt_col
                    else 0.0,
                    "95p_response_time": df[p95_col].max() if p95_col else 0.0,
                    "99p_response_time": df[p99_col].max() if p99_col else 0.0,
                    "error_rate": (total_failures / total_requests * 100)
                    if total_requests > 0
                    else 0.0,
                }

                print("📈 Performance Summary:")
                print(f"  Total Requests: {summary['total_requests']}")
                print(f"  Average Response Time: {summary['avg_response_time']:.2f}ms")
                print(
                    f"  Median Response Time: {summary['median_response_time']:.2f}ms"
                )
                print(f"  95th Percentile: {summary['95p_response_time']:.2f}ms")
                print(f"  99th Percentile: {summary['99p_response_time']:.2f}ms")
                print(f"  Error Rate: {summary['error_rate']:.2f}%")

                # Check against targets
                self._check_targets(summary)

            except ImportError:
                print("⚠️  Pandas not available for detailed analysis")
        else:
            print("⚠️  No results file found for analysis")

    def _check_targets(self, results: Dict[str, float]):
        """Check results against performance targets."""
        targets = self.config.TARGETS

        print("🎯 Target Analysis:")

        # Response time checks
        if results["95p_response_time"] <= targets["response_time_95p"]:
            print(
                f"  ✅ 95th percentile response time: {results['95p_response_time']:.2f}ms (target: ≤{targets['response_time_95p']}ms)"
            )
        else:
            print(
                f"  ❌ 95th percentile response time: {results['95p_response_time']:.2f}ms (target: ≤{targets['response_time_95p']}ms)"
            )

        if results["99p_response_time"] <= targets["response_time_99p"]:
            print(
                f"  ✅ 99th percentile response time: {results['99p_response_time']:.2f}ms (target: ≤{targets['response_time_99p']}ms)"
            )
        else:
            print(
                f"  ❌ 99th percentile response time: {results['99p_response_time']:.2f}ms (target: ≤{targets['response_time_99p']}ms)"
            )

        # Error rate check
        if results["error_rate"] <= targets["error_rate_max"] * 100:
            print(
                f"  ✅ Error rate: {results['error_rate']:.2f}% (target: ≤{targets['error_rate_max'] * 100:.1f}%)"
            )
        else:
            print(
                f"  ❌ Error rate: {results['error_rate']:.2f}% (target: ≤{targets['error_rate_max'] * 100:.1f}%)"
            )

    def run_interactive(self):
        """Run Locust in interactive web UI mode."""
        print("🌐 Starting Locust web interface...")
        print("   Open http://localhost:8089 to access the web UI")
        print(f"   Target: {self.config.HOST}")

        cmd = [
            "python",
            "-m",
            "locust",
            "-f",
            "locust/locustfile.py",
            "--host",
            self.config.HOST,
            "--web-host",
            "0.0.0.0",
            "--web-port",
            "8089",
        ]

        try:
            subprocess.run(cmd)
        except KeyboardInterrupt:
            print("\n🛑 Interactive mode stopped")

    def run(self) -> bool:
        """Main execution method."""
        print("🏃 SMS Load Testing Runner")
        print(f"Environment: {self.config.ENVIRONMENT}")
        print(f"Target: {self.config.HOST}")
        print("-" * 50)

        # Validate configuration
        if not self.config.validate_config():
            print("❌ Configuration validation failed")
            return False

        # Validate environment connectivity
        if not self.validate_environment():
            print("❌ Environment validation failed")
            return False

        # Run smoke test first (unless skipped)
        if not self.args.skip_smoke and not self.run_smoke_test():
            print("❌ Smoke test failed - aborting")
            return False

        # Run the main test
        if self.args.interactive:
            self.run_interactive()
            return True
        else:
            return self.run_load_test()


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="SMS Load Testing Runner",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Run smoke test
  python run_load_tests.py --env development --scenario smoke

  # Run medium load test
  python run_load_tests.py --env staging --scenario medium

  # Run interactive mode
  python run_load_tests.py --interactive

  # Skip smoke test
  python run_load_tests.py --skip-smoke --scenario heavy
        """,
    )

    parser.add_argument(
        "--env",
        "-e",
        choices=["development", "staging", "production"],
        default="development",
        help="Target environment (default: development)",
    )

    parser.add_argument(
        "--scenario",
        "-s",
        choices=["smoke", "light", "medium", "heavy", "stress"],
        default="medium",
        help="Test scenario (default: medium)",
    )

    parser.add_argument(
        "--interactive",
        "-i",
        action="store_true",
        help="Run in interactive web UI mode",
    )

    parser.add_argument(
        "--skip-smoke", action="store_true", help="Skip smoke test before main test"
    )

    parser.add_argument(
        "--verbose", "-v", action="store_true", help="Enable verbose output"
    )

    parser.add_argument(
        "--ci", action="store_true", help="Run in CI mode (non-interactive)"
    )

    args = parser.parse_args()

    # Set CI mode if detected
    if os.getenv("CI") == "true" or args.ci:
        args.ci = True

    runner = LoadTestRunner(args)

    try:
        success = runner.run()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n🛑 Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        if args.verbose:
            import traceback

            traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
