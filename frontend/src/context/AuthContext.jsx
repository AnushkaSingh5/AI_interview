import React, { createContext, useContext, useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if token exists and fetch user details on load
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await axiosInstance.get('/auth/me');
          if (res.data && res.data.success) {
            setUser(res.data.user);
            localStorage.setItem('user', JSON.stringify(res.data.user));
          } else {
            handleUnauthorizedCleanup();
          }
        } catch (error) {
          console.error('Error fetching current user:', error);
          handleUnauthorizedCleanup();
        }
      }
      setLoading(false);
    };

    initializeAuth();

    // Listen to unauthorized interceptor event
    const handleUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener('auth-unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('auth-unauthorized', handleUnauthorized);
    };
  }, []);

  const handleUnauthorizedCleanup = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  // Login action
  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await axiosInstance.post('/auth/login', { email, password });
      if (res.data && res.data.success) {
        const { token, user: userData } = res.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        return { success: true };
      }
    } catch (error) {
      setLoading(false);
      const message = error.response?.data?.message || 'Login failed. Please check your credentials.';
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  // Register action
  const register = async (name, email, password) => {
    setLoading(true);
    try {
      const res = await axiosInstance.post('/auth/register', { name, email, password });
      if (res.data && res.data.success) {
        const { token, user: userData } = res.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        return { success: true };
      }
    } catch (error) {
      setLoading(false);
      const message = error.response?.data?.message || 'Registration failed.';
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  // Logout action
  const logout = async () => {
    setLoading(true);
    try {
      await axiosInstance.post('/auth/logout');
    } catch (error) {
      console.error('Logout error on backend:', error);
    } finally {
      handleUnauthorizedCleanup();
      setLoading(false);
    }
  };

  // Update profile action
  const updateProfile = async (profileData) => {
    try {
      const res = await axiosInstance.put('/auth/profile', profileData);
      if (res.data && res.data.success) {
        const updatedUser = res.data.user;
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        return { success: true, message: res.data.message || 'Profile updated successfully' };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update profile.';
      return { success: false, message };
    }
  };

  const value = {
    user,
    setUser,
    loading,
    login,
    register,
    logout,
    updateProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
