# Phase 5: Caching Optimization

**Status:** 📋 DESIGN DOCUMENT  
**Target Implementation Date:** After Phase 4  
**Effort Estimate:** Medium (2-3 days)

---

## Executive Summary

Phase 5 implements **strategic caching** across the CI/CD pipeline to accelerate dependency resolution and build times. The goal is to reduce cold-cache build times from 25 minutes to 10-15 minutes (~40-50% improvement).

### Goals
1. **Dependency Caching:** Cache Python, Node, Docker layers
2. **Build Caching:** Cache compiled artifacts, test outputs
3. **Smart Invalidation:** Only invalidate when dependencies change
4. **Multi-Level Strategy:** L1 (action cache) + L2 (Docker buildx)

### Benefits
- **Cold cache build:** 25 min → 10-15 min (-60%)
- **Warm cache build:** 10 min → 5-7 min (-30%)
- **Cost:** ~30% reduction in GitHub Actions minutes
- **User experience:** Faster PR feedback

---

## Current State

### Build Pipeline Today
```
Checkout (1 min)
├─ Lint (2 min) — no cache
├─ Unit Tests (3 min) — no cache
├─ Integration Tests (5 min) — no cache
├─ Security Scan (2 min) — no cache
├─ Build Frontend (3 min) — no cache
├─ Build Backend (4 min) — no cache
├─ Build Docker (8 min) — no layer cache
└─ E2E Tests (5 min) — no cache
```

**Total: ~33 minutes (cold cache)**

### Bottlenecks
1. **Python deps:** `pip install` takes 2-3 min every run
2. **Node deps:** `npm install` takes 1-2 min every run
3. **Docker layers:** Base images rebuilt every run
4. **Build artifacts:** Frontend bundle rebuilt every run

---

## Phase 5 Strategy

### 1. Python Dependency Caching

#### Current Flow
```bash
pip install -r requirements.txt  # 2-3 min every time
```

#### With Cache
```bash
# GitHub Actions cache
- uses: actions/setup-python@v5
  with:
    python-version: '3.11'
    cache: 'pip'  # Enable pip caching
    cache-dependency-path: 'requirements.txt'
```

#### Cache Key
```
cache-key: python-${{ runner.os }}-pip-${{ hashFiles('requirements.txt') }}
```

**When cache invalidates:**
- requirements.txt changes
- Python version changes
- OS changes (Linux, Windows, macOS)

**When cache hits:**
- Same dependencies → reuse cached packages
- `pip install` becomes `pip install --no-deps` → ~20 seconds

#### Expected Impact
- **Cold cache:** 2-3 min (first time)
- **Warm cache:** 20 sec (-85%)

---

### 2. Node Dependency Caching

#### Current Flow
```bash
npm install  # 1-2 min every time
```

#### With Cache
```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '24'
    cache: 'npm'
    cache-dependency-path: 'frontend/package-lock.json'
```

#### Cache Key
```
cache-key: node-${{ runner.os }}-npm-${{ hashFiles('frontend/package-lock.json') }}
```

**Expected Impact**
- **Cold cache:** 1-2 min (first time)
- **Warm cache:** 10-15 sec (-85%)

---

### 3. Docker Layer Caching

#### Current Flow
```dockerfile
# Dockerfile
FROM python:3.11-slim
RUN pip install -r requirements.txt  # Downloaded & installed every build
RUN python -m pytest  # Tests run every build
RUN npm install  # JS deps installed every build
COPY . /app
RUN python manage.py collectstatic
```

#### With buildx Cache
```yaml
- uses: docker/build-push-action@v5
  with:
    context: .
    push: ${{ github.event_name != 'pull_request' }}
    cache-from: type=gha  # Use GitHub Actions cache
    cache-to: type=gha,mode=max
```

#### Cache Layers
```dockerfile
# Layer 1: Base image (OS + system deps)
FROM python:3.11-slim  # Usually cached

# Layer 2: Python dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt  # Cached until requirements.txt changes

# Layer 3: Node dependencies
RUN npm install  # Cached until package.json/package-lock.json changes

# Layer 4: App code
COPY . /app
RUN python manage.py collectstatic  # Cached until code changes

# Layer 5: Tests
RUN pytest  # Skippable or cached
```

