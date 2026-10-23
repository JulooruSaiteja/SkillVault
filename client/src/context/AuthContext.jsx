import React, { createContext, useState, useEffect, useCallback } from 'react';
import api, { ApiError } from '../services/api';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check current session on mount via HttpOnly cookie
  const checkSession = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get('/auth/me');
      if (res?.data?.user) {
        setUser(res.data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
      // 401 is normal for unauthenticated visitors
      if (err.status !== 401) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = async (email, password) => {
    setError(null);
    try {
      const res = await api.post('/auth/login', { email, password });
      const authenticatedUser = res?.data?.user || null;
      setUser(authenticatedUser);
      return authenticatedUser;
    } catch (err) {
      const msg = err.message || 'Login failed';
      setError(msg);
      throw err;
    }
  };

  const signup = async (name, email, password) => {
    setError(null);
    try {
      const res = await api.post('/auth/register', { name, email, password });
      const newUser = res?.data?.user || null;
      setUser(newUser);
      return newUser;
    } catch (err) {
      const msg = err.message || 'Registration failed';
      setError(msg);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Proceed with clearing local state even if server logout errored
    } finally {
      setUser(null);
      setError(null);
    }
  };

  const value = {
    user,
    loading,
    error,
    isAuthenticated: Boolean(user),
    isAdmin: user?.role === 'admin',
    login,
    signup,
    logout,
    refreshUser: checkSession
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
