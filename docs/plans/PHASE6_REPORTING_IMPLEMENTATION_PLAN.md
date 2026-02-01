# Phase 6: Reporting Enhancements - Implementation Plan

**Version**: 1.0
**Created**: February 1, 2026
**Target Version**: $11.17.6
**Timeline**: 2-3 weeks (Feb 1-21, 2026)
**Status**: 🚀 IN PROGRESS
**Feature Branch**: `feature/phase6-reporting-enhancements`

---

## 🎯 Objectives

Build comprehensive reporting system with:
1. Custom report builder (drag-and-drop UI)
2. Scheduled report generation (daily/weekly/monthly)
3. Advanced export (PDF with charts, Excel with graphs, CSV)
4. Comparative analytics (class vs class, year vs year)
5. Email delivery automation

---

## 📋 Implementation Phases

### **Phase 1: Backend Report Generation Engine** (Days 1-5)

#### **Day 1-2: Report Models & Services**
- [ ] Create `Report` model (name, template, filters, schedule)
- [ ] Create `ReportTemplate` model (fields, aggregations, charts)
- [ ] Create `GeneratedReport` model (file_path, status, created_at)
- [ ] Alembic migration for report tables
- [ ] Report service class with CRUD operations

**Files to Create/Modify**:
- `backend/models.py` - Add Report, ReportTemplate, GeneratedReport models
- `backend/migrations/versions/XXXX_add_report_tables.py` - Alembic migration
- `backend/services/report_service.py` - Report generation logic (300+ lines)
- `backend/schemas/reports.py` - Pydantic schemas (ReportCreate, ReportUpdate, ReportResponse)

#### **Day 3-4: Report Generation Engine**
- [ ] PDF generation with WeasyPrint (HTML templates → PDF)
- [ ] Excel generation with charts (openpyxl + XlsxWriter)
- [ ] CSV export (simple, fast)
- [ ] Chart generation service (matplotlib for embedded charts)
- [ ] Template rendering (Jinja2 templates)

**Files to Create**:
- `backend/services/report_generator.py` - Core generation engine (400+ lines)
- `backend/services/chart_generator.py` - Chart creation (matplotlib/plotly)
- `templates/reports/` - Jinja2 templates for PDF/HTML reports
  - `student_report.html`
  - `course_report.html`
  - `grade_distribution.html`
  - `attendance_report.html`

#### **Day 5: Report API Endpoints**
- [ ] POST /api/v1/reports - Create custom report
- [ ] GET /api/v1/reports - List saved reports
- [ ] GET /api/v1/reports/{id} - Get report details
- [ ] POST /api/v1/reports/{id}/generate - Generate report now
- [ ] GET /api/v1/reports/{id}/download - Download generated file
- [ ] DELETE /api/v1/reports/{id} - Delete report

**Files to Create**:
- `backend/routers/routers_reports.py` - Report endpoints (250+ lines)

---

### **Phase 2: Frontend Report Builder UI** (Days 6-10)

#### **Day 6-7: Report Builder Component**
- [ ] ReportBuilder.tsx - Drag-and-drop report designer
- [ ] Field selector (students, courses, grades, attendance fields)
- [ ] Filter builder (date ranges, status, enrollment type)
- [ ] Aggregation selector (count, avg, sum, min, max)
- [ ] Preview pane (live preview of report structure)

**Files to Create**:
- `frontend/src/features/reports/ReportBuilder.tsx` (300+ lines)
- `frontend/src/features/reports/components/FieldSelector.tsx`
- `frontend/src/features/reports/components/FilterBuilder.tsx`
- `frontend/src/features/reports/components/ReportPreview.tsx`

#### **Day 8-9: Report List & Management**
- [ ] ReportList.tsx - List of saved reports
- [ ] ReportCard.tsx - Individual report card (name, last run, schedule)
- [ ] ReportDetail.tsx - View report configuration
- [ ] GenerateReportButton.tsx - Trigger report generation
- [ ] DownloadReportButton.tsx - Download generated file

