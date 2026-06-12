import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const RequireAdmin = () => {
  const { user } = useAuth();
  const location = useLocation();

  // Basic guard: require authenticated admin role
  if (!user) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  const role = (user.role || '').toLowerCase();
  if (role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default RequireAdmin;
