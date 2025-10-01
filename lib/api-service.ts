// DIRECT MYSQL API SERVICE - BYPASSES ALL FAILING NEXT.JS ROUTES
import { directMySQLService } from './direct-mysql-service';

// Type definitions - Updated to match database schema
export interface User {
  id: string;
  username?: string;
  name: string;
  email: string;
  role: string;
  team?: string;
  managedTeam?: string;
  password?: string;
  phone?: string;
  created_by?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  // Backward compatibility
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
}

export interface Deal {
  id: string;
  dealId: string;
  customerName: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  email: string;
  phoneNumber: string;
  country: string;
  customCountry?: string;
  amountPaid: number;
  amount_paid?: number;
  amount?: number; // For compatibility
  serviceTier: string;
  service_tier?: string;
  // Legacy/compat fields used by older components
  type_service?: string;
  salesAgentId: string;
  // Compatibility with legacy DB field
  SalesAgentID?: string;
  salesAgentName: string;
  sales_agent?: string; // For compatibility
  salesTeam: string;
  sales_team?: string; // For compatibility
  team?: string; // Legacy team field
  closingAgentId?: string;
  ClosingAgentID?: string; // Database field name
  closingAgentName?: string; // Added missing property
  closing_agent?: string; // For compatibility
  stage: string;
  status: string;
  priority: string;
  signupDate: string;
  signup_date?: string;
  // Additional legacy date field used in some tables
  date?: string;
  endDate?: string;
  end_date?: string;
  durationYears?: number;
  duration_years?: number;
  durationMonths?: number;
  duration_months?: number;
  numberOfUsers?: number;
  number_of_users?: number;
  notes?: string;
  createdBy: string;
  createdById: string;
  // Additional legacy snake_case fields used in MyDealsTable
  phone_number?: string;
  device_key?: string;
  device_id?: string;
  createdAt?: string;
  created_at?: string; // For compatibility
  updatedAt?: string;
  updated_at?: string; // For compatibility
  invoice_link?: string;
}

export interface Callback {
  id: string;
  customerName: string;
  phoneNumber: string;
  email: string;
  salesAgentId: string;
  salesAgentName: string;
  salesTeam: string;
  firstCallDate: string;
  firstCallTime: string;
  scheduledDate: string;
  scheduledTime: string;
  status: 'pending' | 'contacted' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  callbackReason: string;
  callbackNotes?: string;
  followUpRequired: boolean;
  createdBy: string;
  createdById: string;
  createdAt?: string;
  updatedAt?: string;
  convertedToDeal?: boolean; // CamelCase version for compatibility
  converted_to_deal?: boolean; // Snake_case version from database
  created_by_id?: string;
  SalesAgentID?: string;
}

export interface SalesTarget {
  id: string;
  salesAgentId: string;
  salesAgentName: string;
  salesTeam: string;
  targetAmount: number;
  targetDeals: number;
  currentAmount: number;
  currentDeals: number;
  month: string;
  year: number;
  createdAt?: string;
  updatedAt?: string;
  // Additional fields for enhanced targets management
  agentId?: string;
  agentName?: string;
  monthlyTarget?: number;
  dealsTarget?: number;
  period?: string;
  description?: string;
  managerId?: string;
  managerName?: string;
  type?: 'individual' | 'team';
}

