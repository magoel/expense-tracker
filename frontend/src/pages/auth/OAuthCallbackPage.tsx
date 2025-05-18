import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { useAuthStore } from '../../stores/authStore';

const OAuthCallbackPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { handleOAuthCallback } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get token from URL query parameter
        const params = new URLSearchParams(location.search);
        const token = params.get('token');
        
        if (!token) {
          setError('Authentication failed. No token received.');
          return;
        }
        
        // Process the token
        await handleOAuthCallback(token);
        
        // Navigate to dashboard on success
        navigate('/dashboard');
      } catch (error) {
        setError((error as Error).message);
      }
    };
    
    handleCallback();
  }, [location, handleOAuthCallback, navigate]);
  
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
      }}
    >
      {error ? (
        <Alert severity="error" sx={{ maxWidth: 400, width: '100%' }}>
          {error}
        </Alert>
      ) : (
        <>
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Completing authentication...
          </Typography>
        </>
      )}
    </Box>
  );
};

export default OAuthCallbackPage;
