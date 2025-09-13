export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  role: 'manager' | 'salesman' | 'customer-service';
  team?: string;
  email?: string;
  phone?: string;
  created_at?: string;
  created_by?: string;
}

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
  team: 'MANAGEMENT'
};

// Manager-only authentication
export function authenticateManager(username: string, password: string): User | null {
  if (username === MANAGER_CREDENTIALS.username && password === MANAGER_CREDENTIALS.password) {
    return MANAGER_USER;
  }
  return null;
}

// Authenticate any user (manager or salesman from Firebase)
export async function authenticateUser(username: string, password: string): Promise<User | null> {
  console.log('Authenticating user:', username);
  
  // First check if it's the manager
  const manager = authenticateManager(username, password);
  if (manager) {
    console.log('Manager authenticated successfully');
    return manager;
  }
  
  // For salesmen, check Firebase
  try {
    console.log('Checking Firebase for user:', username);
    const { userService } = await import('./firebase-user-service');
    const user = await userService.authenticateUser(username, password);
    if (user) {
      console.log('Firebase user authenticated successfully:', user.name);
    } else {
      console.log('Firebase authentication failed for user:', username);
    }
    return user;
  } catch (error) {
    console.error('Error authenticating user:', error);
    return null;
  }
}

// Firebase-integrated helper functions
export async function getUserById(id: string): Promise<User | null> {
  if (id === MANAGER_USER.id) return MANAGER_USER;
  
  try {
    const { userService } = await import('./firebase-user-service');
    return await userService.getUserById(id);
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    return null;
  }
}

export async function getUsersByRole(role: User['role']): Promise<User[]> {
  if (role === 'manager') return [MANAGER_USER];
  
  try {
    const { userService } = await import('./firebase-user-service');
    return await userService.getUsersByRole(role);
  } catch (error) {
    console.error('Error fetching users by role:', error);
    return [];
  }
}

export async function getUsersByTeam(team: string): Promise<User[]> {
  if (team === 'MANAGEMENT') return [MANAGER_USER];
  
  try {
    const { userService } = await import('./firebase-user-service');
    return await userService.getUsersByTeam(team);
  } catch (error) {
    console.error('Error fetching users by team:', error);
    return [];
  }
}