#!/usr/bin/env python3
"""
E2E Test Metrics Collector & Analyzer
Extracts test results and stores them for trend analysis
Run: python scripts/e2e_metrics_collector.py <report_path>
"""

import json
import sys
from pathlib import Path
from datetime import datetime
from dataclasses import dataclass
from typing import Optional


@dataclass
class TestMetrics:
    """Test run metrics"""

    timestamp: str
    run_id: str
    branch: str
    commit: str
    passed: int
    failed: int
    skipped: int
    total: int
    duration_seconds: int
    critical_pass_rate: float  # percentage
    overall_pass_rate: float  # percentage
    status: str  # "passed" or "failed"

    def to_dict(self) -> dict:
        return {
            "timestamp": self.timestamp,
            "run_id": self.run_id,
            "branch": self.branch,
            "commit": self.commit,
            "passed": self.passed,
            "failed": self.failed,
            "skipped": self.skipped,
            "total": self.total,
            "duration_seconds": self.duration_seconds,
            "critical_pass_rate": self.critical_pass_rate,
            "overall_pass_rate": self.overall_pass_rate,
            "status": self.status,
        }


def parse_playwright_report(report_path: str) -> Optional[dict]:
    """Extract test metrics from Playwright report JSON"""
    try:
        with open(report_path, "r") as f:
            report = json.load(f)

        # Count test results
        passed = 0
        failed = 0
        skipped = 0

        for test in report.get("tests", []):
            results = test.get("results", [])
            if not results:
                continue

            last_result = results[-1]
            status = last_result.get("status")

            if status == "passed":
                passed += 1
            elif status == "failed":
                failed += 1
            elif status == "skipped":
                skipped += 1

        total = passed + failed + skipped

        return {
            "passed": passed,
            "failed": failed,
            "skipped": skipped,
            "total": total,
        }
    except Exception as e:
        print(f"Error parsing report: {e}", file=sys.stderr)
        return None


def calculate_pass_rates(
    passed: int, failed: int, skipped: int, total: int
) -> tuple[float, float]:
    """Calculate critical and overall pass rates"""
    if total == 0:
        return 0.0, 0.0

    # Assuming 19 tests are critical (from baseline)
    critical_count = 19
    critical_passed = min(passed, critical_count)

    critical_rate = (
        (critical_passed / critical_count * 100) if critical_count > 0 else 0.0
    )
    overall_rate = (passed / total * 100) if total > 0 else 0.0

    return critical_rate, overall_rate


def collect_metrics(
    report_path: str,
    run_id: str,
    branch: str,
    commit: str,
    duration_seconds: int,
) -> Optional[TestMetrics]:
    """Collect metrics from a test run"""
    results = parse_playwright_report(report_path)
    if not results:
        return None

    critical_rate, overall_rate = calculate_pass_rates(
        results["passed"],
        results["failed"],
        results["skipped"],
        results["total"],
    )

    status = "passed" if results["failed"] == 0 else "failed"

    return TestMetrics(
        timestamp=datetime.utcnow().isoformat() + "Z",
        run_id=run_id,
        branch=branch,
        commit=commit,
        passed=results["passed"],
        failed=results["failed"],
        skipped=results["skipped"],
        total=results["total"],
        duration_seconds=duration_seconds,
        critical_pass_rate=critical_rate,
        overall_pass_rate=overall_rate,
        status=status,
    )


def save_metrics(metrics: TestMetrics, metrics_dir: str) -> None:
    """Save metrics to JSON file"""
    metrics_path = Path(metrics_dir)
    metrics_path.mkdir(parents=True, exist_ok=True)

    # Save individual run
    run_file = metrics_path / f"run_{metrics.run_id}.json"
    with open(run_file, "w") as f:
        json.dump(metrics.to_dict(), f, indent=2)

    # Append to history
    history_file = metrics_path / "history.jsonl"
    with open(history_file, "a") as f:
        f.write(json.dumps(metrics.to_dict()) + "\n")

    print(f"✅ Metrics saved to {run_file}")
    print(f"✅ History updated: {history_file}")


