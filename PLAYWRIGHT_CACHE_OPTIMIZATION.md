# Playwright Cache Key Optimization

**Date**: December 11, 2025  
**Version**: 1.11.2  
**Status**: Implemented  

---

## Problem

Empirical analysis of 20 E2E workflow runs showed **Playwright cache hit rate of only 40%**, well below the target of 60-70%.

### Root Cause

The cache key was using `hashFiles('frontend/package-lock.json')`:

```yaml
key: playwright-${{ runner.os }}-${{ hashFiles('frontend/package-lock.json') }}
```

**Issue**: Every time `package-lock.json` changes (even for unrelated frontend dependencies), the Playwright browser cache is invalidated. This causes unnecessary re-downloads of the ~200MB Chromium browser.

---

## Solution

Changed cache key to use **Playwright version** instead of package-lock hash:

```yaml
key: playwright-${{ runner.os }}-1.57.0
restore-keys: |
  playwright-${{ runner.os }}-1.57
  playwright-${{ runner.os }}-
```

### Benefits

1. **Stable Cache Key**: Only invalidates when Playwright version changes (rare)
2. **Higher Hit Rate**: Expected to increase from 40% to 75-85%
3. **Faster CI**: Save 7-11 seconds per cache hit
4. **Predictable**: Version bumps are deliberate, not accidental

### Restore Key Strategy

The `restore-keys` provide fallback options:
1. **Primary**: Exact version match (e.g., `1.57.0`)
2. **Fallback 1**: Minor version match (e.g., `1.57.x`)
3. **Fallback 2**: Any Playwright cache

This ensures graceful degradation when upgrading Playwright versions.

---

## Expected Impact

### Before Optimization
- Cache hit rate: **40%**
- Time with cache hit: 16-18s
- Time with cache miss: 23-29s
- Average time: ~22s

### After Optimization (Projected)
- Cache hit rate: **75-85%** (only misses on Playwright upgrades)
- Time with cache hit: 16-18s
- Time with cache miss: 23-29s (rare)
- Average time: ~17s
- **Time saved**: 5 seconds per run on average
- **Monthly impact** (100 runs): 8-10 minutes additional savings

---

## Validation Plan

### Immediate (Next 5 runs)
1. Monitor cache hit rate after first cold cache
2. Verify subsequent runs show cache restore
3. Confirm timing improves to 16-18s

### Short-term (Next 10 runs)
1. Calculate actual cache hit rate
2. Measure average Playwright install time
3. Compare to baseline (40% hit rate)

### Long-term (Monthly)
1. Track cache hit rate over time
2. Monitor for version upgrade impacts
3. Adjust strategy if needed

---

## Monitoring Command

Run the monitoring script to track improvements:

```bash
python scripts/monitor_ci_cache.py \
  --workflow e2e-tests.yml \
  --runs 20 \
  --since 2025-12-11 \
  --output cache_metrics_optimized.json
```

Expected improvements:
- Playwright cache hit rate: 40% → 75-85%
- Overall setup time: 45s → 42s (3s savings)
- Total speedup: 6.5% → 10-12%

---

## Maintenance

### When Playwright Version Changes

Update the cache key in `.github/workflows/e2e-tests.yml`:

```yaml
# Example: Upgrading from 1.57.0 to 1.58.0
key: playwright-${{ runner.os }}-1.58.0
restore-keys: |
  playwright-${{ runner.os }}-1.58
  playwright-${{ runner.os }}-1.57  # Fallback to previous version
  playwright-${{ runner.os }}-
```

**Automated**: Consider extracting version from package.json:

```yaml
# Future improvement (requires setup step)
key: playwright-${{ runner.os }}-${{ steps.get-pw-version.outputs.version }}
```

---

## Rollback Procedure

If cache hit rate doesn't improve or issues arise:

1. Revert to original cache key:
   ```yaml
   key: playwright-${{ runner.os }}-${{ hashFiles('frontend/package-lock.json') }}
   ```

2. Clear all Playwright caches:
   ```bash
   gh actions-cache delete playwright-${{ runner.os }}- --all
   ```

3. Re-run analysis and document findings

---

## Related Changes

### pip Cache Optimization (Next)

Similar issue with pip cache (45% hit rate). Consider using Python version + requirements.txt hash instead of just requirements.txt:

```yaml
# Current (unstable)
cache: 'pip'

# Proposed (more stable)
key: pip-${{ runner.os }}-3.11-${{ hashFiles('backend/requirements*.txt') }}
```

---

## References

- **Empirical Analysis**: `CI_CACHE_EMPIRICAL_ANALYSIS.md`
- **Original Guide**: `docs/operations/CI_CACHE_OPTIMIZATION.md`
- **Workflow**: `.github/workflows/e2e-tests.yml`
- **Playwright Docs**: https://playwright.dev/docs/ci#caching-browsers

---

**Implementation Date**: 2025-12-11  
**Expected Validation**: 2025-12-12 (after 10 runs)  
**Owner**: DevOps/CI Team
