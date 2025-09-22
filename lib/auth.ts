import { API_CONFIG } from './config';

export type UserRole = 'manager' | 'team-leader' | 'salesman';

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  team_id?: number;
  team_name?: string;
  is_active: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
  password_hash?: string; // For authentication
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
}

// Manager user object
export const MANAGER_USER: User = {
  id: 1,
  username: 'manager',
  email: 'manager@vmax.com',
  full_name: 'System Manager',
  role: 'manager',
  team_id: 1,
  team_name: 'MANAGEMENT',
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
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

      // For other users, check via API
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/users-api.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'authenticate',
          username: username,
          password: password
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.user) {
        // Convert API user format to our User interface
        const user: User = {
          id: parseInt(data.user.id),
          username: data.user.username,
          email: data.user.email,
          full_name: data.user.name || data.user.full_name,
          phone: data.user.phone,
          role: data.user.role as UserRole,
          team_id: data.user.team_id,
          team_name: data.user.team || data.user.team_name,
          is_active: data.user.isActive || data.user.is_active,
          created_at: new Date(data.user.createdAt || data.user.created_at),
          updated_at: new Date(data.user.updatedAt || data.user.updated_at),
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
        return {
          success: false,
          message: data.message || 'Invalid credentials'
        };
      }

    } catch (error) {
      console.error('❌ Authentication error:', error);
      return {
        success: false,
        message: 'Authentication failed. Please check your connection.'
      };
    }
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
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/users-api.php?action=getById&id=${id}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.user) {
        return {
          id: parseInt(data.user.id),
          username: data.user.username,
          email: data.user.email,
          full_name: data.user.name || data.user.full_name,
          phone: data.user.phone,
          role: data.user.role as UserRole,
          team_id: data.user.team_id,
          team_name: data.user.team || data.user.team_name,
          is_active: data.user.isActive || data.user.is_active,
          created_at: new Date(data.user.createdAt || data.user.created_at),
          updated_at: new Date(data.user.updatedAt || data.user.updated_at),
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
    if (role === 'manager') return [MANAGER_USER];
    
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/users-api.php?action=getByRole&role=${role}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.users) {
        return data.users.map((user: any) => ({
          id: parseInt(user.id),
          username: user.username,
          email: user.email,
          full_name: user.name || user.full_name,
          phone: user.phone,
          role: user.role as UserRole,
          team_id: user.team_id,
          team_name: user.team || user.team_name,
          is_active: user.isActive || user.is_active,
          created_at: new Date(user.createdAt || user.created_at),
          updated_at: new Date(user.updatedAt || user.updated_at),
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching users by role:', error);
      return [];
    }
  }

  // Fetch users by team from API
  public async getUsersByTeam(team: string): Promise<User[]> {
    if (team === 'MANAGEMENT') return [MANAGER_USER];
    
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/users-api.php?action=getByTeam&team=${encodeURIComponent(team)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.users) {
        return data.users.map((user: any) => ({
          id: parseInt(user.id),
          username: user.username,
          email: user.email,
          full_name: user.name || user.full_name,
          phone: user.phone,
          role: user.role as UserRole,
          team_id: user.team_id,
          team_name: user.team || user.team_name,
          is_active: user.isActive || user.is_active,
          created_at: new Date(user.createdAt || user.created_at),
          updated_at: new Date(user.updatedAt || user.updated_at),
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
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/users-api.php?action=getAll`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.users) {
        return data.users.map((user: any) => ({
          id: parseInt(user.id),
          username: user.username,
          email: user.email,
          full_name: user.name || user.full_name,
          phone: user.phone,
          role: user.role as UserRole,
          team_id: user.team_id,
          team_name: user.team || user.team_name,
          is_active: user.isActive || user.is_active,
          created_at: new Date(user.createdAt || user.created_at),
          updated_at: new Date(user.updatedAt || user.updated_at),
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching all users:', error);
      return [];
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
