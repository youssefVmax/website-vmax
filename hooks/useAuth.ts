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
      try {
        console.log('🔄 useAuth: Bootstrapping authentication...');
        const storedUser = localStorage.getItem('vmax_user');
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            
            // Validate user object has required properties
            if (parsedUser && parsedUser.role && ['manager', 'team_leader', 'salesman'].includes(parsedUser.role)) {
              // Ensure user has all required properties with proper field mapping
              const validatedUser = {
                ...parsedUser,
                id: parsedUser.id || 'user-001',
                username: parsedUser.username || 'unknown',
                name: parsedUser.name || parsedUser.full_name || parsedUser.username || 'Unknown User',
                email: parsedUser.email || `${parsedUser.username}@vmax.com`,
                role: parsedUser.role,
                team: parsedUser.team || parsedUser.team_name || parsedUser.managedTeam || (parsedUser.role === 'manager' ? 'MANAGEMENT' : 'GENERAL'),
                managedTeam: parsedUser.managedTeam,
                is_active: parsedUser.is_active !== false,
                created_at: parsedUser.created_at ? new Date(parsedUser.created_at) : new Date(),
                updated_at: parsedUser.updated_at ? new Date(parsedUser.updated_at) : new Date(),
                // Backward compatibility properties
                full_name: parsedUser.name || parsedUser.full_name || parsedUser.username || 'Unknown User',
                team_name: parsedUser.team || parsedUser.team_name || parsedUser.managedTeam || (parsedUser.role === 'manager' ? 'MANAGEMENT' : 'GENERAL')
              };
              
              console.log('✅ useAuth: Restored valid user from localStorage:', validatedUser.username, validatedUser.role);
              setUser(validatedUser);
            } else {
              console.warn('⚠️ useAuth: Invalid user data in localStorage, clearing...');
              localStorage.removeItem('vmax_user');
            }
          } catch (error) {
            console.error('❌ useAuth: Failed to parse stored user:', error);
            localStorage.removeItem('vmax_user');
          }
        } else {
          console.log('ℹ️ useAuth: No stored user found');
        }
      } catch (error) {
        console.error('❌ useAuth: Bootstrap error:', error);
      } finally {
        console.log('✅ useAuth: Bootstrap complete, setting loading to false');
        setLoading(false);
      }
    }
    
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('⚠️ useAuth: Bootstrap timeout, forcing loading to false');
      setLoading(false);
    }, 3000);
    
    bootstrap().finally(() => {
      clearTimeout(timeoutId);
    });
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    console.log('useAuth: Starting login process for:', username);
    setLoading(true);
    
    const authenticatedUser = await authenticateUser(username, password);
    console.log('useAuth: Authentication result:', authenticatedUser ? 'SUCCESS' : 'FAILED');
    
    if (authenticatedUser) {
      console.log('useAuth: Setting user and storing in localStorage');
      
      // Ensure user has all required properties with correct field mapping
      const validatedUser = {
        ...authenticatedUser,
        id: typeof authenticatedUser.id === 'number' ? String(authenticatedUser.id) : authenticatedUser.id,
        name: authenticatedUser.name || authenticatedUser.full_name || authenticatedUser.username || 'Unknown User',
        team: authenticatedUser.team || authenticatedUser.team_name || (authenticatedUser.role === 'manager' ? 'MANAGEMENT' : 'GENERAL'),
        managedTeam: authenticatedUser.managedTeam,
        is_active: authenticatedUser.is_active !== false,
        created_at: authenticatedUser.created_at || new Date(),
        updated_at: authenticatedUser.updated_at || new Date(),
        // Backward compatibility properties
        full_name: authenticatedUser.name || authenticatedUser.full_name || authenticatedUser.username || 'Unknown User',
        team_name: authenticatedUser.team || authenticatedUser.team_name || (authenticatedUser.role === 'manager' ? 'MANAGEMENT' : 'GENERAL')
      };
      
      setUser(validatedUser);
      localStorage.setItem('vmax_user', JSON.stringify(validatedUser));
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
      // Manager is not stored in MySQL; skip remote update for manager
      if (user.id !== 'manager-001') { // Use string comparison since id is now string
        const { updateUser, getUserById } = await import('@/lib/mysql-auth-service');

        // Convert Date objects to strings for API compatibility
        const apiUpdates: any = { ...updates };
        if (apiUpdates.created_at instanceof Date) {
          apiUpdates.created_at = apiUpdates.created_at.toISOString();
        }
        if (apiUpdates.updated_at instanceof Date) {
          apiUpdates.updated_at = apiUpdates.updated_at.toISOString();
        }

        await updateUser(user.id, apiUpdates); // id is already string
        const refreshed = await getUserById(user.id); // id is already string
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