export interface TeamTarget {
  id: string;
  teamName: string;
  targetAmount: number;
  targetDeals: number;
  currentAmount: number;
  currentDeals: number;
  month: string;
  year: number;
  managerId: string;
  managerName: string;
  period?: string;
  monthlyTarget?: number;
  dealsTarget?: number;
  teamId?: string;
  members?: string[];
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Notification {
  id: string;
  userId: string;
  userName: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
  updatedAt?: string;
}

// Direct API Service Class
class DirectApiService {
  // Core request handler - routes everything through directMySQLService
  async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    try {
      console.log(`🚀 Direct MySQL API call: ${endpoint}`);
      
      // Parse endpoint to determine routing
      if (endpoint.includes('analytics-api.php')) {
        return this.handleAnalyticsRequest(endpoint, options);
      } else if (endpoint.includes('notifications-api.php') || endpoint.includes('notifications')) {
        return this.handleNotificationsRequest(endpoint, options);
      } else if (endpoint.includes('mysql-service.php')) {
        return this.handleMySQLServiceRequest(endpoint, options);
      } else if (endpoint.includes('deals-api.php') || endpoint.includes('deals')) {
        return this.handleDealsRequest(endpoint, options);
      } else if (endpoint.includes('callbacks-api.php') || endpoint.includes('callbacks')) {
        return this.handleCallbacksRequest(endpoint, options);
      } else if (endpoint.includes('targets')) {
        return this.handleTargetsRequest(endpoint, options);
      } else if (endpoint.includes('users')) {
        return this.handleUsersRequest(endpoint, options);
      }
      
      // Default fallback
      return await directMySQLService.makeDirectRequest(endpoint, options);
    } catch (error) {
      console.error(`❌ Direct API error for ${endpoint}:`, error);
      throw error;
    }
  }

  private async handleAnalyticsRequest(endpoint: string, options: RequestInit): Promise<any> {
    try {
      const url = new URL(`https://vmaxcom.org/api/${endpoint.replace('/api/', '')}`);
      const params = url.searchParams;
      
      if (params.get('endpoint') === 'dashboard-stats') {
        return await directMySQLService.getDashboardStats();
      } else if (params.get('endpoint') === 'callback-kpis') {
        const filters: Record<string, string> = {};
        params.forEach((value, key) => {
          filters[key] = value;
        });
        return await directMySQLService.getAnalytics(filters);
      }
      
      return await directMySQLService.makeDirectRequest(endpoint.replace('/api/', ''), options);
    } catch (error) {
      console.error('Analytics request error:', error);
      return { error: 'Analytics data unavailable', data: {} };
    }
  }

  private async handleNotificationsRequest(endpoint: string, options: RequestInit): Promise<any> {
    try {
      const filters: Record<string, string> = {};
      
      if (endpoint.includes('?')) {
        const url = new URL(`https://vmaxcom.org/api/${endpoint.replace('/api/', '')}`);
        url.searchParams.forEach((value, key) => {
          filters[key] = value;
        });
      }
      
      if (options.method === 'POST') {
        const notificationData = JSON.parse(options.body as string);
        return await directMySQLService.createNotification(notificationData);
      }
      
      return await directMySQLService.getNotifications(filters);
    } catch (error) {
      console.error('Notifications request error:', error);
      return [];
    }
  }

  private async handleMySQLServiceRequest(endpoint: string, options: RequestInit): Promise<any> {
    try {
      const url = new URL(`https://vmaxcom.org/api/${endpoint.replace('/api/', '')}`);
      const path = url.searchParams.get('path');
      const filters: Record<string, string> = {};
      
      url.searchParams.forEach((value, key) => {
        if (key !== 'path') {
          filters[key] = value;
        }
      });

      switch (path) {
        case 'deals':
          return await directMySQLService.getDeals(filters);
        case 'callbacks':
          return await directMySQLService.getCallbacks(filters);
        case 'targets':
          return await directMySQLService.getTargets(filters);
        case 'notifications':
          return await directMySQLService.getNotifications(filters);
        case 'users':
          return await directMySQLService.getUsers(filters);
        default:
          return await directMySQLService.makeDirectRequest(endpoint.replace('/api/', ''), options);
      }
    } catch (error) {
      console.error('MySQL service request error:', error);
      return { deals: [], callbacks: [], targets: [], notifications: [], users: [], total: 0 };
    }
  }

