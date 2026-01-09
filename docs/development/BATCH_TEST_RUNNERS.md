# Batch Test Runners - Prevent System Freeze

## Problem

Running all 370+ backend tests at once can freeze VSCode due to high CPU/memory usage.

## Solution

Two batch test runners that split tests into smaller chunks:

### 1. RUN_TESTS_BATCH.ps1 - File-based Batches

Splits tests by file into configurable batch sizes:

```powershell
# Quick mode - small batches, fail fast (recommended during development)
.\RUN_TESTS_BATCH.ps1 -BatchSize 5 -FastFail

# Full mode - larger batches, complete run (recommended before commit)
.\RUN_TESTS_BATCH.ps1 -BatchSize 10

# Verbose output
.\RUN_TESTS_BATCH.ps1 -BatchSize 8 -Verbose
```

**Features**:
- Runs tests in batches of N files
- 2-second delay between batches (lets system breathe)
- Progress tracking per batch
- Summary report with failed files list
- Fast-fail option for development

### 2. RUN_TESTS_CATEGORY.ps1 - Category-based Batches

Groups tests by functionality (routers, services, models, etc.):

```powershell
# Run all categories in sequence
.\RUN_TESTS_CATEGORY.ps1

# Run specific category
.\RUN_TESTS_CATEGORY.ps1 -Category routers
.\RUN_TESTS_CATEGORY.ps1 -Category services
.\RUN_TESTS_CATEGORY.ps1 -Category rbac -Verbose
```

**Categories**:
- `routers` - API endpoint tests (students, courses, grades, etc.)
- `services` - Business logic tests
- `models` - Database model tests
- `rbac` - RBAC and permission tests
- `auth` - Authentication tests
- `other` - Misc tests (health, metrics, etc.)

## Integration with COMMIT_READY.ps1

The batch runner is automatically used when running `COMMIT_READY.ps1`:

```powershell
# Quick mode - uses BatchSize 5, FastFail
.\COMMIT_READY.ps1 -Quick

# Standard/Full mode - uses BatchSize 8, complete run
.\COMMIT_READY.ps1 -Standard
.\COMMIT_READY.ps1 -Full
```

If `RUN_TESTS_BATCH.ps1` is missing, falls back to standard pytest.

## Benefits

✅ **No more VSCode freezes** - Tests run in manageable chunks
✅ **Progress visibility** - See which batch is running
✅ **System breathing room** - 2-3 second delays between batches
✅ **Better error isolation** - Failed batches clearly identified
✅ **Flexible** - Choose batch size and category based on need

## Performance Comparison

| Method | Time | System Load | VSCode Stability |
|--------|------|-------------|------------------|
| All at once (`pytest -q`) | ~45s | 🔴 HIGH (freeze risk) | ⚠️ Risky |
| Batch (5 files) | ~60s | 🟡 MEDIUM | ✅ Stable |
| Batch (10 files) | ~50s | 🟠 MODERATE | ✅ Stable |
| Category | ~55s | 🟡 MEDIUM | ✅ Stable |

**Trade-off**: Slightly longer runtime (~20% overhead) for much better stability.

## Troubleshooting

**Issue**: "File not found" errors
**Solution**: Script expects to find tests in `backend/tests/` - verify paths

**Issue**: Still freezing
**Solution**: Reduce batch size further: `.\RUN_TESTS_BATCH.ps1 -BatchSize 3`

**Issue**: Too slow
**Solution**: Increase batch size: `.\RUN_TESTS_BATCH.ps1 -BatchSize 15`

## Manual Usage

For direct testing without COMMIT_READY:

```powershell
# From project root
.\RUN_TESTS_BATCH.ps1 -BatchSize 8

# From backend directory (not recommended, use from root)
cd backend
python -m pytest tests/ -q  # Standard way if you must
```

---

**Created**: January 8, 2026
**Purpose**: Prevent VSCode freezes during test execution
**Status**: Integrated with COMMIT_READY.ps1 v1.15.1+
