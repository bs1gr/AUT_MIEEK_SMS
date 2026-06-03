# Phase 4: SARIF Consolidation + Conditional Testing

**Status:** 📋 DESIGN DOCUMENT  
**Target Implementation Date:** Next sprint  
**Effort Estimate:** Medium (2-3 days)

---

## Executive Summary

Phase 4 consolidates SARIF (Static Analysis Results Format) security scan outputs and implements **conditional testing** to run advanced test suites (E2E, load testing) only when explicitly requested or in production scenarios.

### Goals
1. **SARIF Consolidation:** Merge all security scan results (pip-audit, trivy, npm-audit) into unified SARIF reports
2. **Conditional Testing:** Run E2E and load tests only when requested (not on every PR)
3. **Dependency Optimization:** Skip expensive test suites in fast-path scenarios
4. **Reporting:** Unified security dashboard with consolidated findings

### Benefits
- **Security:** Centralized vulnerability tracking across all layers
- **Performance:** ~10-15 min faster CI/CD on simple PRs (skips E2E)
- **Cost:** Reduced compute for non-critical test runs
- **Clarity:** Single SARIF report instead of 3+ separate formats

---

## Current State (Phase 3)

### Security Scans Today
```yaml
security-scan-backend:
  - Tool: pip-audit
  - Output: JSON (backend-audit.json)
  - Upload: artifacts
  
security-scan-frontend:
  - Tool: npm-audit
  - Output: JSON (npm-audit.json)
  - Upload: artifacts

security-scan-docker:
  - Tool: trivy
  - Output: SARIF (trivy-results.sarif)
  - Upload: GitHub Security tab (SARIF)
```

### Problem
- **3 different output formats** for security data
- **Multiple upload paths** (artifacts vs. GitHub Security tab)
- **Redundant processing** of vulnerabilities
- **No unified dashboard** for security findings
- **All tests run on every PR** (even simple docs changes)

---

## Phase 4 Design

### 1. SARIF Consolidation

#### Step 1: Convert All Formats to SARIF
```yaml
# Backend security → SARIF
security-scan-backend:
  - Tool: pip-audit (with SARIF output)
  - Convert pip-audit JSON → SARIF if needed
  
# Frontend security → SARIF
security-scan-frontend:
  - Tool: npm-audit (convert to SARIF)
  - Tool: snyk (native SARIF support)
  
# Docker security → SARIF
security-scan-docker:
  - Tool: trivy (native SARIF support - already implemented)
```

#### Step 2: Consolidate SARIF Outputs
```bash
# Create unified SARIF from multiple sources
# Tool: python-jsonschema-merge or custom consolidation script

unified-sarif.json = merge([
  backend-audit.sarif,
  frontend-audit.sarif,
  docker-audit.sarif
])
```

#### Step 3: Upload Unified Report
```yaml
- name: Upload consolidated SARIF
  uses: github/codeql-action/upload-sarif@v4
  with:
    sarif_file: unified-audit-results.sarif
    category: 'unified-security-audit'
```

### Benefits
- Single GitHub Security tab view with all findings
- Consistent vulnerability severity/scoring
- Easier to track fixes across all layers
- Reduced upload API calls

---

### 2. Conditional Testing

#### Trigger Conditions

**Run Full Suite (E2E + Load) When:**
```yaml
if: |
  github.ref == 'refs/heads/main' ||
  github.event.pull_request.labels.contains('requires:e2e') ||
  contains(github.event.pull_request.title, '[full-test]')
```

**Skip E2E/Load (Fast Path) When:**
```yaml
if: |
  github.event_name == 'pull_request' &&
  !github.event.pull_request.labels.contains('requires:e2e') &&
  !contains(github.event.pull_request.title, '[full-test]')
```

#### Implementation