  private async handleDealsRequest(endpoint: string, options: RequestInit): Promise<any> {
    try {
      if (options.method === 'POST') {
        const dealData = JSON.parse(options.body as string);
        return await directMySQLService.createDeal(dealData);
      } else if (options.method === 'PUT') {
        const url = new URL(`https://vmaxcom.org/api/${endpoint.replace('/api/', '')}`);
        const id = url.searchParams.get('id');
        const dealData = JSON.parse(options.body as string);
        return await directMySQLService.updateDeal(id!, dealData);
      } else if (options.method === 'DELETE') {
        const url = new URL(`https://vmaxcom.org/api/${endpoint.replace('/api/', '')}`);
        const id = url.searchParams.get('id');
        return await directMySQLService.deleteDeal(id!);
      }
      
      // GET request
      const filters: Record<string, string> = {};
      if (endpoint.includes('?')) {
        const url = new URL(`https://vmaxcom.org/api/${endpoint.replace('/api/', '')}`);
        url.searchParams.forEach((value, key) => {
          filters[key] = value;
        });
      }
      
      return await directMySQLService.getDeals(filters);
    } catch (error) {
      console.error('Deals request error:', error);
      return [];
    }
  }

  private async handleCallbacksRequest(endpoint: string, options: RequestInit): Promise<any> {
    try {
      if (options.method === 'POST') {
        const callbackData = JSON.parse(options.body as string);
        return await directMySQLService.createCallback(callbackData);
      } else if (options.method === 'PUT') {
        const url = new URL(`https://vmaxcom.org/api/${endpoint.replace('/api/', '')}`);
        const id = url.searchParams.get('id');
        const callbackData = JSON.parse(options.body as string);
        return await directMySQLService.updateCallback(id!, callbackData);
      } else if (options.method === 'DELETE') {
        const url = new URL(`https://vmaxcom.org/api/${endpoint.replace('/api/', '')}`);
        const id = url.searchParams.get('id');
        return await directMySQLService.deleteCallback(id!);
      }
      
      // GET request
      const filters: Record<string, string> = {};
      if (endpoint.includes('?')) {
        const url = new URL(`https://vmaxcom.org/api/${endpoint.replace('/api/', '')}`);
        url.searchParams.forEach((value, key) => {
          filters[key] = value;
        });
      }
      
      return await directMySQLService.getCallbacks(filters);
    } catch (error) {
      console.error('Callbacks request error:', error);
      return [];
    }
  }

  private async handleTargetsRequest(endpoint: string, options: RequestInit): Promise<any> {
    try {
      const filters: Record<string, string> = {};
      if (endpoint.includes('?')) {
        const url = new URL(`https://vmaxcom.org/api/${endpoint.replace('/api/', '')}`);
        url.searchParams.forEach((value, key) => {
          filters[key] = value;
        });
      }
      
      return await directMySQLService.getTargets(filters);
    } catch (error) {
      console.error('Targets request error:', error);
      return [];
    }
  }

  private async handleUsersRequest(endpoint: string, options: RequestInit): Promise<any> {
    try {
      const filters: Record<string, string> = {};
      if (endpoint.includes('?')) {
        const url = new URL(`https://vmaxcom.org/api/${endpoint.replace('/api/', '')}`);
        url.searchParams.forEach((value, key) => {
          filters[key] = value;
        });
      }
      
      return await directMySQLService.getUsers(filters);
    } catch (error) {
      console.error('Users request error:', error);
      return [];
    }
  }

  // Public API methods
  async getUsers(filters: Record<string, string> = {}): Promise<User[]> {
    return await directMySQLService.getUsers(filters);
  }

  async getDeals(filters: Record<string, string> = {}): Promise<Deal[]> {
    return await directMySQLService.getDeals(filters);
  }

  async createDeal(dealData: any): Promise<{ success: boolean; id: string; dealId: string }> {
    return await directMySQLService.createDeal(dealData);
  }

  async updateDeal(id: string, dealData: any): Promise<{ success: boolean }> {
    return await directMySQLService.updateDeal(id, dealData);
  }

