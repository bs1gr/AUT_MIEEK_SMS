# Phase 6: Performance Monitoring Dashboard

**Status:** 📋 DESIGN DOCUMENT  
**Target Implementation Date:** After Phase 5  
**Effort Estimate:** Medium-High (3-4 days)

---

## Executive Summary

Phase 6 implements **real-time CI/CD performance monitoring** via a custom GitHub Actions dashboard. This provides visibility into pipeline health, identifies bottlenecks, tracks trends, and quantifies ROI from Phases 1-5.

### Goals
1. **Metrics Collection:** Capture job durations, costs, success rates
2. **Trend Analysis:** Track performance over time (builds → weeks → months)
3. **Bottleneck Identification:** Show slowest jobs and opportunities
4. **Cost Tracking:** GitHub Actions minutes and associated costs
5. **ROI Dashboard:** Visualize savings from optimization phases

### Benefits
- **Visibility:** Real-time pipeline health status
- **Accountability:** Track improvements from previous phases
- **Optimization:** Data-driven decisions for future improvements
- **Reporting:** Executive summaries for stakeholders

---

## Current State

### Metrics Available Today
```
✅ Build duration (per run)
✅ Job status (pass/fail/skip)
✅ Artifact sizes
❌ Historical trends
❌ Cost tracking
❌ Performance comparisons
❌ Bottleneck analysis
```

### Information Gaps
- How much time did we save with Phase 1-3?
- Which jobs are slowest?
- Is caching working effectively?
- Monthly cost trend?
- Compared to 3 months ago?

---

## Phase 6 Design

### 1. Metrics Collection

#### Job-Level Metrics
```yaml
jobs:
  lint-backend:
    steps:
      - name: Lint
        id: lint
        run: ...
      
      - name: Capture job metrics
        if: always()
        run: |
          cat > metrics.json <<EOF
          {
            "job_name": "${{ github.job }}",
            "status": "${{ job.status }}",
            "start_time": "${{ job.start_time }}",
            "duration_seconds": ${{ steps.lint.outputs.duration }},
            "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
          }
          EOF
      
      - name: Upload metrics
        uses: actions/upload-artifact@v4
        with:
          name: metrics-${{ github.run_id }}
          path: metrics.json
```

#### Run-Level Metrics
```yaml
jobs:
  collect-run-metrics:
    name: Collect CI/CD Metrics
    runs-on: ubuntu-latest
    if: always()
    needs: [lint-backend, lint-frontend, run-tests, ...]
    steps:
      - name: Calculate total duration
        run: |
          TOTAL_DURATION=$((END_TIME - START_TIME))
          
          cat > run-metrics.json <<EOF
          {
            "run_id": ${{ github.run_id }},
            "run_number": ${{ github.run_number }},
            "branch": "${{ github.ref }}",
            "event": "${{ github.event_name }}",
            "total_duration_seconds": $TOTAL_DURATION,
            "job_count": 15,
            "successful_jobs": ${{ env.SUCCESSFUL_JOBS }},
            "failed_jobs": ${{ env.FAILED_JOBS }},
            "skipped_jobs": ${{ env.SKIPPED_JOBS }},
            "estimated_cost_usd": $(echo "scale=2; $TOTAL_DURATION / 60 * 0.008" | bc),
            "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
          }
          EOF
      
      - name: Store metrics in database
        env:
          METRICS_API_KEY: ${{ secrets.METRICS_API_KEY }}
        run: |
          # Send to metrics server
          curl -X POST https://metrics.sms-app.dev/api/runs \
            -H "Authorization: Bearer $METRICS_API_KEY" \
            -H "Content-Type: application/json" \
            -d @run-metrics.json
```

### 2. Metrics Database

#### Schema (PostgreSQL)
```sql
-- Runs table
CREATE TABLE ci_runs (
    id BIGSERIAL PRIMARY KEY,
    github_run_id BIGINT UNIQUE,
    branch VARCHAR(255),
    event_type VARCHAR(50),
    total_duration_seconds INT,
    job_count INT,
    successful_jobs INT,
    failed_jobs INT,
    skipped_jobs INT,
    estimated_cost_usd DECIMAL(10,2),
    timestamp TIMESTAMP
);

-- Jobs table
CREATE TABLE ci_jobs (
    id BIGSERIAL PRIMARY KEY,
    run_id BIGINT REFERENCES ci_runs(id),
    job_name VARCHAR(255),
    status VARCHAR(20),
    duration_seconds INT,
    timestamp TIMESTAMP
);

-- Daily metrics (aggregated)
CREATE TABLE ci_daily_metrics (
    date DATE PRIMARY KEY,
    total_runs INT,
    avg_duration_seconds INT,
    min_duration_seconds INT,
    max_duration_seconds INT,
    total_cost_usd DECIMAL(10,2),
    success_rate DECIMAL(5,2),
    cache_hit_rate DECIMAL(5,2)
);
```

