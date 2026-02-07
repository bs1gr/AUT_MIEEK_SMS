# Load Testing CI Integration - Task #111

**Status**: ✅ COMPLETE (Jan 10, 2026)
**Effort**: 3-4 days (estimated)
**Timeline**: Jan 10-13, 2026
**Owner**: DevOps / Performance Engineer

---

## Overview

This document describes the load testing CI/CD integration for the Student Management System. Load tests run automatically on a weekly schedule and can be triggered manually for performance regression detection.

### Key Features

- ✅ **Weekly Automated Runs**: Performance baselines collected every Monday 2 AM UTC
- ✅ **Manual Trigger**: Dispatch tests with custom load profiles (smoke/light/medium/heavy/stress)
- ✅ **Multi-Environment Support**: Test staging and production
- ✅ **Performance Regression Detection**: Automatic comparison against baseline
- ✅ **Comprehensive Reporting**: HTML reports, metrics JSON, regression analysis
- ✅ **Non-Blocking**: Load tests don't block deployments (monitoring only)

---

## Workflow Configuration

### Triggers

The load testing workflow (`.github/workflows/load-testing.yml`) triggers on:

1. **Schedule** (Weekly):
   - Every Monday at 2:00 AM UTC
   - Runs smoke test (5 users, 30 seconds) on staging
   - Collects baseline metrics for trend analysis

2. **Manual Dispatch** (`workflow_dispatch`):
   - Custom environment (staging/production)
   - Custom load profile (smoke/light/medium/heavy/stress)
   - Test parameters configurable via GitHub UI
   - **Access**: Go to Actions tab → Load Testing → Run workflow

3. **Push to Branches**:
   - Triggers on changes to load-testing/, backend/, or workflow file
   - Runs on main and develop branches
   - Smoke test (light profile) to catch regressions

### Load Profiles

| Profile | Users | Spawn Rate | Duration | Purpose | Target Env |
|---------|-------|-----------|----------|---------|-----------|
| **smoke** | 5 | 5/s | 30s | Quick validation | Any |
| **light** | 10 | 2/s | 5m | Weekly baseline | Staging |
| **medium** | 50 | 5/s | 10m | Performance trend | Staging |
| **heavy** | 100 | 10/s | 15m | Stress testing | Staging |
| **stress** | 200 | 20/s | 10m | Maximum load | Staging (manual) |

---

## Performance Baselines

### Target Metrics (p95 Response Time)

These are the performance targets for the load testing baseline:

```json
{
  "GET /api/v1/students": {
    "p95_ms": 100,
    "description": "List all students"
  },
  "POST /api/v1/students": {
    "p95_ms": 200,
    "description": "Create student"
  },
  "GET /api/v1/courses": {
    "p95_ms": 100,
    "description": "List all courses"
  },
  "POST /api/v1/courses": {
    "p95_ms": 150,
    "description": "Create course"
  },
  "GET /api/v1/grades": {
    "p95_ms": 200,
    "description": "List grades"
  },
  "POST /api/v1/grades": {
    "p95_ms": 250,
    "description": "Submit grade"
  },
  "GET /api/v1/attendance": {
    "p95_ms": 100,
    "description": "List attendance records"
  },
  "POST /api/v1/attendance": {
    "p95_ms": 80,
    "description": "Log attendance"
  },
  "POST /api/v1/auth/login": {
    "p95_ms": 500,
    "description": "User login"
  },
  "POST /api/v1/analytics/dashboard": {
    "p95_ms": 1000,
    "description": "Dashboard metrics (heavy query)"
  }
}
```

### Baseline Collection

The baseline is updated after each successful load test run:

1. **Artifact Location**: `load-test-metrics` artifact in GitHub Actions
2. **File**: `load-testing/baseline.json` (version controlled)
3. **Update Frequency**: After each weekly run
4. **Retention**: 90 days (artifacts)

**Historical Baselines**:
- v1.15.1 (Jan 7, 2026): Initial baseline established
- Updated weekly on Mondays 2:30-3:00 AM UTC

---

## Regression Detection

### How It Works

1. **Current Test Run**:
   - Load test executes with defined profile
   - Metrics collected in `results/loadtest_stats.csv`

2. **Comparison**:
   - Script `scripts/check_regression.py` compares current vs baseline
   - Calculates percentage change for each endpoint
   - Flags regressions >20% increase

3. **Report Generation**:
   - Creates `results/regression_report.json`
   - Detailed breakdown by endpoint
   - Recommendations for investigation

### Example Output

```json
{
  "test_date": "2026-01-10T02:00:00Z",
  "status": "pass",
  "regressions_detected": 0,
  "performance_changes": [
    {
      "endpoint": "GET /api/v1/students",
      "baseline_p95": 100,
      "current_p95": 105,
      "change_percent": 5.0,
      "status": "ok"
    },
    {
      "endpoint": "POST /api/v1/attendance",
      "baseline_p95": 80,
      "current_p95": 95,
      "change_percent": 18.75,
      "status": "ok"
    },
    {
      "endpoint": "POST /api/v1/analytics/dashboard",
      "baseline_p95": 1000,
      "current_p95": 1250,
      "change_percent": 25.0,
      "status": "regression_detected",
      "recommendation": "Investigate query optimization or database indexing"
    }
  ]
}
```

