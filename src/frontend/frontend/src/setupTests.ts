import '@testing-library/jest-dom/vitest';
import testI18n from './test-utils/i18n-test-wrapper';

// Use test-specific i18n instance (avoids corruption from translations.ts spreading)
testI18n.changeLanguage('en').catch(() => {
  // Initialization may not be complete yet, that's okay
});

const shouldSuppressTestLog = (message: string) => {
	return (
		message.includes('Not implemented: navigation') ||
		message.includes('was not wrapped in act') ||
		message.startsWith('[i18n]') ||
		message.startsWith('[Performance]') ||
		message.startsWith('[API Client]') ||
		message.startsWith('[API]') ||
		message.startsWith('[WebSocket]') ||
		message.startsWith('[useAutosave]') ||
		message.startsWith('Failed to fetch notifications') ||
		message.startsWith('Failed to mark notification as read') ||
		message.includes('Each child in a list should have a unique "key" prop') ||
		message.includes('Failed to fetch saved searches') ||
		message.includes('Failed to load course info') ||
		message.includes('Error loading saved searches') ||
		message.includes('Error saving search') ||
		message.includes('[ThemeProvider] Failed to save theme') ||
		message.includes('Error fetching performance') ||
		message.includes('Error fetching trends') ||
		message.includes('Error fetching attendance') ||
		message.includes('Query data cannot be undefined') ||
		message.includes('Using Vite dev proxy for localhost API')
	);
};

const shouldSuppressAllLogs = typeof process !== 'undefined' && !process.env.DEBUG_TEST_LOGS;

const wrapConsoleMethod = <T extends (...args: unknown[]) => void>(method: T) =>
	(...args: unknown[]) => {
		if (shouldSuppressAllLogs) {
			return;
		}
		const combined = args.map((entry) => String(entry)).join(' ');
		if (shouldSuppressTestLog(combined)) {
			return;
		}
		method(...args);
	};

const originalError = console.error.bind(console);
const originalWarn = console.warn.bind(console);
// eslint-disable-next-line no-console
const originalInfo = console.info.bind(console);
// eslint-disable-next-line no-console
const originalLog = console.log.bind(console);

console.error = wrapConsoleMethod(originalError);
console.warn = wrapConsoleMethod(originalWarn);
// eslint-disable-next-line no-console
console.info = wrapConsoleMethod(originalInfo);
// eslint-disable-next-line no-console
console.log = wrapConsoleMethod(originalLog);

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
