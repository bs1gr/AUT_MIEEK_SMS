// Re-export the project's initialized i18n instance so tests and components
// can import from "src/i18n" and receive the configured i18next instance.
// Note: The actual initialization happens in "./i18n/config" which wires up
// resources from translations.ts and sets up react-i18next.
export { default } from './i18n/config';
