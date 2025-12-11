#!/usr/bin/env python3
"""
CI Cache Performance Monitor

Analyzes GitHub Actions workflow runs to collect empirical cache performance metrics.
Helps validate the expected 95% speedup from npm/Playwright/pip caching.

Usage:
    python scripts/monitor_ci_cache.py --workflow e2e-tests.yml --runs 10
    python scripts/monitor_ci_cache.py --workflow e2e-tests.yml --output cache_metrics.json
    python scripts/monitor_ci_cache.py --all-workflows --since 2025-12-11
"""

import argparse
import json
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    import requests
except ImportError:
    print("Error: requests library not installed")
    print("Install with: pip install requests")
    sys.exit(1)


class CacheMetricsCollector:
    """Collects and analyzes cache performance metrics from GitHub Actions."""

    def __init__(self, repo_owner: str, repo_name: str, token: Optional[str] = None):
        """
        Initialize the metrics collector.

        Args:
            repo_owner: GitHub repository owner
            repo_name: GitHub repository name
            token: GitHub personal access token (optional, for higher rate limits)
        """
        self.repo_owner = repo_owner
        self.repo_name = repo_name
        self.token = token
        self.base_url = f"https://api.github.com/repos/{repo_owner}/{repo_name}"
        self.headers = {
            "Accept": "application/vnd.github.v3+json",
        }
        if token:
            self.headers["Authorization"] = f"token {token}"

    def get_workflow_runs(
        self,
        workflow_file: str,
        count: int = 10,
        since: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Fetch workflow runs from GitHub Actions API.

        Args:
            workflow_file: Workflow filename (e.g., 'e2e-tests.yml')
            count: Number of runs to fetch
            since: ISO date string to filter runs (e.g., '2025-12-11')

        Returns:
            List of workflow run dictionaries
        """
        url = f"{self.base_url}/actions/workflows/{workflow_file}/runs"
        params = {"per_page": count, "status": "completed"}

        if since:
            params["created"] = f">={since}"

        try:
            response = requests.get(url, headers=self.headers, params=params, timeout=30)
            response.raise_for_status()
            data = response.json()
            return data.get("workflow_runs", [])
        except Exception as e:
            print(f"Error fetching workflow runs: {e}")
            return []

    def get_job_details(self, run_id: int) -> List[Dict[str, Any]]:
        """
        Fetch job details for a specific workflow run.

        Args:
            run_id: Workflow run ID

        Returns:
            List of job dictionaries with timing information
        """
        url = f"{self.base_url}/actions/runs/{run_id}/jobs"

        try:
            response = requests.get(url, headers=self.headers, timeout=30)
            response.raise_for_status()
            data = response.json()
            return data.get("jobs", [])
        except requests.exceptions.RequestException as e:
            print(f"Error fetching job details for run {run_id}: {e}")
            return []

    def analyze_cache_performance(
        self, jobs: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Analyze cache performance from job step timings.

        Args:
            jobs: List of job dictionaries

        Returns:
            Dictionary with cache performance metrics
        """
        metrics = {
            "npm_cache_hit": False,
            "playwright_cache_hit": False,
            "pip_cache_hit": False,
            "npm_install_time": None,
            "playwright_install_time": None,
            "pip_install_time": None,
            "total_setup_time": None,
        }

        for job in jobs:
            steps = job.get("steps", [])

            for step in steps:
                step_name = step.get("name", "").lower()
                conclusion = step.get("conclusion", "")
                started_at = step.get("started_at")
                completed_at = step.get("completed_at")

                # Calculate step duration
                duration = None
                if started_at and completed_at:
                    start = datetime.fromisoformat(started_at.replace("Z", "+00:00"))
                    end = datetime.fromisoformat(completed_at.replace("Z", "+00:00"))
                    duration = (end - start).total_seconds()

                # Detect cache hits from explicit cache steps or fast setup
                if "cache" in step_name:
                    if "npm" in step_name or "node" in step_name:
                        metrics["npm_cache_hit"] = conclusion == "success"
                    elif "playwright" in step_name:
                        metrics["playwright_cache_hit"] = conclusion == "success"
                    elif "pip" in step_name or "python" in step_name:
                        metrics["pip_cache_hit"] = conclusion == "success"
                # Also detect cache hits from setup-node/setup-python with cache enabled
                elif "set up node" in step_name and conclusion == "success" and duration and duration < 5:
                    metrics["npm_cache_hit"] = True
                elif "set up python" in step_name and conclusion == "success" and duration and duration < 5:
                    metrics["pip_cache_hit"] = True

                # Capture installation timings
                if "install frontend dependencies" in step_name:
                    metrics["npm_install_time"] = duration
                elif "install playwright" in step_name:
                    metrics["playwright_install_time"] = duration
                elif "install backend dependencies" in step_name:
                    metrics["pip_install_time"] = duration

        # Calculate total setup time
        setup_times = [
            metrics["npm_install_time"],
            metrics["playwright_install_time"],
            metrics["pip_install_time"],
        ]
        valid_times = [t for t in setup_times if t is not None]
        if valid_times:
            metrics["total_setup_time"] = sum(valid_times)

        return metrics

    def generate_report(
        self,
        workflow_file: str,
        count: int = 10,
        since: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Generate a comprehensive cache performance report.

        Args:
            workflow_file: Workflow filename
            count: Number of runs to analyze
            since: ISO date string to filter runs

        Returns:
            Dictionary with aggregated metrics and analysis
        """
        print(f"Fetching {count} runs for {workflow_file}...")
        runs = self.get_workflow_runs(workflow_file, count, since)

        if not runs:
            return {"error": "No workflow runs found"}

        report = {
            "workflow": workflow_file,
            "analyzed_runs": len(runs),
            "date_range": {
                "start": runs[-1].get("created_at"),
                "end": runs[0].get("created_at"),
            },
            "runs": [],
            "summary": {
                "npm_cache_hit_rate": 0,
                "playwright_cache_hit_rate": 0,
                "pip_cache_hit_rate": 0,
                "avg_setup_time_with_cache": None,
                "avg_setup_time_without_cache": None,
                "estimated_time_saved": None,
            },
        }

        cache_hits = {"npm": 0, "playwright": 0, "pip": 0}
        setup_times_cached = []
        setup_times_uncached = []

        for run in runs:
            run_id = run["id"]
            run_number = run["run_number"]
            conclusion = run["conclusion"]
            created_at = run["created_at"]

            print(f"Analyzing run #{run_number} (ID: {run_id})...")
            jobs = self.get_job_details(run_id)
            metrics = self.analyze_cache_performance(jobs)

            run_data = {
                "run_number": run_number,
                "run_id": run_id,
                "conclusion": conclusion,
                "created_at": created_at,
                "metrics": metrics,
            }
            report["runs"].append(run_data)

            # Aggregate statistics
            if metrics["npm_cache_hit"]:
                cache_hits["npm"] += 1
            if metrics["playwright_cache_hit"]:
                cache_hits["playwright"] += 1
            if metrics["pip_cache_hit"]:
                cache_hits["pip"] += 1

            # Categorize by cache usage
            total_time = metrics["total_setup_time"]
            if total_time:
                if (
                    metrics["npm_cache_hit"]
                    and metrics["playwright_cache_hit"]
                    and metrics["pip_cache_hit"]
                ):
                    setup_times_cached.append(total_time)
                else:
                    setup_times_uncached.append(total_time)

        # Calculate summary statistics
        total_runs = len(runs)
        report["summary"]["npm_cache_hit_rate"] = (
            f"{(cache_hits['npm'] / total_runs) * 100:.1f}%"
        )
        report["summary"]["playwright_cache_hit_rate"] = (
            f"{(cache_hits['playwright'] / total_runs) * 100:.1f}%"
        )
        report["summary"]["pip_cache_hit_rate"] = (
            f"{(cache_hits['pip'] / total_runs) * 100:.1f}%"
        )

        if setup_times_cached:
            avg_cached = sum(setup_times_cached) / len(setup_times_cached)
            report["summary"]["avg_setup_time_with_cache"] = f"{avg_cached:.1f}s"

        if setup_times_uncached:
            avg_uncached = sum(setup_times_uncached) / len(setup_times_uncached)
            report["summary"]["avg_setup_time_without_cache"] = f"{avg_uncached:.1f}s"

        if setup_times_cached and setup_times_uncached:
            avg_cached = sum(setup_times_cached) / len(setup_times_cached)
            avg_uncached = sum(setup_times_uncached) / len(setup_times_uncached)
            time_saved = avg_uncached - avg_cached
            speedup = ((avg_uncached - avg_cached) / avg_uncached) * 100
            report["summary"]["estimated_time_saved"] = (
                f"{time_saved:.1f}s ({speedup:.1f}% speedup)"
            )

        return report


def main():
    """Main entry point for the cache monitoring script."""
    parser = argparse.ArgumentParser(
        description="Monitor CI cache performance from GitHub Actions"
    )
    parser.add_argument(
        "--workflow",
        default="e2e-tests.yml",
        help="Workflow filename to analyze (default: e2e-tests.yml)",
    )
    parser.add_argument(
        "--runs",
        type=int,
        default=10,
        help="Number of workflow runs to analyze (default: 10)",
    )
    parser.add_argument(
        "--since",
        help="Only analyze runs since this date (ISO format: YYYY-MM-DD)",
    )
    parser.add_argument(
        "--output",
        help="Output file for JSON report (prints to stdout if not specified)",
    )
    parser.add_argument(
        "--repo",
        default="bs1gr/AUT_MIEEK_SMS",
        help="GitHub repository (format: owner/repo)",
    )
    parser.add_argument(
        "--token",
        help="GitHub personal access token (optional, for higher rate limits)",
    )

    args = parser.parse_args()

    # Parse repository owner and name
    try:
        repo_owner, repo_name = args.repo.split("/")
    except ValueError:
        print(f"Error: Invalid repository format '{args.repo}'. Use 'owner/repo'")
        sys.exit(1)

    # Create collector and generate report
    collector = CacheMetricsCollector(repo_owner, repo_name, args.token)
    report = collector.generate_report(args.workflow, args.runs, args.since)

    # Output report
    json_output = json.dumps(report, indent=2)

    if args.output:
        output_path = Path(args.output)
        output_path.write_text(json_output)
        print(f"\nReport saved to: {args.output}")
        print("\nSummary:")
        print(json.dumps(report["summary"], indent=2))
    else:
        print(json_output)


if __name__ == "__main__":
    main()
