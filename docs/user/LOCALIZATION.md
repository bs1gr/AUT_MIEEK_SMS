# Internationalization (i18n) Implementation

## Accessibility & Color Contrast

- All translated UI text must use high-contrast, accessible color classes (see README for details).
- Never use low-contrast grays for primary content; prefer `text-indigo-700`, `text-indigo-800`, or similar vivid colors.
- Validate all UI changes with accessibility tools and ensure ARIA roles/labels are present where needed.

## Translation Integrity

- All translation keys must exist in both EN and EL files.
- Tests enforce translation completeness and prevent regressions.
- Never hardcode UI strings; always use `t('key')` from the translation context.

## Overview

The Student Management System now supports full internationalization with bilingual support for **English (EN)** and **Greek (EL)**. This implementation uses the industry-standard `i18next` framework with automatic language detection and persistent user preferences.

## Architecture

### Core Dependencies

- **i18next** (v23.x): Core internationalization framework
- **react-i18next** (v14.x): React bindings for i18next
- **i18next-browser-languagedetector** (v7.x): Automatic language detection

### File Structure

```text
frontend/src/
├── i18n/
│   └── config.ts                # i18n initialization (i18next + detectors)
├── translations.ts              # Aggregates namespace modules per language
├── locales/
│   ├── en/
│   │   ├── common.ts
│   │   ├── attendance.ts
│   │   └── [...additional namespaces]
│   └── el/
│       ├── common.ts
│       ├── attendance.ts
│       └── [...]
├── components/
│   └── LanguageSwitcher.tsx     # Language toggle component
├── StudentManagementApp.tsx     # Loads config + providers
└── [other components]           # Components using translations
```

## Configuration Details

### Language Detection

The system detects language in the following order:

1. **localStorage** - Previously selected language (persistent)
2. **navigator** - Browser language settings (fallback)

Default fallback language: **English (en)**

### Language Switching

Users can toggle between languages using the `LanguageSwitcher` component located in the header. The selection is automatically saved to `localStorage` and persists across sessions.

## Translation Modules

### Directory Layout

- Language namespaces live under `frontend/src/locales/<language>/<namespace>.{js,ts}` (for example `frontend/src/locales/en/attendance.js`).
- Each module exports a default object containing translation keys for that feature area.
- `frontend/src/translations.ts` imports those modules and merges them into the `translations` object consumed by `frontend/src/i18n/config.ts`.

### Example Namespace Module

```typescript
// frontend/src/locales/en/attendance.js
export default {
  attendanceTitle: 'Attendance Tracking',
  markAttendance: 'Mark attendance for students',
  selectDate: 'Select Date'
  // ...more keys
};
```

### Aggregator (`translations.ts`)

The aggregator shapes the resources passed to i18next:

```typescript
import attendanceEn from './locales/en/attendance';
import attendanceEl from './locales/el/attendance';

export const translations = {
  en: {
    attendance: attendanceEn,
    ...attendanceEn // flattened keys for legacy callers
  },
  el: {
    attendance: attendanceEl,
    ...attendanceEl
  }
};
```

Add your namespace import and merge entry for both `en` and `el` whenever you introduce a new module. This keeps nested access available (`t('attendance.markAttendance')`) while still supporting legacy flat keys.

### Key Naming Convention

Use dot notation to organize keys hierarchically:

```text
module.component.element
```

Examples:

- `nav.students` → Navigation: Students
- `students.add` → Students: Add Student
- `errors.required` → Errors: This field is required

## Usage Guide

### In Functional Components

```jsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('common.dashboard')}</h1>
      <button>{t('common.save')}</button>
    </div>
  );
}
```

### With Interpolation

For dynamic values, use interpolation:

```jsx
// Translation file
{
  "errors": {
    "minLength": "Minimum length is {{min}} characters"
  }
}

// Component
<span>{t('errors.minLength', { min: 5 })}</span>
```

### In Class Components

Wrap the class component with a functional component that provides the translation function:

```jsx
import { useTranslation } from 'react-i18next';

// Class component receives t as prop
class MyClassComponent extends React.Component {
  render() {
    const { t } = this.props;
    return <div>{t('common.title')}</div>;
  }
}

// Wrapper provides translation
const MyComponent = (props) => {
  const { t } = useTranslation();
  return <MyClassComponent {...props} t={t} />;
};

export default MyComponent;
```

### Fallback Behavior

If a translation key is missing, the system will:

1. Show the key itself (e.g., `students.unknownKey`)
2. Use the provided fallback if specified: `t('key') || 'Fallback text'`

## Components Updated

### ✅ Implemented

1. **LanguageSwitcher** - Language toggle button (EN ⟷ ΕΛ)
2. **ErrorBoundary** - Error screen with translated messages
3. **StudentManagementApp** - Main app with LanguageSwitcher integration

### 🔄 Ready for Translation

All components can now use the `useTranslation()` hook. Priority components to update:

- Navigation menus
- Dashboard widgets
- Form labels and validation messages
- Data tables and lists
- Modal dialogs
- Confirmation messages

## Adding New Translations

### Step 1: Update Namespace Modules

Add or edit the key inside both language modules. Example adding a `myFeature` namespace:

```typescript
// frontend/src/locales/en/myFeature.js
export default {
  title: 'My Feature',
  description: 'Feature description'
};

// frontend/src/locales/el/myFeature.js
export default {
  title: 'Το Χαρακτηριστικό μου',
  description: 'Περιγραφή χαρακτηριστικού'
};
```

