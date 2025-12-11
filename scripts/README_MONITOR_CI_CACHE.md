# CI Cache Performance Monitoring

## Overview

The `monitor_ci_cache.py` script analyzes GitHub Actions workflow runs to collect empirical cache performance metrics. It helps validate the expected ~95% speedup from npm/Playwright/pip caching infrastructure.

## Installation

```bash
pip install requests
```

## Usage

### Basic Usage

```bash
# Analyze last 10 E2E test runs
python scripts/monitor_ci_cache.py

# Analyze last 20 runs
python scripts/monitor_ci_cache.py --runs 20

# Analyze runs since a specific date
python scripts/monitor_ci_cache.py --since 2025-12-11

# Save report to JSON file
python scripts/monitor_ci_cache.py --output cache_metrics.json

# Use GitHub token for higher rate limits (60/hour → 5000/hour)
python scripts/monitor_ci_cache.py --token YOUR_GITHUB_TOKEN
```

### Advanced Options

```bash
# Analyze specific workflow
python scripts/monitor_ci_cache.py --workflow ci-cd-pipeline.yml

# Different repository
python scripts/monitor_ci_cache.py --repo owner/repo --token YOUR_TOKEN

# Full example
python scripts/monitor_ci_cache.py \
  --workflow e2e-tests.yml \
  --runs 15 \
  --since 2025-12-11 \
  --output reports/cache_metrics_$(date +%Y%m%d).json \
  --token YOUR_GITHUB_TOKEN
```

## Output Format

### Summary Statistics

```json
{
  "workflow": "e2e-tests.yml",
  "analyzed_runs": 10,
  "date_range": {
    "start": "2025-12-11T10:00:00Z",
    "end": "2025-12-11T16:00:00Z"
  },
  "summary": {
    "npm_cache_hit_rate": "85.0%",
    "playwright_cache_hit_rate": "90.0%",
    "pip_cache_hit_rate": "88.0%",
    "avg_setup_time_with_cache": "16.2s",
    "avg_setup_time_without_cache": "130.5s",
    "estimated_time_saved": "114.3s (87.6% speedup)"
  }
}
```

### Detailed Run Metrics

Each run includes:
- **run_number**: GitHub Actions run number
- **run_id**: Unique run identifier
- **conclusion**: success/failure status
- **created_at**: Timestamp
- **metrics**: Detailed timing and cache hit information
  - `npm_cache_hit`: Boolean indicating npm cache hit
  - `playwright_cache_hit`: Boolean indicating Playwright browser cache hit
  - `pip_cache_hit`: Boolean indicating pip cache hit
  - `npm_install_time`: Seconds for npm ci
  - `playwright_install_time`: Seconds for Playwright browser install
  - `pip_install_time`: Seconds for pip install
  - `total_setup_time`: Sum of all installation times

## Cache Hit Detection

The script detects cache hits through:

1. **Explicit cache steps**: Looks for "Cache Playwright browsers", "Set up Node", "Set up Python" steps
2. **Fast setup times**: Considers setup-node/setup-python steps under 5 seconds as cache hits
3. **Installation timing**: Compares installation durations between cached and uncached runs

## Validation Workflow

1. **After caching implementation**: Run immediately to establish baseline
2. **After 5-10 runs**: Collect initial metrics to validate expected performance
3. **Weekly monitoring**: Track cache hit rates and time savings over time
4. **Monthly reporting**: Document cumulative time savings

Expected benchmarks:
- **Cache hit rate**: 85-90% (dependencies change infrequently)
- **Setup time with cache**: 15-20 seconds (npm 5s, Playwright 6s, pip 5s)
- **Setup time without cache**: 120-140 seconds (npm 40s, Playwright 60s, pip 30s)
- **Expected speedup**: 85-90% (105-120s savings)

## GitHub API Rate Limits

- **Without token**: 60 requests/hour (sufficient for occasional monitoring)
- **With token**: 5,000 requests/hour (recommended for automated monitoring)

Generate a personal access token at: https://github.com/settings/tokens
- Required scope: `public_repo` (for public repositories)
- Required scope: `repo` (for private repositories)

## Testing

Run the comprehensive test suite:

```bash
pytest scripts/tests/test_monitor_ci_cache.py -v
```

Test coverage:
- 13 tests covering all major functionality
- Mocked GitHub API calls (no network dependencies)
- Edge cases (empty projects, missing timestamps, API errors)

## Integration with CI/CD

### Scheduled Monitoring (GitHub Actions)

```yaml
name: Cache Performance Monitoring

on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday at midnight
  workflow_dispatch:

jobs:
  monitor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: pip install requests
      
      - name: Run monitoring
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          python scripts/monitor_ci_cache.py \
            --runs 20 \
            --since $(date -d '7 days ago' +%Y-%m-%d) \
            --output cache_metrics.json \
            --token $GITHUB_TOKEN
      
      - name: Upload results
        uses: actions/upload-artifact@v4
        with:
          name: cache-metrics
          path: cache_metrics.json
```

## Troubleshooting

### Rate Limit Errors

```
Error fetching workflow runs: 403 Client Error: rate limit exceeded
```

**Solution**: Use a GitHub token with `--token` parameter

### No Workflow Runs Found

```json
{"error": "No workflow runs found"}
```

**Solutions**:
- Check workflow filename (use exact name from `.github/workflows/`)
- Verify date range with `--since` parameter
- Ensure repository has recent workflow runs
- Check repository access permissions

### Network Errors

```
Error fetching workflow runs: Network error
```

**Solutions**:
- Check internet connection
- Verify GitHub API status: https://www.githubstatus.com/
- Retry with increased timeout (modify `timeout=30` in code)

## Related Documentation

- [CI Cache Optimization Guide](../docs/operations/CI_CACHE_OPTIMIZATION.md)
- [GitHub Actions Workflows](../.github/workflows/)
- [E2E Tests Workflow](../.github/workflows/e2e-tests.yml)
