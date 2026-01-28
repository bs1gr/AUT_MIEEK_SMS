import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';
import { getErrorMessage } from '@/utils/errorMessage';

type LoginWidgetVariant = 'dialog' | 'inline';

interface LoginWidgetProps {
  variant?: LoginWidgetVariant;
  onLoginSuccess?: () => void;
}

const LoginWidget: React.FC<LoginWidgetProps> = ({ variant = 'dialog', onLoginSuccess }) => {
  const { login } = useAuth();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (variant === 'dialog' && !open) {
      setEmail('');
      setPassword('');
      setError(null);
      setLoading(false);
    }
  }, [open, variant]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      if (variant === 'dialog') {
        setOpen(false);
      }
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err: unknown) {
      // Error can be many shapes (axios, Error, string) — use helper to extract a message
      setError(getErrorMessage(err, t('auth.loginError')));
    } finally {
      setLoading(false);
    }
  };

  const form = (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="auth-login-email">{t('common.email')}</Label>
        <Input
          id="auth-login-email"
          name="email"
          data-testid="auth-login-email"
          type="email"
          autoComplete="email"
          aria-label="email"
          value={email}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="auth-login-password">{t('common.password')}</Label>
        <Input
          id="auth-login-password"
          name="password"
          data-testid="auth-login-password"
          type="password"
          autoComplete="current-password"
          aria-label="password"
          value={password}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
          required
        />
      </div>
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? t('common.loading') : t('common.login')}
      </Button>
    </form>
  );

  if (variant === 'inline') {
    return form;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {t('common.login')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('auth.loginTitle')}</DialogTitle>
          <DialogDescription>{t('auth.loginDescription')}</DialogDescription>
        </DialogHeader>
        {form}
      </DialogContent>
    </Dialog>
  );
};

export default LoginWidget;
