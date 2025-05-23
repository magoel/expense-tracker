import { create } from 'zustand';
import axios from 'axios';
import jwtDecode from 'jwt-decode';
import { User } from '../types/auth';
import { api } from '../api';

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isInitialized: boolean;
  checkAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (firstName: string, lastName: string, email: string, password: string) => Promise<void>;
  handleOAuthCallback: (token: string) => Promise<void>;
  logout: () => void;
  updateProfile: (firstName: string, lastName: string) => Promise<void>;
  updateUserData: (userData: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  isInitialized: false,
  
  // Check if user is authenticated
  checkAuth: async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        set({ isAuthenticated: false, user: null, isInitialized: true });
        return;
      }
      
      // Verify token is not expired
      const decoded: any = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      
      if (decoded.exp < currentTime) {
        localStorage.removeItem('token');
        set({ isAuthenticated: false, user: null, isInitialized: true });
        return;
      }
      
      // Set auth header
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
      
      // Get current user
      const response = await api.get('/auth/me');
      set({ 
        isAuthenticated: true, 
        user: response.data.data.user, 
        isInitialized: true 
      });
    } catch (error) {
      localStorage.removeItem('token');
      set({ isAuthenticated: false, user: null, isInitialized: true });
    }
  },
  
  // Login user
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data.data;
      
      localStorage.setItem('token', token);
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
      
      set({ isAuthenticated: true, user });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Login failed');
      }
      throw new Error('Login failed');
    }
  },
  
  // Register user
  register: async (firstName, lastName, email, password) => {
    try {
      const response = await api.post('/auth/register', {
        firstName,
        lastName,
        email,
        password,
      });
      
      const { token, user } = response.data.data;
      
      localStorage.setItem('token', token);
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
      
      set({ isAuthenticated: true, user });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Registration failed');
      }
      throw new Error('Registration failed');
    }
  },
  
  // Handle OAuth callback
  handleOAuthCallback: async (token) => {
    try {
      localStorage.setItem('token', token);
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
      
      const response = await api.get('/auth/me');
      set({ isAuthenticated: true, user: response.data.data.user });
    } catch (error) {
      localStorage.removeItem('token');
      set({ isAuthenticated: false, user: null });
      throw new Error('OAuth authentication failed');
    }
  },
  
  // Logout user
  logout: () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common.Authorization;
    set({ isAuthenticated: false, user: null });
  },
  
  // Update user profile
  updateProfile: async (firstName, lastName) => {
    try {
      const response = await api.put('/auth/profile', {
        firstName,
        lastName,
      });
      
      set({ user: response.data.data.user });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Profile update failed');
      }
      throw new Error('Profile update failed');
    }
  },
  
  // Update user data in state
  updateUserData: (userData) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...userData } : null
    }));
  },
}));
