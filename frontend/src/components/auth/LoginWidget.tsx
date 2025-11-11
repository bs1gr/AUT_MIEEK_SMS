import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const LoginWidget: React.FC = () => {
  const { login } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="login-widget">
      <div>
        <label>{t('common.email') || 'Email'}</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div>
        <label>{t('common.password') || 'Password'}</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      {error && <div className="error">{error}</div>}
      <button type="submit" disabled={loading}>{loading ? t('common.loading') : t('common.login')}</button>
    </form>
  );
};

export default LoginWidget;
