import React, { useEffect, useState } from 'react';
import apiClient from '@/api/api';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
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
import { UserPlus } from 'lucide-react';
import { getErrorMessage } from '@/utils/errorMessage';

type FeedbackState = {
  type: 'success' | 'info' | 'error';
  message: string;
};

type RegisterWidgetVariant = 'dialog' | 'inline';

interface RegisterWidgetProps {
  variant?: RegisterWidgetVariant;
  onRegisterSuccess?: () => void;
  collapsedByDefault?: boolean;
}

const RegisterWidget: React.FC<RegisterWidgetProps> = ({ variant = 'dialog', onRegisterSuccess, collapsedByDefault = false }) => {
  const { login } = useAuth();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const role = 'teacher' as const; // Guard against privilege escalation for self-registration
  const [collapsed, setCollapsed] = useState(collapsedByDefault);

  useEffect(() => {
    if (variant === 'dialog' && !open) {
      setEmail('');
      setPassword('');
      setFullName('');
      setBusy(false);
      setFeedback(null);
    }
  }, [open, variant]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setFeedback(null);

    try {
      await apiClient.post('/auth/register', {
        email,
        password,
        full_name: fullName,
        role,
      });

      try {
        await login(email, password);
        setFeedback({ type: 'success', message: t('auth.registerSuccess') });
        if (variant === 'dialog') {
          setOpen(false);
        }
        if (onRegisterSuccess) {
          onRegisterSuccess();
        }
      } catch (err: unknown) {
        setFeedback({ type: 'info', message: getErrorMessage(err, t('auth.registerPartial')) });
      }
    } catch (err: unknown) {
      setFeedback({ type: 'error', message: getErrorMessage(err, t('auth.registerError')) });
    } finally {
      setBusy(false);
    }
  };

  const feedbackTone = feedback?.type === 'error'
    ? 'text-red-600 dark:text-red-400'
    : feedback?.type === 'success'
      ? 'text-green-600 dark:text-green-400'
      : 'text-gray-700 dark:text-gray-300';

  const registerDescription = t('auth.registerDescription');

  const form = (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="auth-register-email">{t('common.email')}</Label>
        <Input
          id="auth-register-email"
          type="email"
          autoComplete="email"
          aria-label="email"
          data-testid="register-email"
          value={email}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="auth-register-password">{t('common.password')}</Label>
        <Input
          id="auth-register-password"
          type="password"
          autoComplete="new-password"
          aria-label="password"
          data-testid="register-password"
          value={password}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="auth-register-full-name">{t('common.fullNameOptional')}</Label>
        <Input
          id="auth-register-full-name"
          type="text"
          autoComplete="name"
          aria-label="full name"
          data-testid="register-fullname"
          value={fullName}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => setFullName(event.target.value)}
        />
      </div>
      {feedback && (
        <p className={`text-sm ${feedbackTone}`}>
          {feedback.message}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={busy} data-testid="register-submit">
        {busy ? t('common.loading') : t('common.register')}
      </Button>
    </form>
  );

  if (variant === 'inline') {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-transparent bg-transparent p-0 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {t('auth.registerCta')}
          </p>
          <Button
            type="button"
            size="sm"
            variant={collapsed ? 'secondary' : 'ghost'}
            onClick={() => setCollapsed((prev) => !prev)}
            data-testid="register-toggle"
          >
            {collapsed ? t('auth.openRegisterPrompt') : t('auth.hideRegisterPrompt')}
          </Button>
        </div>
        {!collapsed && (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50/60 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800/40">
            {form}
          </div>
        )}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" data-testid="register-open">
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          <span>{t('common.register')}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('auth.registerTitle')}</DialogTitle>
          {registerDescription && <DialogDescription>{registerDescription}</DialogDescription>}
        </DialogHeader>
        {form}
      </DialogContent>
    </Dialog>
  );
};

export default RegisterWidget;
