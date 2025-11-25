# Autosave Pattern Guide

## Overview

The Student Management System implements a **universal autosave pattern** using a custom React hook that provides automatic data persistence with debouncing, preventing data loss and reducing manual save operations.

## Architecture

### Core Hook: `useAutosave`

Location: `frontend/src/hooks/useAutosave.ts`

The `useAutosave` hook provides:
- ✅ **Debounced saves** - Waits for user to stop making changes
- ✅ **Duplicate prevention** - Prevents concurrent save operations
- ✅ **State tracking** - Shows saving/pending status to users
- ✅ **Error handling** - Callbacks for success/error scenarios
- ✅ **Manual override** - `saveNow()` function to bypass debounce
- ✅ **Skip initial render** - Avoids unnecessary saves on component mount

## Usage

### Basic Example

```tsx
import { useAutosave } from '@/hooks/useAutosave';

const MyComponent = () => {
  const [data, setData] = useState({});
  
  const { isSaving, isPending, saveNow } = useAutosave(
    async () => {
      await apiClient.post('/save', data);
    },
    [data], // Dependencies to watch
    {
      delay: 2000, // Wait 2s after last change
      enabled: data !== null, // Only save when data exists
      onSuccess: () => console.log('Saved!'),
      onError: (error) => console.error('Save failed:', error),
    }
  );

  return (
    <div>
      <input onChange={(e) => setData(e.target.value)} />
      {isPending && <span>Changes pending...</span>}
      {isSaving && <span>Saving...</span>}
      <button onClick={saveNow}>Save Now</button>
    </div>
  );
};
```

### Advanced Example: Attendance with Autosave

```tsx
const AttendanceView = ({ courses, students }) => {
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [dailyPerformance, setDailyPerformance] = useState({});

  const performSave = useCallback(async () => {
    // Complex save logic with multiple API calls
    const attendancePromises = Object.entries(attendanceRecords).map(/*...*/);
    const performancePromises = Object.entries(dailyPerformance).map(/*...*/);
    await Promise.all([...attendancePromises, ...performancePromises]);
    
    showToast('Saved successfully', 'success');
  }, [attendanceRecords, dailyPerformance]);

  const hasChanges = 
    Object.keys(attendanceRecords).length > 0 || 
    Object.keys(dailyPerformance).length > 0;

  const { isSaving, isPending } = useAutosave(
    performSave,
    [attendanceRecords, dailyPerformance],
    {
      delay: 2000,
      enabled: hasChanges && selectedCourse !== '',
      skipInitial: true,
    }
  );

  return (
    <div>
      {/* Autosave status indicator */}
      {(isSaving || isPending) && (
        <div className="flex items-center gap-2">
          <CloudUpload className={isSaving ? 'animate-pulse' : ''} />
          <span>{isSaving ? 'Saving...' : 'Changes pending...'}</span>
        </div>
      )}
      
      {/* No manual save button needed! */}
      <StudentsList onMarkAttendance={setAttendance} />
    </div>
  );
};
```

## API Reference

### `useAutosave(saveFunction, dependencies, options)`

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `saveFunction` | `() => Promise<void>` | Async function to execute for saving |
| `dependencies` | `unknown[]` | Array of values to watch for changes |
| `options` | `AutosaveOptions` | Configuration object (optional) |

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `delay` | `number` | `2000` | Debounce delay in milliseconds |
| `enabled` | `boolean` | `true` | Enable/disable autosave |
| `onSuccess` | `() => void` | `undefined` | Callback on successful save |
| `onError` | `(error) => void` | `undefined` | Callback on save error |
| `skipInitial` | `boolean` | `true` | Skip saving on initial mount |

#### Return Value

| Property | Type | Description |
|----------|------|-------------|
| `isSaving` | `boolean` | Whether save is currently in progress |
| `isPending` | `boolean` | Whether changes are waiting to be saved |
| `saveNow` | `() => Promise<void>` | Manually trigger save immediately |
| `lastSaved` | `Date \| null` | Timestamp of last successful save |

