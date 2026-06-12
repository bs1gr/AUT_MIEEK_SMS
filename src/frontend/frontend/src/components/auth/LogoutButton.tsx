import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Power } from 'lucide-react';

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
    <Button
      onClick={handleLogout}
      size="sm"
      variant="outline"
      disabled={loading}
      data-testid="logout-button"
      aria-label={loading ? t('common.loading') : t('common.logout')}
      title={loading ? t('common.loading') : t('common.logout')}
    >
      <Power className="h-4 w-4" aria-hidden="true" />
    </Button>
  );
};

export default LogoutButton;
