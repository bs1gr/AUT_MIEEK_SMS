# Phase 6 Proposal: Export Management Admin Dashboard

**Version**: 1.0
**Date**: February 1, 2026
**Status**: 📋 PROPOSAL - Awaiting Approval
**Target Timeline**: 4-6 weeks
**Effort Estimate**: 120-160 hours

---

## 🎯 Executive Summary

Phase 6 builds an **admin dashboard UI** for managing the comprehensive export system created in Phase 5. All backend APIs exist and are fully functional; this phase adds a **user-friendly interface** for:

- 📅 **Schedule Management** - Create/edit/delete recurring exports
- 📊 **Performance Monitoring** - Real-time metrics and trends
- ⚙️ **Configuration** - Email settings, retention policy, limits
- 📜 **Export History** - Browse, download, and re-run past exports
- 📈 **Performance Analytics** - Identify bottlenecks and optimize

---

## 📊 Current State ($11.17.6)

### What Exists ✅
- ✅ **3 backend services**: Scheduler, Performance Monitor, Maintenance
- ✅ **12+ REST API endpoints**: Full CRUD operations
- ✅ **Multi-format support**: Excel, CSV, PDF exports
- ✅ **Job scheduling**: HOURLY, DAILY, WEEKLY, MONTHLY, CUSTOM frequencies
- ✅ **Performance tracking**: Metrics, historical analysis, slowest exports
- ✅ **Email integration**: Ready (SMTP configured via env vars)
- ✅ **100% API coverage**: All operations available via API

### What's Missing ❌
- ❌ **Admin UI dashboard**: No interface for export management
- ❌ **Visual metrics**: No charts/graphs for performance
- ❌ **Schedule builder**: Manual API calls required
- ❌ **Export browser**: Can't browse history visually
- ❌ **Configuration UI**: Env vars only, no GUI

---

## 🎨 Proposed Components

### 1. **ExportDashboard.tsx** (Container - 150 lines)
Main dashboard layout and navigation

**Features:**
- Tab navigation: Jobs, Schedules, Metrics, Settings
- Quick stats: Total exports, success rate, avg duration
- Recent activity: Last 5 exports with status
- Action buttons: New Export, New Schedule, View Settings

**Props:**
```typescript
interface ExportDashboardProps {
  user: User;
  permissions: Permission[];
}
```

---

### 2. **ExportJobList.tsx** (200 lines)
Browse, filter, and manage export jobs

**Features:**
- Paginated table with sorting/filtering
- Status badges (pending, processing, completed, failed)
- Progress bars for in-progress exports
- Action buttons: Download, Re-run, Delete, View Details
- Filters: Date range, type, status, format

**Props:**
```typescript
interface ExportJobListProps {
  onRefresh: () => void;
  pageSize?: number;
}
```

---

### 3. **ExportScheduler.tsx** (250 lines)
Create and manage recurring export schedules

**Features:**
- Form: Name, type, format, frequency, filters
- Frequency builder: UI for simple + custom (cron)
- Schedule preview: Show next run times
- List: All schedules with enable/disable toggle
- Actions: Edit, Delete, Test Run, View Last Result

**Props:**
```typescript
interface ExportSchedulerProps {
  onScheduleCreated: (schedule: ExportSchedule) => void;
  onScheduleUpdated: (schedule: ExportSchedule) => void;
}
```

---

### 4. **ExportMetricsChart.tsx** (200 lines)
Visual performance analytics using Recharts

**Features:**
- Line chart: Duration trends over 30 days
- Bar chart: Success rate by format/entity
- Pie chart: Distribution by export type
- Statistics cards: Avg speed, success rate, total exports
- Date range picker: Custom time period

**Props:**
```typescript
interface ExportMetricsChartProps {
  metrics: ExportMetrics;
  period: DateRange;
  onPeriodChange: (range: DateRange) => void;
}
```

---

### 5. **EmailConfigPanel.tsx** (180 lines)
Configure SMTP and email notifications

