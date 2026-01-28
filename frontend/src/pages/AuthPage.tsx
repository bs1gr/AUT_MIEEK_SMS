import { useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '@/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import LoginWidget from '@/components/auth/LoginWidget';
import RegisterWidget from '@/components/auth/RegisterWidget';
import { useAuth } from '@/contexts/AuthContext';

interface LocationState {
  from?: {
    pathname: string;
  };
}

const AuthPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  const redirectPath = useMemo(() => {
    const state = location.state as LocationState | undefined;
    return state?.from?.pathname ?? '/dashboard';
  }, [location.state]);

  useEffect(() => {
    if (user) {
      navigate(redirectPath, { replace: true });
    }
  }, [user, navigate, redirectPath]);

  const handleAuthSuccess = () => {
    navigate(redirectPath, { replace: true });
  };

  if (user) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 py-10">
      {/* Add page-ready indicator for E2E tests */}
      <div data-testid="auth-page-loaded" className="hidden">{t('common.loaded')}</div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">{t('auth.loginTitle')}</CardTitle>
          <CardDescription>{t('auth.loginDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginWidget variant="inline" onLoginSuccess={handleAuthSuccess} />
        </CardContent>
      </Card>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <RegisterWidget variant="inline" onRegisterSuccess={handleAuthSuccess} collapsedByDefault />
      </div>
    </div>
  );
};

export default AuthPage;
