import { useState, useEffect } from 'react';
import { authenticateUser, authenticateManager, User } from '@/lib/auth';
import { userService } from '@/lib/firebase-user-service';

export function useUserAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('current-user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
      } catch (err) {
        localStorage.removeItem('current-user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const authenticatedUser = await authenticateUser(username, password);
      
      if (authenticatedUser) {
        setUser(authenticatedUser);
        localStorage.setItem('current-user', JSON.stringify(authenticatedUser));
        return true;
      } else {
        setError('Invalid credentials');
        return false;
      }
    } catch (err) {
      setError('Authentication failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('current-user');
    setError(null);
  };

  const isAuthenticated = !!user;
  const isManager = user?.role === 'manager';

  return {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated,
    isManager
  };
}
