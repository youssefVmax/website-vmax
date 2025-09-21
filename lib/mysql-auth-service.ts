import { apiService, User } from './api-service';

// Manager credentials - hardcoded as requested
const MANAGER_CREDENTIALS = {
  username: 'manager',
  password: 'manage@Vmax'
};

// Manager user object
export const MANAGER_USER: User = {
  id: 'manager-001',
  username: 'manager',
  password: 'manage@Vmax',
  name: 'System Manager',
  role: 'manager',
  email: 'manager@vmax.com',
  phone: '+1234567890',
  team: 'MANAGEMENT',
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: 'system'
};

// Manager-only authentication
export function authenticateManager(username: string, password: string): User | null {
  if (username === MANAGER_CREDENTIALS.username && password === MANAGER_CREDENTIALS.password) {
    return MANAGER_USER;
  }
  return null;
}

// Authenticate any user (manager or from MySQL database)
export async function authenticateUser(username: string, password: string): Promise<User | null> {
  console.log('Authenticating user:', username);
  
  // First check if it's the manager
  const manager = authenticateManager(username, password);
  if (manager) {
    console.log('Manager authenticated successfully');
    return manager;
  }
  
  // For other users, check MySQL database
  try {
    console.log('Checking MySQL database for user:', username);
    const users = await apiService.getUsers({ username });
    
    if (users.length === 0) {
      console.log('User not found in database:', username);
      return null;
    }
    
    const user = users[0];
    
    // Verify password (assuming passwords are hashed in database)
    const bcrypt = require('bcryptjs');
    const isValidPassword = await bcrypt.compare(password, user.password || '');
    
    if (!isValidPassword) {
      console.log('Invalid password for user:', username);
      return null;
    }
    
    console.log('MySQL user authenticated successfully:', user.name);
    return {
      ...user,
      isActive: true
    };
  } catch (error) {
    console.error('Error authenticating user:', error);
    return null;
  }
}

// MySQL-integrated helper functions
export async function getUserById(id: string): Promise<User | null> {
  if (id === MANAGER_USER.id) return MANAGER_USER;
  
  try {
    const users = await apiService.getUsers({ id });
    return users.length > 0 ? { ...users[0], isActive: true } : null;
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    return null;
  }
}

export async function getUsersByRole(role: User['role']): Promise<User[]> {
  if (role === 'manager') return [MANAGER_USER];
  
  try {
    const users = await apiService.getUsers({ role });
    return users.map(user => ({ ...user, isActive: true }));
  } catch (error) {
    console.error('Error fetching users by role:', error);
    return [];
  }
}

export async function getUsersByTeam(team: string): Promise<User[]> {
  if (team === 'MANAGEMENT') return [MANAGER_USER];
  
  try {
    const users = await apiService.getUsers({ team });
    return users.map(user => ({ ...user, isActive: true }));
  } catch (error) {
    console.error('Error fetching users by team:', error);
    return [];
  }
}

export async function createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; id: string }> {
  try {
    return await apiService.createUser(userData);
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

export async function updateUser(id: string, userData: Partial<User>): Promise<{ success: boolean }> {
  try {
    return await apiService.updateUser(id, userData);
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

export async function getAllUsers(): Promise<User[]> {
  try {
    const users = await apiService.getUsers();
    return [MANAGER_USER, ...users.map(user => ({ ...user, isActive: true }))];
  } catch (error) {
    console.error('Error fetching all users:', error);
    return [MANAGER_USER];
  }
}
