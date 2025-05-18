import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Link,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Google as GoogleIcon } from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';

import { useAuthStore } from '../../stores/authStore';

const LoginPage = () => {
  const { login } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema: Yup.object({
      email: Yup.string()
        .email('Invalid email address')
        .required('Email is required'),
      password: Yup.string()
        .required('Password is required'),
    }),
    onSubmit: async (values) => {
      try {
        setIsLoading(true);
        setError(null);
        await login(values.email, values.password);
      } catch (error) {
        setError((error as Error).message);
      } finally {
        setIsLoading(false);
      }
    },
  });

  const googleLoginUrl = `${import.meta.env.VITE_API_URL || ''}/auth/google`;
  
  return (
    <Box
      component="form"
      onSubmit={formik.handleSubmit}
      sx={{
        width: '100%',
      }}
    >
      <Typography variant="h4" align="center" gutterBottom>
        Login
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <TextField
        margin="normal"
        fullWidth
        id="email"
        name="email"
        label="Email Address"
        autoComplete="email"
        autoFocus
        value={formik.values.email}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.touched.email && Boolean(formik.errors.email)}
        helperText={formik.touched.email && formik.errors.email}
      />
      
      <TextField
        margin="normal"
        fullWidth
        id="password"
        name="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        value={formik.values.password}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.touched.password && Boolean(formik.errors.password)}
        helperText={formik.touched.password && formik.errors.password}
      />
      
      <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{ mt: 3 }}
        disabled={isLoading}
      >
        {isLoading ? <CircularProgress size={24} /> : 'Login'}
      </Button>
      
      <Box sx={{ position: 'relative', mt: 3, mb: 2 }}>
        <Divider>
          <Typography variant="body2" color="text.secondary">
            OR
          </Typography>
        </Divider>
      </Box>
      
      <Button
        fullWidth
        variant="outlined"
        startIcon={<GoogleIcon />}
        component="a"
        href={googleLoginUrl}
      >
        Login with Google
      </Button>
      
      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography variant="body2">
          Don't have an account?{' '}
          <Link component={RouterLink} to="/register" variant="body2">
            Sign Up
          </Link>
        </Typography>
      </Box>
    </Box>
  );
};

export default LoginPage;
