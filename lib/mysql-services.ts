// MySQL Services - Complete replacement for Firebase services
export { apiService } from './api-service';
export { 
  authenticateUser, 
  authenticateManager, 
  getUserById, 
  getUsersByRole, 
  getUsersByTeam,
  MANAGER_USER,
  authService
} from './auth';
export { dealsService, DealUtils } from './mysql-deals-service';
export { callbacksService, CallbackUtils } from './mysql-callbacks-service';
export { targetsService, TargetUtils } from './mysql-targets-service';
export { notificationService } from './mysql-notifications-service';
export { integratedDataService, DataUtils, dataEventEmitter, DATA_EVENTS } from './mysql-integrated-data-service';

// Re-export types for compatibility
export type { User, UserRole, AuthResponse } from './auth';
export type { Deal, Callback, SalesTarget } from './api-service';
export type { Notification } from './mysql-notifications-service';

// MySQL-based user service using the new auth service
export const userService = {
  authenticateUser: async (username: string, password: string) => {
    const { authService } = await import('./auth');
    const result = await authService.authenticateUser(username, password);
    return result.success ? result.user : null;
  },
  getUserById: async (id: string) => {
    const { authService } = await import('./auth');
    return await authService.getUserById(id);
  },
  getUsersByRole: async (role: string) => {
    const { authService } = await import('./auth');
    // Convert role names to match MySQL schema
    const mysqlRole = role === 'admin' ? 'manager' : role;
    return await authService.getUsersByRole(mysqlRole as any);
  },
  getUsersByTeam: async (team: string) => {
    const { authService } = await import('./auth');
    return await authService.getUsersByTeam(team);
  },
  getAllUsers: async () => {
    const { authService } = await import('./auth');
    return await authService.getAllUsers();
  },
  createUser: async (userData: any) => {
    // This would need to be implemented via API call
    const { API_CONFIG } = await import('./config');
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/users-api.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', ...userData })
    });
    return await response.json();
  },
  updateUser: async (id: string, updates: any) => {
    // This would need to be implemented via API call
    const { API_CONFIG } = await import('./config');
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/users-api.php`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates })
    });
    return await response.json();
  },
  getUserByUsername: async (username: string) => {
    try {
      // Try to get user directly from API instead of fetching all users
      const response = await fetch(`/api/users?username=${encodeURIComponent(username)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.users && data.users.length > 0) {
          return data.users[0];
        }
      }
      
      // Fallback: if API fails, try the auth service
      const { authService } = await import('./auth');
      const users = await authService.getAllUsers();
      return users.find(user => user.username === username) || null;
    } catch (error) {
      console.error('Error getting user by username:', error);
      return null;
    }
  },
  deleteUser: async (id: string) => {
    // This would need to be implemented via API call
    const { API_CONFIG } = await import('./config');
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/users-api.php`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    return await response.json();
  }
};

// Export MySQL sales data hook
export { useMySQLSalesData, useFirebaseSalesData } from '../hooks/useMySQLSalesData';
