// MySQL User Service - replaces Firebase with MySQL database calls
import { apiService } from './api-service';

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  role: 'manager' | 'team-leader' | 'salesman';
  team?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
  managedTeam?: string;
  password?: string;
}

class MySQLUserService {
  async getUsers(): Promise<User[]> {
    try {
      console.log('🔄 MySQLUserService: Fetching users via unified API');
      const response = await fetch('/api/unified-data?userRole=manager&dataTypes=users&limit=1000');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.success ? (result.data.users || []) : [];
    } catch (error) {
      console.error('❌ MySQLUserService: Error fetching users:', error);
      return [];
    }
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      const users = await this.getUsers();
      return users.find(u => u.id === id) || null;
    } catch (error) {
      console.error('Error fetching user by ID from MySQL:', error);
      return null;
    }
  }

  async getUserByUsername(username: string): Promise<User | null> {
    try {
      const users = await this.getUsers();
      return users.find(u => u.username === username) || null;
    } catch (error) {
      console.error('Error fetching user by username from MySQL:', error);
      return null;
    }
  }

  async authenticateUser(username: string, password: string): Promise<User | null> {
    try {
      console.log('MySQL User Service: Authenticating user:', username);
      
      // For development, use hardcoded manager credentials
      if (username === 'manager' && password === 'manage@Vmax') {
        console.log('MySQL User Service: Manager authenticated successfully');
        return {
          id: 'user_manager_1',
          username: 'manager',
          email: 'manager@vmax.com',
          name: 'Sales Manager',
          role: 'manager',
          team: 'MANAGEMENT',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }

      // Try to authenticate with MySQL database
      const users = await this.getUsers();
      const user = users.find(u => u.username === username);
      
      if (user && user.password === password) {
        console.log('MySQL User Service: Database user authenticated successfully:', user.name);
        return user;
      }

      console.log('MySQL User Service: Authentication failed for user:', username);
      return null;
    } catch (error) {
      console.error('Error authenticating user with MySQL:', error);
      return null;
    }
  }

  async createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    try {
      const response = await apiService.makeRequest('/api/mysql-service.php?path=users', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
      return response.data;
    } catch (error) {
      console.error('Error creating user in MySQL:', error);
      throw error;
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    try {
      const response = await apiService.makeRequest(`/api/mysql-service.php?path=users&id=${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      return response.data || null;
    } catch (error) {
      console.error('Error updating user in MySQL:', error);
      return null;
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      await apiService.makeRequest(`/api/mysql-service.php?path=users&id=${id}`, {
        method: 'DELETE'
      });
      return true;
    } catch (error) {
      console.error('Error deleting user from MySQL:', error);
      return false;
    }
  }

  async getUsersByRole(role: User['role']): Promise<User[]> {
    try {
      const users = await this.getUsers();
      return users.filter(u => u.role === role);
    } catch (error) {
      console.error('Error fetching users by role from MySQL:', error);
      return [];
    }
  }

  async getUsersByTeam(team: string): Promise<User[]> {
    try {
      const users = await this.getUsers();
      return users.filter(u => u.team === team);
    } catch (error) {
      console.error('Error fetching users by team from MySQL:', error);
      return [];
    }
  }

  // Polling-based change detection (replaces Firebase real-time listeners)
  onUsersChange(callback: (users: User[]) => void): () => void {
    let intervalId: NodeJS.Timeout;
    
    // Initial load
    this.getUsers().then(callback);
    
    // Poll for changes every 60 seconds
    intervalId = setInterval(async () => {
      try {
        const users = await this.getUsers();
        callback(users);
      } catch (error) {
        console.error('Error polling users changes:', error);
      }
    }, 60000);
    
    // Return unsubscribe function
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }
}

// Export singleton instance
export const mysqlUserService = new MySQLUserService();
export default mysqlUserService;
