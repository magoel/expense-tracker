import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import OAuthCallbackPage from './pages/auth/OAuthCallbackPage';
import DashboardPage from './pages/DashboardPage';
import GroupsPage from './pages/groups/GroupsPage';
import GroupDetailPage from './pages/groups/GroupDetailPage';
import CreateGroupPage from './pages/groups/CreateGroupPage';
import ExpensesPage from './pages/expenses/ExpensesPage';
import CreateExpensePage from './pages/expenses/CreateExpensePage';
import PaymentsPage from './pages/payments/PaymentsPage';
import CreatePaymentPage from './pages/payments/CreatePaymentPage';
import StatisticsPage from './pages/statistics/StatisticsPage';
import ProfilePage from './pages/profile/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';

// Guards
import AuthGuard from './components/guards/AuthGuard';
import GuestGuard from './components/guards/GuestGuard';

// Hooks
import { useAuthStore } from './stores/authStore';

function App() {
  // Auth state
  const { checkAuth, isInitialized } = useAuthStore();
  
  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);
  
  // Wait for auth check
  if (!isInitialized) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        Loading...
      </Box>
    );
  }
  
  return (
    <Routes>
      {/* Auth routes */}
      <Route element={<GuestGuard />}>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
      </Route>

      <Route path="/auth/callback" element={<OAuthCallbackPage />} />
      
      {/* Protected routes */}
      <Route element={<AuthGuard />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/groups/new" element={<CreateGroupPage />} />
          <Route path="/groups/:groupId" element={<GroupDetailPage />} />
          
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/expenses/new" element={<CreateExpensePage />} />
          
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/payments/new" element={<CreatePaymentPage />} />
          
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>
      
      {/* 404 page */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