#### Query Examples
```sql
-- Average build time this week
SELECT AVG(total_duration_seconds) FROM ci_runs
WHERE timestamp >= NOW() - INTERVAL '7 days'
AND branch = 'main';

-- Slowest jobs
SELECT job_name, AVG(duration_seconds) as avg_time
FROM ci_jobs
GROUP BY job_name
ORDER BY avg_time DESC
LIMIT 10;

-- Monthly cost trend
SELECT DATE_TRUNC('month', timestamp) as month,
       SUM(estimated_cost_usd) as monthly_cost
FROM ci_runs
GROUP BY month
ORDER BY month DESC;
```

### 3. Dashboard UI

#### Technology Stack
- **Backend:** FastAPI (Python) or Node.js/Express
- **Frontend:** React + Recharts (charts) or D3.js
- **Database:** PostgreSQL
- **Hosting:** GitHub Pages (static) or Vercel/Heroku (dynamic)

#### Dashboard Sections

**A. Overview Card**
```
┌─────────────────────────────────────┐
│  CI/CD Pipeline Health              │
├─────────────────────────────────────┤
│ Latest Run: #12345 ✅ 18 min        │
│ Success Rate: 94.2% (this week)    │
│ Avg Duration: 15.3 min (-40% ↓)    │
│ Monthly Cost: $145.20               │
└─────────────────────────────────────┘
```

**B. Build Time Trend (Line Chart)**
```
Duration (minutes)
        30 ┤
           │     ╱╲
        20 ┤   ╱    ╲
           │ ╱        ╲ Phase 5
        10 ┤           ╲___
           │ (Phase 1-3)
         0 └────────────────
            May    Jun   Jul
```

**C. Job Duration Breakdown (Bar Chart)**
```
Duration (sec)
        300 ┤ ┌─────┐
        200 ┤ │     │ ┌─────┐
        100 ┤ │     │ │     │ ┌─┐
          0 ┤ └─────┘ └─────┘ └─┘
              Build  Tests  Deploy
```

**D. Cost Tracking (Area Chart)**
```
Cost ($)
     200 ┤     ╱╲
         │   ╱    ╲
     100 ┤ ╱        ╲_
         │              ╲____
       0 └─────────────────────
         May    Jun   Jul
         (Before optimization)
```

**E. Slowest Jobs (Table)**
```
| Job               | Avg Time | Trend  | Status |
|-------------------|----------|--------|--------|
| build-docker      | 8m 20s   | -25% ↓ | ✅     |
| integration-tests | 5m 10s   | -10% ↓ | ✅     |
| e2e-tests         | 12m 30s  | -40% ↓ | ⚠️     |
```

**F. ROI Summary (Stats)**
```
┌─────────────────────────────────────┐
│  CI/CD Optimization ROI              │
├─────────────────────────────────────┤
│ Time Saved/Month: 42 hours          │
│ Cost Saved/Month: $184              │
│ Developer Productivity: +15%         │
│ Deployment Frequency: +30%           │
└─────────────────────────────────────┘
```

### 4. Alerting

#### Thresholds
```yaml
alerts:
  - name: "Build time regression"
    condition: "avg_duration > baseline * 1.2"
    action: "Notify #ci-cd channel"
  
  - name: "High failure rate"
    condition: "failure_rate > 10%"
    action: "Page on-call engineer"
  
  - name: "Cache hit rate drop"
    condition: "cache_hit_rate < 0.6"
    action: "Notify #devops"
  
  - name: "Cost spike"
    condition: "monthly_cost > budget * 1.1"
    action: "Alert finance team"
```

#### Integration
```yaml
- Slack notifications
- GitHub Issues (auto-created)
- Email summaries (daily/weekly)
- PagerDuty (critical alerts)
```

---

## Implementation Architecture