```yaml
# New job: Determine test scope
determine-test-scope:
  name: Determine Test Scope
  runs-on: ubuntu-latest
  outputs:
    run_full_tests: ${{ steps.scope.outputs.run_full }}
    run_e2e: ${{ steps.scope.outputs.run_e2e }}
    run_load: ${{ steps.scope.outputs.run_load }}
  steps:
    - id: scope
      run: |
        # Default: unit tests only (fast path)
        RUN_FULL="false"
        RUN_E2E="false"
        RUN_LOAD="false"
        
        # Full tests on main branch
        if [ "${{ github.ref }}" == "refs/heads/main" ]; then
          RUN_FULL="true"
          RUN_E2E="true"
          RUN_LOAD="true"
        fi
        
        # Check for PR label "requires:e2e"
        if echo "${{ github.event.pull_request.labels }}" | grep -q "requires:e2e"; then
          RUN_E2E="true"
        fi
        
        # Check for title tag "[full-test]"
        if echo "${{ github.event.pull_request.title }}" | grep -q "\[full-test\]"; then
          RUN_FULL="true"
          RUN_E2E="true"
        fi
        
        echo "run_full=$RUN_FULL" >> $GITHUB_OUTPUT
        echo "run_e2e=$RUN_E2E" >> $GITHUB_OUTPUT
        echo "run_load=$RUN_LOAD" >> $GITHUB_OUTPUT

# E2E tests - conditional
run-e2e-tests:
  name: 🧪 End-to-End Tests
  runs-on: ubuntu-latest
  needs: [determine-test-scope, run-integration-tests]
  if: needs.determine-test-scope.outputs.run_e2e == 'true'
  steps:
    - name: Run E2E test suite
      run: |
        # Playwright/Cypress E2E tests
        npm run test:e2e

# Load tests - conditional
run-load-tests:
  name: 📊 Load & Performance Tests
  runs-on: ubuntu-latest
  needs: [determine-test-scope, run-integration-tests]
  if: needs.determine-test-scope.outputs.run_load == 'true'
  timeout-minutes: 30
  steps:
    - name: Run load test suite
      run: |
        # k6 load test or locust
        npm run test:load
```

#### Usage

**Fast path (skip E2E):**
```bash
git push origin feature-branch
# CI runs: linting, unit tests, integration tests
# Time: ~5-10 minutes
```

**Full testing (PR label):**
```bash
# Add "requires:e2e" label to PR
# CI runs: linting, unit, integration, E2E, load
# Time: ~20-25 minutes
```

**Full testing (title tag):**
```bash
# Create PR with "[full-test]" in title
# "Fix critical bug in auth [full-test]"
# CI runs: full suite
```

**Full testing (main branch):**
```bash
git push origin main
# Always runs full suite (automatic)
```

---

## Phase 4 Implementation Roadmap

### Week 1: Foundation
- [ ] Create `scripts/consolidate-sarif.py` — SARIF merger utility
- [ ] Update `security-scan-backend` to generate SARIF
- [ ] Update `security-scan-frontend` to generate SARIF
- [ ] Create `determine-test-scope` job
- [ ] Add conditional `if:` clauses to E2E/load jobs

### Week 2: Testing & Integration
- [ ] Test SARIF consolidation locally
- [ ] Validate GitHub Security tab display
- [ ] Test conditional logic on PR branches
- [ ] Document usage patterns

### Week 3: Deployment
- [ ] Deploy to staging environment
- [ ] Monitor for 1 week
- [ ] Collect metrics (time saved, cost reduced)
- [ ] Production deployment

### Effort Estimate
- Design: 2 hours
- Implementation: 8-10 hours
- Testing: 4-6 hours
- Documentation: 2-3 hours
- **Total: 16-21 hours (~2-3 days)**

---

## SARIF Consolidation Script

### Location
`scripts/consolidate-sarif.py`

### Functionality
```python
#!/usr/bin/env python3
"""
Consolidate multiple SARIF reports into a single unified report.

Usage:
    python scripts/consolidate-sarif.py \
      --backend backend-audit.sarif \
      --frontend frontend-audit.sarif \
      --docker docker-audit.sarif \
      --output unified-audit-results.sarif
"""

import json
import argparse
from pathlib import Path
from typing import List, Dict, Any

class SARIFConsolidator:
    def __init__(self):
        self.unified_runs = []
        
    def load_sarif(self, filepath: str) -> Dict[str, Any]:
        """Load SARIF file."""
        with open(filepath, 'r') as f:
            return json.load(f)
    
    def consolidate(self, files: List[str]) -> Dict[str, Any]:
        """Merge multiple SARIF reports."""
        all_runs = []
        all_results = []
        
        for filepath in files:
            sarif = self.load_sarif(filepath)
            for run in sarif.get('runs', []):
                # Merge all results from all runs
                all_results.extend(run.get('results', []))
                all_runs.append({
                    'tool': run['tool'],
                    'results': run.get('results', [])
                })
        
        # Create unified report
        unified = {
            'version': '2.1.0',
            'runs': [{
                'tool': {
                    'driver': {
                        'name': 'Unified Security Audit',
                        'version': '1.0.0'
                    }
                },
                'results': all_results
            }]
        }
        
        return unified
    
    def save(self, data: Dict[str, Any], output_path: str):
        """Save unified SARIF."""
        with open(output_path, 'w') as f:
            json.dump(data, f, indent=2)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--backend', help='Backend audit SARIF')
    parser.add_argument('--frontend', help='Frontend audit SARIF')
    parser.add_argument('--docker', help='Docker audit SARIF')
    parser.add_argument('--output', default='unified-audit-results.sarif')
    
    args = parser.parse_args()
    
    consolidator = SARIFConsolidator()
    files = [args.backend, args.frontend, args.docker]
    files = [f for f in files if f]  # Remove None
    
    unified = consolidator.consolidate(files)
    consolidator.save(unified, args.output)
    
    print(f"✅ Consolidated {len(files)} SARIF reports")
    print(f"📊 Total findings: {len(unified['runs'][0]['results'])}")
    print(f"💾 Saved to: {args.output}")
```

