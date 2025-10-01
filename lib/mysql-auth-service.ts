import { apiService, User } from './api-service';

// Manager user object - will be fetched from database, but keeping as fallback
const MANAGER_USER: User = {
  id: 'manager-001',
  username: 'manager',
  name: 'System Manager',
  role: 'manager',
  email: 'manager@vmax.com',
  phone: '+1234567890',
  team: 'MANAGEMENT',
  created_by: 'system',
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

// Get manager user - try to fetch from database first, fallback to hardcoded
async function getManagerUser(): Promise<User> {
  try {
    const managers = await apiService.getUsers({ role: 'manager' });
    if (managers.length > 0) {
      return { ...managers[0], is_active: true };
    }
  } catch (error) {
    console.warn('Could not fetch manager from database, using fallback:', error);
  }

  // Fallback to hardcoded manager
  return MANAGER_USER;
}

// Manager-only authentication - use API authentication
export async function authenticateManager(username: string, password: string): Promise<User | null> {
  try {
    // Try to authenticate manager through API
    const authResponse = await fetch('/api/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: username,
        password: password
      })
    });

    if (authResponse.ok) {
      const authData = await authResponse.json();
      if (authData.success && authData.user) {
        console.log('Manager authenticated successfully via API');
        return {
          ...authData.user,
          is_active: true
        };
      }
    }

    // Fallback to hardcoded manager for development
    if (username === 'manager' && password === 'manage@Vmax') {
      console.log('Using fallback manager authentication');
      return await getManagerUser();
    }

    return null;
  } catch (error) {
    console.error('Error authenticating manager:', error);
    // Fallback to hardcoded manager
    if (username === 'manager' && password === 'manage@Vmax') {
      return await getManagerUser();
    }
    return null;
  }
}

// Authenticate any user (manager or from MySQL database)
export async function authenticateUser(username: string, password: string): Promise<User | null> {
  console.log('Authenticating user:', username);

  // First check if it's the manager
  const manager = await authenticateManager(username, password);
  if (manager) {
    console.log('Manager authenticated successfully');
    return manager;
  }

  // For other users, use API authentication
  try {
    console.log('Authenticating user through API:', username);
    const authResponse = await fetch('/api/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: username,
        password: password
      })
    });

    if (authResponse.ok) {
      const authData = await authResponse.json();
      if (authData.success && authData.user) {
        console.log('User authenticated successfully via API:', authData.user.name);
        return {
          ...authData.user,
          is_active: true
        };
      }
    }

    console.log('API authentication failed for user:', username);
    return null;
  } catch (error) {
    console.error('Error during API authentication:', error);
    return null;
  }
}

export async function getUserById(id: string): Promise<User | null> {
  if (id === 'manager-001') {
    return await getManagerUser();
  }

  try {
    const users = await apiService.getUsers({ id });
    return users.length > 0 ? { ...users[0], is_active: true } : null;
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    return null;
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

export async function getUsersByRole(role: User['role']): Promise<User[]> {
  if (role === 'manager') {
    const manager = await getManagerUser();
    return [manager];
  }

  try {
    const users = await apiService.getUsers({ role });
    return users.map(user => ({ ...user, is_active: true }));
  } catch (error) {
    console.error('Error fetching users by role:', error);
    return [];
  }
}

export async function getUsersByTeam(team: string): Promise<User[]> {
  if (team === 'MANAGEMENT') {
    const manager = await getManagerUser();
    return [manager];
  }

  try {
    const users = await apiService.getUsers({ team });
    return users.map(user => ({ ...user, is_active: true }));
  } catch (error) {
    console.error('Error fetching users by team:', error);
    return [];
  }
}

export async function getAllUsers(): Promise<User[]> {
  try {
    const manager = await getManagerUser();
    const users = await apiService.getUsers();
    return [manager, ...users.map(user => ({ ...user, is_active: true }))];
  } catch (error) {
    console.error('Error fetching all users:', error);
    return [MANAGER_USER];
  }
}
