import React, { useEffect, useRef, useState } from 'react';
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

  // Refs to read actual DOM values on submit — handles Android autofill
  // which fills the input visually without triggering React onChange.
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

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

    // Read from DOM to catch Android autofill that bypasses onChange
    const actualEmail = (emailRef.current?.value ?? email).trim();
    const actualPassword = passwordRef.current?.value ?? password;

    console.log('[Login] email:', JSON.stringify(actualEmail), 'len:', actualEmail.length);

    if (!actualEmail) {
      setError('Παρακαλώ εισάγετε τη διεύθυνση email σας. / Please enter your email.');
      setLoading(false);
      return;
    }
    if (!actualPassword) {
      setError('Παρακαλώ εισάγετε τον κωδικό πρόσβασης. / Please enter your password.');
      setLoading(false);
      return;
    }

    try {
      await login(actualEmail, actualPassword);
      if (variant === 'dialog') {
        setOpen(false);
      }
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err: unknown) {
      const errObj = err as { response?: { status?: number; data?: { error?: { details?: { errors?: Array<{ loc?: unknown[]; msg?: string }> } } } } };
      if (errObj?.response?.status === 422) {
        const validationErrors = errObj.response?.data?.error?.details?.errors;
        if (validationErrors && validationErrors.length > 0) {
          const firstErr = validationErrors[0];
          const field = Array.isArray(firstErr.loc) ? firstErr.loc.join('.') : '';
          const msg = firstErr.msg || 'validation error';
          setError(`Validation failed: ${field} — ${msg}`);
        } else {
          setError(getErrorMessage(err, t('auth.loginError')));
        }
        console.error('[Login 422]', JSON.stringify(errObj.response?.data));
      } else {
        setError(getErrorMessage(err, t('auth.loginError')));
      }
      console.error('[Login error]', err);
    } finally {
      setLoading(false);
    }
  };

  const form = (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="auth-login-email">{t('common.email')}</Label>
        <Input
          ref={emailRef}
          id="auth-login-email"
          name="email"
          data-testid="auth-login-email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          inputMode="email"
          aria-label="email"
          value={email}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
          onInput={(event: React.FormEvent<HTMLInputElement>) => setEmail((event.target as HTMLInputElement).value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="auth-login-password">{t('common.password')}</Label>
        <Input
          ref={passwordRef}
          id="auth-login-password"
          name="password"
          data-testid="auth-login-password"
          type="password"
          autoComplete="current-password"
          aria-label="password"
          value={password}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
          onInput={(event: React.FormEvent<HTMLInputElement>) => setPassword((event.target as HTMLInputElement).value)}
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
