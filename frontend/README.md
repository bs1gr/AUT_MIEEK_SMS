# Frontend README

## Frontend Setup

1. Install dependencies:

    ```bash
    npm install
    ```

1. Run development server:

    ```bash
    npm run dev
    ```

1. Build for production:

    ```bash
    npm run build
    ```

The development server runs at <http://localhost:5173>.

### Optional: auto-login for local dev

For faster local testing you can enable auto-login (disabled by default). Add the following to your local `.env` only when needed:

```dotenv
VITE_ENABLE_AUTO_LOGIN=true
VITE_AUTO_LOGIN_EMAIL=admin@example.com
VITE_AUTO_LOGIN_PASSWORD=YourSecurePassword123!
```

Do **not** set these in production builds—users should sign in normally.

```text
student-management-system/
├── backend/
│   ├── main.py (UPDATED)
│   ├── models.py (UPDATED)
│   ├── migrate_database.py (NEW)
│   ├── smart_migrate.py (NEW)
│   ├── test_evaluation_rules.py (NEW)
│   └── student_management.db
│
└── frontend/
     └── src/
          ├── components/
          │   ├── CourseEvaluationRules.jsx (NEW)
          │   ├── EnhancedGradeEntryForm.jsx (NEW)
          │   ├── AttendanceCalendar.jsx
          │   ├── ExportCenter.jsx
          │   ├── HelpDocumentation.jsx
          │   └── StudentProfile.jsx
          ├── App.jsx (UPDATED)
          ├── LanguageContext.jsx
          └── index.js
```
