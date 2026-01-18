# Batch 6 Phase 2 - Detailed Strategic Plan
**Hardcoded Literal Strings (49 Warnings)**

## Overview
Phase 2 targets all hardcoded literal strings that ESLint flags via `i18next/no-literal-string` rule. These represent UI text that should be internationalized.

**Status**: 🟡 PLANNED
**Estimated Effort**: 45-60 minutes
**Expected Outcome**: 49 warnings fixed → ~115 remaining warnings overall

---

## Phase 2 Scope: 49 Hardcoded Literal Strings

### Category 1: Import/Export Feature Components (9 strings - PARTIALLY DONE)
**Files**:
- `frontend/src/features/importExport/ExportDialog.tsx` (0 strings - Phase 1 complete ✅)
- `frontend/src/features/importExport/HistoryTable.tsx` (0 strings - Phase 1 complete ✅)
- `frontend/src/features/importExport/ImportWizard.tsx` (20 strings - NOT DONE)

**ImportWizard.tsx Hardcoded Strings**:
```typescript
// Line 63
<h2>Import Wizard</h2>
// → t('importExport.importWizard')

// Line 87
<strong>Select file to import:</strong>
// → t('importExport.selectFileToImport')

// Line 99
<span>Selected file: <b>{fileName}</b></span>
// → t('importExport.selectedFile', { fileName })

// Line 106
<strong>Preview Data</strong>
// → t('importExport.previewData')

// Line 107
<p>No file selected.</p>
// → t('importExport.noFileSelected')

// Line 150
<strong>Validate Data</strong>
// → t('importExport.validateData')

// Line 179
<strong>Commit Import</strong>
// → t('importExport.commitImport')

// Line 154 (in button)
Preview with Backend
// → t('importExport.previewWithBackend')

// Additional strings in ImportWizard:
// "Step 1: Select File"
// "Step 2: Preview"
// "Step 3: Validate"
// "Step 4: Commit"
// And error messages, button labels, etc.
```

**Action**: Wrap ALL 20 hardcoded strings in ImportWizard.tsx with `t()` function calls
- Add useLanguage() hook
- Create 20 new translation keys in both locales
- Use context (file selected, validation status) as i18n parameters

---

### Category 2: Analytics Components (6+ strings)
**Files**:
- `frontend/src/features/analytics/components/AttendanceCard.tsx` (1 string)
- `frontend/src/features/analytics/components/GradeDistributionChart.tsx` (5 strings)
- `frontend/src/features/analytics/components/PerformanceCard.tsx` (1 string)

**Hardcoded Strings**:
```typescript
// AttendanceCard.tsx line 111
<span className="status-good">✓ {t("analytics.attendance_good")}</span>
// The ✓ itself is hardcoded symbol; strings inside are OK
// This might be a false positive

// GradeDistributionChart.tsx lines 111-127
<span>A (90-100%)</span>  → t('analytics.gradeA')
<span>B (80-89%)</span>   → t('analytics.gradeB')
<span>C (70-79%)</span>   → t('analytics.gradeC')
<span>D (60-69%)</span>   → t('analytics.gradeD')
<span>F (<60%)</span>     → t('analytics.gradeF')

// PerformanceCard.tsx line 94
<span className="stat-value">{data.period_days} days</span>
// → t('analytics.daysPeriod', { days: data.period_days })
```

**Action**:
1. Wrap 5 grade label strings in GradeDistributionChart
2. Wrap period_days string in PerformanceCard
3. Create 6 new translation keys in both locales

---

### Category 3: RBAC Components (3 strings)
**File**: `frontend/src/components/admin/RBACPanel.tsx`

**Hardcoded Strings** (lines 213-229):
```typescript
// Line 213
<CardTitle className="text-sm">User-Role Mappings ({usersData.items.length} users)</CardTitle>
// → t('rbac.userRoleMappings', { count: usersData.items.length })

// Line 229
<div className="text-xs text-gray-500">Legacy role: {user.role}</div>
// → t('rbac.legacyRole', { role: user.role })
```

**Action**:
1. Wrap 2-3 hardcoded strings with t() + parameters
2. Create 2-3 new translation keys in both locales

---

### Category 4: Control Panel (1 string)
**File**: `frontend/src/components/ControlPanel/UpdatesPanel.tsx`

**Hardcoded String** (lines 193-197):
```typescript
<p className="text-xs text-gray-400 mt-2 font-mono break-all">
  SHA256: {updateInfo.installer_hash}
</p>
// → t('updatesPanel.sha256Label') + {updateInfo.installer_hash}
```

**Action**:
1. Separate label from dynamic hash value
2. Wrap "SHA256:" label with t()
3. Create 1 new translation key in both locales

---

### Category 5: Auth/Page Components (2 strings)
**File**: `frontend/src/pages/AuthPage.tsx`

**Hardcoded String** (line 43):
```typescript
<div data-testid="auth-page-loaded" className="hidden">Loaded</div>
// This is a test-only element; may be false positive
// But if needed: → t('common.loaded')
```

