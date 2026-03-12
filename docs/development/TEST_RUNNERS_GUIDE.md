# Test Runners Guide

**Last Updated**: March 12, 2026
**Version**: 1.18.12
**Status**: ✅ ACTIVE - Specialized scripts maintained separately after targeted wrapper consolidation

---

## Overview

The project maintains **5 active specialized test runner scripts** at the repository root. After comprehensive analysis (March 2026), the old direct E2E wrapper and duplicate frontend Vitest wrappers were consolidated into canonical runners.

---

## Test Runner Scripts

### 🎯 Primary Test Runners (Keep As-Is)

#### 1. RUN_TESTS_BATCH.ps1
**Purpose**: Backend pytest execution in batches to prevent system overload
**Use Case**: Primary backend test runner (490+ tests)
**Key Features**:
- **Incremental testing** with failure tracking (`.test-failures` file)
- **Batch execution** prevents VS Code crashes (default: 5 files per batch)
- **RetestFailed mode** to re-run only failed tests
- **FastFail option** to stop on first batch failure

**Parameters**:
```powershell
-BatchSize <int>              # Files per batch (default: 5)
-Verbose                      # Detailed output
-FastFail                     # Stop on first failure
-RetestFailed                 # Re-run only failed tests from previous run
-ShowOutput                   # Display pytest output in console
-InterBatchDelaySeconds <int> # Delay between batches (default: 2)
-FailureFile <string>         # Custom failure tracking file
```

**Example Usage**:
```powershell
# Standard run
.\RUN_TESTS_BATCH.ps1

# Quick retest of failures
.\RUN_TESTS_BATCH.ps1 -RetestFailed

# Smaller batches for debugging
.\RUN_TESTS_BATCH.ps1 -BatchSize 3 -Verbose
```

**⚠️ Important**: Do NOT run with `isBackground: true` - see [TEST_RUNNER_BACKGROUND_LIMITATION.md](../TEST_RUNNER_BACKGROUND_LIMITATION.md)

---

#### 2. RUN_E2E_TESTS.ps1
**Purpose**: End-to-end test orchestration with service management
**Use Case**: Playwright E2E tests with automatic service verification
**Key Features**:
- **Service orchestration** via NATIVE.ps1
- **HTTP health checks** before running tests (backend:8000, frontend:5173)
- **Specific test file support** via `-SpecFile` parameter
- **Skip checks option** for manual service control

**Parameters**:
```powershell
-SpecFile <string>  # Optional: path to specific test file
-SkipChecks         # Bypass service verification (assume services running)
-Direct             # Alias for direct E2E execution without orchestration
```

**Example Usage**:
```powershell
# Run all E2E tests (verifies services automatically)
.\RUN_E2E_TESTS.ps1

# Run specific test file
.\RUN_E2E_TESTS.ps1 -SpecFile "frontend\tests\e2e\auth.spec.ts"

# Skip service checks (services already running)
.\RUN_E2E_TESTS.ps1 -SkipChecks

# Direct iterative mode (preferred replacement for RUN_E2E_DIRECT.ps1)
.\RUN_E2E_TESTS.ps1 -Direct
```

---

#### 3. RUN_CURATED_LOAD_TEST.ps1
**Purpose**: Specialized load testing framework
**Use Case**: Performance testing with controlled load scenarios
**Key Features**:
- Curated test scenarios (not general-purpose)
- Performance metrics collection
- Load profile management

**Example Usage**:
```powershell
.\RUN_CURATED_LOAD_TEST.ps1
```

---

### 🔀 Frontend Test Runner

#### 4. RUN_FRONTEND_TESTS.ps1
**Purpose**: Canonical Vitest runner with UTF-8 handling and optional summary output
**Use Case**: All frontend test execution paths (quick local runs, targeted checks, summary capture)
**Key Features**:
- **UTF-8 encoding handling** for console output
- Sets `SMS_ALLOW_DIRECT_VITEST=1` environment variable
- **Verbose mode** for detailed local debugging
- **Summary mode** for condensed console output plus artifact capture
- Writes `test-results/frontend/vitest_output.txt` and `test-results/frontend/summary.txt`

**Parameters**:
```powershell
-Pattern <string>   # Optional test pattern or file fragment
-Mode <string>      # Verbose (default) or Summary
-SkipRun            # Skip Vitest execution and refresh summary artifacts only
```

**Example Usage**:
```powershell
# Detailed local run
.\RUN_FRONTEND_TESTS.ps1

# Summary-oriented validation
.\RUN_FRONTEND_TESTS.ps1 -Mode Summary

# Focused file/pattern run
.\RUN_FRONTEND_TESTS.ps1 -Pattern "RBACPanel.test" -Mode Summary
```

---

### 🎭 Alternative Test Runners

#### 5. RUN_TESTS_CATEGORY.ps1
**Purpose**: Category-based backend test execution
**Use Case**: Run specific test categories/modules
**Key Features**:
- Targeted test execution by category
- Faster than full batch run
- Good for feature-specific testing

