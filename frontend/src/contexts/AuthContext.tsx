import React, { createContext, useContext, useState, useCallback } from 'react';
import { authApi } from '@/api/auth.api';
import { setAuthToken, removeAuthToken, getAuthToken } from '@/api/client';

export type UserRole = 'SALES' | 'ADMIN' | 'HR' | 'INVENTORY' | 'SUPERADMIN';

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
}

interface AuthContextType {
  user: AppUser | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
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
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  // Initialize: Check for existing token and fetch user if needed
  React.useEffect(() => {
    const initAuth = async () => {
      const token = getAuthToken();
      if (token && !user) {
        // Here we could add a /api/auth/me endpoint to verify token
        // For now, if we have a user in localStorage, we trust it
      }
      setLoading(false);
    };
    initAuth();
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password });

      if (response.error) {
        return { success: false, error: response.error };
      }

      const { user, token } = response.data;

      setUser(user);
      setAuthToken(token);
      localStorage.setItem('app_user', JSON.stringify(user));
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Invalid credentials' };
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    removeAuthToken();
    localStorage.removeItem('app_user');
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