**Action**:
- Mark as test-only and skip, OR
- Create test-specific translation key

---

## Phase 2 Execution Plan

### Step 1: ImportWizard.tsx (20 strings) - HIGHEST PRIORITY
**Time**: 15-20 min
**Process**:
1. Read file to identify all hardcoded strings (including in onClick handlers, error messages)
2. Create useLanguage() hook integration
3. Wrap 20+ hardcoded strings with t()
4. Identify all unique translation keys needed
5. Add 20 new keys to en/common.js
6. Add 20 new keys (Greek) to el/common.js
7. Commit: "Batch 6 Phase 2a - Wrap ImportWizard.tsx 20 hardcoded strings (i18n)"

### Step 2: Analytics Components (6 strings) - MEDIUM PRIORITY
**Time**: 10-15 min
**Process**:
1. GradeDistributionChart: Wrap 5 grade labels
2. PerformanceCard: Wrap period_days string
3. AttendanceCard: Review if needed
4. Add 6 new translation keys (EN + EL)
5. Commit: "Batch 6 Phase 2b - Wrap analytics component hardcoded strings (6 warnings)"

### Step 3: RBAC Panel (3 strings) - LOW-MEDIUM PRIORITY
**Time**: 5-10 min
**Process**:
1. Read RBACPanel.tsx
2. Wrap "User-Role Mappings" and "Legacy role" strings
3. Add 2-3 translation keys (EN + EL)
4. Commit: "Batch 6 Phase 2c - Wrap RBACPanel hardcoded strings (3 warnings)"

### Step 4: Control Panel (1 string) - LOW PRIORITY
**Time**: 3-5 min
**Process**:
1. Wrap "SHA256:" label
2. Add 1 translation key (EN + EL)
3. Commit: "Batch 6 Phase 2d - Wrap UpdatesPanel SHA256 label (1 warning)"

### Step 5: Auth/Page (test strings) - SKIP/DEFER
**Time**: Skip
**Reasoning**: Test-only elements; can be deferred to Phase 5 (polish)

### Step 6: Validation & Recount
**Time**: 5-10 min
**Process**:
1. Run TypeScript check: `npx tsc --noEmit`
2. Run ESLint scan: `npm run lint` to get new warning count
3. Expected result: ~49 warnings fixed → **~66-70 remaining**

---

## Translation Keys to Create (Phase 2)

### ImportWizard Keys (20 new):
```javascript
'importExport.importWizard': 'Import Wizard',
'importExport.step1SelectFile': 'Step 1: Select File',
'importExport.step2Preview': 'Step 2: Preview',
'importExport.step3Validate': 'Step 3: Validate',
'importExport.step4Commit': 'Step 4: Commit',
'importExport.selectFileToImport': 'Select file to import:',
'importExport.selectedFile': 'Selected file: {{fileName}}',
'importExport.noFileSelected': 'No file selected.',
'importExport.previewData': 'Preview Data',
'importExport.validateData': 'Validate Data',
'importExport.commitImport': 'Commit Import',
'importExport.previewWithBackend': 'Preview with Backend',
// ... Additional keys as needed
```

### Analytics Keys (6 new):
```javascript
'analytics.gradeA': 'A (90-100%)',
'analytics.gradeB': 'B (80-89%)',
'analytics.gradeC': 'C (70-79%)',
'analytics.gradeD': 'D (60-69%)',
'analytics.gradeF': 'F (<60%)',
'analytics.daysPeriod': '{{days}} days',
```

### RBAC Keys (2-3 new):
```javascript
'rbac.userRoleMappings': 'User-Role Mappings ({{count}} users)',
'rbac.legacyRole': 'Legacy role: {{role}}',
```

### Updates Keys (1 new):
```javascript
'updatesPanel.sha256Label': 'SHA256:',
```

**Total New Keys for Phase 2**: ~30-35 keys
- English: 15-18 keys
- Greek: 15-18 keys

---

## Success Criteria

✅ **Phase 2 Complete When**:
- [ ] All 20 ImportWizard strings wrapped with t()
- [ ] All 6 analytics component strings wrapped
- [ ] All 3 RBAC strings wrapped
- [ ] All 1 UpdatesPanel string wrapped
- [ ] 30+ translation keys added (EN + EL)
- [ ] TypeScript: 0 errors
- [ ] ESLint: ~49 warnings fixed (expect ~66-70 remaining)
- [ ] All Phase 2 commits in git history
- [ ] No regressions in functionality

**Token Budget**: 57% of 200,000 remaining (plenty for Phase 2)

---

## Notes

- ImportWizard is the bulk of this phase (20/49 = 40% of warnings)
- All other files are quick wins after ImportWizard
- Bilingual support (EN + EL) required for every key
- Parameters needed for dynamic content: `fileName`, `days`, `count`, `role`
- Test-only strings (AuthPage) can be deferred to Phase 5

**Status**: Ready to execute Phase 2 starting with ImportWizard.tsx
