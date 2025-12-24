#!/usr/bin/env python3
"""
Performance Regression Check Script

Compares current load test results against baseline performance metrics
to detect performance regressions.
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Dict, Any, Optional


class RegressionChecker:
    """Checks for performance regressions against baseline."""

    def __init__(self, baseline_file: Path, current_results: Path):
        self.baseline_file = baseline_file
        self.current_results = current_results

    def load_baseline(self) -> Optional[Dict[str, Any]]:
        """Load baseline performance metrics."""
        if not self.baseline_file.exists():
            print(f"Baseline file not found: {self.baseline_file}")
            return None

        try:
            with open(self.baseline_file, "r") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading baseline: {e}")
            return None

    def load_current_results(self) -> Optional[Dict[str, Any]]:
        """Load current test results."""
        if not self.current_results.exists():
            print(f"Current results file not found: {self.current_results}")
            return None

        try:
            with open(self.current_results, "r") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading current results: {e}")
            return None

    def check_regression(
        self, baseline: Dict[str, Any], current: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Check for performance regressions."""
        results = {"passed": True, "regressions": [], "improvements": [], "checks": []}

        # Define regression thresholds (percentage changes)
        thresholds = {
            "avg_response_time": 1.20,  # 20% increase allowed
            "95p_response_time": 1.25,  # 25% increase allowed
            "error_rate": 1.50,  # 50% increase in error rate allowed
            "requests_per_second": 0.80,  # 20% decrease allowed
        }

        metrics_to_check = [
            ("avg_response_time", "Average Response Time", "lower"),
            ("95p_response_time", "95th Percentile Response Time", "lower"),
            ("error_rate", "Error Rate", "lower"),
            ("requests_per_second", "Requests per Second", "higher"),
        ]

        for metric_key, display_name, direction in metrics_to_check:
            if metric_key in baseline and metric_key in current:
                baseline_value = baseline[metric_key]
                current_value = current[metric_key]

                if baseline_value == 0:
                    continue

                ratio = current_value / baseline_value

                if direction == "lower":
                    # Lower is better (response time, error rate)
                    if ratio > thresholds[metric_key]:
                        results["passed"] = False
                        results["regressions"].append(
                            {
                                "metric": display_name,
                                "baseline": baseline_value,
                                "current": current_value,
                                "change_percent": (ratio - 1) * 100,
                                "threshold_percent": (thresholds[metric_key] - 1) * 100,
                            }
                        )
                    elif ratio < 1.0:
                        results["improvements"].append(
                            {
                                "metric": display_name,
                                "baseline": baseline_value,
                                "current": current_value,
                                "change_percent": (ratio - 1) * 100,
                            }
                        )
                else:
                    # Higher is better (requests per second)
                    if ratio < thresholds[metric_key]:
                        results["passed"] = False
                        results["regressions"].append(
                            {
                                "metric": display_name,
                                "baseline": baseline_value,
                                "current": current_value,
                                "change_percent": (ratio - 1) * 100,
                                "threshold_percent": (thresholds[metric_key] - 1) * 100,
                            }
                        )
                    elif ratio > 1.0:
                        results["improvements"].append(
                            {
                                "metric": display_name,
                                "baseline": baseline_value,
                                "current": current_value,
                                "change_percent": (ratio - 1) * 100,
                            }
                        )

                results["checks"].append(
                    {
                        "metric": display_name,
                        "baseline": baseline_value,
                        "current": current_value,
                        "ratio": ratio,
                        "status": "PASS" if results["passed"] else "FAIL",
                    }
                )

        return results

    def run_check(self) -> bool:
        """Run the regression check."""
        print("🔍 Checking for performance regressions...")

        baseline = self.load_baseline()
        if not baseline:
            print("ERROR: Could not load baseline")
            return False

        # Find the latest results file
        results_files = list(self.current_results.parent.glob("analysis_*.json"))
        if not results_files:
            print("ERROR: No analysis results found")
            return False

        current = self.load_current_results()
        if not current:
            print("ERROR: Could not load current results")
            return False

        regression_results = self.check_regression(baseline, current)

        print("\n📊 Regression Check Results")
        print("=" * 40)

        if regression_results["passed"]:
            print("✅ PASSED: No performance regressions detected")
        else:
            print("❌ FAILED: Performance regressions detected")

        print(f"\nRegressions ({len(regression_results['regressions'])}):")
        for reg in regression_results["regressions"]:
            print(
                f"  - {reg['metric']}: {reg['change_percent']:+.1f}% "
                f"(threshold: {reg['threshold_percent']:+.1f}%)"
            )

        print(f"\nImprovements ({len(regression_results['improvements'])}):")
        for imp in regression_results["improvements"]:
            print(f"  - {imp['metric']}: {imp['change_percent']:+.1f}%")

        print("\nDetailed Metrics:")
        for check in regression_results["checks"]:
            print(
                f"  - {check['metric']}: {check['baseline']:.3f} → {check['current']:.3f} "
                f"({check['ratio']:.2f}x) [{check['status']}]"
            )

        return regression_results["passed"]


def main():
    parser = argparse.ArgumentParser(description="Check for performance regressions")
    parser.add_argument("--baseline", required=True, help="Baseline metrics JSON file")
    parser.add_argument("--current", required=True, help="Current results directory")

    args = parser.parse_args()

    baseline_file = Path(args.baseline)
    current_dir = Path(args.current)

    checker = RegressionChecker(baseline_file, current_dir)
    success = checker.run_check()

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
