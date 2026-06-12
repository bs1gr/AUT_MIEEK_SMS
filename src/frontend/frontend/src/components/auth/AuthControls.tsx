import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoginWidget from './LoginWidget';
import RegisterWidget from './RegisterWidget';

const AuthControls: React.FC = () => {
  const { user } = useAuth();

  if (user) {
    return null;
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <LoginWidget />
      <RegisterWidget collapsedByDefault variant="dialog" />
    </div>
  );
};

export default AuthControls;
