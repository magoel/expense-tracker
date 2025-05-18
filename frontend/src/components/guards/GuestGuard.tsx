import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

const GuestGuard = () => {
  const { isAuthenticated } = useAuthStore();
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <Outlet />;
};

export default GuestGuard;
