# Deprecated Components

This directory contains legacy code and files that have been superseded by newer implementations.

## Contents

### `html_control_panel.html`

- **Deprecated**: January 2025
- **Replaced by**: React Operations page at `/operations`
- **Reason**:
  - Duplicated functionality now available in the main React SPA
  - Manage Backups, system diagnostics, and control features are fully integrated in the Operations UI
  - Standalone HTML file was harder to maintain and inconsistent with the modern React architecture
- **Migration**: All control and operations features are now accessible through the React Operations page with improved UX, i18n support (EN/EL), and theme integration

## Notes

- Files in this directory are preserved for reference only
- They are not loaded or served by the application
- Backend endpoints under `/control/api/operations/*` remain active for use by the React Operations UI
- The legacy `GET /control` endpoint has been removed from `backend/main.py`

---

**Last Updated**: January 2025
