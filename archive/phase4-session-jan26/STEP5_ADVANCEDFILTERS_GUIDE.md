# Step 5: AdvancedFilters Component - Implementation Guide

**Timeline**: Next 8 hours
**Status**: 🟢 READY TO START
**Estimated Time**: 8 hours
**Test Cases**: 12+ required
**Total Lines**: 300-400 (component) + 300+ (tests) = 600+ lines

---

## 📋 Component Overview

### AdvancedFilters Purpose
Dynamic filter condition builder allowing users to create complex search queries with multiple filter criteria, each with:
- Field selector (student fields, course fields, grade fields)
- Operator selector (equals, contains, startsWith, greaterThan, lessThan, between)
- Value input (appropriate input type based on field/operator)

### Key Features Required

1. **Dynamic Condition Array**
   - Add new filter condition
   - Remove specific condition
   - Clear all conditions
   - Filter count badge

2. **FilterCondition Sub-Component** (150-200 lines)
   - Field dropdown (available fields based on context)
   - Operator dropdown (6 types)
   - Value input (dynamic based on operator)
   - Remove button

3. **Operator Support** (6 types)
   - `equals`: Single value, exact match
   - `contains`: Single value, substring match
   - `startsWith`: Single value, prefix match
   - `greaterThan`: Single numeric/date value
   - `lessThan`: Single numeric/date value
   - `between`: Min/max range inputs

4. **UI Features**
   - Expandable/collapsible panel
   - Filter count badge
   - Clear all button
   - Add condition button
   - Proper spacing and layout
   - Loading state

5. **Accessibility**
   - ARIA labels on all controls
   - Semantic HTML
   - Keyboard navigation
   - Focus management
   - Screen reader support

6. **TypeScript Typing**
   - No `any` types
   - Proper interface definitions
   - Generic typing where appropriate

---

## 🎯 Implementation Steps

### Step 5.1: Create FilterCondition Component (2 hours)

**File**: `frontend/src/features/advanced-search/components/FilterCondition.tsx`

**Structure** (150-200 lines):
```typescript
interface FilterConditionProps {
  condition: FilterCondition;
  fields: FieldDefinition[];
  onConditionChange: (condition: FilterCondition) => void;
  onRemove: () => void;
  disabled?: boolean;
}

interface FilterConditionComponentProps extends FilterConditionProps {}

const FilterCondition: FC<FilterConditionComponentProps> = ({
  condition,
  fields,
  onConditionChange,
  onRemove,
  disabled = false
}) => {
  // Handle field selection change
  // Handle operator selection change
  // Render dynamic value input based on operator
  // Handle value change
  // Render remove button
}
```

**Key Implementation Details**:

1. **Field Selector**
   - Dropdown showing all available fields
   - Pre-selected field from condition
   - onChange handler updates condition

2. **Operator Selector**
   - Dropdown with 6 operator types
   - Options filtered based on field type
   - onChange handler updates operator

3. **Value Input** (Dynamic based on operator)
   ```typescript
   switch (operator) {
     case 'equals':
       return <TextInput value={...} onChange={...} />;
     case 'contains':
       return <TextInput value={...} onChange={...} />;
     case 'startsWith':
       return <TextInput value={...} onChange={...} />;
     case 'greaterThan':
       return <NumberInput value={...} onChange={...} />;
     case 'lessThan':
       return <NumberInput value={...} onChange={...} />;
     case 'between':
       return (
         <>
           <NumberInput label="Min" value={...} onChange={...} />
           <NumberInput label="Max" value={...} onChange={...} />
         </>
       );
   }
   ```

4. **Remove Button**
   - TrashIcon from @heroicons/react
   - onClick calls onRemove
   - ARIA label: "Remove this filter condition"

---

### Step 5.2: Create AdvancedFilters Container (2 hours)

**File**: `frontend/src/features/advanced-search/components/AdvancedFilters.tsx`