  async deleteDeal(id: string): Promise<{ success: boolean }> {
    return await directMySQLService.deleteDeal(id);
  }

  async getCallbacks(filters: Record<string, string> = {}): Promise<Callback[]> {
    return await directMySQLService.getCallbacks(filters);
  }

  async createCallback(callbackData: any): Promise<{ success: boolean; id: string }> {
    return await directMySQLService.createCallback(callbackData);
  }

  async updateCallback(id: string, callbackData: any): Promise<{ success: boolean }> {
    return await directMySQLService.updateCallback(id, callbackData);
  }

  async deleteCallback(id: string): Promise<{ success: boolean }> {
    return await directMySQLService.deleteCallback(id);
  }

  async getSalesTargets(filters: Record<string, string> = {}): Promise<SalesTarget[]> {
    return await directMySQLService.getTargets(filters);
  }

  // Update a target via Next.js targets API
  async updateTarget(id: string, targetData: {
    agentId?: string;
    agentName?: string;
    monthlyTarget?: number;
    dealsTarget?: number;
    period?: string;
    description?: string;
    managerId?: string;
    managerName?: string;
    type?: 'individual' | 'team';
  }): Promise<{ success: boolean }> {
    const res = await fetch('/api/targets', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ id, ...targetData })
    });
    if (!res.ok) {
      throw new Error(`Update target API error: ${res.status} ${res.statusText}`);
    }
    const result = await res.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to update target');
    }
    return { success: true };
  }

  // Create a single (usually individual) target via Next.js targets API
  async createTarget(targetData: {
    type: 'individual' | 'team';
    agentId: string;
    agentName: string;
    monthlyTarget: number;
    dealsTarget: number;
    period: string;
    description?: string;
    managerId: string;
    managerName: string;
  }): Promise<{ success: boolean; id: string }> {
    const res = await fetch('/api/targets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(targetData)
    });
    if (!res.ok) {
      throw new Error(`Create target API error: ${res.status} ${res.statusText}`);
    }
    const result = await res.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to create target');
    }
    return { success: true, id: result.id };
  }

  // Create a team target via Next.js targets API
  async createTeamTarget(teamTargetData: {
    teamId?: string;
    teamName: string;
    monthlyTarget: number;
    dealsTarget: number;
    period: string;
    description?: string;
    managerId: string;
    managerName: string;
    members?: Array<{ id: string; name?: string } | string>;
  }): Promise<{ success: boolean; id: string } & typeof teamTargetData> {
    // Map to /api/targets expected fields
    const payload = {
      agentId: teamTargetData.teamId || `team_${teamTargetData.teamName}`,
      agentName: teamTargetData.teamName,
      managerId: teamTargetData.managerId,
      managerName: teamTargetData.managerName,
      monthlyTarget: teamTargetData.monthlyTarget,
      dealsTarget: teamTargetData.dealsTarget,
      period: teamTargetData.period,
      type: 'team',
      description: teamTargetData.description || null
    };

    const res = await fetch('/api/targets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      throw new Error(`Create team target API error: ${res.status} ${res.statusText}`);
    }
    const result = await res.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to create team target');
    }
    return { success: true, id: result.id, ...teamTargetData };
  }

  // Optionally create individual targets from a team target
  async createIndividualTargetsFromTeamTarget(teamTarget: {
    id: string;
    teamName: string;
    monthlyTarget: number;
    dealsTarget: number;
    period: string;
    description?: string;
    managerId: string;
    managerName: string;
    members?: Array<{ id: string; name?: string } | string>;
  }): Promise<{ success: boolean; created: number }> {
    const members = teamTarget.members || [];
    if (!members.length) return { success: true, created: 0 };

    const perMemberAmount = Math.floor((teamTarget.monthlyTarget || 0) / members.length);
    const perMemberDeals = Math.floor((teamTarget.dealsTarget || 0) / members.length);

    let created = 0;
    for (const m of members) {
      const agentId = typeof m === 'string' ? m : m.id;
      const agentName = typeof m === 'string' ? m : (m.name || m.id);
      const payload = {
        agentId,
        agentName,
        managerId: teamTarget.managerId,
        managerName: teamTarget.managerName,
        monthlyTarget: perMemberAmount,
        dealsTarget: perMemberDeals,
        period: teamTarget.period,
        type: 'individual',
        description: teamTarget.description ? `${teamTarget.description} (from team ${teamTarget.teamName})` : `From team ${teamTarget.teamName}`
      };

      const res = await fetch('/api/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const r = await res.json();
        if (r && r.success) created += 1;
      }
    }
    return { success: true, created };
  }

  async getNotifications(filters: Record<string, string> = {}): Promise<Notification[]> {
    return await directMySQLService.getNotifications(filters);
  }

  async createNotification(notificationData: any): Promise<{ success: boolean; id: string }> {
    return await directMySQLService.createNotification(notificationData);
  }

  async getCompanyAnalytics(filters: Record<string, string> = {}): Promise<any> {
    return await directMySQLService.getDashboardStats();
  }

  async getCallbackAnalytics(filters: Record<string, string> = {}): Promise<any> {
    return await directMySQLService.getAnalytics(filters);
  }

  async getUserById(userId: string): Promise<any> {
    try {
      console.log('🔄 ApiService: Fetching user profile for ID:', userId);
      
      const response = await fetch(`/api/user-profile?user_id=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`User profile API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch user profile');
      }

      console.log('✅ ApiService: User profile fetched successfully');
      return result.data;
    } catch (error) {
      console.error('❌ ApiService: Get user profile error:', error);
      return null;
    }
  }

  async createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; id: string }> {
    try {
      console.log('🔄 ApiService: Creating user:', userData.username);
      
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        throw new Error(`Create user API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create user');
      }

      console.log('✅ ApiService: User created successfully');
      return { success: true, id: result.id };
    } catch (error) {
      console.error('❌ ApiService: Create user error:', error);
      throw error;
    }
  }

  async updateUser(id: string, userData: Partial<User>): Promise<{ success: boolean }> {
    try {
      console.log('🔄 ApiService: Updating user:', id);
      
      const response = await fetch(`/api/users?id=${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        throw new Error(`Update user API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to update user');
      }

      console.log('✅ ApiService: User updated successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ ApiService: Update user error:', error);
      throw error;
    }
  }

  async updateUserProfile(userId: string, updates: any): Promise<boolean> {
    try {
      console.log('🔄 ApiService: Updating user profile for ID:', userId, updates);
      
      const response = await fetch(`/api/user-profile?user_id=${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`Update profile API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to update user profile');
      }

      console.log('✅ ApiService: User profile updated successfully');
      return true;
    } catch (error) {
      console.error('❌ ApiService: Update user profile error:', error);
      throw error;
    }
  }
}

// Manager API Service for compatibility
export class ManagerApiService {
  private directApi = new DirectApiService();

  async getDealsWithPagination(filters: Record<string, any> = {}): Promise<any> {
    return await this.directApi.getDeals(filters);
  }

  async getDealStats(filters: Record<string, any> = {}): Promise<any> {
    return await this.directApi.getCompanyAnalytics(filters);
  }

  async getCallbacksWithPagination(filters: Record<string, any> = {}): Promise<any> {
    return await this.directApi.getCallbacks(filters);
  }

  async getCallbackStats(filters: Record<string, any> = {}): Promise<any> {
    return await this.directApi.getCallbackAnalytics(filters);
  }

  async updateCallbackStatus(callbackId: string, newStatus: string): Promise<any> {
    return await directMySQLService.makeDirectRequest(`callbacks-api.php?id=${callbackId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus })
    });
  }
}

// Export service instances
export const apiService = new DirectApiService();
export const managerApiService = new ManagerApiService();

// Default export
export default apiService;
