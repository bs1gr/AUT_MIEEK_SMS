# Release Notes $11.17.6 - PWA & Mobile Experience

**Date:** January 22, 2026
**Version:** $11.17.6
**Focus:** Progressive Web App (PWA), Offline Support, Mobile UX

## 🚀 Key Highlights

This release transforms the Student Management System into a fully installable Progressive Web App (PWA), enabling offline access, home screen installation, and a native-like mobile experience.

### 📱 PWA Capabilities

- **Installable App:** Users can now install SMS on their desktop or mobile device (iOS/Android) for a native app experience.
- **Offline Support:** Core application shell and static assets are cached, allowing the app to load instantly even without a network connection.
- **Data Persistence:** Previously fetched data (students, grades, etc.) is persisted locally, enabling read-only access while offline.
- **Mobile Optimizations:** Enhanced viewport handling for notched devices (iPhone X+), disabled pull-to-refresh for app-like feel, and optimized touch interactions.

### 🔄 Updates & Resilience

- **Smart Updates:** The app automatically detects new versions and prompts the user to refresh, ensuring everyone is on the latest build.
- **Network Resilience:** Caching strategies prioritize network freshness for data while falling back to cache, ensuring reliability in poor network conditions.

## 🛠️ Technical Details

### New Features

- **Service Worker:** Powered by `vite-plugin-pwa` and Workbox for robust caching strategies.
- **Manifest:** Full web app manifest with maskable icons and theme configuration.
- **Persistence Layer:** `persistQueryClient` integration with `localStorage` for React Query cache persistence.

### New Components

- `PwaInstallPrompt`: Custom UI to encourage installation on supported devices.
- `PwaReloadPrompt`: Non-intrusive notification when a new version is ready.

## 🧪 Testing

- **PWA Audit:** Automated Playwright suite verifying manifest, service worker registration, and installability.
- **Lighthouse:** Verified PWA compliance scores.

## 📝 Upgrade Notes

### Frontend

- Users will see a "New content available" prompt upon first load after deployment.
- Browser cache will be primed with new assets.

---
**Contributors:** Development Team
**Signed-off by:** QA Lead

