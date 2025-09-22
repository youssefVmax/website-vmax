// MySQL Services - Complete replacement for Firebase services
export { apiService } from './api-service';
export { 
  authenticateUser, 
  authenticateManager, 
  getUserById, 
  getUsersByRole, 
  getUsersByTeam,
  createUser,
  updateUser,
  getAllUsers,
  MANAGER_USER 
} from './mysql-auth-service';
export { dealsService, DealUtils } from './mysql-deals-service';
export { callbacksService, CallbackUtils } from './mysql-callbacks-service';
export { targetsService, TargetUtils } from './mysql-targets-service';
export { notificationService } from './mysql-notifications-service';
export { integratedDataService, DataUtils, dataEventEmitter, DATA_EVENTS } from './mysql-integrated-data-service';

// Re-export types for compatibility
export type { User } from './auth';
export type { Deal, Callback, SalesTarget } from './api-service';
export type { Notification } from './mysql-notifications-service';

// MySQL-based user service
export const userService = {
  authenticateUser: async (username: string, password: string) => {
    const { authenticateUser } = await import('./mysql-auth-service');
    return authenticateUser(username, password);
  },
  getUserById: async (id: string) => {
    const { getUserById } = await import('./mysql-auth-service');
    return getUserById(id);
  },
  getUsersByRole: async (role: string) => {
    const { getUsersByRole } = await import('./mysql-auth-service');
    // Convert role names to match MySQL schema
    const mysqlRole = role === 'admin' ? 'manager' : role;
    return getUsersByRole(mysqlRole as any);
  },
  getUsersByTeam: async (team: string) => {
    const { getUsersByTeam } = await import('./mysql-auth-service');
    return getUsersByTeam(team);
  },
  updateUser: async (id: string, updates: any) => {
    const { updateUser } = await import('./mysql-auth-service');
    return updateUser(id, updates);
  },
  createUser: async (userData: any) => {
    const { createUser } = await import('./mysql-auth-service');
    return createUser(userData);
  },
  getUserByUsername: async (username: string) => {
    const { getAllUsers } = await import('./mysql-auth-service');
    const users = await getAllUsers();
    return users.find(user => user.username === username) || null;
  },
  getAllUsers: async () => {
    const { getAllUsers } = await import('./mysql-auth-service');
    return getAllUsers();
  },
  deleteUser: async (id: string) => {
    // Note: Delete functionality should be implemented in mysql-auth-service if needed
    throw new Error('Delete user functionality not implemented for safety');
  }
};

// Export MySQL sales data hook
export { useMySQLSalesData, useFirebaseSalesData } from '../hooks/useMySQLSalesData';