**Structure** (300-350 lines):
```typescript
interface AdvancedFiltersProps {
  filters: FilterCondition[];
  onFiltersChange: (filters: FilterCondition[]) => void;
  disabled?: boolean;
  className?: string;
}

const AdvancedFilters: FC<AdvancedFiltersProps> = ({
  filters,
  onFiltersChange,
  disabled = false,
  className = ''
}) => {
  // State: expanded panel
  // Handle add filter condition
  // Handle filter condition change
  // Handle remove filter condition
  // Handle clear all
  // Render collapsible panel
  // Render filter count badge
}
```

**Key Implementation Details**:

1. **Expandable Panel**
   - Initial state: collapsed (expand on click)
   - Header shows "Advanced Filters" + badge
   - Content shows all filter conditions
   - ChevronDownIcon (rotated on expand)

2. **Filter Count Badge**
   - Shows number of active filters
   - Styling: bg-blue-100 text-blue-800, rounded-full
   - Updates as filters added/removed
   - Hidden when count is 0

3. **Add Filter Button**
   - PlusIcon from @heroicons/react
   - Creates new FilterCondition with defaults
   - appends to filters array
   - Disables when form has validation errors

4. **Clear All Button**
   - Appears when filters.length > 0
   - onClick: setFilters([])
   - Confirmation: optional toast message
   - ARIA label: "Clear all filter conditions"

5. **Layout**
   ```
   ┌─ Advanced Filters ▼ [3]      ──────┐
   │  Filter Condition 1                 │
   │  ├─ Field: [Student Name ▼]        │
   │  ├─ Operator: [contains ▼]         │
   │  ├─ Value: [John...]              │
   │  └─ Remove [×]                     │
   │                                     │
   │  Filter Condition 2                 │
   │  ├─ Field: [Status ▼]              │
   │  ├─ Operator: [equals ▼]           │
   │  ├─ Value: [Active ▼]              │
   │  └─ Remove [×]                     │
   │                                     │
   │  [+ Add Filter]  [Clear All]       │
   └─────────────────────────────────────┘
   ```

---

### Step 5.3: Write 12+ Test Cases (3 hours)

**File**: `frontend/src/features/advanced-search/__tests__/AdvancedFilters.test.tsx`

**Test Suite** (300+ lines, 12+ tests):

1. **Rendering Tests** (2 tests)
   - Renders collapsed by default
   - Renders expanded when clicked

2. **Filter Condition Management** (4 tests)
   - Add filter condition button works
   - Remove filter condition works
   - Clear all filters works
   - Multiple conditions render correctly

3. **Filter Count Badge** (2 tests)
   - Badge shows correct count
   - Badge hidden when no filters

4. **Operator & Field Selection** (2 tests)
   - Field selection updates condition
   - Operator selection updates condition

5. **Value Input** (1 test)
   - Value input changes update condition

6. **Accessibility** (1 test)
   - ARIA labels present
   - Keyboard navigation works

**Test Pattern**:
```typescript
describe('AdvancedFilters', () => {
  const defaultFilters: FilterCondition[] = [
    {
      field: 'name',
      operator: 'contains',
      value: 'John',
    },
  ];

  const mockOnFiltersChange = vi.fn();

  beforeEach(() => {
    mockOnFiltersChange.mockClear();
  });

  test('renders collapsed by default', () => {
    const { queryByText } = renderWithI18n(
      <AdvancedFilters
        filters={[]}
        onFiltersChange={mockOnFiltersChange}
      />
    );
    expect(queryByText(/Filter Condition 1/)).not.toBeInTheDocument();
  });

  test('expands when header is clicked', async () => {
    const { getByRole, getByText } = renderWithI18n(
      <AdvancedFilters
        filters={defaultFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    );
    
    const header = getByRole('button', { name: /Advanced Filters/ });
    await userEvent.click(header);
    
    expect(getByText(/Filter Condition 1/)).toBeInTheDocument();
  });

  // ... more tests
});
```

