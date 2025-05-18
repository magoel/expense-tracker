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

const RegisterPage = () => {
  const { register } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const formik = useFormik({
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    validationSchema: Yup.object({
      firstName: Yup.string().required('First name is required'),
      lastName: Yup.string().required('Last name is required'),
      email: Yup.string()
        .email('Invalid email address')
        .required('Email is required'),
      password: Yup.string()
        .min(6, 'Password must be at least 6 characters')
        .required('Password is required'),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref('password')], 'Passwords must match')
        .required('Please confirm your password'),
    }),
    onSubmit: async (values) => {
      try {
        setIsLoading(true);
        setError(null);
        await register(
          values.firstName,
          values.lastName,
          values.email,
          values.password
        );
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
        Register
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextField
          margin="normal"
          fullWidth
          id="firstName"
          name="firstName"
          label="First Name"
          autoComplete="given-name"
          autoFocus
          value={formik.values.firstName}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.touched.firstName && Boolean(formik.errors.firstName)}
          helperText={formik.touched.firstName && formik.errors.firstName}
        />
        
        <TextField
          margin="normal"
          fullWidth
          id="lastName"
          name="lastName"
          label="Last Name"
          autoComplete="family-name"
          value={formik.values.lastName}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={formik.touched.lastName && Boolean(formik.errors.lastName)}
          helperText={formik.touched.lastName && formik.errors.lastName}
        />
      </Box>
      
      <TextField
        margin="normal"
        fullWidth
        id="email"
        name="email"
        label="Email Address"
        autoComplete="email"
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
        autoComplete="new-password"
        value={formik.values.password}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.touched.password && Boolean(formik.errors.password)}
        helperText={formik.touched.password && formik.errors.password}
      />
      
      <TextField
        margin="normal"
        fullWidth
        id="confirmPassword"
        name="confirmPassword"
        label="Confirm Password"
        type="password"
        autoComplete="new-password"
        value={formik.values.confirmPassword}
        onChange={formik.handleChange}
        onBlur={formik.handleBlur}
        error={formik.touched.confirmPassword && Boolean(formik.errors.confirmPassword)}
        helperText={formik.touched.confirmPassword && formik.errors.confirmPassword}
      />
      
      <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{ mt: 3 }}
        disabled={isLoading}
      >
        {isLoading ? <CircularProgress size={24} /> : 'Register'}
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
        Sign up with Google
      </Button>
      
      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography variant="body2">
          Already have an account?{' '}
          <Link component={RouterLink} to="/login" variant="body2">
            Sign In
          </Link>
        </Typography>
      </Box>
    </Box>
  );
};

export default RegisterPage;