### Step 2: Register the Namespace

Import the new module in `frontend/src/translations.ts` and spread it into both language objects:

```typescript
import myFeatureEn from './locales/en/myFeature';
import myFeatureEl from './locales/el/myFeature';

export const translations = {
  en: {
    myFeature: myFeatureEn,
    ...myFeatureEn
  },
  el: {
    myFeature: myFeatureEl,
    ...myFeatureEl
  }
};
```

### Step 3: Use in Component

```jsx
import { useTranslation } from 'react-i18next';

function MyFeature() {
  const { t } = useTranslation();

  return (
    <div>
      <h2>{t('myFeature.title')}</h2>
      <p>{t('myFeature.description')}</p>
    </div>
  );
}
```

## Testing

### Manual Testing Checklist

- [ ] Language switcher visible and accessible
- [ ] Click switcher toggles between EN and ΕΛ
- [ ] Selected language persists after page refresh
- [ ] All translated components display correct language
- [ ] Fallback to English for missing translations
- [ ] Browser language detected on first visit
- [ ] localStorage correctly stores language preference

### Browser Console

Check i18n initialization:

```javascript
// Check current language
console.log(window.i18n.language);

// Check available languages
console.log(window.i18n.languages);

// Change language programmatically
window.i18n.changeLanguage('el');
```

## Performance Considerations

### Bundle Size

- Translation modules are tree-shaken and included in the main bundle
- Consider code-splitting for additional languages in the future
- Current overhead: ~10KB per language (uncompressed object literals)

### Runtime Performance

- i18next caches translations in memory
- Language switching is instant (no network requests)
- Translation lookup is O(1) hash map access

## Backend Localization

### Export Files (Excel/PDF)

The export endpoints in `backend/routers/routers_exports.py` now honor the requested locale and emit bilingual spreadsheets/PDFs.

- **Language detection order**: `?lang=` query parameter → `Accept-Language` header → English fallback.
- **Translation store**: A shared `TRANSLATIONS` dict plus `HEADER_DEFINITIONS` maps column headers, sheet names, status labels, and boilerplate strings for both EN/EL.
- **Helpers**: `get_header_row`, `translate_status_value`, `not_available`, `yes_no`, and `grade_report_heading` keep the code DRY and ensure every string goes through the translator before being written to a file.

#### Adding or Updating Export Text

1. Add/update the key inside `TRANSLATIONS['en']` and `TRANSLATIONS['el']`.
2. If the string is part of a header row, add the translation key to the relevant `HEADER_DEFINITIONS` entry (e.g., `"courses"`, `"attendance"`).
3. Reference the key via `t('your_key', lang)` or `get_header_row()` rather than hardcoding English text.
4. Verify outputs by calling the export endpoint with `Accept-Language: el` (Greek) and ensuring every sheet, column header, status label, and footer reflects the translation.

> **Tip:** Excel auto-fit helpers and PDF font registration already use DejaVu Sans, so no extra work is needed for Greek glyph support.

## Future Enhancements

### Potential Additions

1. **More Languages**: Add Spanish, French, German, etc.
2. **Lazy Loading**: Load translations on-demand for large apps
3. **Translation Management**: Use Locize, Crowdin, or similar services
4. **Pluralization**: Handle singular/plural forms (i18next supports this)
5. **Date/Time Localization**: Format dates per locale using `date-fns` or `luxon`
6. **Number Formatting**: Localize numbers, currencies, percentages
7. **RTL Support**: Add right-to-left language support (Arabic, Hebrew)
8. **Backend Localization**: Translate API error messages and emails

## Troubleshooting

### Language Not Changing

1. Check browser console for i18n errors
2. Verify translation keys exist in both language files
3. Clear localStorage and reload: `localStorage.clear()`
4. Ensure i18n config is imported in `main.jsx`

### Missing Translations

1. Check translation file syntax (valid JSON)
2. Verify key path matches exactly (case-sensitive)
3. Use fallback: `t('key') || 'Default text'`
4. Check browser console for i18next warnings

### Component Not Re-rendering

1. Ensure component uses `useTranslation()` hook
2. For class components, use wrapper pattern (see ErrorBoundary)
3. Check that component is not memoized incorrectly

## Migration Guide

### Converting Existing Components

**Before (hardcoded):**

```jsx
<button>Save</button>
<h1>Student Management</h1>
```

**After (localized):**

```jsx
import { useTranslation } from 'react-i18next';

function Component() {
  const { t } = useTranslation();

  return (
    <>
      <button>{t('common.save')}</button>
      <h1>{t('students.title')}</h1>
    </>
  );
}
```

### Existing Language Context

The app previously used a custom `LanguageContext`. This can coexist with i18next:

- Keep `LanguageContext` for legacy components (temporary)
- Gradually migrate to `useTranslation()` hook
- Eventually remove `LanguageContext` when all components are migrated

## Resources

- [i18next Documentation](https://www.i18next.com/)
- [react-i18next Documentation](https://react.i18next.com/)
- [i18next Best Practices](https://www.i18next.com/principles/fallback)
- [Translation File Examples](https://github.com/i18next/i18next/tree/master/examples)

## Support

For questions or issues with localization:

1. Check this documentation first
2. Review i18next documentation
3. Check browser console for errors
4. Verify translation file syntax with a JSON validator

---

**Last Updated**: 2025-11-15
**Version**: 1.2 ($11.9.7 alignment)
**Languages Supported**: English (EN), Greek (EL)