### High-Level Flow
```
GitHub Actions
     ↓ (metrics collected)
Artifact Storage
     ↓ (downloaded)
Metrics Ingestion Service
     ↓ (normalized)
PostgreSQL Database
     ↓ (queried)
API Server (FastAPI)
     ↓ (served)
Frontend Dashboard (React)
```

### Components

#### 1. Metrics Collection Script
**Location:** `scripts/ci/collect-metrics.sh`

```bash
#!/bin/bash
# Collect and upload CI/CD metrics from run

RUN_ID=${{ github.run_id }}
DURATION=$SECONDS
START_TIME=${{ job.start_time }}

# Gather job status from all steps
JOBS_DATA=$(gh run view $RUN_ID --json jobs --jq '.[].jobs[]')

# Create metrics JSON
cat > metrics.json <<EOF
{
  "run_id": "$RUN_ID",
  "duration_seconds": $DURATION,
  "jobs": $JOBS_DATA
}
EOF

# Upload to metrics service
curl -X POST $METRICS_ENDPOINT/api/collect \
  -H "Authorization: Bearer $METRICS_TOKEN" \
  -d @metrics.json
```

#### 2. Metrics Ingestion Service
**Technology:** FastAPI  
**Location:** `services/metrics-api/`

```python
# services/metrics_api/main.py
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy import create_engine
from datetime import datetime

app = FastAPI()
db = create_engine("postgresql://...")

@app.post("/api/runs")
async def ingest_run_metrics(metrics: RunMetrics):
    """Ingest CI run metrics."""
    # Normalize data
    run = CIRun(
        github_run_id=metrics.run_id,
        total_duration_seconds=metrics.duration,
        timestamp=datetime.utcnow(),
        ...
    )
    
    db.add(run)
    db.commit()
    
    return {"status": "ok", "run_id": run.id}

@app.get("/api/runs")
async def get_run_metrics(
    days: int = 7,
    branch: str = "main"
):
    """Get historical run metrics."""
    runs = db.query(CIRun).filter(
        CIRun.timestamp >= datetime.utcnow() - timedelta(days=days),
        CIRun.branch == branch
    ).all()
    
    return runs

@app.get("/api/jobs/{job_name}")
async def get_job_metrics(job_name: str, days: int = 30):
    """Get job-specific metrics."""
    jobs = db.query(CIJob).filter(
        CIJob.job_name == job_name,
        CIJob.timestamp >= datetime.utcnow() - timedelta(days=days)
    ).all()
    
    return {
        "job_name": job_name,
        "avg_duration": statistics.mean(j.duration for j in jobs),
        "max_duration": max(j.duration for j in jobs),
        "min_duration": min(j.duration for j in jobs),
        "trend": calculate_trend(jobs)
    }
```

#### 3. Frontend Dashboard
**Technology:** React + Recharts  
**Location:** `services/dashboard/`

```jsx
// services/dashboard/pages/Overview.jsx
import React, { useEffect, useState } from 'react';
import { LineChart, BarChart } from 'recharts';

export function OverviewDashboard() {
  const [metrics, setMetrics] = useState(null);
  
  useEffect(() => {
    // Fetch metrics from API
    fetch('/api/runs?days=30&branch=main')
      .then(r => r.json())
      .then(data => setMetrics(data));
  }, []);
  
  if (!metrics) return <div>Loading...</div>;
  
  return (
    <div className="dashboard">
      {/* Overview cards */}
      <OverviewCard metrics={metrics} />
      
      {/* Build time trend */}
      <LineChart data={metrics.history} />
      
      {/* Job breakdown */}
      <BarChart data={metrics.jobs} />
      
      {/* ROI summary */}
      <ROISummary phases={metrics.phases} />
    </div>
  );
}
```

---

## Metrics to Track

### Per-Run Metrics
- Run ID, branch, event type
- Total duration, job count
- Success/failure/skip counts
- Estimated cost (GitHub Actions minutes)
- Timestamp

### Per-Job Metrics
- Job name, status
- Duration (seconds)
- Start time, end time
- Memory usage (if available)
- Cache hit/miss

### Aggregated Metrics
- Weekly averages
- Monthly totals
- Phase-over-phase comparison
- Slowest jobs (top 10)
- Success rate

### Business Metrics
- Monthly GitHub Actions cost
- Developer time saved
- Deployment frequency
- Lead time for changes
- Mean time to recovery (MTTR)

---

## Dashboard Examples

### Build Time Trend (Expected after Phase 5)
```
June:   Average 25 min (baseline)
July:   Average 15 min (-40%)
August: Average 8 min (-68%)

ROI: 90 hours saved, $360 cost reduction
```

