import { OperationsView } from '@/features/operations';
import { SectionErrorBoundary } from '@/components/ErrorBoundaries';
import { useStudentsStore } from '@/stores';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export default function OperationsPage() {
  const students = useStudentsStore((state) => state.students);
  const { user } = useAuth();
  const { t } = useTranslation();

  return (
    <SectionErrorBoundary section="OperationsPage">
      <div className="space-y-6">
        {user && user.role === 'admin' && (
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-indigo-800 font-semibold">{t('rbac.configuration')}</h3>
                <p className="text-sm text-indigo-700">{t('rbac.createDefaultsDesc')}</p>
              </div>
              <Link
                to="/admin/permissions"
                className="px-3 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
              >
                {t('rbac.show')}
              </Link>
            </div>
          </div>
        )}

        <OperationsView students={students} />
      </div>
    </SectionErrorBoundary>
  );
}