### Alerting Strategy

**Non-Critical (Informational)**:
- Changes 15-20%: Logged as warning
- Action: Review logs, investigate if consistent pattern

**Critical (Action Required)**:
- Changes >20%: Flagged as regression
- Action: Create issue, investigate root cause
- Example: Database query N+1, unindexed table scan, memory leak

---

## Workflow Details

### Step 1: Checkout & Setup (2 min)

```yaml
- Checkout repository
- Set up Python 3.11 with pip caching
- Install dependencies from load-testing/requirements.txt
```

### Step 2: Configure Environment (1 min)

```bash
# Determine test parameters
environment: staging or production (from input)
profile: smoke/light/medium/heavy/stress
api_url: Derived from environment
timestamp: Current UTC timestamp
```

### Step 3: Start Backend (for staging only)

```bash
# Start FastAPI uvicorn on 127.0.0.1:8000
# Wait for /health endpoint to respond (up to 30 seconds)
# Timeout: Fail workflow if backend doesn't start
```

### Step 4: Run Load Tests (5-15 min depending on profile)

```bash
locust \
  --host=$API_URL \
  --users=$USERS \
  --spawn-rate=$SPAWN_RATE \
  --run-time=${DURATION}s \
  --headless \
  --csv=results/loadtest
```

**Locust Output Files**:
- `results/loadtest_stats.csv` - Endpoint statistics
- `results/loadtest_failures.csv` - Failed requests
- `results/loadtest_stats_history.csv` - Time series data
- `results/loadtest_report.html` - Interactive report

### Step 5: Analyze Results (1 min)

```python
# Parse CSV results
# Extract metrics for each endpoint
# Calculate p95, p99, error rates
# Output to results/analysis.json
```

### Step 6: Check Regressions (1 min)

```python
# Load baseline.json
# Compare current metrics vs baseline
# Flag regressions >20%
# Output to results/regression_report.json
```

### Step 7: Generate Report (1 min)

```python
# Create performance_report.md
# Include endpoint breakdown
# Regression summary
# Recommendations
```

### Step 8: Extract Metrics (1 min)

```python
# Create structured metrics.json
# Include test metadata
# Endpoint performance data
# Environment/profile info
```

### Step 9: Upload Artifacts (1 min)

```
load-test-results-{env}-{profile}/
├── loadtest_stats.csv
├── loadtest_failures.csv
├── loadtest_report.html
├── analysis.json
├── regression_report.json
└── performance_report.md

load-test-metrics/
├── metrics.json
```

### Step 10: Comment on PR (optional)

```markdown
### 📊 Load Testing Results

**Profile**: light
**Environment**: staging

- ✅ Load test completed
- 📊 Metrics available in artifacts
- Performance targets: All met
```

---

## Running Load Tests Manually

### Via GitHub Actions UI

1. Go to: **Actions** → **Load Testing**
2. Click: **Run workflow**
3. Configure:
   - **Environment**: staging or production
   - **Load profile**: smoke/light/medium/heavy/stress
4. Click: **Run workflow**
5. Wait: 5-20 minutes (depending on profile)
6. Review: Artifacts and job summary

### Via GitHub CLI

```bash
# List available workflows
gh workflow list

# Run load testing workflow
gh workflow run load-testing.yml \
  -f environment=staging \
  -f load_profile=light

# View run details
gh run view --repo bs1gr/AUT_MIEEK_SMS
```

### Local Testing

```bash
cd load-testing

# Install dependencies
pip install -r requirements.txt

# Run smoke test
python scripts/run_load_tests.py --scenario smoke --env development

# Run light load test
python scripts/run_load_tests.py --scenario light --env development

# Run heavy stress test
python scripts/run_load_tests.py --scenario heavy --env development

# Analyze results
python scripts/analyze_results.py --results-dir results/

# Check regression
python scripts/check_regression.py --baseline baseline.json --current results/analysis.json
```

---

## Monitoring & Maintenance

### Weekly Monitoring Checklist

**Every Monday after 2:30 AM UTC** (after scheduled run completes):

- [ ] Access GitHub Actions → Load Testing workflow
- [ ] Check workflow run status (should be green ✅)
- [ ] Download `load-test-metrics` artifact
- [ ] Review `metrics.json` for baseline values
- [ ] Check `regression_report.json` for any flags
- [ ] If regressions detected:
  - [ ] Create GitHub issue with regression details
  - [ ] Link to performance report artifact
  - [ ] Assign to performance team for investigation

### Monthly Analysis

**First week of each month**:

1. **Collect Data**:
   - Download all `load-test-metrics` from past month
   - Extract metrics.json files

2. **Trend Analysis**:
   - Calculate p95 trend for each endpoint
   - Identify improving/degrading metrics
   - Check for seasonal patterns

3. **Report**:
   - Create monthly performance summary
   - Document any concerning trends
   - Update baseline if drift detected

### Troubleshooting

#### Workflow Fails at "Run load tests"