---

## Conditional Testing Jobs

### Job: determine-test-scope

**Input:** Pull request metadata (labels, title), branch  
**Output:** Booleans (`run_e2e`, `run_load`, `run_full`)  
**Time:** ~10 seconds

### Job: run-e2e-tests

**Condition:** `if: needs.determine-test-scope.outputs.run_e2e == 'true'`  
**Tools:**
- Playwright (recommended) or Cypress
- API testing: Postman or insomnia
- UI testing: Selenium alternative  
**Time:** ~10-15 minutes (when run)

### Job: run-load-tests

**Condition:** `if: needs.determine-test-scope.outputs.run_load == 'true'`  
**Tools:**
- k6 (recommended) - lightweight, fast
- Apache JMeter
- Locust (Python)  
**Time:** ~20-30 minutes (when run)

---

## Migration & Rollback

### Enable Phase 4
```bash
# 1. Merge Phase 4 branch to staging
git checkout main
git pull origin main
git merge phase-4-sarif-conditional

# 2. Test on staging for 1 week
# Monitor GitHub Security tab for unified findings
# Check E2E/load test execution times

# 3. Merge to main
git push origin main
```

### Disable Phase 4 (If Issues)
```bash
# 1. Revert conditional job conditions
git revert <phase-4-commit-hash>

# 2. All tests run again (no conditional logic)
# Pipeline reverts to Phase 3 behavior

# 3. Investigate issues and re-implement
```

---

## Success Metrics

### Performance
- **Unit tests only:** ~5-10 min (vs ~25 min with full suite)
- **Full suite on main:** ~25 min (same as today)
- **PR without E2E label:** 50% faster than before

### Security
- **Unified SARIF report:** Single source of truth
- **Finding deduplication:** Fewer redundant alerts
- **Faster vulnerability tracking:** Dashboard visibility

### Cost
- **Reduced compute:** ~20% fewer machine-hours per month
- **GitHub Actions:** ~100-150 fewer minutes per month
- **Annual savings:** ~1,200-1,800 minutes (~20-30 hours)

### Quality
- **No regression in bug detection:** All tests still run on main
- **Faster feedback for simple PRs:** Developers get results faster
- **Better resource allocation:** Run expensive tests only when needed

---

## Phase 4 vs Phase 3

| Aspect | Phase 3 | Phase 4 |
|--------|---------|---------|
| **Security Reports** | 3 formats (JSON, JSON, SARIF) | 1 format (SARIF) |
| **GitHub Security Tab** | 1 tool (Trivy) | All tools consolidated |
| **E2E Testing** | Every PR | Conditional (label/tag) |
| **Load Testing** | Every PR | Main branch only |
| **CI/CD Time (PR)** | ~25 min | ~10-15 min (fast path) |
| **CI/CD Time (Main)** | ~25 min | ~25 min (full suite) |

---

## Related Phases

- **Phase 1:** Workflow cleanup & archival ✅
- **Phase 2:** Critical bug fixes ✅
- **Phase 3:** Maintenance consolidation ✅
- **Phase 4:** SARIF + conditional testing (THIS)
- **Phase 5:** Caching optimization (next)
- **Phase 6:** Performance monitoring dashboard (next)

---

## Questions & Answers

### Q: What if someone creates a PR without the "requires:e2e" label but E2E is needed?
**A:** They can add the label later, or add `[full-test]` to the PR title. The workflow is re-triggered and runs full suite.

### Q: Will load testing cause issues with the staging database?
**A:** Yes - load tests should target a dedicated staging environment or mock service. This is covered in Phase 4 implementation checklist.

### Q: How do we prevent developers from forgetting to run E2E?
**A:** CODEOWNERS file can enforce required checks. Default to full-test on main branch (always runs).

### Q: What if SARIF consolidation breaks?
**A:** Script logs errors, uploads individual SARIF files as fallback. GitHub Security tab shows results even if consolidation fails.

---

## Next Phase Preview

**Phase 5: Caching Optimization**
- Cache Python/Node dependencies
- Cache build artifacts
- Cache Docker layer caching
- Expected savings: 10-15 min per run (cold → warm cache)

---

**Document:** Phase 4 Design - SARIF Consolidation + Conditional Testing  
**Status:** 📋 DESIGN READY FOR IMPLEMENTATION  
**Date:** June 3, 2026