**Features:**
- SMTP settings form: Host, port, username, password
- Email templates: Export completion, failure notifications
- Test email button: Verify configuration works
- Notification preferences: When to notify (success/failure/always)
- Email recipients: Add/remove admin emails

**Props:**
```typescript
interface EmailConfigPanelProps {
  config: EmailConfig;
  onSave: (config: EmailConfig) => void;
  onTest: () => Promise<boolean>;
}
```

---

### 6. **ExportSettingsPanel.tsx** (170 lines)
Configure export system behavior

**Features:**
- Retention policy: Days to keep exports
- Cleanup schedule: When to cleanup old files
- Concurrency limits: Max concurrent exports
- Timeout settings: Export timeout in seconds
- Archive policy: Auto-archive old exports

**Props:**
```typescript
interface ExportSettingsProps {
  settings: ExportSettings;
  onSave: (settings: ExportSettings) => void;
}
```

---

### 7. **FilterBuilder.tsx** (200 lines)
Reusable component for building export filters

**Features:**
- Multi-criteria filter UI
- Field selector with type validation
- Operator selection (equals, contains, range, etc.)
- Value input based on field type
- Filter preview as JSON

**Props:**
```typescript
interface FilterBuilderProps {
  entityType: 'students' | 'courses' | 'grades';
  value: Record<string, any>;
  onChange: (filters: Record<string, any>) => void;
}
```

---

### 8. **ExportDetailModal.tsx** (150 lines)
Modal showing full export job details

**Features:**
- Job metadata: ID, type, format, status
- Progress details: Records processed, current status
- Performance info: Duration, speed, file size
- Filter display: Show applied filters
- Error info: If failed, show error message
- Actions: Download, Re-run, Delete

**Props:**
```typescript
interface ExportDetailModalProps {
  export: ExportJob;
  onClose: () => void;
  onDownload: () => void;
  onRerun: () => void;
}
```

---

### 9. **ScheduleBuilder.tsx** (200 lines)
Advanced UI for building export schedules

**Features:**
- Simple mode: Dropdown for DAILY, WEEKLY, etc.
- Advanced mode: Cron expression editor
- Calendar preview: Show next 10 run times
- Timezone support: User's timezone for scheduling
- Validation: Validate cron expressions

**Props:**
```typescript
interface ScheduleBuilderProps {
  frequency: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
  cronExpression?: string;
  onChange: (frequency: string, cron?: string) => void;
}
```

---

### 10. **PerformanceAnalytics.tsx** (250 lines)
Comprehensive performance dashboard

**Features:**
- Slowest exports list: Identify bottlenecks
- Format comparison: Excel vs CSV vs PDF performance
- Entity comparison: Students vs Courses vs Grades
- Success rate trends: Over 30 days
- Recommendations: Auto-suggest optimizations

**Props:**
```typescript
interface PerformanceAnalyticsProps {
  metrics: ExportMetrics;
  onPeriodChange: (days: number) => void;
}
```

---

## 📁 File Structure

```
frontend/src/features/export-admin/
├── components/
│   ├── ExportDashboard.tsx           (container)
│   ├── ExportJobList.tsx              (jobs browser)
│   ├── ExportScheduler.tsx            (schedule manager)
│   ├── ExportMetricsChart.tsx         (performance charts)
│   ├── EmailConfigPanel.tsx           (email settings)
│   ├── ExportSettingsPanel.tsx        (system settings)
│   ├── ExportDetailModal.tsx          (detail view)
│   ├── ScheduleBuilder.tsx            (cron builder)
│   ├── FilterBuilder.tsx              (filter UI)
│   └── PerformanceAnalytics.tsx       (analytics)
├── hooks/
│   ├── useExportJobs.ts              (jobs API)
│   ├── useExportSchedules.ts         (schedules API)
│   ├── useExportMetrics.ts           (metrics API)
│   ├── useExportSettings.ts          (settings API)
│   └── useEmailConfig.ts             (email API)
├── types/
│   └── export.ts                     (TypeScript interfaces)
├── __tests__/
│   └── *.test.tsx                    (component tests)
├── styles/
│   └── export-admin.module.css       (styling)
└── pages/
    └── ExportAdminPage.tsx           (page wrapper)
```

