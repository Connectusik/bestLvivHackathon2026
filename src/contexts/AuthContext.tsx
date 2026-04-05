import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { UserRole } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface User {
  name: string;
  role: UserRole;
  warehouseId?: string; // for workers
}

interface AuthContextValue {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useLocalStorage<User | null>('auth-user', null);
  const [user, setUser] = useState<User | null>(stored);

  const login = useCallback((u: User) => {
    setUser(u);
    setStored(u);
  }, [setStored]);

  const logout = useCallback(() => {
    setUser(null);
    setStored(null);
  }, [setStored]);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