## Implementation Status

### ✅ Implemented Components

1. **AttendanceView** (`frontend/src/features/attendance/components/AttendanceView.tsx`)
   - Autosaves attendance records and daily performance scores
   - 2-second debounce after last change
   - Visual indicator shows saving/pending status
   - Removed redundant "Save All" button

2. **EnhancedAttendanceCalendar** (`frontend/src/features/attendance/components/EnhancedAttendanceCalendar.tsx`)
   - Same autosave behavior as AttendanceView
   - Simplified UI without manual save button

3. **NotesSection** (`frontend/src/features/students/components/NotesSection.tsx`)
   - Autosaves student notes to localStorage
   - 2-second debounce after typing stops
   - Visual indicator with CloudUpload icon
   - Used across student cards and profile views

4. **CourseEvaluationRules** (`frontend/src/features/courses/components/CourseEvaluationRules.tsx`)
   - Autosaves evaluation rules and absence penalties
   - Only saves when rules total 100% (validation)
   - Removed manual "Save Rules" button
   - Visual indicator in component header

### 🔄 Recommended for Future Implementation

1. **StudentForm** (AddStudentModal/EditStudentModal) - Auto-save profile edits
2. **CourseForm** (AddCourseModal/EditCourseModal) - Auto-save course configuration
3. **HighlightsForm** - Auto-save student achievements/concerns when created
4. **GradingView** - Currently uses form submission (optimal for single entry)

## Best Practices

### ✅ DO

- **Use `useCallback`** for save functions to prevent unnecessary re-renders
- **Show visual feedback** when autosave is pending or in progress
- **Handle errors gracefully** with `onError` callback and user notifications
- **Disable autosave** when there are no changes (`enabled: hasChanges`)
- **Set appropriate debounce delays**:
  - Quick edits (text input): 1000-2000ms
  - Complex forms: 2000-3000ms
  - Heavy operations: 3000-5000ms

### ❌ DON'T

- **Don't create inline save functions** - memoize with `useCallback`
- **Don't ignore errors** - always implement error handling
- **Don't set delay too low** - causes excessive API calls
- **Don't forget `skipInitial: true`** - prevents unwanted saves on mount
- **Don't remove all manual save options** - provide `saveNow()` for critical operations

## UX Considerations

### Visual Indicators

Provide clear feedback to users about autosave status:

```tsx
{(isAutosaving || autosavePending) && (
  <div className="flex items-center gap-2 text-sm bg-blue-50 px-3 py-2 rounded-lg">
    <CloudUpload 
      size={16} 
      className={isAutosaving ? 'animate-pulse text-blue-600' : 'text-gray-400'} 
    />
    <span>
      {isAutosaving 
        ? t('saving') || 'Saving...' 
        : t('autosavePending') || 'Changes pending...'
      }
    </span>
  </div>
)}
```

### Accessibility

- Use ARIA live regions for screen readers:
  ```tsx
  <div role="status" aria-live="polite" aria-atomic="true">
    {isSaving ? 'Saving changes...' : isPending ? 'Changes pending' : 'All changes saved'}
  </div>
  ```

### Translations

Add autosave-related keys to locale files:

```javascript
// en/attendance.js
{
  autosavePending: 'Changes pending...',
  saving: 'Saving...',
  savedSuccessfully: 'Saved successfully',
  saveFailed: 'Save failed',
}

// el/attendance.js
{
  autosavePending: 'Αλλαγές σε εκκρεμότητα...',
  saving: 'Αποθήκευση...',
  savedSuccessfully: 'Αποθηκεύτηκε επιτυχώς',
  saveFailed: 'Η αποθήκευση απέτυχε',
}
```

## Performance Optimization

### Memory Management

The autosave hook uses:
- **Cleanup timers** - Clears timeouts on unmount
- **Ref-based flags** - Prevents concurrent saves without re-renders
- **Minimal state** - Only tracks essential saving status

