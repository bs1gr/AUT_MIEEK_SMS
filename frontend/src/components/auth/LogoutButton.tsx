import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

const LogoutButton: React.FC = () => {
  const { logout } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleLogout} size="sm" variant="outline" disabled={loading}>
      <LogOut className="h-4 w-4" aria-hidden="true" />
      <span>{loading ? t('common.loading') : t('common.logout')}</span>
    </Button>
  );
};

export default LogoutButton;