---

## 🔧 Type Definitions (Already Defined)

From `frontend/src/features/advanced-search/types/search.ts`:

```typescript
export type FilterOperator = 'equals' | 'contains' | 'startsWith' | 'greaterThan' | 'lessThan' | 'between';

export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: string | number | { min: number; max: number };
}

export interface FieldDefinition {
  name: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'select';
  operators: FilterOperator[];
  options?: { label: string; value: string }[];
}
```

---

## 🚀 Available Icons

From `@heroicons/react/24/outline`:
- `PlusIcon` - Add filter button
- `TrashIcon` - Remove condition button
- `XMarkIcon` - Clear all button
- `ChevronDownIcon` - Expand/collapse panel
- `AdjustmentsHorizontalIcon` - Header icon

---

## 📝 i18n Keys Required

Add to all locale files (`frontend/src/locales/{en,el}/search.ts`):

```typescript
{
  search: {
    // ... existing keys
    advancedFilters: {
      title: 'Advanced Filters',
      addFilter: 'Add Filter',
      clearAll: 'Clear All',
      removeFilter: 'Remove this filter',
      filterCount: '{{count}} active',
      condition: {
        field: 'Field',
        operator: 'Operator',
        value: 'Value',
        selectField: 'Select field...',
        selectOperator: 'Select operator...',
      },
      operators: {
        equals: 'Equals',
        contains: 'Contains',
        startsWith: 'Starts with',
        greaterThan: 'Greater than',
        lessThan: 'Less than',
        between: 'Between',
      },
    },
  }
}
```

---

## ✅ Acceptance Criteria

- [x] FilterCondition component created (150-200 lines)
- [x] AdvancedFilters container created (300-350 lines)
- [x] Add filter condition works
- [x] Remove filter condition works
- [x] Clear all filters works
- [x] Filter count badge displays
- [x] Expandable/collapsible panel works
- [x] 12+ test cases written
- [x] All tests passing
- [x] WCAG 2.1 accessibility
- [x] TypeScript strict mode (no `any` types)
- [x] i18n integration (EN/EL)
- [x] Committed to git
- [x] Pushed to origin

---

## ⏱️ Time Breakdown

| Task | Estimated | Actual | Status |
|------|-----------|--------|--------|
| FilterCondition component | 2h | - | ⏳ |
| AdvancedFilters container | 2h | - | ⏳ |
| Test suite (12+ tests) | 3h | - | ⏳ |
| Git commit & push | 1h | - | ⏳ |
| **TOTAL** | **8h** | - | ⏳ |

---

## 🎯 Success Criteria

After Step 5 is complete:
- ✅ AdvancedFilters.tsx (300-350 lines) committed
- ✅ FilterCondition.tsx (150-200 lines) committed
- ✅ AdvancedFilters.test.tsx (300+ lines, 12+ tests) passing
- ✅ All tests green
- ✅ Code pushed to origin
- ✅ Documentation updated
- ✅ Ready for Step 6 (SearchResults)

---

## 🔗 Related Files

- Types: `frontend/src/features/advanced-search/types/search.ts`
- API: `frontend/src/features/advanced-search/api/search-client.ts`
- Hooks: `frontend/src/features/advanced-search/hooks/useSearch.ts`
- Test wrapper: `frontend/src/test-utils/i18n-test-wrapper.tsx`
- Main page: `frontend/src/features/advanced-search/AdvancedSearchPage.tsx`

---

## 📚 Reference

- Previous Step (SearchBar): `STEP4_SEARCHBAR_COMPLETE.md`
- Implementation Status: `ISSUE147_IMPLEMENTATION_STATUS.md`
- Work Plan: `docs/plans/UNIFIED_WORK_PLAN.md`
- Preparation Guide: `docs/PHASE4_ISSUE147_PREPARATION_GUIDE.md`

