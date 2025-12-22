#!/usr/bin/env python3
"""
Load Test Report Generation Script

This script generates comprehensive HTML reports from load test results.
"""

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List


class LoadTestReportGenerator:
    """Load test report generator."""

    def __init__(self, results_dir: Path, output_dir: Path):
        self.results_dir = results_dir
        self.output_dir = output_dir
        self.output_dir.mkdir(exist_ok=True)

    def find_analysis_files(self) -> List[Path]:
        """Find all analysis JSON files."""
        return list(self.results_dir.glob("analysis_*.json"))

    def load_analysis(self, analysis_file: Path) -> Dict[str, Any]:
        """Load analysis data from JSON file."""
        with open(analysis_file, "r") as f:
            return json.load(f)

    def generate_html_report(self, analyses: List[Dict[str, Any]]) -> str:
        """Generate comprehensive HTML report."""
        html_template = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SMS Load Test Report</title>
    <style>
        {self._get_css_styles()}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🎯 Student Management System Load Test Report</h1>
            <p class="subtitle">Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
        </header>

        {self._generate_summary_section(analyses)}
        {self._generate_detailed_results(analyses)}
        {self._generate_endpoint_analysis(analyses)}
        {self._generate_target_analysis(analyses)}
    </div>
</body>
</html>
        """
        return html_template

    def _get_css_styles(self) -> str:
        """Get CSS styles for the report."""
        return """
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        header {
            text-align: center;
            margin-bottom: 40px;
            padding: 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 10px;
        }

        h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }

        .subtitle {
            font-size: 1.1em;
            opacity: 0.9;
        }

        .section {
            background: white;
            margin-bottom: 30px;
            padding: 25px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .section h2 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
            margin-bottom: 20px;
            font-size: 1.8em;
        }

        .metric-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }

        .metric-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #3498db;
        }

        .metric-value {
            font-size: 2em;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 5px;
        }

        .metric-label {
            color: #7f8c8d;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .status-badge {
            display: inline-block;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: bold;
            text-transform: uppercase;
        }

        .status-pass {
            background-color: #d4edda;
            color: #155724;
        }

        .status-fail {
            background-color: #f8d7da;
            color: #721c24;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }

        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }

        th {
            background-color: #f8f9fa;
            font-weight: 600;
            color: #2c3e50;
        }

        tr:hover {
            background-color: #f8f9fa;
        }

        .endpoint-url {
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 0.9em;
            color: #e74c3c;
        }

        .performance-bar {
            height: 20px;
            background-color: #ecf0f1;
            border-radius: 10px;
            overflow: hidden;
            margin: 5px 0;
        }

        .performance-fill {
            height: 100%;
            background: linear-gradient(90deg, #27ae60, #f39c12, #e74c3c);
            transition: width 0.3s ease;
        }

        .chart-container {
            margin: 20px 0;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
        }

        .footer {
            text-align: center;
            margin-top: 40px;
            padding: 20px;
            color: #7f8c8d;
            font-size: 0.9em;
        }
        """

    def _generate_summary_section(self, analyses: List[Dict[str, Any]]) -> str:
        """Generate summary section."""
        if not analyses:
            return ""

        latest = analyses[0]  # Assuming sorted by date
        summary = latest["summary"]

        # Calculate overall status
        all_passed = all(analysis["target_analysis"]["passed"] for analysis in analyses)
        status_class = "status-pass" if all_passed else "status-fail"
        status_text = "✅ ALL PASSED" if all_passed else "❌ ISSUES FOUND"

        html = f"""
        <div class="section">
            <h2>📊 Executive Summary</h2>
            <div class="metric-grid">
                <div class="metric-card">
                    <div class="metric-value">{summary['total_requests']:,}</div>
                    <div class="metric-label">Total Requests</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">{summary['requests_per_second']:.1f}</div>
                    <div class="metric-label">Requests/Second</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">{summary['95p_response_time']:.3f}s</div>
                    <div class="metric-label">95th Percentile Response Time</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">{summary['error_rate']:.2f}%</div>
                    <div class="metric-label">Error Rate</div>
                </div>
            </div>
            <div style="text-align: center; margin-top: 20px;">
                <span class="status-badge {status_class}">{status_text}</span>
            </div>
        </div>
        """
        return html

    def _generate_detailed_results(self, analyses: List[Dict[str, Any]]) -> str:
        """Generate detailed results section."""
        if not analyses:
            return ""

        html = """
        <div class="section">
            <h2>📈 Detailed Results</h2>
            <table>
                <thead>
                    <tr>
                        <th>Test ID</th>
                        <th>Requests</th>
                        <th>RPS</th>
                        <th>Avg Response</th>
                        <th>95th %ile</th>
                        <th>Error Rate</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
        """

        for analysis in analyses:
            summary = analysis["summary"]
            target_check = analysis["target_analysis"]

            status_class = "status-pass" if target_check["passed"] else "status-fail"
            status_text = "PASS" if target_check["passed"] else "FAIL"

            html += f"""
                    <tr>
                        <td>{summary['test_id']}</td>
                        <td>{summary['total_requests']:,}</td>
                        <td>{summary['requests_per_second']:.1f}</td>
                        <td>{summary['avg_response_time']:.3f}s</td>
                        <td>{summary['95p_response_time']:.3f}s</td>
                        <td>{summary['error_rate']:.2f}%</td>
                        <td><span class="status-badge {status_class}">{status_text}</span></td>
                    </tr>
            """

        html += """
                </tbody>
            </table>
        </div>
        """
        return html

    def _generate_endpoint_analysis(self, analyses: List[Dict[str, Any]]) -> str:
        """Generate endpoint analysis section."""
        if not analyses:
            return ""

        latest = analyses[0]
        endpoints = latest["summary"]["endpoint_stats"][:20]  # Top 20 endpoints

        html = """
        <div class="section">
            <h2>🔍 Endpoint Performance Analysis</h2>
            <table>
                <thead>
                    <tr>
                        <th>Endpoint</th>
                        <th>Requests</th>
                        <th>Avg Response</th>
                        <th>95th %ile</th>
                        <th>RPS</th>
                        <th>Error Rate</th>
                    </tr>
                </thead>
                <tbody>
        """

        for endpoint in endpoints:
            error_rate = (
                (endpoint["failures"] / endpoint["requests"] * 100)
                if endpoint["requests"] > 0
                else 0
            )

            html += f"""
                    <tr>
                        <td class="endpoint-url">{endpoint['endpoint']}</td>
                        <td>{endpoint['requests']:,}</td>
                        <td>{endpoint['avg_response_time']:.3f}s</td>
                        <td>{endpoint['95p_response_time']:.3f}s</td>
                        <td>{endpoint['rps']:.2f}</td>
                        <td>{error_rate:.2f}%</td>
                    </tr>
            """

        html += """
                </tbody>
            </table>
        </div>
        """
        return html

    def _generate_target_analysis(self, analyses: List[Dict[str, Any]]) -> str:
        """Generate target analysis section."""
        if not analyses:
            return ""

        latest = analyses[0]
        target_check = latest["target_analysis"]

        html = """
        <div class="section">
            <h2>🎯 Performance Target Analysis</h2>
            <table>
                <thead>
                    <tr>
                        <th>Metric</th>
                        <th>Target</th>
                        <th>Actual</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
        """

        for check in target_check["checks"]:
            status_class = "status-pass" if check["passed"] else "status-fail"
            status_text = "PASS" if check["passed"] else "FAIL"

            html += f"""
                    <tr>
                        <td>{check['metric']}</td>
                        <td>{check['target']:.3f}</td>
                        <td>{check['actual']:.3f}</td>
                        <td><span class="status-badge {status_class}">{status_text}</span></td>
                    </tr>
            """

        html += """
                </tbody>
            </table>
        </div>
        """
        return html

    def generate_report(self, test_id: "Optional[str]" = None) -> bool:
        """Generate comprehensive HTML report."""
        print("📄 Generating load test report...")

        # Find analysis files
        analysis_files = self.find_analysis_files()
        if not analysis_files:
            print("❌ No analysis files found")
            return False

        # Load all analyses
        analyses = []
        for analysis_file in analysis_files:
            try:
                analysis = self.load_analysis(analysis_file)
                analyses.append(analysis)
            except Exception as e:
                print(f"⚠️  Error loading {analysis_file}: {e}")

        if not analyses:
            print("❌ No valid analysis files found")
            return False

        # Sort by timestamp (newest first)
        analyses.sort(key=lambda x: x.get("generated_at", ""), reverse=True)

        # Filter by test_id if specified
        if test_id:
            analyses = [a for a in analyses if a["summary"]["test_id"] == test_id]
            if not analyses:
                print(f"❌ Test ID '{test_id}' not found")
                return False

        # Generate HTML report
        html_content = self.generate_html_report(analyses)

        # Save report
        report_file = (
            self.output_dir
            / f"load_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
        )
        with open(report_file, "w", encoding="utf-8") as f:
            f.write(html_content)

        print(f"✅ Report generated: {report_file}")
        print(f"   Open in browser: file://{report_file.absolute()}")

        return True


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Load Test Report Generator")
    parser.add_argument("--test-id", help="Specific test ID to generate report for")
    parser.add_argument(
        "--results-dir", default="load-testing/results", help="Results directory path"
    )
    parser.add_argument(
        "--output-dir",
        default="load-testing/reports",
        help="Output directory for reports",
    )

    args = parser.parse_args()

    results_dir = Path(args.results_dir)
    output_dir = Path(args.output_dir)

    if not results_dir.exists():
        print(f"❌ Results directory not found: {results_dir}")
        sys.exit(1)

    output_dir.mkdir(exist_ok=True)

    generator = LoadTestReportGenerator(results_dir, output_dir)
    success = generator.generate_report(args.test_id)

    if success:
        print("🎉 Report generation complete!")
    else:
        print("❌ Report generation failed!")
        sys.exit(1)


if __name__ == "__main__":
    main()
