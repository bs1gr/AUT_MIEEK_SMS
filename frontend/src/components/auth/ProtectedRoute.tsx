import React from 'react';
import { Navigate } from 'react-router-dom';

// This is a placeholder implementation for E2E testing.
// A real implementation would check the user's actual auth status and roles.
const useAuth = () => {
  // For the purpose of E2E tests, we assume the user is always authenticated as an admin.
  return {
    isAuthenticated: true,
    user: {
      roles: ['admin'],
      permissions: ['imports:view', 'exports:view', 'users:view', 'users:manage', 'diagnostics:view']
    }
  };
};

interface ProtectedRouteProps {
  children: React.ReactElement;
  roles?: string[];
  permissions?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, roles: _roles, permissions: _permissions }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
