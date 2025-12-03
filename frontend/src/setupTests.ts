import '@testing-library/jest-dom/vitest';
import './i18n/config';

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
