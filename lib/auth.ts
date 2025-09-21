export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: 'manager' | 'salesman' | 'team-leader';
  team?: string;
  managedTeam?: string; // For team leaders - which team they manage
  email?: string;
  phone?: string;
  isActive?: boolean;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
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
    const { authenticateUser: mysqlAuth } = await import('./mysql-auth-service');
    const user = await mysqlAuth(username, password);
    if (user) {
      console.log('MySQL user authenticated successfully:', user.name);
    } else {
      console.log('MySQL authentication failed for user:', username);
    }
    return user;
  } catch (error) {
    console.error('Error authenticating user:', error);
    return null;
  }
}

// MySQL-integrated helper functions
export async function getUserById(id: string): Promise<User | null> {
  if (id === MANAGER_USER.id) return MANAGER_USER;
  
  try {
    const { getUserById: mysqlGetUserById } = await import('./mysql-auth-service');
    return await mysqlGetUserById(id);
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    return null;
  }
}

export async function getUsersByRole(role: User['role']): Promise<User[]> {
  if (role === 'manager') return [MANAGER_USER];
  
  try {
    const { getUsersByRole: mysqlGetUsersByRole } = await import('./mysql-auth-service');
    return await mysqlGetUsersByRole(role);
  } catch (error) {
    console.error('Error fetching users by role:', error);
    return [];
  }
}

export async function getUsersByTeam(team: string): Promise<User[]> {
  if (team === 'MANAGEMENT') return [MANAGER_USER];
  
  try {
    const { getUsersByTeam: mysqlGetUsersByTeam } = await import('./mysql-auth-service');
    return await mysqlGetUsersByTeam(team);
  } catch (error) {
    console.error('Error fetching users by team:', error);
    return [];
  }
}