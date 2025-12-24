# CI/CD Performance Optimization: npm Dependency Caching

**Version**: 1.11.2 (Empirically Validated)
**Date**: 2025-12-11
**Status**: Implemented (dynamic Playwright key) & pre-change validated

## Overview

Added npm dependency caching to GitHub Actions workflows to improve CI/CD pipeline speed. **Empirical analysis (Dec 11, 2025)** shows actual performance gains of **6.5% speedup (3-6s savings per run)**, differing from theoretical expectations due to already-optimized baseline.

> **📊 Empirical Analysis**: See [`../../CI_CACHE_EMPIRICAL_ANALYSIS.md`](../../CI_CACHE_EMPIRICAL_ANALYSIS.md) for detailed findings from 20 actual workflow runs.

---

## Changes Made

### E2E Tests Workflow (`.github/workflows/e2e-tests.yml`)

Added three caching enhancements:

#### 1. **npm Dependencies Caching**
```yaml
- name: Set up Node
  uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'
    cache-dependency-path: frontend/package-lock.json
```

**Impact**: Skips `npm ci` when dependencies haven't changed
- **Typical time saved**: 30-45 seconds per run
- **Condition**: Triggered on `package-lock.json` changes

#### 2. **Python Dependencies Caching** (verified; expanded dependency path)
```yaml
- name: Set up Python
  uses: actions/setup-python@v5
  with:
    python-version: '3.11'
    cache: 'pip'
    cache-dependency-path: backend/requirements*.txt
```

**Impact**: Skips pip install when `requirements.txt` unchanged
- **Typical time saved**: 20-30 seconds per run

#### 3. **Playwright Browsers Caching** (updated: dynamic version-based key)
```yaml
- name: Determine Playwright version
  id: pwver
  working-directory: ./frontend
  run: |
    echo "version=$(node -p \"require('./package.json').devDependencies['@playwright/test'].replace('^','')\")" >> $GITHUB_OUTPUT
    echo "minor=$(node -p \"require('./package.json').devDependencies['@playwright/test'].replace('^','').split('.').slice(0,2).join('.')\")" >> $GITHUB_OUTPUT

- name: Cache Playwright browsers
  uses: actions/cache@v4
  with:
    path: ~/.cache/ms-playwright
    key: playwright-${{ runner.os }}-${{ steps.pwver.outputs.version }}
    restore-keys: |
      playwright-${{ runner.os }}-${{ steps.pwver.outputs.minor }}
      playwright-${{ runner.os }}-
```

**Impact**: Caches pre-built Chromium browser
- **Typical time saved**: 45-60 seconds per run
- **Cache size**: ~300MB
- **Invalidation**: When `@playwright/test` version changes; restore keys provide minor-version fallback

---

## Performance Impact

### ⚠️ UPDATED: Empirical Results (Dec 11, 2025)

**Analysis of 20 actual E2E workflow runs** reveals different performance characteristics:

#### Actual Baseline (Without Explicit Cache)
- npm install: ~14-15 seconds (CDN-optimized)
- Playwright install: ~23-29 seconds (fast download)
- pip install: ~12-14 seconds (PyPI CDN)
- **Total overhead**: ~48-56 seconds per run

#### With Explicit Caching (Cache Hit)
- npm install: ~12-13 seconds (2-3s savings)
- Playwright install: ~16-18 seconds (7-11s savings)
- pip install: ~11-12 seconds (1-2s savings)
- **Total overhead**: ~39-45 seconds per run
- **Actual improvement**: **6.5% faster (~3-6 seconds saved)**

#### Empirical Cache Hit Rates (pre-change, 20 runs)
- npm cache: **75%** (target: 75-80% ✅)
- Playwright cache: **40%** (target: 60-70% ⚠️ needs improvement)
- pip cache: **45%** (target: 60-70% ⚠️ needs improvement)

> Note: The Playwright cache key was updated to a dynamic version-based strategy in $11.11.1. Post-change monitoring aims to raise Playwright hit rate to ≥60–70% and reduce install time variance.

### Why Actual vs Theoretical Differ

The **theoretical 95% speedup** assumed a worst-case 120-140s uncached baseline. Reality shows:

1. **GitHub Actions infrastructure** already provides implicit caching layers
2. **Package registry CDNs** (npm, PyPI) are extremely fast with global edge nodes
3. **SMS dependencies are lightweight**: ~50MB frontend, ~30MB backend, ~200MB single browser
4. **Baseline was already fast**: 48s (not 120s)

**Conclusion**: Explicit caching provides **marginal but valuable improvements** (6.5%) primarily for **consistency and reliability**, not dramatic speed gains.

### Realistic Monthly Impact
- **Per-run savings**: 3-6 seconds average
- **Monthly impact** (100 E2E runs): **5-10 minutes saved**
- **Annual impact**: **1-2 hours of CI time**
- **Cost savings**: ~$0.50-1.00/year (@$0.008/minute)

---

## CI Workflows Already Optimized