**Example Usage**:
```powershell
# Example categories: auth, students, courses, etc.
.\RUN_TESTS_CATEGORY.ps1 -Category auth
```

---

## Consolidation Analysis (March 2026)

### Why Scripts Are NOT Consolidated

After comprehensive analysis, these scripts remain separate for these reasons:

1. **Divergent Execution Contexts**:
   - Backend: pytest with batch management
   - Frontend: vitest with encoding handling
   - E2E: Playwright with service orchestration
   - Load: Specialized performance framework

2. **Specialized Parameter Sets**:
   - Batch runner: 7 parameters for failure tracking, batch sizing
   - E2E orchestrator: Service management flags
   - Frontend: Simple vs summary output modes

3. **Distinct Failure Modes**:
   - Backend: System freeze if all tests run at once (memory overload)
   - Frontend: Node.js process management
   - E2E: Service startup/health check failures

4. **Implementation Complexity**:
   - Consolidation would create a 500+ line mega-script
   - Parameter explosion (would need 15+ flags)
   - Loss of clarity and maintainability

### Potential Future Consolidation

These pairs could be merged with low risk:
- `RUN_FRONTEND_TESTS_SIMPLE.ps1` + `RUN_FRONTEND_TESTS_SUMMARY.ps1`
   → ✅ Consolidated into `RUN_FRONTEND_TESTS.ps1 -Mode [Verbose|Summary]` (March 12, 2026)

- `RUN_E2E_DIRECT.ps1` → ✅ Consolidated into `RUN_E2E_TESTS.ps1 -Direct` (March 12, 2026)

- `RUN_TESTS_CATEGORY.ps1` → Merge into `RUN_TESTS_BATCH.ps1 -Category`

**Estimated effort**: 2-3 hours careful refactoring + testing
**Recommendation**: Defer to dedicated refactoring sprint

---

## Quick Reference

| Script | Test Type | Execution Time | Use When |
|--------|-----------|----------------|----------|
| RUN_TESTS_BATCH.ps1 | Backend | 3-5 min | Primary backend testing |
| RUN_E2E_TESTS.ps1 | E2E | 2-3 min | Full E2E test suite |
| RUN_CURATED_LOAD_TEST.ps1 | Load | Varies | Performance testing |
| RUN_FRONTEND_TESTS.ps1 | Frontend | 30-60s | Canonical frontend testing |
| RUN_TESTS_CATEGORY.ps1 | Backend | 30-90s | Targeted backend testing |

---

## Best Practices

### For CI/CD Pipelines
```powershell
# Full validation
.\RUN_TESTS_BATCH.ps1
.\RUN_FRONTEND_TESTS.ps1 -Mode Summary
.\RUN_E2E_TESTS.ps1
```

### For Local Development
```powershell
# Quick iteration
.\RUN_TESTS_CATEGORY.ps1 -Category <module>
.\RUN_FRONTEND_TESTS.ps1 -Mode Verbose
.\RUN_E2E_TESTS.ps1 -Direct  # After starting services manually
```

### For Debugging Failures
```powershell
# Backend: Retest only failures
.\RUN_TESTS_BATCH.ps1 -RetestFailed -Verbose

# Frontend: Check specific test
cd frontend
npm run test -- ComponentName.test --run

# E2E: Run specific spec
.\RUN_E2E_TESTS.ps1 -SpecFile "path/to/spec.ts"
```

---

## Related Documentation

- [TESTING_GUIDE.md](TESTING_GUIDE.md) - Comprehensive testing documentation
- [TEST_RUNNER_BACKGROUND_LIMITATION.md](../TEST_RUNNER_BACKGROUND_LIMITATION.md) - Known limitations
- [AGENT_POLICY_ENFORCEMENT.md](../AGENT_POLICY_ENFORCEMENT.md) - Policy 1: Testing requirements
- [.github/copilot-instructions.md](../../.github/copilot-instructions.md) - Testing workflow section

---

## Troubleshooting

### VS Code Crashes During Tests
**Issue**: Running all backend tests at once crashes VS Code
**Solution**: Use `RUN_TESTS_BATCH.ps1` (default behavior)

### Frontend Tests Encoding Errors
**Issue**: Garbled output or encoding warnings
**Solution**: Use `RUN_FRONTEND_TESTS.ps1` (has UTF-8 handling in both modes)

### E2E Tests Fail with "Service Not Running"
**Issue**: Backend/frontend services not detected
**Solution**:
- Check services with `.\NATIVE.ps1 -Status`
- Start services with `.\NATIVE.ps1 -Start`
- Or use `.\RUN_E2E_TESTS.ps1` (auto-detects and starts services)

### Background Test Execution Hangs
**Issue**: Tests run via background mode don't produce output
**Solution**: Do NOT use `isBackground: true` - see [TEST_RUNNER_BACKGROUND_LIMITATION.md](../TEST_RUNNER_BACKGROUND_LIMITATION.md)

---

**Maintained by**: Development Team
**Last Reviewed**: March 9, 2026
