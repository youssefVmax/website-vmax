"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, authenticateUser } from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
  updateProfile: (updates: Partial<User>) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored auth on mount
    const bootstrap = async () => {
      const storedUser = localStorage.getItem('vmax_user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          // Simply restore the user from localStorage without re-authentication
          // This maintains login state across page refreshes
          setUser(parsedUser);
        } catch (error) {
          console.error('Failed to parse stored user:', error);
          localStorage.removeItem('vmax_user');
        }
      }
      setLoading(false);
    }
    void bootstrap();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    console.log('useAuth: Starting login process for:', username);
    setLoading(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const authenticatedUser = await authenticateUser(username, password);
    console.log('useAuth: Authentication result:', authenticatedUser ? 'SUCCESS' : 'FAILED');
    
    if (authenticatedUser) {
      console.log('useAuth: Setting user and storing in localStorage');
      setUser(authenticatedUser);
      localStorage.setItem('vmax_user', JSON.stringify(authenticatedUser));
      setLoading(false);
      console.log('useAuth: Login completed successfully');
      return true;
    }
    
    console.log('useAuth: Login failed - no authenticated user');
    setLoading(false);
    return false;
  };

  const updateProfile = async (updates: Partial<User>): Promise<boolean> => {
    if (!user) return false;
    try {
      let updatedUser: User = { ...user, ...updates } as User;
      // Manager is not stored in Firebase; skip remote update for manager
      if (user.id !== 'manager-001') {
        const { userService } = await import('@/lib/firebase-user-service');
        await userService.updateUser(user.id, updates);
        const refreshed = await userService.getUserById(user.id);
        if (refreshed) {
          updatedUser = { ...updatedUser, ...refreshed } as User;
        }
      }
      setUser(updatedUser);
      localStorage.setItem('vmax_user', JSON.stringify(updatedUser));
      return true;
    } catch (e) {
      console.error('Failed to update profile', e);
      return false;
    }
  }

  const logout = () => {
    setUser(null);
    localStorage.removeItem('vmax_user');
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    loading,
    updateProfile,
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