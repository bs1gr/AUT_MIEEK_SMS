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
import { getApiErrorCode, getErrorMessage, isServerUnreachable } from '@/utils/errorMessage';
import { usesNativeSession } from '@/services/nativeSession';
import {
  markAutoOfferDone,
  offerToSaveLogin,
  pickSavedLogin,
  shouldAutoOfferSavedLogin,
} from '@/utils/savedLogin';

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

  const showForm = variant === 'inline' || open;
  const savedLoginAvailable = usesNativeSession();

  // `fromSaved`: the email and password came from the phone's password manager. Such a sign-in
  // is not offered for saving again, and a refusal says the saved password is the wrong one.
  const performLogin = async (actualEmail: string, actualPassword: string, fromSaved: boolean) => {
    setLoading(true);
    setError(null);
    try {
      await login(actualEmail, actualPassword);
      if (!fromSaved) {
        // The phone's password manager asks the owner itself; nothing waits for the answer.
        void offerToSaveLogin(actualEmail, actualPassword);
      }
      if (variant === 'dialog') {
        setOpen(false);
      }
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err: unknown) {
      if (fromSaved && (err as { response?: { status?: number } })?.response?.status === 401) {
        setError(t('auth.savedLoginFailed'));
        return;
      }
      const errObj = err as { response?: { status?: number; data?: { error?: { details?: { errors?: Array<{ loc?: unknown[]; msg?: string }> } } } } };
      if (errObj?.response?.status === 422) {
        const validationErrors = errObj.response?.data?.error?.details?.errors;
        if (validationErrors && validationErrors.length > 0) {
          // The server did not take what was typed: in practice an address that is not one.
          // It used to be shown as the server's own English ("Validation failed: body.email …").
          const field = Array.isArray(validationErrors[0].loc) ? validationErrors[0].loc.join('.') : '';
          setError(field.includes('email') ? t('auth.emailInvalid') : t('auth.loginError'));
        } else {
          setError(getErrorMessage(err, t('auth.loginError')));
        }
        console.error('[Login 422]', JSON.stringify(errObj.response?.data));
      } else if (isServerUnreachable(err)) {
        setError(t('auth.serverUnreachable'));
      } else if (getApiErrorCode(err) === 'AUTH_ACCOUNT_INACTIVE') {
        setError(t('auth.accountInactive'));
      } else {
        setError(getErrorMessage(err, t('auth.loginError')));
      }
      console.error('[Login error]', err);
    } finally {
      setLoading(false);
    }
  };

  const signInWithSavedLogin = async () => {
    const picked = await pickSavedLogin();
    if (!picked.found) return;
    setEmail(picked.id);
    setPassword(picked.password);
    await performLogin(picked.id.trim(), picked.password, true);
  };

  // In the Android app the phone's sheet of saved sign-ins opens with the page, once per run
  // of the app (not again after it was dismissed, nor right after a sign-out).
  useEffect(() => {
    if (!showForm || !shouldAutoOfferSavedLogin()) return;
    markAutoOfferDone();
    void signInWithSavedLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showForm]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Read from DOM to catch Android autofill that bypasses onChange
    const actualEmail = (emailRef.current?.value ?? email).trim();
    const actualPassword = passwordRef.current?.value ?? password;

    if (!actualEmail) {
      setError(t('auth.emailRequired'));
      return;
    }
    if (!actualPassword) {
      setError(t('auth.passwordRequired'));
      return;
    }

    await performLogin(actualEmail, actualPassword, false);
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
          // "username", not "email": password managers pair username + current-password as
          // one saved sign-in (Android's autofill guidance; the field is still an email).
          autoComplete="username"
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
      {savedLoginAvailable && (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={loading}
          data-testid="auth-login-saved"
          onClick={() => { void signInWithSavedLogin(); }}
        >
          {t('auth.useSavedLogin')}
        </Button>
      )}
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