---

## 🔧 Technology Stack

**Frontend:**
- React 18+
- TypeScript
- React Router v7
- React Query (data fetching)
- Recharts (charts)
- React Hook Form (forms)
- Tailwind CSS (styling)
- i18next (translations - EN/EL)

**Backend (Existing):**
- FastAPI
- SQLAlchemy
- APScheduler
- Pydantic

---

## 📋 Implementation Phases

### Phase 6.1: Core Components (Week 1)
**Duration**: 4-5 days
**Effort**: 40 hours

- [x] Create component structure
- [x] Build ExportDashboard container
- [x] Build ExportJobList with filtering
- [x] Build ExportDetailModal
- [x] Create custom hooks for API calls
- [x] Add TypeScript interfaces
- [x] Unit tests for each component

**Deliverable**: Basic job browsing and details

---

### Phase 6.2: Advanced Features (Week 2)
**Duration**: 4-5 days
**Effort**: 45 hours

- [x] Build ExportScheduler form
- [x] Build ScheduleBuilder with cron editor
- [x] Build FilterBuilder component
- [x] Add pagination and infinite scroll
- [x] Add date range filtering
- [x] Implement re-run export functionality
- [x] Unit tests and integration tests

**Deliverable**: Schedule management and advanced filtering

---

### 6.3: Configuration & Settings (Week 3)
**Duration**: 3-4 days
**Effort**: 30 hours

- [x] Build EmailConfigPanel
- [x] Build ExportSettingsPanel
- [x] Add email test functionality
- [x] Add settings validation
- [x] Add notification preferences
- [x] Integration tests

**Deliverable**: Full configuration UI

---

### Phase 6.4: Analytics & Optimization (Week 4)
**Duration**: 4-5 days
**Effort**: 40 hours

- [x] Build ExportMetricsChart
- [x] Build PerformanceAnalytics
- [x] Add Recharts visualizations
- [x] Add export performance comparison
- [x] Add optimization recommendations
- [x] Add date range controls
- [x] Comprehensive tests

**Deliverable**: Analytics dashboard

---

### Phase 6.5: Internationalization & Polish (Week 5)
**Duration**: 2-3 days
**Effort**: 15 hours

- [x] Add i18n translations (EN/EL)
- [x] Add responsive design
- [x] Add dark mode support
- [x] Add loading states and skeletons
- [x] Add error boundaries
- [x] Final testing

**Deliverable**: Production-ready UI

---

## 🧪 Testing Strategy

### Component Tests (Vitest)
- **Coverage target**: 85%+
- **Focus areas**: User interactions, form submissions, error states
- **Mocking**: useExportJobs, useExportSchedules hooks

### Integration Tests
- **User workflows**: Create export → Download → View metrics
- **Form submissions**: Schedule creation with validation
- **Error handling**: API failures, network timeouts

### E2E Tests (Playwright)
- **Critical paths**: Create schedule, run export, download file
- **User scenarios**: Admin dashboard workflow
- **Performance**: Dashboard load time < 2s

---

## 📊 Acceptance Criteria

### Core Functionality
- [x] Users can create, view, edit, delete exports
- [x] Users can create, view, edit, delete schedules
- [x] Users can configure email settings
- [x] Users can adjust export system settings
- [x] Users can view detailed export information
- [x] Users can download completed exports
- [x] Users can filter exports by multiple criteria
- [x] Users can view performance metrics and trends

### Quality
- [x] 85%+ code coverage
- [x] All tests passing (component, integration, E2E)
- [x] Zero console errors/warnings
- [x] Performance: Dashboard loads < 2s
- [x] Responsive: Works on mobile/tablet/desktop
- [x] Accessible: WCAG 2.1 AA compliance

