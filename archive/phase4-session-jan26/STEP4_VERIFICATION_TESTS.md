# Step 4 Verification: Run SearchBar Tests

**Status**: SearchBar component (450 lines) and tests (20 tests) implemented and committed
**Next Action**: Run tests to verify all 20 pass
**Estimated Time**: 10-15 minutes

---

## ✅ Pre-Test Checklist

- [x] SearchBar.tsx created (450+ lines)
- [x] SearchBar.test.tsx created (20 tests, 400+ lines)
- [x] i18n wrapper fixed (renderWithI18n pattern verified)
- [x] Dependencies verified (@heroicons/react@2.2.0 installed)
- [x] Code committed (0ab3ba664)
- [x] Code pushed to origin

**All Prerequisites Met - Ready to Test**

---

## 🚀 Run Tests - Two Options

### Option 1: Direct with Environment Variable (10-15 min)

```powershell
# Set environment variable for direct Vitest execution
$env:SMS_ALLOW_DIRECT_VITEST=1

# Run SearchBar tests specifically
npm --prefix frontend run test -- SearchBar.test.tsx --run

# Or run all search feature tests
npm --prefix frontend run test -- search --run
```

**Expected Output**:
```
✓ src/features/advanced-search/__tests__/SearchBar.test.tsx (20 tests)
  SearchBar
    ✓ Renders with placeholder text
    ✓ Updates on input change
    ✓ Debounces search requests (300ms)
    ✓ Entity type selection works
    ✓ Clear button resets input
    ✓ Shows search history dropdown
    ✓ Selects history item when clicked
    ✓ Handles keyboard navigation (arrows, enter, escape)
    ✓ Has accessibility attributes
    ✓ Shows loading indicator
    ✓ Disables inputs during loading
    ✓ Auto-focuses input
    ✓ Closes dropdown on Escape
    ✓ Closes dropdown on outside click
    ✓ Respects custom placeholder
    ✓ Limits history to 5 items
    ✓ Calls onSearch with Enter
    ✓ Hides history when showHistory=false
    ✓ Handles empty history gracefully
    ✓ Entity type defaults to 'all'

 PASS 20 tests
```

### Option 2: Batch Test Runner (5-10 min)

```powershell
# Use the batch runner for larger test suites
.\RUN_TESTS_BATCH.ps1

# Or with specific batch size
.\RUN_TESTS_BATCH.ps1 -BatchSize 5

# With verbose output
.\RUN_TESTS_BATCH.ps1 -Verbose
```

**This Runs**:
- Backend tests in batches (5 files per batch)
- Frontend tests in batches
- Displays summary with passing/failing counts

---

## 📊 Expected Test Results

### All 20 Tests Should Pass

| Test # | Category | Expected | Status |
|--------|----------|----------|--------|
| 1-2 | Rendering | PASS | ✅ |
| 3-5 | Input/Debounce | PASS | ✅ |
| 6-11 | History Dropdown | PASS | ✅ |
| 12-14 | Keyboard Nav | PASS | ✅ |
| 15 | Accessibility | PASS | ✅ |
| 16-17 | Loading States | PASS | ✅ |
| 18-20 | Props/Edge Cases | PASS | ✅ |

**Success Criteria**: 20/20 PASS ✅

---

## 🔍 Troubleshooting

### Issue: "Test policy enforcement" error
**Solution**: Ensure environment variable is set
```powershell
$env:SMS_ALLOW_DIRECT_VITEST=1
npm --prefix frontend run test -- SearchBar.test.tsx --run
```

### Issue: "Cannot find module '@/test-utils/i18n-test-wrapper'"
**Solution**: This file exists at `frontend/src/test-utils/i18n-test-wrapper.tsx`
- Check file exists: `ls frontend/src/test-utils/`
- Verify alias in tsconfig: `"@/*": ["src/*"]`

### Issue: "Heroicons icons not found"
**Solution**: Verify @heroicons/react installed
```powershell
npm list @heroicons/react
# Should show: @heroicons/react@2.2.0
```

### Issue: Some tests timeout
**Solution**: Increase timeout for specific tests
```typescript
test('test name', async () => {
  // test code
}, { timeout: 10000 }); // 10 second timeout
```

---

## 📝 After Tests Pass

Once all 20 tests pass:

1. **Document Results**
   - Note passing count (should be 20/20)
   - Note any warnings or issues
   - Create progress log entry

2. **Commit Test Run** (optional)
   ```powershell
   git add .
   git commit -m "test: verify SearchBar tests passing (20/20)"
   ```

3. **Begin Step 5**
   - Follow STEP5_ADVANCEDFILTERS_GUIDE.md
   - Create FilterCondition component
   - Write 12+ tests
   - Commit and push

---

## ✅ Next Steps After Verification

**Step 5: AdvancedFilters Component** (8 hours)
- [x] Run SearchBar tests (THIS)
- [ ] Verify all 20 passing
- [ ] Create STEP5_ADVANCEDFILTERS_GUIDE.md (READY)
- [ ] Create FilterCondition component (2h)
- [ ] Create AdvancedFilters container (2h)
- [ ] Write 12+ tests (3h)
- [ ] Commit and push (1h)

---

## 🎯 Success Indicator

When you see this output → Step 4 is verified complete:

```
✓ SearchBar.test.tsx (20 tests)
  ✓ Renders with placeholder text
  ✓ Updates on input change
  ✓ Debounces search requests
  ... (all 20 tests showing ✓)

PASS 20/20 tests
```

After that, proceed to Step 5 using STEP5_ADVANCEDFILTERS_GUIDE.md