**Files to Create**:
- `frontend/src/features/reports/ReportList.tsx`
- `frontend/src/features/reports/ReportCard.tsx`
- `frontend/src/features/reports/ReportDetail.tsx`
- `frontend/src/features/reports/components/GenerateReportButton.tsx`

#### **Day 10: Report Templates & Presets**
- [ ] Pre-built report templates (10 standard reports)
  1. Student roster (all students with contact info)
  2. Grade distribution by course (histogram chart)
  3. Attendance summary by student
  4. Course enrollment report
  5. Top performers (GPA > 3.5)
  6. At-risk students (GPA < 2.0)
  7. Weekly attendance trends
  8. Monthly grade report
  9. Semester summary
  10. Comparative class performance

**Files to Create**:
- `backend/seeds/seed_report_templates.py` - Pre-built templates
- `frontend/src/features/reports/templates/` - Template UI configurations

---

### **Phase 3: Scheduled Reports & Email Delivery** (Days 11-13)

#### **Day 11-12: Report Scheduling**
- [ ] Add schedule fields to Report model (frequency, cron expression, next_run)
- [ ] Celery task for scheduled report generation
- [ ] Background worker configuration
- [ ] Scheduler service (trigger reports based on schedule)

**Files to Create/Modify**:
- `backend/services/report_scheduler.py` - Scheduling logic (200+ lines)
- `backend/tasks/report_tasks.py` - Celery tasks
- `backend/celeryconfig.py` - Celery configuration
- Add Redis as task broker (docker-compose update)

#### **Day 13: Email Delivery**
- [ ] Email service integration (existing email_notification_service.py)
- [ ] Report delivery email templates
- [ ] Attachment handling (PDF/Excel via email)
- [ ] Delivery status tracking (sent, failed, retries)

**Files to Create/Modify**:
- `templates/emails/report_delivery.html` - Email template
- `backend/services/report_delivery_service.py` - Email integration

---

### **Phase 4: Advanced Analytics & Charts** (Days 14-16)

#### **Day 14-15: Comparative Analytics**
- [ ] Class-to-class comparison (avg grades, attendance)
- [ ] Year-over-year trends (semester comparisons)
- [ ] Cohort analysis (2023 vs 2024 vs 2025)
- [ ] Statistical analysis (mean, median, std dev, percentiles)

**Files to Create**:
- `backend/services/analytics_service.py` - Statistical analysis (300+ lines)
- `backend/services/comparative_reports.py` - Comparison logic

#### **Day 16: Chart Generation**
- [ ] Bar charts (grade distribution, attendance by course)
- [ ] Line charts (grade trends over time)
- [ ] Pie charts (enrollment by status)
- [ ] Scatter plots (grade vs attendance correlation)
- [ ] Export charts as images (PNG) for PDF embedding

**Files to Create/Modify**:
- Enhance `backend/services/chart_generator.py` with all chart types
- Chart embedding in PDF templates

---

### **Phase 5: Testing & Documentation** (Days 17-21)

#### **Day 17-18: Backend Testing**
- [ ] Unit tests for report service (30+ tests)
- [ ] Integration tests for report generation (20+ tests)
- [ ] API endpoint tests (15+ tests)
- [ ] Scheduled report task tests (10+ tests)

**Files to Create**:
- `backend/tests/test_report_service.py`
- `backend/tests/test_report_generator.py`
- `backend/tests/test_routers_reports.py`
- `backend/tests/test_report_scheduler.py`

#### **Day 19-20: Frontend Testing**
- [ ] ReportBuilder component tests (25+ tests)
- [ ] Report list/detail tests (15+ tests)
- [ ] Template tests (10+ tests)
- [ ] Integration tests (10+ tests)

**Files to Create**:
- `frontend/src/features/reports/__tests__/ReportBuilder.test.tsx`
- `frontend/src/features/reports/__tests__/ReportList.test.tsx`
- `frontend/src/features/reports/__tests__/ReportTemplates.test.test`

