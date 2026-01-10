#!/usr/bin/env python3
"""
E2E Test Failure Pattern Detector
Analyzes test failures to detect patterns and categorize issues
Run: python scripts/e2e_failure_detector.py <report_path>
"""

import json
import sys
import re
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import Dict, List
from collections import Counter


@dataclass
class FailurePattern:
    """Detected failure pattern"""

    test_name: str
    error_type: str  # timeout, assertion, network, selector, auth, other
    error_message: str
    affected_tests: int
    first_seen: str  # timestamp
    last_seen: str  # timestamp
    frequency: int  # count across monitored period
    severity: str  # critical, high, medium, low
    recommended_action: str


class FailureDetector:
    """Detect and categorize test failures"""

    # Pattern matching for common error types
    ERROR_PATTERNS = {
        "timeout": [
            r"Timeout waiting for",
            r"timeout",
            r"operation timed out",
            r"await page.wait",
        ],
        "selector": [
            r"target page, context or browser has been closed",
            r"Selector",
            r"locator",
            r"did not resolve to any elements",
        ],
        "auth": [
            r"401",
            r"403",
            r"unauthorized",
            r"forbidden",
            r"authentication",
            r"login",
        ],
        "network": [
            r"fetch",
            r"network",
            r"connection",
            r"ECONNREFUSED",
            r"socket",
        ],
        "assertion": [
            r"Assertion",
            r"expect",
            r"toBe",
            r"toContain",
            r"not equal",
        ],
    }

    SEVERITY_MAP = {
        "timeout": "high",
        "selector": "medium",
        "auth": "critical",
        "network": "critical",
        "assertion": "medium",
        "other": "low",
    }

    RECOMMENDATIONS = {
        "timeout": "Increase test timeout or optimize test speed",
        "selector": "Update selector or add explicit waits",
        "auth": "Check authentication setup and permissions",
        "network": "Verify backend connectivity and server status",
        "assertion": "Review test expectations and actual behavior",
        "other": "Investigate root cause - see test logs",
    }

    def __init__(self):
        self.patterns: Dict[str, FailurePattern] = {}
        self.failure_messages: List[str] = []

    def classify_error(self, error_message: str) -> str:
        """Classify error into category"""
        if not error_message:
            return "other"

        error_lower = error_message.lower()

        for error_type, patterns in self.ERROR_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, error_lower, re.IGNORECASE):
                    return error_type

        return "other"

    def parse_test_failures(self, report_data: dict) -> List[dict]:
        """Extract failures from Playwright report"""
        failures = []

        for test in report_data.get("tests", []):
            test_name = test.get("title", "Unknown")
            results = test.get("results", [])

            if not results:
                continue

            # Get the last result (most recent failure)
            last_result = results[-1]

            if last_result.get("status") == "failed":
                error = last_result.get("error", {})
                message = error.get("message", "Unknown error")

                failures.append(
                    {
                        "test_name": test_name,
                        "error_message": message,
                        "timestamp": test.get("startTime", ""),
                        "duration": last_result.get("duration", 0),
                    }
                )

        return failures

    def detect_patterns(
        self, failures: List[dict], timestamp: str
    ) -> Dict[str, FailurePattern]:
        """Detect patterns from failures"""
        patterns = {}

        for failure in failures:
            error_type = self.classify_error(failure["error_message"])
            test_name = failure["test_name"]

            key = f"{test_name}::{error_type}"

            if key not in patterns:
                patterns[key] = FailurePattern(
                    test_name=test_name,
                    error_type=error_type,
                    error_message=failure["error_message"][:100],
                    affected_tests=1,
                    first_seen=timestamp,
                    last_seen=timestamp,
                    frequency=1,
                    severity=self.SEVERITY_MAP.get(error_type, "low"),
                    recommended_action=self.RECOMMENDATIONS.get(
                        error_type, "Investigate"
                    ),
                )
            else:
                patterns[key].affected_tests += 1
                patterns[key].last_seen = timestamp
                patterns[key].frequency += 1

        return patterns

    def save_patterns(
        self, patterns: Dict[str, FailurePattern], output_dir: str
    ) -> None:
        """Save detected patterns to file"""
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

        # Save patterns as JSON
        patterns_file = output_path / "failure_patterns.json"
        patterns_data = [asdict(p) for p in patterns.values()]

        with open(patterns_file, "w") as f:
            json.dump(patterns_data, f, indent=2)

        print(f"✅ Patterns saved to {patterns_file}")

        # Save summary
        summary_file = output_path / "pattern_summary.txt"
        with open(summary_file, "w") as f:
            f.write("E2E TEST FAILURE PATTERNS\n")
            f.write("=" * 80 + "\n\n")

            # Sort by severity
            sorted_patterns = sorted(
                patterns.values(),
                key=lambda p: ("critical", "high", "medium", "low").index(p.severity),
            )

            for pattern in sorted_patterns:
                f.write(f"Test: {pattern.test_name}\n")
                f.write(f"Error Type: {pattern.error_type.upper()}\n")
                f.write(f"Severity: {pattern.severity.upper()}\n")
                f.write(f"Frequency: {pattern.frequency}\n")
                f.write(f"Error: {pattern.error_message}\n")
                f.write(f"Action: {pattern.recommended_action}\n")
                f.write("-" * 80 + "\n\n")

        print(f"✅ Summary saved to {summary_file}")

    def print_alert(self, patterns: Dict[str, FailurePattern]) -> None:
        """Print alert for critical patterns"""
        critical_patterns = [p for p in patterns.values() if p.severity == "critical"]

        if critical_patterns:
            print("\n🚨 CRITICAL FAILURES DETECTED 🚨")
            print("=" * 80)
            for pattern in critical_patterns:
                print(f"  ❌ {pattern.test_name}")
                print(f"     Type: {pattern.error_type}")
                print(f"     Error: {pattern.error_message}")
                print(f"     Action: {pattern.recommended_action}")
            print("=" * 80)
            print("\n⚠️  IMMEDIATE ACTION REQUIRED")


