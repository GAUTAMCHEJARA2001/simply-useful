import React, { createContext, useContext, useState, useCallback } from 'react';
import { mockUsers } from '@/data/mockData';

export type UserRole = 'SALES' | 'ADMIN' | 'HR' | 'INVENTORY' | 'SUPERADMIN';

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  monthly_target?: number;
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
      const saved = localStorage.getItem('mock_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [loading] = useState(false);

  const login = useCallback(async (email: string, password: string) => {
    const found = mockUsers.find(u => u.email === email && u.password === password && u.active);
    if (!found) {
      return { success: false, error: 'Invalid credentials' };
    }
    const appUser: AppUser = {
      id: found.email,
      email: found.email,
      name: found.name || found.email,
      role: found.role,
      active: found.active,
    };
    setUser(appUser);
    localStorage.setItem('mock_user', JSON.stringify(appUser));
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('mock_user');
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