def analyze_trends(metrics_dir: str, last_n: int = 5) -> None:
    """Analyze trends from last N runs"""
    history_file = Path(metrics_dir) / "history.jsonl"

    if not history_file.exists():
        print("⚠️  No history file found")
        return

    # Read last N runs
    runs = []
    with open(history_file, "r") as f:
        for line in f:
            try:
                runs.append(json.loads(line))
            except json.JSONDecodeError:
                continue

    if not runs:
        print("⚠️  No runs in history")
        return

    recent_runs = runs[-last_n:]

    print(f"\n📊 Last {len(recent_runs)} E2E Test Runs:")
    print("-" * 80)

    for run in recent_runs:
        print(
            f"  {run['timestamp'][:10]} | {run['branch']:10} | "
            f"✅ {run['passed']:2} ❌ {run['failed']:2} | "
            f"Critical: {run['critical_pass_rate']:5.1f}% Overall: {run['overall_pass_rate']:5.1f}%"
        )

    # Calculate trends
    if len(recent_runs) > 1:
        pass_rates = [r["overall_pass_rate"] for r in recent_runs]
        first = pass_rates[0]
        last = pass_rates[-1]
        trend = (
            "↑ improving"
            if last > first
            else ("↓ degrading" if last < first else "→ stable")
        )

        print("-" * 80)
        print(f"📈 Trend: {trend} (from {first:.1f}% to {last:.1f}%)")

        # Alert if critical
        if any(r["critical_pass_rate"] < 95 for r in recent_runs):
            print("⚠️  ALERT: Critical pass rate <95% in recent runs!")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Collect and analyze E2E test metrics")
    parser.add_argument(
        "--report",
        type=str,
        default="frontend/test-results/report.json",
        help="Path to Playwright test report",
    )
    parser.add_argument("--run-id", type=str, default="unknown", help="GitHub run ID")
    parser.add_argument("--branch", type=str, default="unknown", help="Git branch name")
    parser.add_argument("--commit", type=str, default="unknown", help="Git commit SHA")
    parser.add_argument(
        "--output",
        type=str,
        default="artifacts/e2e-metrics",
        help="Output directory for metrics",
    )
    parser.add_argument(
        "--duration",
        type=int,
        default=0,
        help="Test duration in seconds",
    )

    args = parser.parse_args()

    # Check if report exists
    if not Path(args.report).exists():
        print(f"⚠️  Report not found at {args.report}")
        print("Creating minimal metrics for this run...")
        # Create directory for output
        Path(args.output).mkdir(parents=True, exist_ok=True)
        metrics_file = Path(args.output) / "metrics.json"
        with open(metrics_file, "w") as f:
            json.dump(
                {
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "run_id": args.run_id,
                    "branch": args.branch,
                    "commit": args.commit,
                    "passed": 0,
                    "failed": 0,
                    "skipped": 0,
                    "total": 0,
                    "critical_pass_rate": 0.0,
                    "overall_pass_rate": 0.0,
                    "status": "unknown",
                    "error": "Report not found",
                },
                f,
                indent=2,
            )
        print(f"✅ Metrics saved to {metrics_file}")
        sys.exit(0)

    # Collect metrics
    metrics = collect_metrics(
        args.report, args.run_id, args.branch, args.commit, args.duration
    )

    if not metrics:
        print("❌ Failed to collect metrics")
        sys.exit(1)

    # Save metrics to output file
    Path(args.output).mkdir(parents=True, exist_ok=True)
    metrics_file = Path(args.output) / "metrics.json"
    with open(metrics_file, "w") as f:
        json.dump(metrics.to_dict(), f, indent=2)

    print(f"✅ Metrics saved to {metrics_file}")

    # Print summary
    print("\n✅ E2E Test Metrics Collected:")
    print(f"  Passed: {metrics.passed}")
    print(f"  Failed: {metrics.failed}")
    print(f"  Critical Pass Rate: {metrics.critical_pass_rate:.1f}%")
    print(f"  Overall Pass Rate: {metrics.overall_pass_rate:.1f}%")
    print(f"  Status: {metrics.status}")

    # Exit with success (metrics collection is non-blocking)
    sys.exit(0)