**Symptom**: `locust: command not found`

**Solution**:
```bash
cd load-testing
pip install -r requirements.txt
# Check requirements.txt includes locust
```

**Root Cause**: `requirements.txt` doesn't include locust package

---

#### Backend won't start

**Symptom**: "Backend failed to start" after 30 sec timeout

**Solution**:
```bash
# Check backend logs
tail -f logs/app.log

# Verify dependencies
pip install -r backend/requirements.txt

# Try manual start
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

**Root Cause**: Missing dependencies, database issues, or configuration errors

---

#### Regression detected but unclear why

**Investigation Steps**:

1. Compare baseline vs current metrics
2. Check backend logs for errors during test
3. Review database statistics (slow queries)
4. Check for recent code changes
5. Run test again to verify consistency

**Tools**:
```bash
# View slow queries (if enabled)
curl http://localhost:8000/api/v1/admin/performance

# Check database logs
sqlite3 data/student_management.db ".log stderr"

# Profile API performance
python -m cProfile -s cumtime backend/main.py
```

---

## Integration with CI/CD

### GitHub Actions Integration

The load testing workflow is integrated into the main CI/CD pipeline:

- **Trigger**: Manual dispatch or weekly schedule
- **Non-blocking**: Doesn't fail the build
- **Artifacts**: 90-day retention
- **Notifications**: Optional Slack/Teams via webhook

### Example: Daily Performance Dashboard

```python
# daily_performance_summary.py
import json
from pathlib import Path

# Load latest metrics
metrics_dir = Path("artifacts/load-test-metrics-*")
latest = sorted(metrics_dir.glob("metrics.json"))[-1]

with open(latest) as f:
    metrics = json.load(f)

# Print summary
print(f"Performance Report - {metrics['timestamp']}")
print(f"Environment: {metrics['environment']}")
print(f"Profile: {metrics['profile']}")
print(f"\nEndpoint Performance (p95):")

for endpoint, stats in metrics['endpoints'].items():
    print(f"  {endpoint}: {stats['p95_response']}ms")
```

---

## Performance Targets Summary

### Read Operations (GET)

| Endpoint | p95 Target | Rationale |
|----------|-----------|-----------|
| `/api/v1/students` | 100ms | Simple list query |
| `/api/v1/courses` | 100ms | Simple list query |
| `/api/v1/grades` | 200ms | Join with students |
| `/api/v1/attendance` | 100ms | Indexed query |
| `/api/v1/analytics/dashboard` | 1000ms | Aggregation query |

### Write Operations (POST/PUT)

| Endpoint | p95 Target | Rationale |
|----------|-----------|-----------|
| `/api/v1/students` | 200ms | Insert + validation |
| `/api/v1/courses` | 150ms | Insert + validation |
| `/api/v1/grades` | 250ms | Insert + audit log |
| `/api/v1/attendance` | 80ms | Quick insert |
| `/api/v1/auth/login` | 500ms | Password hash + DB lookup |

### Error Rate Targets

- **Overall**: <1% (>99% success rate)
- **Read operations**: <0.1% (>99.9% success)
- **Write operations**: <1% (>99% success)
- **Auth operations**: <2% (>98% success - includes invalid creds)

---

## Deliverables

✅ **Completed Components**:

1. **Workflow Configuration** (`.github/workflows/load-testing.yml`)
   - Weekly scheduled runs
   - Manual dispatch support
   - Multi-environment configuration
   - Comprehensive logging

2. **Baseline Metrics** (`load-testing/baseline.json`)
   - 10+ endpoints defined
   - p95/p99 targets established
   - Error rate thresholds

3. **Regression Detection** (`scripts/check_regression.py`)
   - Automated comparison logic
   - >20% threshold alerts
   - Detailed reporting

4. **Performance Reporting** (`scripts/analyze_results.py`)
   - Metric extraction from CSV
   - Trend calculation
   - JSON output for archival

5. **Documentation** (this file)
   - Complete operational guide
   - Troubleshooting procedures
   - Monitoring checklist

---

## Success Criteria

✅ **Task #111 Complete When**:

- [x] Load testing workflow integrated into CI/CD
- [x] Weekly scheduled runs configured
- [x] Manual trigger support working
- [x] Performance baselines defined
- [x] Regression detection implemented
- [x] Artifacts retention configured (90 days)
- [x] Monitoring procedures documented
- [x] Troubleshooting guide provided
- [x] Success metrics from first run collected

---

## Next Steps

### Phase 2 Execution (Jan 27 - Mar 7)

- **Week 4 (Feb 17-21)**: Monitor load test metrics collection
- **Week 5 (Feb 24-28)**: Refine performance baselines based on production data
- **Week 6 (Mar 3-7)**: Final validation and release preparation

### Future Improvements

- **Phase 3**: Add real-time dashboard for performance monitoring
- **Phase 4**: ML-based anomaly detection for regressions
- **Phase 5**: Geographic load testing (multi-region)
- **Phase 6**: Database query profiling and optimization recommendations

---

**Document Owner**: DevOps Lead
**Last Updated**: January 10, 2026
**Status**: Ready for Phase 2 Execution
