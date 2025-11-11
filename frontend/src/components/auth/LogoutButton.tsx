import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const LogoutButton: React.FC = () => {
  const { logout } = useAuth();
  const { t } = useTranslation();

  return (
    <button onClick={() => logout()}>{t('common.logout') || 'Logout'}</button>
  );
};

export default LogoutButton;
