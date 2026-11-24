import { Link } from 'react-router-dom';
import { FileText, Table2 } from 'lucide-react';
import { gradeSheetsLink } from '@/features/grade-sheets/gradeSheetsLink';

export interface OperationsReportsTabProps {
  t: (key: string, options?: Record<string, unknown>) => string;
  studentIdParam: string | null;
  courseIdParam: string | null;
}

/**
 * Utils → Reports (plan todo 75 stage 6). The grade sheets, then the custom reports' three pages:
 * my reports, the builder, the templates. Until November 2026 twelve more links sat under them,
 * each opening the template browser with a kind of data, a file format or a tab already chosen:
 * the browser has those filters itself, so they were the same page fifteen ways.
 */
const OperationsReportsTab = ({ t, studentIdParam, courseIdParam }: OperationsReportsTabProps) => {
  const reportIcons = {
    list: t('icons.list', { ns: 'customReports', defaultValue: '📋' }),
    create: t('icons.create', { ns: 'customReports', defaultValue: '✏️' }),
    templates: t('icons.templates', { ns: 'customReports', defaultValue: '📚' }),
  };

  // A student or a course the page was opened for goes on to the templates (they prefill it).
  const templatesLink = (() => {
    const queryParams = new URLSearchParams();
    if (studentIdParam && Number.isFinite(Number(studentIdParam))) {
      queryParams.set('studentId', studentIdParam);
    }
    if (courseIdParam && Number.isFinite(Number(courseIdParam))) {
      queryParams.set('courseId', courseIdParam);
    }
    const queryString = queryParams.toString();
    return `/operations/reports/templates${queryString ? `?${queryString}` : ''}`;
  })();

  const cards = [
    { to: '/operations/reports', icon: reportIcons.list, title: 'viewAll', note: 'myReports', testId: 'reports-card-list' },
    { to: '/operations/reports/builder', icon: reportIcons.create, title: 'createNew', note: 'reportBuilder', testId: 'reports-card-builder' },
    { to: templatesLink, icon: reportIcons.templates, title: 'templates', note: 'templatesFilterHint', testId: 'reports-card-templates' },
  ];

  return (
    <div className="space-y-6">
      {/* The grading lists of a course: the most common report, one click away (todo 75). */}
      <Link
        to={gradeSheetsLink(courseIdParam && Number.isFinite(Number(courseIdParam)) ? courseIdParam : null)}
        className="flex items-start gap-4 rounded-lg border border-indigo-200 bg-white p-5 transition hover:border-indigo-400 hover:shadow-md"
        data-testid="reports-grade-sheets-card"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
          <Table2 className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{t('gradeSheets.openGradeSheets', { ns: 'reports' })}</h2>
          <p className="text-sm text-slate-600">{t('gradeSheets.cardDescription', { ns: 'reports' })}</p>
        </div>
      </Link>

      <div className="rounded-lg border border-slate-200 bg-linear-to-br/srgb from-indigo-50 to-slate-50 p-6">
        <div className="mb-6 flex items-center gap-3">
          <FileText className="h-6 w-6 text-indigo-600" />
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{t('customReports', { ns: 'customReports' })}</h2>
            <p className="text-sm text-slate-600">{t('helpDragFields', { ns: 'customReports' })}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {cards.map((card) => (
            <Link
              key={card.testId}
              to={card.to}
              data-testid={card.testId}
              className="group rounded-lg border border-slate-200 bg-white p-4 transition hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-md"
            >
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-indigo-100 text-indigo-600 font-bold">{card.icon}</div>
                <h3 className="font-semibold text-slate-900">{t(card.title, { ns: 'customReports' })}</h3>
              </div>
              <p className="text-xs text-slate-600">{t(card.note, { ns: 'customReports' })}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OperationsReportsTab;