✅ **E2E Tests** (`.github/workflows/e2e-tests.yml`) - JUST UPDATED
✅ **CI/CD Pipeline** (`.github/workflows/ci-cd-pipeline.yml`) - Already has npm caching
✅ **Backend Tests** (`.github/workflows/backend-deps.yml`) - Already has pip caching
✅ **Frontend Tests** (`.github/workflows/frontend-deps.yml`) - Already has npm caching

---

## Verification & Monitoring

### Manual Verification

To verify caching is working:

1. **Run E2E test workflow twice**: `Actions → E2E Tests → Run Workflow`
2. **First run** (cold cache): ~50-56 seconds setup
3. **Second run** (warm cache): ~39-45 seconds setup ✨
4. **Look for** "Setup Node" step with "(Restored from cache)" message

### Automated Monitoring

Use the CI cache monitoring script to track performance:

```bash
# Analyze last 10 runs
python scripts/monitor_ci_cache.py --workflow e2e-tests.yml --runs 10

# Weekly monitoring with JSON output
python scripts/monitor_ci_cache.py \
  --workflow e2e-tests.yml \
  --runs 20 \
  --output "reports/cache_metrics_$(date +%Y%m%d).json" \
  --token YOUR_GITHUB_TOKEN
```

**Expected metrics**:
- npm cache hit rate: 75-80%
- Playwright cache hit rate: 60-70% (pre-change 40%, expected to improve with version key)
- pip cache hit rate: 60-70% (pre-change 45%, expected to improve with expanded dependency path)
- Setup time with all caches: 39-45 seconds
- Setup time without cache: 48-56 seconds

See [`../../scripts/README_MONITOR_CI_CACHE.md`](../../scripts/README_MONITOR_CI_CACHE.md) for complete monitoring documentation.

---

## Future Optimization Opportunities

| Opportunity | Savings | Effort | Status |
|---|---|---|---|
| **Build artifact caching** | 30-40s | Medium | 📋 TODO |
| **Docker layer caching** (in docker-publish) | 60-90s | Medium | 📋 TODO |
| **Codecov cache** | 10-15s | Low | 📋 TODO |
| **Package manager version cache** | 5-10s | Low | 📋 TODO |

---

## Configuration Details

### Cache Expiration Policy

GitHub Actions caches expire based on:
- **Last used**: Unused for > 7 days
- **Maximum size**: 5GB per repo (shared across all caches)
- **Manual eviction**: Can delete via API

Current cache usage estimate:
- npm dependencies: ~200MB
- Playwright browsers: ~300MB
- **Total**: ~500MB (within limits)

---

## Troubleshooting

### Cache Not Working?

**Symptom**: Still seeing full npm/Playwright installs on every run

**Diagnosis**:
1. Check `Actions` tab → Select E2E Tests → View logs
2. Look for "Setup Node" step → Should show "Restored from cache"
3. If missing, check:
   - `package-lock.json` was committed to Git
   - No workflow syntax errors
   - Branch is pushing to remote

**Solution**:
```bash
# Manually push new commits to trigger fresh run
git commit --allow-empty -m "trigger CI cache"
git push origin main
```

### Cache Too Large?

**Symptom**: Build fails with "Cache size exceeds limit"

**Action**: Delete old caches
```bash
# Via GitHub CLI (requires admin role)
gh actions-cache delete -R bs1gr/AUT_MIEEK_SMS --all

# Manual: Actions → Manage Caches → Delete
```

---

## Maintenance

### Quarterly Review Checklist

- [ ] Verify cache hit rate remains >80%
- [ ] Check disk usage hasn't exceeded 1GB
- [ ] Review Playwright version for major updates (may invalidate cache)
- [ ] Test cache invalidation on `package-lock.json` change

---

## References

- [GitHub Actions - setup-node caching](https://github.com/actions/setup-node#caching-packages-dependencies)
- [GitHub Actions - Cache action](https://github.com/actions/cache)
- [Playwright - CI documentation](https://playwright.dev/docs/ci)
- SMS Documentation Index: `DOCUMENTATION_INDEX.md`

---

**Owner**: DevOps Team
**Last Updated**: 2025-12-11
**Next Review**: 2025-03-11

---

## Post-change validation ($11.11.1)

Run the scheduled or manual monitoring workflow to collect post-change metrics:

1. Navigate to Actions → “Cache Performance Monitoring” → “Run workflow”
2. After 10–20 E2E runs complete, download `cache_metrics_monitoring.json` artifact
3. Update the table below with validated numbers

| Component | Hit Rate | Setup Time (hit) | Setup Time (miss) | Notes |
|---|---:|---:|---:|---|
| npm | 55% | — | — | setup-node cache via package-lock.json |
| Playwright | 60% | — | — | dynamic version key with minor fallback |
| pip | 90% | — | — | setup-python cache with requirements* path |

Initial overall times post-change:
- With cache: 44.5s
- Without cache: 45.2s
- Estimated savings: 0.8s (1.7% speedup)

Note: Component-level timing averages will be added after more runs; current summary reflects total setup times derived from the last 20 runs.

Once validated, reflect results here and in `CACHE_OPTIMIZATION_SUMMARY.md`.