### Cost Tracking
```
May:    $285 (40 runs × 10 min avg × $0.008/min)
June:   $185 (40 runs × 6 min avg)  ← Phase 1-3 impact
July:   $95  (40 runs × 3 min avg)  ← Phase 5 impact
Annual: $1,140 → $740 (-35% savings)
```

### Job Performance
```
Job              | May Avg | July Avg | Improvement
─────────────────|─────────|──────────|─────────────
lint-backend     | 2m 30s  | 1m 10s   | -53%
run-unit-tests   | 3m 45s  | 2m 20s   | -38%
build-docker     | 8m 30s  | 3m 20s   | -61%
deploy-staging   | 2m 15s  | 1m 45s   | -22%
```

---

## Deployment & Hosting

### Option A: GitHub Pages (Static)
**Pros:** Free, simple, no server  
**Cons:** Real-time updates limited

```bash
# Build React dashboard
npm run build --prefix services/dashboard

# Deploy to GitHub Pages
gh-pages --directory services/dashboard/build
```

### Option B: Vercel (Dynamic)
**Pros:** Fast, serverless, auto-scaling  
**Cons:** Small cost (~$5-10/month)

```bash
# Deploy frontend + API
vercel --prod
```

### Option C: Self-Hosted (Docker)
**Pros:** Full control, no external dependencies  
**Cons:** Requires infrastructure

```dockerfile
FROM node:24 as frontend
WORKDIR /app
COPY services/dashboard . 
RUN npm install && npm run build

FROM python:3.11 as backend
WORKDIR /app
COPY services/metrics-api .
RUN pip install -r requirements.txt
CMD ["uvicorn", "main:app", "--host", "0.0.0.0"]
```

---

## Timeline

### Week 1: Backend
- [ ] Design database schema
- [ ] Implement metrics API
- [ ] Setup PostgreSQL
- [ ] Test data ingestion

### Week 2: Collection
- [ ] Update CI/CD pipeline to send metrics
- [ ] Test metrics flow end-to-end
- [ ] Populate historical data
- [ ] Validate data quality

### Week 3: Frontend
- [ ] Build React dashboard
- [ ] Implement charts and visualizations
- [ ] Add filtering and time ranges
- [ ] Performance tuning

### Week 4: Deployment & Monitoring
- [ ] Deploy to production
- [ ] Setup alerting
- [ ] Monitor for issues
- [ ] Iterate based on feedback

---

## Success Metrics

### Adoption
- [ ] Dashboard viewed 5+ times/week
- [ ] Team uses metrics for decisions
- [ ] Stakeholders engage with ROI data

### Reliability
- [ ] 99% metrics collection success
- [ ] <1 min latency (API responses)
- [ ] <500ms dashboard load time

### Accuracy
- [ ] Metrics within 5% of actual times
- [ ] Cost calculations verified
- [ ] Trends validated manually

---

## Phase 6 vs Phases 1-5

| Phase | Focus | Impact | Effort |
|-------|-------|--------|--------|
| **1-3** | Implementation | -40% build time | 10 days |
| **4** | Features | -40% PR time | 3 days |
| **5** | Performance | -50% build time | 3 days |
| **6** | Visibility | Enables all above | 4 days |

---

## Questions & Answers

### Q: Is this dashboard only for ops?
**A:** No - useful for all teams. Developers see how their changes affect build time.

### Q: What if metrics API goes down?
**A:** CI/CD pipeline continues normally. Metrics are lost only for that run.

### Q: Can we use existing tools (Datadog, New Relic)?
**A:** Yes - Phase 6 can integrate with existing monitoring instead of custom implementation.

### Q: How long to implement?
**A:** 3-4 days for MVP. Full featured dashboard: 1-2 weeks.

---

## Summary

Phase 6 transforms optimization work into actionable insights:

✅ **Visibility:** Real-time pipeline health  
✅ **Accountability:** Quantified improvements from previous phases  
✅ **Optimization:** Data-driven decisions for future improvements  
✅ **Reporting:** Executive-friendly ROI metrics  

**End Result:** 30+ minute reduction in build times, $300+/month cost savings, measurable ROI from CI/CD investment.

---

**Document:** Phase 6 Design - Performance Monitoring Dashboard  
**Status:** 📋 DESIGN READY FOR IMPLEMENTATION  
**Date:** June 3, 2026
