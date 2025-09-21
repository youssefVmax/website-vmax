// API Service for MySQL Backend
const API_BASE_URL = '/api/mysql-service.php';

// Manager API Service for direct MySQL access
export class ManagerApiService {
  // Deals API
  async getDealsWithPagination(filters: Record<string, any> = {}): Promise<any> {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    const response = await fetch(`/api/deals-api.php?${queryParams}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  async getDealStats(filters: Record<string, any> = {}): Promise<any> {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && key !== 'page' && key !== 'limit') {
        queryParams.append(key, value.toString());
      }
    });

    const response = await fetch(`/api/deals-api.php?action=stats&${queryParams}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // Callbacks API
  async getCallbacksWithPagination(filters: Record<string, any> = {}): Promise<any> {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    const response = await fetch(`/api/callbacks-api.php?${queryParams}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  async getCallbackStats(filters: Record<string, any> = {}): Promise<any> {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && key !== 'page' && key !== 'limit') {
        queryParams.append(key, value.toString());
      }
    });

    const response = await fetch(`/api/callbacks-api.php?action=stats&${queryParams}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  async updateCallbackStatus(callbackId: string, status: string): Promise<any> {
    const response = await fetch('/api/callbacks-api.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: callbackId,
        status: status
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }
}

export const managerApiService = new ManagerApiService();

export interface User {
  id: string;
  username: string;
  email: string;
  password?: string;
  name: string;
  phone: string;
  role: 'manager' | 'team-leader' | 'salesman';
  team: string;
  managedTeam?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Deal {
  id: string;
  dealId: string;
  customerName: string;
  email?: string;
  phoneNumber?: string;
  country?: string;
  customCountry?: string;
  amountPaid: number;
  serviceTier: 'Silver' | 'Gold' | 'Premium';
  salesAgentId: string;
  salesAgentName?: string;
  closingAgentId?: string;
  closingAgentName?: string;
  salesTeam?: string;
  stage: 'prospect' | 'qualified' | 'proposal' | 'negotiation' | 'closed-won' | 'closed-lost';
  status: 'active' | 'inactive' | 'pending';
  priority: 'low' | 'medium' | 'high';
  signupDate: string;
  endDate?: string;
  durationYears?: number;
  durationMonths?: number;
  numberOfUsers?: number;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Callback {
  id: string;
  customerName: string;
  phoneNumber: string;
  email?: string;
  salesAgentId: string;
  salesAgentName: string;
  salesTeam?: string;
  firstCallDate: string;
  firstCallTime?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  status: 'pending' | 'contacted' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  callbackReason?: string;
  callbackNotes?: string;
  followUpRequired: boolean;
  createdBy: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalesTarget {
  id: string;
  agentId: string;
  agentName: string;
  managerId: string;
  managerName: string;
  period: string;
  monthlyTarget: number;
  dealsTarget: number;
  type: 'individual' | 'team';
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsData {
  deals: {
    totalDeals: number;
    totalRevenue: number;
  };
  callbacks: Array<{
    status: string;
    count: number;
  }>;
}

class ApiService {
  public async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${API_BASE_URL}?path=${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Users API
  async getUsers(filters: Record<string, string> = {}): Promise<User[]> {
    const queryParams = new URLSearchParams(filters);
    return this.makeRequest(`users&${queryParams.toString()}`);
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; id: string }> {
    return this.makeRequest('users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id: string, userData: Partial<User>): Promise<{ success: boolean }> {
    return this.makeRequest(`users&id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  // Deals API
  async getDeals(filters: Record<string, string> = {}): Promise<Deal[]> {
    const queryParams = new URLSearchParams(filters);
    return this.makeRequest(`deals&${queryParams.toString()}`);
  }

  async createDeal(dealData: Omit<Deal, 'id' | 'dealId' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; id: string; dealId: string }> {
    return this.makeRequest('deals', {
      method: 'POST',
      body: JSON.stringify(dealData),
    });
  }

  async updateDeal(id: string, dealData: Partial<Deal>): Promise<{ success: boolean }> {
    return this.makeRequest(`deals&id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(dealData),
    });
  }

  async deleteDeal(id: string): Promise<{ success: boolean }> {
    return this.makeRequest(`deals&id=${id}`, {
      method: 'DELETE',
    });
  }

  // Callbacks API
  async getCallbacks(filters: Record<string, string> = {}): Promise<Callback[]> {
    const queryParams = new URLSearchParams(filters);
    return this.makeRequest(`callbacks&${queryParams.toString()}`);
  }

  async createCallback(callbackData: Omit<Callback, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; id: string }> {
    return this.makeRequest('callbacks', {
      method: 'POST',
      body: JSON.stringify(callbackData),
    });
  }

  async updateCallback(id: string, callbackData: Partial<Callback>): Promise<{ success: boolean }> {
    return this.makeRequest(`callbacks&id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(callbackData),
    });
  }

  async deleteCallback(id: string): Promise<{ success: boolean }> {
    return this.makeRequest(`callbacks&id=${id}`, {
      method: 'DELETE',
    });
  }

  // Sales Targets API
  async getSalesTargets(filters: Record<string, string> = {}): Promise<SalesTarget[]> {
    const queryParams = new URLSearchParams(filters);
    return this.makeRequest(`targets&${queryParams.toString()}`);
  }

  async createSalesTarget(targetData: Omit<SalesTarget, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; id: string }> {
    return this.makeRequest('targets', {
      method: 'POST',
      body: JSON.stringify(targetData),
    });
  }

  async updateSalesTarget(id: string, targetData: Partial<SalesTarget>): Promise<{ success: boolean }> {
    return this.makeRequest(`targets&id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(targetData),
    });
  }

  async deleteSalesTarget(id: string): Promise<{ success: boolean }> {
    return this.makeRequest(`targets&id=${id}`, {
      method: 'DELETE',
    });
  }

  // Analytics API
  async getAnalytics(filters: Record<string, string> = {}): Promise<AnalyticsData> {
    const queryParams = new URLSearchParams(filters);
    return this.makeRequest(`analytics&${queryParams.toString()}`);
  }

  // Notifications API
  async getNotifications(filters: Record<string, string> = {}): Promise<any[]> {
    const queryParams = new URLSearchParams(filters);
    return this.makeRequest(`notifications&${queryParams.toString()}`);
  }

  async createNotification(notificationData: any): Promise<{ success: boolean; id: string }> {
    return this.makeRequest('notifications', {
      method: 'POST',
      body: JSON.stringify(notificationData),
    });
  }

  async updateNotification(id: string, notificationData: any): Promise<{ success: boolean }> {
    return this.makeRequest(`notifications&id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(notificationData),
    });
  }

  // Targets API
  async createTarget(targetData: any): Promise<{ success: boolean; id: string }> {
    return this.makeRequest('targets', {
      method: 'POST',
      body: JSON.stringify(targetData),
    });
  }

  async createTeamTarget(teamTargetData: any): Promise<{ success: boolean; id: string }> {
    return this.makeRequest('team-targets', {
      method: 'POST',
      body: JSON.stringify(teamTargetData),
    });
  }

  async createIndividualTargetsFromTeamTarget(teamTarget: any): Promise<{ success: boolean }> {
    return this.makeRequest('distribute-team-target', {
      method: 'POST',
      body: JSON.stringify(teamTarget),
    });
  }

  // Utility methods for analytics
  async getUserPerformance(userId: string, period?: string): Promise<any> {
    const filters: Record<string, string> = { salesAgentId: userId };
    if (period) filters.period = period;
    
    const deals = await this.getDeals(filters);
    const targets = await this.getSalesTargets({ agentId: userId, period: period || 'September 2025' });
    
    const totalRevenue = deals.reduce((sum, deal) => sum + deal.amountPaid, 0);
    const totalDeals = deals.length;
    const closedWonDeals = deals.filter(deal => deal.stage === 'closed-won').length;
    
    const target = targets[0];
    const targetAchievement = target ? (totalRevenue / target.monthlyTarget) * 100 : 0;
    const dealsTargetAchievement = target ? (totalDeals / target.dealsTarget) * 100 : 0;
    
    return {
      totalRevenue,
      totalDeals,
      closedWonDeals,
      targetAchievement,
      dealsTargetAchievement,
      target,
      deals
    };
  }

  async getTeamAnalytics(team: string, period?: string): Promise<any> {
    const filters: Record<string, string> = { salesTeam: team };
    if (period) filters.period = period;
    
    const deals = await this.getDeals(filters);
    const users = await this.getUsers({ team });
    
    const teamRevenue = deals.reduce((sum, deal) => sum + deal.amountPaid, 0);
    const teamDeals = deals.length;
    
    const userPerformances = await Promise.all(
      users.map(user => this.getUserPerformance(user.id, period))
    );
    
    return {
      teamRevenue,
      teamDeals,
      teamMembers: users.length,
      userPerformances,
      deals
    };
  }

  async getCompanyAnalytics(period?: string): Promise<any> {
    const deals = await this.getDeals();
    const users = await this.getUsers();
    const callbacks = await this.getCallbacks();
    
    const totalRevenue = deals.reduce((sum, deal) => sum + deal.amountPaid, 0);
    const totalDeals = deals.length;
    const activeUsers = users.filter(user => user.isActive).length;
    const pendingCallbacks = callbacks.filter(callback => callback.status === 'pending').length;
    
    // Group deals by team
    const teamStats = deals.reduce((acc, deal) => {
      const team = deal.salesTeam || 'Unknown';
      if (!acc[team]) {
        acc[team] = { revenue: 0, deals: 0 };
      }
      acc[team].revenue += deal.amountPaid;
      acc[team].deals += 1;
      return acc;
    }, {} as Record<string, { revenue: number; deals: number }>);
    
    return {
      totalRevenue,
      totalDeals,
      activeUsers,
      pendingCallbacks,
      teamStats,
      deals,
      users,
      callbacks
    };
  }
}

export const apiService = new ApiService();
export default apiService;