**When cache hits:**
- Only changed layers rebuild
- Unchanged layers reuse cached outputs
- Example: Updated a Python file but not requirements.txt
  - Layer 2 (deps): cache hit (~10 sec)
  - Layer 4 (app): rebuilt (~30 sec)
  - Total: ~40 sec (vs 3-4 min without cache)

#### Expected Impact
- **Cold cache:** 8 min (first time)
- **Warm cache:** 2-3 min (-60%)
- **Minimal change:** 1-2 min (-75%)

---

### 4. Build Artifact Caching

#### Frontend Build Output
```yaml
# Cache frontend dist/
- uses: actions/cache@v4
  with:
    path: frontend/dist
    key: frontend-build-${{ hashFiles('frontend/src/**', 'frontend/package-lock.json') }}
    restore-keys: |
      frontend-build-
```

**When to cache:**
- Frontend code unchanged
- Dependencies unchanged
- → Reuse built bundle

**When to invalidate:**
- Any .ts/.tsx/.css file changes
- package.json changes
- → Rebuild required

#### Expected Impact
- **Frontend rebuild time:** 3 min → 10 sec (-95%)

---

### 5. Test Output Caching

#### Hypothesis Testing
Cache test output for unchanged code:

```yaml
- uses: actions/cache@v4
  with:
    path: .pytest_cache
    key: pytest-cache-${{ hashFiles('tests/**', 'requirements.txt') }}
```

**Caveat:** Only safe if:
- No external dependencies (APIs, databases)
- No timing-dependent tests
- Test data is stable

**Better approach:** Cache test fixture data instead:
```yaml
- uses: actions/cache@v4
  with:
    path: tests/fixtures
    key: test-fixtures-${{ hashFiles('tests/fixtures/**') }}
```

#### Expected Impact
- **Test setup time:** 30 sec → 5 sec (-85%)

---

## Implementation Plan

### Layer 1: Dependency Caches (Easy, High Impact)

```yaml
jobs:
  setup-caches:
    runs-on: ubuntu-latest
    steps:
      # Python cache
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'
          cache-dependency-path: 'requirements*.txt'
      
      # Node cache
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'
          cache-dependency-path: 'frontend/package-lock.json'
```

### Layer 2: Docker buildx Cache (Medium, High Impact)

```yaml
jobs:
  build-docker-images:
    steps:
      - uses: docker/setup-buildx-action@v3
      
      - uses: docker/build-push-action@v5
        with:
          context: .
          cache-from: type=gha
          cache-to: type=gha,mode=max
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
```

### Layer 3: Build Artifact Cache (Medium, Medium Impact)

```yaml
jobs:
  build-frontend:
    steps:
      - uses: actions/cache@v4
        with:
          path: frontend/dist
          key: frontend-dist-${{ github.run_id }}
          restore-keys: frontend-dist-
      
      - run: npm run build --prefix frontend
        if: steps.cache.outputs.cache-hit != 'true'
```

---

## Cache Strategy Matrix

