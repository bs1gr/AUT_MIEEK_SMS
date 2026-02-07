#!/usr/bin/env python3
"""
Load Test Results Analysis Script

This script analyzes Locust load test results and generates comprehensive reports.
"""

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional

import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns
from pandas import DataFrame


class LoadTestAnalyzer:
    """Load test results analyzer."""

    def __init__(self, results_dir: Path):
        self.results_dir = results_dir
        self.plots_dir = results_dir / "plots"
        self.plots_dir.mkdir(exist_ok=True)

        # Set up matplotlib
        plt.style.use("seaborn-v0_8")
        sns.set_palette("husl")

    def find_latest_results(self) -> List[Path]:
        """Find the most recent test results."""
        stats_files = list(self.results_dir.glob("*_stats.csv"))
        if not stats_files:
            print("ERROR: No results files found")
            return []

        # Sort by modification time (newest first)
        stats_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)
        return stats_files[:1]  # Return most recent

    def load_results(self, stats_file: Path) -> DataFrame:
        """Load and process results data (robust to Locust CSV variations)."""
        try:
            df = pd.read_csv(stats_file)

            # Clean up column names
            df.columns = df.columns.str.strip()

            # Helper to find a suitable column name from a list of candidates
            def _find_col(candidates):
                for c in candidates:
                    if c in df.columns:
                        return c
                # try case-insensitive fuzzy match
                lowcols = [c.lower() for c in df.columns]
                for cand in candidates:
                    cand_low = cand.lower()
                    for idx, col in enumerate(lowcols):
                        # match if all tokens in candidate appear in the column name
                        if all(tok in col for tok in cand_low.split()):
                            return df.columns[idx]
                return None

            # Convert time columns to seconds (Locust may output ms)
            avg_col = _find_col(
                [
                    "Average Response Time",
                    "Avg Response Time",
                    "Average",
                ]
            )
            median_col = _find_col(["Median Response Time", "Median"])
            p95_col = _find_col(["95%", "95%ile Response Time", "95%ile"])
            p99_col = _find_col(["99%", "99%ile Response Time", "99%ile"])

            for col in [avg_col, median_col, p95_col, p99_col]:
                if col and col in df.columns:
                    df[col] = df[col] / 1000.0  # Convert ms to seconds

            return df

        except Exception as e:
            print(f"ERROR: Error loading results: {e}")
            return pd.DataFrame()

    def generate_summary_report(self, df: DataFrame, test_id: str) -> Dict[str, Any]:
        """Generate comprehensive summary report."""
        if df.empty:
            return {}

        # Resolve column names robustly
        def _find_col(candidates):
            for c in candidates:
                if c in df.columns:
                    return c
            lowcols = [c.lower() for c in df.columns]
            for cand in candidates:
                cand_low = cand.lower()
                for idx, col in enumerate(lowcols):
                    if all(tok in col for tok in cand_low.split()):
                        return df.columns[idx]
            return None

        req_count_col = _find_col(["Request Count", "Total Request Count", "Requests"])
        fail_count_col = _find_col(
            ["Failure Count", "Total Failure Count", "Total Failures", "Failures"]
        )
        rps_col = _find_col(["Requests/s", "RPS", "Requests per Second"])
        avg_col = _find_col(["Average Response Time", "Avg Response Time", "Average"])
        median_col = _find_col(["Median Response Time", "Median"])
        p95_col = _find_col(["95%", "95%ile Response Time", "95%ile"])
        p99_col = _find_col(["99%", "99%ile Response Time", "99%ile"])

        name_col = _find_col(["Name", "Endpoint", "URL"])
        method_col = _find_col(["Method", "HTTP Method"])

        # Guard against missing columns
        if not req_count_col or not fail_count_col:
            raise ValueError(
                "Required columns not found in results CSV (Request/Failure counts)"
            )

        summary = {
            "test_id": test_id,
            "timestamp": datetime.now().isoformat(),
            "total_requests": int(df[req_count_col].sum()) if req_count_col else 0,
            "total_failures": int(df[fail_count_col].sum()) if fail_count_col else 0,
            "error_rate": float(
                df[fail_count_col].sum() / df[req_count_col].sum() * 100
            )
            if df[req_count_col].sum() > 0
            else 0.0,
            "avg_response_time": float(df[avg_col].mean()) if avg_col else 0.0,
            "median_response_time": float(df[median_col].median())
            if median_col
            else 0.0,
            "95p_response_time": float(df[p95_col].max()) if p95_col else 0.0,
            "99p_response_time": float(df[p99_col].max()) if p99_col else 0.0,
            "requests_per_second": float(df[rps_col].sum()) if rps_col else 0.0,
            "endpoint_stats": [],
        }

        # Per-endpoint statistics
        for _, row in df.iterrows():
            endpoint_stat = {
                "endpoint": row[name_col] if name_col else row.get("Name", ""),
                "method": row.get(method_col or "Method", "GET"),
                "requests": int(row[req_count_col])
                if req_count_col in row
                else int(row.get("Request Count", 0)),
                "failures": int(row[fail_count_col])
                if fail_count_col in row
                else int(row.get("Failure Count", 0)),
                "avg_response_time": float(row[avg_col])
                if avg_col in row
                else float(row.get("Average Response Time", 0.0)),
                "95p_response_time": float(row[p95_col])
                if p95_col in row
                else float(row.get("95%", 0.0)),
                "rps": float(row[rps_col])
                if rps_col in row
                else float(row.get("Requests/s", 0.0)),
            }
            summary["endpoint_stats"].append(endpoint_stat)

        # Sort endpoints by request count
        summary["endpoint_stats"].sort(key=lambda x: x["requests"], reverse=True)

        return summary

    def check_performance_targets(
        self, summary: Dict[str, Any], targets: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Check results against performance targets."""
        results = {"passed": True, "checks": []}

        # Response time checks
        checks = [
            (
                "95th Percentile Response Time",
                summary["95p_response_time"],
                targets["response_time_95p"],
            ),
            (
                "99th Percentile Response Time",
                summary["99p_response_time"],
                targets["response_time_99p"],
            ),
            ("Error Rate", summary["error_rate"], targets["error_rate_max"] * 100),
        ]

        for name, actual, target in checks:
            passed = actual <= target
            results["checks"].append(
                {
                    "metric": name,
                    "actual": actual,
                    "target": target,
                    "passed": passed,
                    "status": "PASS" if passed else "FAIL",
                }
            )

            if not passed:
                results["passed"] = False

        return results

    def generate_plots(self, df: DataFrame, test_id: str):
        """Generate performance visualization plots."""
        if df.empty:
            return

        # Response time distribution
        plt.figure(figsize=(12, 8))

        # Filter out endpoints with very few requests
        df_filtered = df[df["Request Count"] > 10]

        if not df_filtered.empty:
            # Response time box plot
            plt.subplot(2, 2, 1)
            response_times = []
            labels = []

            for _, row in df_filtered.iterrows():
                # Create synthetic data points for box plot (approximation)
                avg_time = row["Average Response Time"]
                median_time = row["Median Response Time"]
                p95_time = row["95%"]

                # Approximate distribution
                times = [
                    avg_time * 0.5,
                    median_time * 0.8,
                    median_time,
                    median_time * 1.2,
                    p95_time * 0.8,
                ]
                response_times.append(times)
                labels.append(
                    row["Name"][:30] + "..." if len(row["Name"]) > 30 else row["Name"]
                )

            plt.boxplot(response_times, labels=labels, vert=False)
            plt.title("Response Time Distribution by Endpoint")
            plt.xlabel("Response Time (seconds)")

            # RPS by endpoint
            plt.subplot(2, 2, 2)
            rps_data = df_filtered.set_index("Name")["Requests/s"].sort_values(
                ascending=True
            )
            rps_data.plot(kind="barh", figsize=(10, 6))
            plt.title("Requests per Second by Endpoint")
            plt.xlabel("RPS")

            # Error rate by endpoint
            plt.subplot(2, 2, 3)
            error_rates = (
                df_filtered["Failure Count"] / df_filtered["Request Count"] * 100
            )
            error_rates = error_rates.sort_values(ascending=True)
            error_rates.plot(kind="barh", figsize=(10, 6))
            plt.title("Error Rate by Endpoint (%)")
            plt.xlabel("Error Rate (%)")

            # Response time percentiles
            plt.subplot(2, 2, 4)
            percentiles = [
                "Average Response Time",
                "Median Response Time",
                "95%",
                "99%",
            ]

            percentile_data = df_filtered[percentiles].mean()
            percentile_data.plot(kind="bar")
            plt.title("Average Response Time Percentiles")
            plt.ylabel("Time (seconds)")
            plt.xticks(rotation=45)

            plt.tight_layout()
            plt.savefig(
                self.plots_dir / f"{test_id}_analysis.png", dpi=300, bbox_inches="tight"
            )
            plt.close()

            print(
                f"📊 Generated analysis plots: {self.plots_dir / f'{test_id}_analysis.png'}"
            )

    def save_report(
        self, summary: Dict[str, Any], target_check: Dict[str, Any], test_id: str
    ):
        """Save comprehensive report to JSON."""
        report = {
            "summary": summary,
            "target_analysis": target_check,
            "generated_at": datetime.now().isoformat(),
            "test_id": test_id,
        }

        report_file = self.results_dir / f"analysis_{test_id}.json"
        with open(report_file, "w") as f:
            json.dump(report, f, indent=2, default=str)

        print(f"💾 Saved analysis report: {report_file}")

        # Also save human-readable summary
        summary_file = self.results_dir / f"summary_{test_id}.txt"
        with open(summary_file, "w") as f:
            f.write("SMS Load Test Analysis Report\n")
            f.write("=" * 50 + "\n\n")
            f.write(f"Test ID: {test_id}\n")
            f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")

            f.write("PERFORMANCE SUMMARY\n")
            f.write("-" * 20 + "\n")
            f.write(f"Total Requests: {summary['total_requests']:,}\n")
            f.write(f"Total Failures: {summary['total_failures']:,}\n")
            f.write(f"Error Rate: {summary['error_rate']:.2f}%\n")
            f.write(f"Requests/sec: {summary['requests_per_second']:.2f}\n")
            f.write(f"Avg Response Time: {summary['avg_response_time']:.3f}s\n")
            f.write(f"95th Percentile: {summary['95p_response_time']:.3f}s\n")
            f.write(f"99th Percentile: {summary['99p_response_time']:.3f}s\n\n")

            f.write("TARGET ANALYSIS\n")
            f.write("-" * 15 + "\n")
            for check in target_check["checks"]:
                f.write(
                    f"{check['status']} {check['metric']}: {check['actual']:.3f} (target: {check['target']:.3f})\n"
                )

            f.write(
                f"\nOverall Result: {'PASSED' if target_check['passed'] else 'FAILED'}\n\n"
            )

            f.write("TOP ENDPOINTS BY REQUESTS\n")
            f.write("-" * 25 + "\n")
            for stat in summary["endpoint_stats"][:10]:  # Top 10
                f.write(
                    f"{stat['requests']:>6,} req | {stat['avg_response_time']:>6.3f}s | {stat['endpoint']}\n"
                )

        print(f"📄 Saved summary report: {summary_file}")

    def analyze(
        self, test_id: Optional[str] = None, targets: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Main analysis method."""
        print("🔍 Analyzing load test results...")

        # Find results files
        if test_id:
            stats_file = self.results_dir / f"results_{test_id}_stats.csv"
            if not stats_file.exists():
                print(f"ERROR: Results file not found: {stats_file}")
                return False
            stats_files = [stats_file]
        else:
            stats_files = self.find_latest_results()
            if not stats_files:
                return False

        stats_file = stats_files[0]
        test_id = test_id or stats_file.stem.replace("results_", "").replace(
            "_stats", ""
        )

        print(f"📂 Analyzing results: {stats_file}")

        # Load and process data
        df = self.load_results(stats_file)
        if df.empty:
            return False

        # Generate summary
        summary = self.generate_summary_report(df, test_id)

        # Check against targets
        if targets:
            target_check = self.check_performance_targets(summary, targets)
        else:
            # Default targets
            default_targets = {
                "response_time_95p": 2.0,
                "response_time_99p": 5.0,
                "error_rate_max": 0.05,
            }
            target_check = self.check_performance_targets(summary, default_targets)

        # Generate plots
        self.generate_plots(df, test_id)

        # Save reports
        self.save_report(summary, target_check, test_id)

        # Print results
        print("\n📊 ANALYSIS COMPLETE")
        print("=" * 50)
        print(f"Test ID: {test_id}")
        print(f"Total Requests: {summary['total_requests']:,}")
        print(f"Error Rate: {summary['error_rate']:.2f}%")
        print(f"95th Percentile: {summary['95p_response_time']:.3f}s")
        print(f"Requests/sec: {summary['requests_per_second']:.2f}")
        print(f"Overall Result: {'PASSED' if target_check['passed'] else 'FAILED'}")

        return target_check["passed"]


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Load Test Results Analyzer")
    parser.add_argument("--test-id", help="Specific test ID to analyze")
    parser.add_argument(
        "--results-dir", default="load-testing/results", help="Results directory path"
    )
    parser.add_argument(
        "--target-95p", type=float, default=2.0, help="95th percentile target (seconds)"
    )
    parser.add_argument(
        "--target-99p", type=float, default=5.0, help="99th percentile target (seconds)"
    )
    parser.add_argument(
        "--max-error-rate", type=float, default=0.05, help="Maximum error rate (0-1)"
    )

    args = parser.parse_args()

    results_dir = Path(args.results_dir)
    if not results_dir.exists():
        print(f"ERROR: Results directory not found: {results_dir}")
        sys.exit(1)

    targets = {
        "response_time_95p": args.target_95p,
        "response_time_99p": args.target_99p,
        "error_rate_max": args.max_error_rate,
    }

    analyzer = LoadTestAnalyzer(results_dir)
    success = analyzer.analyze(args.test_id, targets)

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
