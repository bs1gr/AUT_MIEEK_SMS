import '@testing-library/jest-dom/vitest';
import i18n from './i18n/config';

// Ensure i18n is using English for tests
i18n.changeLanguage('en').catch(() => {
  // Initialization may not be complete yet, that's okay
});

// Log translation keys for debugging (will be visible in test output)
if (typeof process !== 'undefined' && (process.env.DEBUG_I18N || process.env.NODE_ENV === 'test')) {
  console.log('[i18n] Initialized with English');
  const searchKeys = i18n.getResourceBundle('en', 'translation')?.search;
  if (searchKeys) {
    console.log('[i18n] Found search translation keys:', Object.keys(searchKeys || {}));
  } else {
    console.warn('[i18n] No search translation keys found in English bundle');
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
