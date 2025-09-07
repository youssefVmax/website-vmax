"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, authenticateUser } from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored auth on mount
    const storedUser = localStorage.getItem('vmax_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        // Validate that the stored user still exists in our system
        const validUser = authenticateUser(parsedUser.username, parsedUser.password);
        if (validUser) {
          setUser(validUser);
        } else {
          localStorage.removeItem('vmax_user');
        }
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('vmax_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const authenticatedUser = authenticateUser(username, password);
    
    if (authenticatedUser) {
      setUser(authenticatedUser);
      localStorage.setItem('vmax_user', JSON.stringify(authenticatedUser));
      setLoading(false);
      return true;
    }
    
    setLoading(false);
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('vmax_user');
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    loading
  };

  return React.createElement(
    AuthContext.Provider,
    { value },
    children
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}