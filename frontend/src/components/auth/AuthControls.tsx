import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LoginWidget from './LoginWidget';
import LogoutButton from './LogoutButton';
import RegisterWidget from './RegisterWidget';

const AuthControls: React.FC = () => {
  const { user } = useAuth();
  if (user) return <LogoutButton />;
  return (
    <div className="grid grid-cols-2 gap-4">
      <LoginWidget />
      <RegisterWidget />
    </div>
  );
};

export default AuthControls;
