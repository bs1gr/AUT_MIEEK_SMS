#!/usr/bin/env python3
"""
Consolidate multiple SARIF reports into a single unified report.

This script merges security scan results from different tools (pip-audit, npm-audit, trivy)
into a single SARIF file that can be uploaded to GitHub's Security tab.

Usage:
    python scripts/consolidate-sarif.py \
      --backend backend-audit.sarif \
      --frontend frontend-audit.sarif \
      --docker docker-audit.sarif \
      --output unified-audit-results.sarif

Supports individual or multiple SARIF sources.
"""

import json
import argparse
import sys
from pathlib import Path
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict


@dataclass
class ConsolidationStats:
    """Statistics about consolidation."""
    total_files: int
    total_results: int
    backend_results: int
    frontend_results: int
    docker_results: int
    duplicate_results: int


class SARIFConsolidator:
    """Consolidate multiple SARIF reports into a unified report."""

    def __init__(self, verbose: bool = False):
        self.verbose = verbose
        self.stats = ConsolidationStats(
            total_files=0,
            total_results=0,
            backend_results=0,
            frontend_results=0,
            docker_results=0,
            duplicate_results=0
        )

    def _log(self, message: str) -> None:
        """Log message if verbose."""
        if self.verbose:
            print(f"[DEBUG] {message}")

    def load_sarif(self, filepath: str) -> Optional[Dict[str, Any]]:
        """Load and validate SARIF file."""
        try:
            path = Path(filepath)
            if not path.exists():
                print(f"⚠️  File not found: {filepath}", file=sys.stderr)
                return None

            with open(path, 'r') as f:
                data = json.load(f)

            if 'runs' not in data or not isinstance(data['runs'], list):
                print(f"⚠️  Invalid SARIF format in {filepath}: missing or invalid 'runs'", file=sys.stderr)
                return None

            self._log(f"✅ Loaded {filepath}: {len(data['runs'])} run(s)")
            return data

        except json.JSONDecodeError as e:
            print(f"❌ Failed to parse {filepath}: {e}", file=sys.stderr)
            return None
        except Exception as e:
            print(f"❌ Error loading {filepath}: {e}", file=sys.stderr)
            return None

    def _deduplicate_results(self, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Remove duplicate results based on ruleId + message."""
        seen = set()
        unique = []

        for result in results:
            rule_id = result.get('ruleId', 'unknown')
            message = result.get('message', {}).get('text', '')
            location = result.get('locations', [{}])[0].get('physicalLocation', {}).get('artifactLocation', {}).get('uri', '')

            # Create a simple signature to detect duplicates
            signature = (rule_id, message, location)

            if signature not in seen:
                seen.add(signature)
                unique.append(result)
            else:
                self.stats.duplicate_results += 1
                self._log(f"Duplicate found: {rule_id} - {message[:50]}")

        return unique

    def consolidate(self, backend_file: Optional[str], frontend_file: Optional[str], docker_file: Optional[str]) -> Dict[str, Any]:
        """Merge multiple SARIF reports into unified report."""
        all_results = []
        tool_sources = []

        # Load backend scan
        if backend_file:
            self._log("Loading backend SARIF...")
            backend_sarif = self.load_sarif(backend_file)
            if backend_sarif:
                self.stats.total_files += 1
                for run in backend_sarif.get('runs', []):
                    results = run.get('results', [])
                    all_results.extend(results)
                    self.stats.backend_results = len(results)
                    tool_name = run.get('tool', {}).get('driver', {}).get('name', 'backend-scanner')
                    tool_sources.append(tool_name)
                    self._log(f"Backend: {len(results)} results from {tool_name}")

        # Load frontend scan
        if frontend_file:
            self._log("Loading frontend SARIF...")
            frontend_sarif = self.load_sarif(frontend_file)
            if frontend_sarif:
                self.stats.total_files += 1
                for run in frontend_sarif.get('runs', []):
                    results = run.get('results', [])
                    all_results.extend(results)
                    self.stats.frontend_results = len(results)
                    tool_name = run.get('tool', {}).get('driver', {}).get('name', 'frontend-scanner')
                    tool_sources.append(tool_name)
                    self._log(f"Frontend: {len(results)} results from {tool_name}")

        # Load docker scan
        if docker_file:
            self._log("Loading docker SARIF...")
            docker_sarif = self.load_sarif(docker_file)
            if docker_sarif:
                self.stats.total_files += 1
                for run in docker_sarif.get('runs', []):
                    results = run.get('results', [])
                    all_results.extend(results)
                    self.stats.docker_results = len(results)
                    tool_name = run.get('tool', {}).get('driver', {}).get('name', 'docker-scanner')
                    tool_sources.append(tool_name)
                    self._log(f"Docker: {len(results)} results from {tool_name}")

        # Deduplicate
        self._log(f"Total results before deduplication: {len(all_results)}")
        unique_results = self._deduplicate_results(all_results)
        self._log(f"Total results after deduplication: {len(unique_results)}")

        self.stats.total_results = len(unique_results)

        # Create unified report
        unified = {
            'version': '2.1.0',
            '$schema': 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
            'runs': [{
                'tool': {
                    'driver': {
                        'name': 'Unified Security Audit',
                        'version': '1.0.0',
                        'informationUri': 'https://github.com/SMS-Student-Management-System',
                        'rules': self._extract_rules(all_results)
                    }
                },
                'results': unique_results,
                'properties': {
                    'sources': tool_sources,
                    'duplicate_count': self.stats.duplicate_results
                }
            }]
        }

        return unified

    def _extract_rules(self, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Extract unique rules from results."""
        rules = {}

        for result in results:
            rule_id = result.get('ruleId')
            if rule_id and rule_id not in rules:
                rules[rule_id] = {
                    'id': rule_id,
                    'shortDescription': {
                        'text': result.get('message', {}).get('text', 'Security finding')
                    },
                    'properties': {
                        'severity': result.get('level', 'warning')
                    }
                }

        return list(rules.values())

    def save(self, data: Dict[str, Any], output_path: str) -> bool:
        """Save unified SARIF to file."""
        try:
            path = Path(output_path)
            path.parent.mkdir(parents=True, exist_ok=True)

            with open(path, 'w') as f:
                json.dump(data, f, indent=2)

            self._log(f"✅ Saved unified SARIF to {output_path}")
            return True

        except Exception as e:
            print(f"❌ Failed to save SARIF: {e}", file=sys.stderr)
            return False

    def print_stats(self) -> None:
        """Print consolidation statistics."""
        print("\n📊 Consolidation Statistics:")
        print(f"  Files processed:      {self.stats.total_files}")
        print(f"  Backend results:      {self.stats.backend_results}")
        print(f"  Frontend results:     {self.stats.frontend_results}")
        print(f"  Docker results:       {self.stats.docker_results}")
        print(f"  Total (before dedup): {self.stats.backend_results + self.stats.frontend_results + self.stats.docker_results}")
        print(f"  Duplicates removed:   {self.stats.duplicate_results}")
        print(f"  Final count:          {self.stats.total_results}")

        if self.stats.duplicate_results > 0:
            dedup_percent = (self.stats.duplicate_results / (self.stats.backend_results + self.stats.frontend_results + self.stats.docker_results)) * 100
            print(f"  Dedup rate:           {dedup_percent:.1f}%")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Consolidate multiple SARIF security scan reports'
    )
    parser.add_argument(
        '--backend',
        help='Backend security audit SARIF file (pip-audit)',
        default=None
    )
    parser.add_argument(
        '--frontend',
        help='Frontend security audit SARIF file (npm-audit)',
        default=None
    )
    parser.add_argument(
        '--docker',
        help='Docker security audit SARIF file (trivy)',
        default=None
    )
    parser.add_argument(
        '--output',
        help='Output SARIF file path',
        default='unified-audit-results.sarif'
    )
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Enable verbose output'
    )

    args = parser.parse_args()

    # Validate at least one input file
    if not any([args.backend, args.frontend, args.docker]):
        parser.print_help()
        print("\n❌ Error: Provide at least one input SARIF file")
        sys.exit(1)

    print("🔄 Consolidating SARIF reports...")

    # Consolidate
    consolidator = SARIFConsolidator(verbose=args.verbose)
    unified = consolidator.consolidate(args.backend, args.frontend, args.docker)

    # Save
    if consolidator.save(unified, args.output):
        print(f"✅ Successfully consolidated to {args.output}")
        consolidator.print_stats()
        sys.exit(0)
    else:
        print(f"❌ Failed to save consolidated SARIF")
        sys.exit(1)


if __name__ == '__main__':
    main()