### Network Optimization

- **Debouncing** reduces API calls by ~80-90%
- **Chunked requests** for batch operations (see AttendanceView)
- **Request deduplication** with ref flags

### Example: Chunked Saves

```tsx
const performSave = useCallback(async () => {
  const allPromises = [...attendancePromises, ...performancePromises];
  const CHUNK_SIZE = 30; // Process 30 at a time
  
  for (let i = 0; i < allPromises.length; i += CHUNK_SIZE) {
    const chunk = allPromises.slice(i, i + CHUNK_SIZE);
    await Promise.all(chunk);
    
    if (i + CHUNK_SIZE < allPromises.length) {
      await new Promise(resolve => setTimeout(resolve, 200)); // Small delay between chunks
    }
  }
}, [attendancePromises, performancePromises]);
```

## Testing

### Unit Test Example

```tsx
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAutosave } from '@/hooks/useAutosave';

describe('useAutosave', () => {
  it('debounces save calls', async () => {
    const mockSave = jest.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ data }) => useAutosave(mockSave, [data], { delay: 100 }),
      { initialProps: { data: 'initial' } }
    );

    // Change data multiple times
    rerender({ data: 'change1' });
    rerender({ data: 'change2' });
    rerender({ data: 'final' });

    // Should only call save once after debounce
    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1), { timeout: 500 });
  });

  it('provides isPending status', () => {
    const mockSave = jest.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ data }) => useAutosave(mockSave, [data], { delay: 1000 }),
      { initialProps: { data: 'initial' } }
    );

    expect(result.current.isPending).toBe(false);
    
    rerender({ data: 'changed' });
    
    expect(result.current.isPending).toBe(true);
  });
});
```

## Migration Guide

### Converting Manual Save to Autosave

**Before:**
```tsx
const MyForm = () => {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await apiClient.post('/save', data);
      showToast('Saved!', 'success');
    } catch (error) {
      showToast('Failed!', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <input onChange={(e) => setData({ ...data, name: e.target.value })} />
      <button onClick={handleSave} disabled={loading}>
        {loading ? 'Saving...' : 'Save'}
      </button>
    </>
  );
};
```

**After:**
```tsx
const MyForm = () => {
  const [data, setData] = useState({});

  const performSave = useCallback(async () => {
    await apiClient.post('/save', data);
    showToast('Saved!', 'success');
  }, [data]);

  const { isSaving, isPending } = useAutosave(
    performSave,
    [data],
    {
      delay: 2000,
      enabled: Object.keys(data).length > 0,
      onError: () => showToast('Failed!', 'error'),
    }
  );

  return (
    <>
      <input onChange={(e) => setData({ ...data, name: e.target.value })} />
      {(isSaving || isPending) && (
        <span>{isSaving ? 'Saving...' : 'Changes pending...'}</span>
      )}
      {/* No save button needed! */}
    </>
  );
};
```

## Troubleshooting

### Issue: Save called on initial render

**Solution:** Ensure `skipInitial: true` in options

### Issue: Too many API calls

**Solution:** Increase `delay` or check dependencies array for unstable references

### Issue: Save not triggered

**Solution:** Verify `enabled` condition and check console for errors

### Issue: Concurrent saves causing conflicts

**Solution:** Hook prevents this automatically, but ensure `saveFunction` is properly memoized

## Future Enhancements

- [ ] **Offline support** - Queue saves when offline, sync when online
- [ ] **Conflict resolution** - Handle simultaneous edits from multiple users
- [ ] **Save history** - Track and display save timestamps
- [ ] **Undo/Redo** - Integrate with autosave for change history
- [ ] **Optimistic updates** - Update UI immediately, rollback on error

## Related Documentation

- [React Query Patterns](./REACT_QUERY_PATTERNS.md)
- [State Management Guide](./STATE_MANAGEMENT.md)
- [Performance Optimization](./PERFORMANCE_OPTIMIZATION.md)
- [API Client Usage](./API_CLIENT.md)