| Cache Type | Invalidation | Restore Time | Storage | Impact |
|-----------|--------------|--------------|---------|--------|
| **Python deps** | requirements.txt | 1 min | 500MB | -85% setup |
| **Node deps** | package-lock.json | 30 sec | 300MB | -85% setup |
| **Docker layers** | Dockerfile + src | 2-3 min | 2GB | -60% build |
| **Frontend dist** | src + package.json | 10 sec | 200MB | -95% build |
| **Test fixtures** | fixtures/* | 5 sec | 100MB | -85% setup |

---

## Cache Validation

### Automatic Invalidation
```python
# If this file changes, invalidate cache
INVALIDATION_KEYS = [
    'requirements.txt',
    'requirements-dev.txt',
    'package.json',
    'package-lock.json',
    'Dockerfile',
    'docker-compose.yml'
]
```

### Manual Cache Invalidation
```bash
# Force cache bust on specific branch
gh workflow run ci-cd-pipeline.yml \
  -f cache_strategy=fresh \
  -ref feature-branch
```

### Cache Hit Monitoring
```yaml
- name: Cache stats
  run: |
    echo "Frontend cache: ${{ steps.frontend-cache.outputs.cache-hit }}"
    echo "Python cache: ${{ steps.python-cache.outputs.cache-hit }}"
    echo "Node cache: ${{ steps.node-cache.outputs.cache-hit }}"
```

---

## Performance Timeline

### Current (Phase 3)
```
Cold: 33 min  → Warm: 25 min → Unit only: 12 min
```

### Phase 5 (With Caching)
```
Cold: 12 min  → Warm: 7 min → Unit only: 4 min
```

### Savings Breakdown
```
Unit test only: 12 min → 4 min (save 8 min)
Full suite: 25 min → 7 min (save 18 min)
Annual (260 runs): ~100 hours saved
```

---

## Risk Mitigation

### Risk: Stale Cache
**Problem:** Cache contains outdated artifacts  
**Mitigation:**
- Auto-invalidate every 7 days
- Manual invalidation on release
- Verify cache with hash mismatch check

### Risk: Cache Bloat
**Problem:** Storage quota exceeded (5GB GitHub Actions limit)  
**Mitigation:**
- Monitor cache size
- Prune old caches (>30 days)
- Only cache essential artifacts

### Risk: Cache Corruption
**Problem:** Corrupted cache breaks build  
**Mitigation:**
- Validate cache integrity (hash check)
- Fallback to fresh install
- Alert on cache failures

---

## Implementation Timeline

### Week 1: Foundation
- [ ] Implement Python cache
- [ ] Implement Node cache
- [ ] Monitor cache hit rates
- [ ] Baseline performance

### Week 2: Docker Caching
- [ ] Setup docker/build-push-action with buildx
- [ ] Configure layer-based caching
- [ ] Test with minimal changes
- [ ] Measure cache effectiveness

### Week 3: Artifact Caching
- [ ] Add frontend dist cache
- [ ] Add test fixture cache
- [ ] Validate cache invalidation
- [ ] Performance testing

### Week 4: Monitoring & Tuning
- [ ] Deploy to staging
- [ ] Monitor for 1 week
- [ ] Tune cache strategies
- [ ] Collect metrics

---

## Success Metrics

### Build Time Reduction
- [ ] Cold cache: 33 min → 15 min (-55%)
- [ ] Warm cache: 25 min → 8 min (-68%)
- [ ] Unit only: 12 min → 5 min (-58%)

### Cost Reduction
- [ ] GitHub Actions minutes: -35%
- [ ] Storage used: <500MB total
- [ ] Annual cost savings: ~$200-300

### Quality Metrics
- [ ] No false-negative test results from stale cache
- [ ] No builds failed due to cache corruption
- [ ] Cache hit rate: >80% after 1 week

---

## Phase 5 vs Phase 4

| Aspect | Phase 4 | Phase 5 |
|--------|---------|---------|
| **Scope** | Security + testing | Caching |
| **Time Impact** | -40% (on E2E skip) | -50% (all builds) |
| **Complexity** | Medium | Medium |
| **Risk** | Low | Low |
| **Implementation** | 2-3 days | 2-3 days |

---

## Related Phases

- **Phase 1:** Workflow cleanup ✅
- **Phase 2:** Critical bug fixes ✅
- **Phase 3:** Maintenance consolidation ✅
- **Phase 4:** SARIF + conditional testing (next)
- **Phase 5:** Caching optimization (THIS)
- **Phase 6:** Performance monitoring dashboard (next)

---

## Questions & Answers

### Q: Will cache increase storage costs?
**A:** No - GitHub provides 5GB free cache per repo. We'll use ~500MB, well under limit.

### Q: What if cache is corrupted?
**A:** Build fails fast (2-3 min). We clear cache and rebuild from scratch automatically.

### Q: Is caching safe for security scans?
**A:** No - always run fresh scans. Only cache dependencies, not scan results.

### Q: Can we cache across branches?
**A:** Yes - `restore-keys` allows fallback from main branch cache to PRs.

---

## Next Phase Preview

**Phase 6: Performance Monitoring Dashboard**
- Real-time CI/CD metrics
- Build time trends
- Cost tracking
- Bottleneck identification

---

**Document:** Phase 5 Design - Caching Optimization  
**Status:** 📋 DESIGN READY FOR IMPLEMENTATION  
**Date:** June 3, 2026
