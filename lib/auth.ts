import { requestManager } from './request-manager';
import { 
  UserRole, 
  User, 
  AuthResponse, 
  USER_ROLES, 
  isValidRole,
  hasPermission 
} from '../types/user';

// Re-export User type for compatibility
export type { User, UserRole, AuthResponse };

// Manager user object
export const MANAGER_USER: User = {
  id: 'manager-001',
  username: 'manager',
  email: 'manager@vmax.com',
  name: 'System Manager',
  role: USER_ROLES.MANAGER,
  team: 'MANAGEMENT',
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
  // Backward compatibility
  full_name: 'System Manager',
  team_name: 'MANAGEMENT',
  team_id: 1,
};

// Frontend Authentication Service
export class AuthService {
  private static instance: AuthService;
  private currentUser: User | null = null;
  private token: string | null = null;

  private constructor() {
    // Load user from localStorage on initialization
    this.loadUserFromStorage();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Load user and token from localStorage
  private loadUserFromStorage(): void {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    
    try {
      const storedUser = localStorage.getItem('vmax_user');
      const storedToken = localStorage.getItem('vmax_token');
      
      if (storedUser && storedToken) {
        this.currentUser = JSON.parse(storedUser);
        this.token = storedToken;
      }
    } catch (error) {
      console.error('Error loading user from storage:', error);
      this.clearStorage();
    }
  }

  // Save user and token to localStorage
  private saveUserToStorage(user: User, token: string): void {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      this.currentUser = user;
      this.token = token;
      return;
    }
    
    try {
      localStorage.setItem('vmax_user', JSON.stringify(user));
      localStorage.setItem('vmax_token', token);
      this.currentUser = user;
      this.token = token;
    } catch (error) {
      console.error('Error saving user to storage:', error);
    }
  }

