import React, { createContext, useContext, useState, useCallback } from 'react';
import { authService as authApi } from '@/api/services/auth.service';
import { setTokens, getAccessToken, clearTokens } from '@/api/client';
import { User, RegisterInput } from '@/types';

export type UserRole = 'SALES' | 'ADMIN' | 'HR' | 'INVENTORY' | 'SUPERADMIN';

export interface AppUser extends User {}

interface AuthContextType {
  user: AppUser | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterInput) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const getRoleDashboard = (role: string): string => {
  const r = (role || '').toUpperCase();
  if (r.startsWith('SALES')) return '/sales';
  if (r.startsWith('ADMIN') || r === 'SUPERADMIN') return '/admin';
  if (r.startsWith('HR')) return '/hr';
  if (r.startsWith('INVENTORY') || r.includes('WAREHOUSE')) return '/inventory';
  return '/';
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem('app_user');
      const token = localStorage.getItem('token');
      // Only return user if a token also exists
      return (saved && token) ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [loading, setLoading] = useState(true);

  // Initialize: Check for existing token and fetch user if needed
  React.useEffect(() => {
    const initAuth = async () => {
      const token = getAccessToken();
      if (token && !user) {
        // Here we could verify token if needed
      }
      setLoading(false);
    };
    initAuth();
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password });

      if (!response.success) {
        return { success: false, error: response.message };
      }

      const { user, accessToken, refreshToken } = response.data;

      setUser(user);
      setTokens(accessToken, refreshToken);
      localStorage.setItem('app_user', JSON.stringify(user));
      
      return { success: true };
    } catch (error: unknown) {
      const err = error as Error;
      return { success: false, error: err.message || 'Invalid credentials' };
    }
  }, []);

  const register = useCallback(async (data: RegisterInput) => {
    try {
      const response = await authApi.register(data);

      if (!response.success) {
        return { success: false, error: response.message };
      }

      if (!response.data) {
        return { success: false, error: 'Authorization failed' };
      }

      const { user, accessToken, refreshToken } = response.data;

      setUser(user);
      setTokens(accessToken, refreshToken);
      localStorage.setItem('app_user', JSON.stringify(user));
      
      return { success: true };
    } catch (error: unknown) {
      const err = error as Error;
      return { success: false, error: err.message || 'Registration failed' };
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    clearTokens();
    localStorage.removeItem('app_user');
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated: !!user && !!localStorage.getItem('token'), loading }}>

      {children}
    </AuthContext.Provider>
  );
};