#### **Day 21: Documentation & Polish**
- [ ] User guide: Creating custom reports
- [ ] Admin guide: Report scheduling and delivery
- [ ] API documentation: Report endpoints
- [ ] Translation keys (EN/EL for all UI text)

**Files to Create**:
- `docs/user/REPORTING_USER_GUIDE.md`
- `docs/admin/REPORTING_ADMIN_GUIDE.md`
- `frontend/src/locales/en/reports.ts` (40+ keys)
- `frontend/src/locales/el/reports.ts` (40+ keys)

---

## 📦 Dependencies to Add

### Backend
```txt
# requirements.txt additions
weasyprint>=60.0  # HTML to PDF generation
openpyxl>=3.1.0   # Excel with charts
xlsxwriter>=3.1.9 # Advanced Excel formatting
matplotlib>=3.8.0 # Chart generation
jinja2>=3.1.2     # Template rendering (already present)
celery>=5.3.0     # Task scheduling
redis>=5.0.0      # Celery broker
python-crontab>=3.0.0  # Cron expression parsing
```

### Frontend
```json
// package.json additions (if needed)
"@tanstack/react-query": "^5.17.0",  // Already present
"react-beautiful-dnd": "^13.1.1",    // Drag-and-drop for report builder
"recharts": "^2.10.0"                // Chart visualization in UI
```

---

## 🎯 Success Criteria

### Performance
- [ ] Report generation time < 10 seconds (standard reports)
- [ ] Large reports (1000+ records) < 30 seconds
- [ ] Scheduled reports 99%+ success rate
- [ ] Email delivery < 2 minutes after generation

### Functionality
- [ ] All 10 pre-built templates working
- [ ] Custom report builder functional
- [ ] PDF/Excel/CSV exports all working
- [ ] Charts rendering correctly in PDFs
- [ ] Email delivery successful

### Quality
- [ ] 100+ backend tests passing
- [ ] 60+ frontend tests passing
- [ ] No regressions in existing features
- [ ] Translation parity (EN/EL)

### User Experience
- [ ] Report builder intuitive (< 5 min to create report)
- [ ] Preview shows accurate data
- [ ] Download links work reliably
- [ ] Mobile-friendly report viewing

---

## 🔄 Rollout Plan

### Week 1 (Feb 1-7): Backend Foundation
- Days 1-5: Complete Phase 1 (backend engine + API)
- Deliverable: Working report generation API

### Week 2 (Feb 8-14): Frontend UI
- Days 6-10: Complete Phase 2 (report builder UI)
- Deliverable: Functional report builder interface

### Week 3 (Feb 15-21): Advanced Features & Polish
- Days 11-13: Complete Phase 3 (scheduling + email)
- Days 14-16: Complete Phase 4 (analytics + charts)
- Days 17-21: Complete Phase 5 (testing + docs)
- Deliverable: Production-ready reporting system

---

## 📊 Progress Tracking

**Current Status**: Day 1 - Backend Report Models

| Phase | Status | Completion |
|-------|--------|------------|
| Phase 1: Backend Engine | 🔄 IN PROGRESS | 0% |
| Phase 2: Frontend UI | ⏸️ PENDING | 0% |
| Phase 3: Scheduling | ⏸️ PENDING | 0% |
| Phase 4: Analytics | ⏸️ PENDING | 0% |
| Phase 5: Testing | ⏸️ PENDING | 0% |

**Overall Progress**: 0% (Day 1 of 21)

---

## 🚀 Next Actions

**Immediate (Today - Feb 1)**:
1. ✅ Create feature branch
2. ✅ Create implementation plan
3. 🔄 Create Report models (backend/models.py)
4. 🔄 Create Alembic migration
5. 🔄 Create ReportService class

**Tomorrow (Feb 2)**:
- Complete report service CRUD operations
- Start report generation engine
- Begin Jinja2 templates

---

**Document Owner**: Solo Developer
**Review Schedule**: Daily standup (solo), weekly progress check
**Version History**:
- v1.0 (Feb 1, 2026): Initial implementation plan