  // Clear user data from storage
  private clearStorage(): void {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.removeItem('vmax_user');
      localStorage.removeItem('vmax_token');
    }
    this.currentUser = null;
    this.token = null;
  }

  // Get current authenticated user
  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  // Get current token
  public getToken(): string | null {
    return this.token;
  }

  // Check if user is authenticated
  public isAuthenticated(): boolean {
    return this.currentUser !== null && this.token !== null;
  }

  // Check if user has specific role
  public hasRole(role: UserRole): boolean {
    return this.currentUser?.role === role;
  }

  // Check if user has any of the specified roles
  public hasAnyRole(roles: UserRole[]): boolean {
    return this.currentUser ? roles.includes(this.currentUser.role) : false;
  }

  // Authenticate user with username and password
  public async authenticateUser(username: string, password: string): Promise<AuthResponse> {
    try {
      console.log('🔐 Authenticating user:', username);

      // First check if it's the hardcoded manager
      if (username === 'manager' && password === 'manage@Vmax') {
        const token = `manager_token_${Date.now()}`;
        this.saveUserToStorage(MANAGER_USER, token);

        console.log('✅ Manager authenticated successfully');
        return {
          success: true,
          user: MANAGER_USER,
          token: token,
          message: 'Manager authentication successful'
        };
      }

      // For other users, check via auth API
      const response = await requestManager.fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username,
          password: password
        })
      });

      if (!response.ok) {
        // If auth API fails, try fallback authentication
        console.warn('⚠️ Auth API failed, trying fallback authentication');
        return this.fallbackAuthentication(username, password);
      }

      const data = await response.json();

      if (data.success && data.user) {
        // Convert API user format to our User interface
        const user: User = {
          id: data.user.id.toString(), // Ensure string type
          username: data.user.username,
          email: data.user.email,
          name: data.user.name || data.user.full_name,
          phone: data.user.phone,
          role: data.user.role as UserRole,
          team: data.user.team || data.user.team_name,
          managedTeam: data.user.managedTeam,
          password: data.user.password,
          created_by: data.user.created_by,
          is_active: data.user.isActive || data.user.is_active,
          created_at: new Date(data.user.createdAt || data.user.created_at),
          updated_at: new Date(data.user.updatedAt || data.user.updated_at),
          // Backward compatibility
          full_name: data.user.name || data.user.full_name,
          team_name: data.user.team || data.user.team_name,
          team_id: data.user.team_id,
        };

        const token = data.token || `user_token_${Date.now()}`;
        this.saveUserToStorage(user, token);

        console.log('✅ User authenticated successfully:', user.full_name);
        return {
          success: true,
          user: user,
          token: token,
          message: 'Authentication successful'
        };
      } else {
        console.log('❌ Authentication failed:', data.message);
        // Try fallback authentication if API auth fails
        return this.fallbackAuthentication(username, password);
      }

    } catch (error) {
      console.error('❌ Authentication error:', error);
      return {
        success: false,
        message: 'Authentication failed. Please check your connection.'
      };
    }
  }

  // Fallback authentication for when API is not available
  private async fallbackAuthentication(username: string, password: string): Promise<AuthResponse> {
    console.log('🔄 Attempting fallback authentication for:', username);
    
    // Common test credentials for development
    const testCredentials = [
      { username: 'admin', password: 'admin', role: USER_ROLES.MANAGER },
      { username: 'manager', password: 'manager', role: USER_ROLES.MANAGER },
      { username: 'sales', password: 'sales', role: USER_ROLES.SALESMAN },
      { username: 'team-lead', password: 'team-lead', role: USER_ROLES.TEAM_LEADER },
      { username: 'demo', password: 'demo', role: USER_ROLES.SALESMAN }
    ];
    
    const credential = testCredentials.find(cred => 
      cred.username.toLowerCase() === username.toLowerCase() && 
      cred.password === password
    );
    
    if (credential) {
      const user: User = {
        id: `user-${Math.floor(Math.random() * 1000) + 100}`, // Ensure string type
        username: credential.username,
        email: `${credential.username}@vmaxcom.org`,
        name: credential.username.charAt(0).toUpperCase() + credential.username.slice(1),
        role: credential.role,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        // Backward compatibility
        full_name: credential.username.charAt(0).toUpperCase() + credential.username.slice(1)
      };
      
      const token = `fallback_token_${user.id}_${Date.now()}`;
      this.saveUserToStorage(user, token);
      
      console.log('✅ Fallback authentication successful for:', username);
      return {
        success: true,
        user: user,
        token: token,
        message: 'Fallback authentication successful'
      };
    }
    
    console.log('❌ Fallback authentication failed for:', username);
    return {
      success: false,
      message: 'Invalid credentials. Try: admin/admin, manager/manager, sales/sales'
    };
  }

  // Logout user
  public logout(): void {
    console.log('🚪 User logged out');
    this.clearStorage();
  }

  // Fetch user by ID from API
  public async getUserById(id: string): Promise<User | null> {
    if (id === '1' || id === 'manager-001') return MANAGER_USER;
    
    try {
      const response = await requestManager.fetch(`/api/users?userId=${id}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.user) {
        return {
          id: data.user.id.toString(),
          username: data.user.username,
          email: data.user.email,
          name: data.user.name,
          phone: data.user.phone,
          role: data.user.role as UserRole,
          team: data.user.team,
          managedTeam: data.user.managedTeam,
          password: data.user.password,
          created_by: data.user.created_by,
          is_active: data.user.is_active,
          created_at: new Date(data.user.created_at),
          updated_at: new Date(data.user.updated_at),
          // Backward compatibility
          full_name: data.user.name,
          team_name: data.user.team,
          team_id: data.user.team_id,
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      return null;
    }
  }

  // Fetch users by role from API
  public async getUsersByRole(role: UserRole): Promise<User[]> {
    if (role === USER_ROLES.MANAGER) return [MANAGER_USER];
    
    try {
      const response = await requestManager.fetch(`/api/users?role=${role}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.users) {
        return data.users.map((user: any) => ({
          id: user.id.toString(),
          username: user.username,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role as UserRole,
          team: user.team,
          managedTeam: user.managedTeam,
          password: user.password,
          created_by: user.created_by,
          is_active: user.is_active,
          created_at: new Date(user.created_at),
          updated_at: new Date(user.updated_at),
          // Backward compatibility
          full_name: user.name,
          team_name: user.team,
          team_id: user.team_id,
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching users by role:', error);
      return [];
    }
  }

  // Fetch users by team from API
  public async getUsersByTeam(teamName: string): Promise<User[]> {
    if (teamName === 'MANAGEMENT') return [MANAGER_USER];
    
    try {
      const response = await requestManager.fetch(`/api/users?team=${teamName}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.users) {
        return data.users.map((user: any) => ({
          id: user.id.toString(),
          username: user.username,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role as UserRole,
          team: user.team,
          managedTeam: user.managedTeam,
          password: user.password,
          created_by: user.created_by,
          is_active: user.is_active,
          created_at: new Date(user.created_at),
          updated_at: new Date(user.updated_at),
          // Backward compatibility
          full_name: user.name,
          team_name: user.team,
          team_id: user.team === 'ALI ASHRAF' ? 1 : user.team === 'CS TEAM' ? 2 : 0,
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching users by team:', error);
      return [];
    }
  }

  // Fetch all users from API
  public async getAllUsers(): Promise<User[]> {
    try {
      const response = await requestManager.fetch('/api/users');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.users) {
        // Include the manager user in the list
        const dbUsers = data.users.map((user: any) => ({
          id: user.id.toString(),
          username: user.username,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role as UserRole,
          team: user.team,
          managedTeam: user.managedTeam,
          password: user.password,
          created_by: user.created_by,
          is_active: user.is_active,
          created_at: new Date(user.created_at),
          updated_at: new Date(user.updated_at),
          // Backward compatibility
          full_name: user.name,
          team_name: user.team,
          team_id: user.team === 'ALI ASHRAF' ? 1 : user.team === 'CS TEAM' ? 2 : 0,
        }));
        
        // Add manager user if not already in the list
        const hasManager = dbUsers.some((user: User) => user.role === USER_ROLES.MANAGER);
        if (!hasManager) {
          return [MANAGER_USER, ...dbUsers];
        }
        
        return dbUsers;
      }
      
      return [MANAGER_USER]; // Return at least the manager user
    } catch (error) {
      console.error('Error fetching all users:', error);
      return [MANAGER_USER]; // Return at least the manager user on error
    }
  }
}

// Export singleton instance for easy access
export const authService = AuthService.getInstance();

// Backward compatibility functions
export async function authenticateUser(username: string, password: string): Promise<User | null> {
  const result = await authService.authenticateUser(username, password);
  return result.success ? result.user || null : null;
}

export async function authenticateUserWithManager(username: string, password: string): Promise<User | null> {
  return await authenticateUser(username, password);
}

export function authenticateManager(username: string, password: string): User | null {
  if (username === 'manager' && password === 'manage@Vmax') {
    return MANAGER_USER;
  }
  return null;
}

export async function getUserById(id: string): Promise<User | null> {
  return await authService.getUserById(id);
}

export async function getUsersByRole(role: UserRole): Promise<User[]> {
  return await authService.getUsersByRole(role);
}

export async function getUsersByTeam(team: string): Promise<User[]> {
  return await authService.getUsersByTeam(team);
}
