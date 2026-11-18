import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/LanguageContext';

/** The roles that open something. Any other word in an account's Role column opens nothing. */
const ROLES = new Set(['admin', 'teacher']);

/**
 * For an account that is signed in and holds no role ("No role": its roles were taken away, or
 * it was a Student, Viewer or Guest account before those went).
 *
 * Every page shows such an account the same buttons as anybody, and the server refuses each
 * request, so what it saw was a row of unrelated failures: "Error loading analytics data",
 * "Failed to load data". This line, on every page, says the one thing that is the matter and
 * who can change it.
 */
export default function NoRoleBanner() {
  const { user } = useAuth();
  const { t } = useLanguage();
  if (!user) return null;
  const role = String(user.role ?? '').trim().toLowerCase();
  if (ROLES.has(role)) return null;

  return (
    <div
      role="status"
      data-testid="no-role-banner"
      className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <ShieldAlert size={18} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
      <span>{t('auth.noRoleNotice')}</span>
    </div>
  );
}
