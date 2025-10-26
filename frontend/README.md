
### frontend/README.md
```markdown
# Frontend Setup

1. Install dependencies:
```bash
npm install
```

2. Run development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

App will run at: http://localhost:5173
```

---
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