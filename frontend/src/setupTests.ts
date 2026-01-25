import '@testing-library/jest-dom/vitest';
import testI18n from './test-utils/i18n-test-wrapper';

// Use test-specific i18n instance (avoids corruption from translations.ts spreading)
testI18n.changeLanguage('en').catch(() => {
  // Initialization may not be complete yet, that's okay
});

// Log translation keys for debugging (will be visible in test output)
if (typeof process !== 'undefined' && (process.env.DEBUG_I18N || process.env.NODE_ENV === 'test')) {
  // Translation debugging - using warn to comply with ESLint console rules
  const searchKeys = testI18n.getResourceBundle('en', 'translation')?.search;
  if (!searchKeys) {
    console.warn('[i18n] No search translation keys found in English bundle');
  } else {
    console.warn('[i18n] Search translation keys loaded:', Object.keys(searchKeys).length, 'keys');
  }
}

// Suppress JSDOM navigation warnings - these are expected in test environment
const originalError = console.error;
console.error = (...args: unknown[]) => {
  const message = String(args[0]);
  if (message.includes('Not implemented: navigation')) {
    return; // Suppress JSDOM navigation warnings
  }
  originalError(...args);
};

// Disable native browser form validation in JSDOM so component-level schema
// validation (zod) can run and surface errors in tests. Native validation would
// otherwise block form submission on inputs like type="email".
try {
	// Always consider forms/inputs valid to allow submit events to fire
	// and let our validation logic handle errors.
	if (typeof HTMLFormElement !== 'undefined') {
		// checkValidity/reportValidity can interfere with submit in JSDOM
		Object.defineProperty(HTMLFormElement.prototype, 'checkValidity', {
			configurable: true,
			writable: true,
			value: () => true,
		});
		Object.defineProperty(HTMLFormElement.prototype, 'reportValidity', {
			configurable: true,
			writable: true,
			value: () => true,
		});
	}
	if (typeof HTMLInputElement !== 'undefined') {
		Object.defineProperty(HTMLInputElement.prototype, 'reportValidity', {
			configurable: true,
			writable: true,
			value: () => true,
		});
		Object.defineProperty(HTMLInputElement.prototype, 'checkValidity', {
			configurable: true,
			writable: true,
			value: () => true,
		});
		Object.defineProperty(HTMLInputElement.prototype, 'setCustomValidity', {
			configurable: true,
			writable: true,
			value: () => {},
		});
	}
} catch {
	// Non-fatal in environments where DOM prototypes aren't available
}