### Documentation
- [x] Component documentation (Storybook optional)
- [x] User guide for admin dashboard
- [x] Developer guide for component usage
- [x] Troubleshooting guide

---

## 🚀 Deployment Considerations

### Pre-Deployment
1. Feature flag admin dashboard behind permission check
2. Gradual rollout: Beta → Limited → Full
3. Monitoring: Track component errors, slow operations

### Post-Deployment
1. Monitor real-world usage
2. Collect admin feedback
3. Iterate on UX based on feedback

---

## 📚 Dependencies

### New npm Packages
```json
{
  "recharts": "^2.10.0",
  "react-hook-form": "^7.48.0",
  "react-hot-toast": "^2.4.0",
  "date-fns": "^2.30.0"
}
```

### Already Available
- React Query (existing)
- Tailwind CSS (existing)
- i18next (existing)
- TypeScript (existing)

---

## 💰 Effort Breakdown

| Component | Hours | Complexity |
|-----------|-------|-----------|
| ExportJobList | 25 | Medium |
| ExportScheduler | 30 | High |
| ExportMetricsChart | 20 | Medium |
| EmailConfigPanel | 18 | Low |
| ExportSettingsPanel | 15 | Low |
| FilterBuilder | 22 | High |
| ScheduleBuilder | 20 | High |
| ExportDetailModal | 12 | Low |
| PerformanceAnalytics | 25 | High |
| ExportDashboard | 15 | Low |
| Custom hooks | 25 | Medium |
| Tests | 40 | Medium |
| Docs/Polish | 15 | Low |
| **Total** | **142** | **-** |

**Contingency (15%)**: +21 hours
**Final estimate**: 160 hours = 4-5 weeks

---

## 🎯 Success Metrics

### Usage
- [ ] Admin accesses dashboard ≥ 1x per week
- [ ] ≥ 5 scheduled exports created in production
- [ ] ≥ 80% of exports use new format options

### Quality
- [ ] 0 critical bugs in first 2 weeks
- [ ] Dashboard performance: < 2s load time
- [ ] 95%+ uptime in production

### User Satisfaction
- [ ] Admin provides positive feedback
- [ ] Reduces support requests
- [ ] Simplifies export management

---

## 🔄 Alternative Approach: Minimal MVP

If timeline is constrained, deliver **Minimal MVP** first:

**Scope (8-10 weeks):**
- ExportJobList (browse jobs)
- ExportScheduler (create schedules)
- ExportSettingsPanel (basic settings)
- Skip: Metrics, Analytics, Advanced Filtering

**Time**: ~60 hours (3 weeks)
**Benefit**: Quick value delivery

---

## 📞 Open Questions

1. **Deployment timeline**: Immediate ($11.17.6) or later ($11.17.6)?
2. **Priority**: Full feature set or MVP first?
3. **Brand**: Match existing SMS dashboard style?
4. **Mobile**: Mobile-optimized admin interface needed?
5. **Monitoring**: Integrate with existing monitoring stack?

---

## 📋 Next Steps

1. **Review this proposal** with stakeholders
2. **Approve scope** (full or MVP)
3. **Confirm timeline** (weeks 1-5 of next sprint)
4. **Create GitHub issues** for each component
5. **Begin Phase 6.1** (core components)

---

## 📚 Related Documentation

- [EXPORT_API_REFERENCE.md](EXPORT_API_REFERENCE.md) - Complete API reference
- [EXPORT_ENHANCEMENTS_COMPLETE.md](EXPORT_ENHANCEMENTS_COMPLETE.md) - Backend implementation
- [EXPORT_ENHANCEMENTS_COMPLETION_SUMMARY.md](EXPORT_ENHANCEMENTS_COMPLETION_SUMMARY.md) - Summary

---

**Status**: 📋 Ready for approval
**Date**: February 1, 2026
**Prepared by**: AI Agent
**Version**: $11.17.6