def analyze_historical_patterns(metrics_dir: str) -> None:
    """Analyze patterns across historical runs"""
    history_file = Path(metrics_dir) / "failure_patterns.json"

    if not history_file.exists():
        print("ℹ️  No historical pattern data found")
        return

    print("\n📊 Historical Failure Patterns:")
    print("-" * 80)

    try:
        with open(history_file, "r") as f:
            patterns = json.load(f)

        # Group by error type
        by_type = Counter(p["error_type"] for p in patterns)
        for error_type, count in by_type.most_common():
            print(f"  {error_type.upper():12} : {count:3} occurrences")

        # Group by severity
        by_severity = Counter(p["severity"] for p in patterns)
        print()
        for severity in ["critical", "high", "medium", "low"]:
            count = by_severity.get(severity, 0)
            if count > 0:
                print(f"  {severity.upper():12} : {count:3} issues")

    except Exception as e:
        print(f"Error reading patterns: {e}")


if __name__ == "__main__":
    import argparse
    from datetime import datetime

    parser = argparse.ArgumentParser(
        description="Detect and analyze E2E test failure patterns"
    )
    parser.add_argument(
        "--report",
        type=str,
        default="frontend/test-results/report.json",
        help="Path to Playwright test report",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="ci-artifacts",
        help="Output directory for failure patterns",
    )
    parser.add_argument(
        "--timestamp",
        type=str,
        default=None,
        help="Test run timestamp (defaults to now)",
    )

    args = parser.parse_args()

    timestamp = args.timestamp or datetime.utcnow().isoformat() + "Z"

    # Check if report exists
    if not Path(args.report).exists():
        print(f"⚠️  Report not found at {args.report}")
        print("Creating empty failure patterns file...")
        # Create directory for output
        Path(args.output).mkdir(parents=True, exist_ok=True)
        patterns_file = Path(args.output) / "failure-patterns.json"
        with open(patterns_file, "w") as f:
            json.dump({"status": "no_report", "patterns": {}}, f, indent=2)
        print(f"✅ Patterns file created at {patterns_file}")
        sys.exit(0)

    # Read report
    try:
        with open(args.report, "r") as f:
            report_data = json.load(f)
    except Exception as e:
        print(f"⚠️  Error reading report: {e}")
        Path(args.output).mkdir(parents=True, exist_ok=True)
        patterns_file = Path(args.output) / "failure-patterns.json"
        with open(patterns_file, "w") as f:
            json.dump(
                {"status": "read_error", "error": str(e), "patterns": {}}, f, indent=2
            )
        print(f"✅ Patterns file created at {patterns_file}")
        sys.exit(0)

    # Detect patterns
    detector = FailureDetector()
    failures = detector.parse_test_failures(report_data)

    if not failures:
        print("✅ No test failures detected")
        Path(args.output).mkdir(parents=True, exist_ok=True)
        patterns_file = Path(args.output) / "failure-patterns.json"
        with open(patterns_file, "w") as f:
            json.dump(
                {"status": "success", "failure_count": 0, "patterns": {}}, f, indent=2
            )
        print(f"✅ Patterns file created at {patterns_file}")
        sys.exit(0)

    print(f"🔍 Analyzing {len(failures)} failures...")

    patterns = detector.detect_patterns(failures, timestamp)

    # Save patterns
    Path(args.output).mkdir(parents=True, exist_ok=True)
    patterns_file = Path(args.output) / "failure-patterns.json"
    patterns_data = {
        "status": "success",
        "timestamp": timestamp,
        "failure_count": len(failures),
        "pattern_count": len(patterns),
        "patterns": {key: asdict(pattern) for key, pattern in patterns.items()},
    }
    with open(patterns_file, "w") as f:
        json.dump(patterns_data, f, indent=2)

    print(f"✅ Failure patterns saved to {patterns_file}")

    # Print summary
    print(f"\n📋 Detected {len(patterns)} failure pattern(s):")
    for key, pattern in patterns.items():
        print(
            f"  [{pattern.severity.upper():8}] {pattern.test_name:40} - {pattern.error_type}"
        )

    # Exit successfully (failure detection is non-blocking)
    sys.exit(0)
