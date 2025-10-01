import directMySQLService from './direct-mysql-service';

// Direct MySQL API Service - Bypasses ALL failing Next.js routes
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  team?: string;
  createdAt?: string;
  updatedAt?: string;
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
  serviceTier: string;
  service_tier?: string;
  salesAgentId: string;
  salesAgentName: string;
  salesTeam: string;
  stage: string;
  status: string;
  priority: string;
  signupDate: string;
  signup_date?: string;
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
  createdAt?: string;
  updatedAt?: string;
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
  status: 'pending' | 'contacted' | 'completed';
  priority: 'low' | 'medium' | 'high';
  callbackReason: string;
  callbackNotes?: string;
  followUpRequired: boolean;
  createdBy: string;
  createdById: string;
  createdAt?: string;
  updatedAt?: string;
  converted_to_deal?: boolean;
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

class DirectApiService {
  // Direct MySQL connection - bypasses all Next.js routes
  async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    try {
      console.log(`Direct API call to: ${endpoint}`);
      
      // Route all requests through directMySQLService
      if (endpoint.includes('analytics-api.php')) {
        return this.handleAnalyticsRequest(endpoint, options);
      } else if (endpoint.includes('notifications-api.php')) {
        return this.handleNotificationsRequest(endpoint, options);
      } else if (endpoint.includes('mysql-service.php')) {
        return this.handleMySQLServiceRequest(endpoint, options);
      } else if (endpoint.includes('deals-api.php')) {
        return this.handleDealsRequest(endpoint, options);
      } else if (endpoint.includes('callbacks-api.php')) {
        return this.handleCallbacksRequest(endpoint, options);
      }
      
      // Default fallback to directMySQLService
      return await directMySQLService.makeDirectRequest(endpoint, options);
    } catch (error) {
      console.error(`Direct API error for ${endpoint}:`, error);
      throw error;
    }
  }

  private async handleAnalyticsRequest(endpoint: string, options: RequestInit): Promise<any> {
    const url = new URL(`http://vmaxcom.org/api/${endpoint}`);
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
    
    return await directMySQLService.makeDirectRequest(endpoint, options);
  }

  private async handleNotificationsRequest(endpoint: string, options: RequestInit): Promise<any> {
    const filters: Record<string, string> = {};
    const url = new URL(`https://vmaxcom.org/api/${endpoint}`);
    url.searchParams.forEach((value, key) => {
      filters[key] = value;
    });
    
    return await directMySQLService.getNotifications(filters);
  }

  private async handleMySQLServiceRequest(endpoint: string, options: RequestInit): Promise<any> {
    const url = new URL(`https://vmaxcom.org/api/${endpoint}`);
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
        return await directMySQLService.makeDirectRequest(endpoint, options);
    }
  }

  private async handleDealsRequest(endpoint: string, options: RequestInit): Promise<any> {
    if (options.method === 'POST') {
      const dealData = JSON.parse(options.body as string);
      return await directMySQLService.createDeal(dealData);
    } else if (options.method === 'PUT') {
      const url = new URL(`https://vmaxcom.org/api/${endpoint}`);
      const id = url.searchParams.get('id');
      const dealData = JSON.parse(options.body as string);
      return await directMySQLService.updateDeal(id!, dealData);
    } else if (options.method === 'DELETE') {
      const url = new URL(`https://vmaxcom.org/api/${endpoint}`);
      const id = url.searchParams.get('id');
      return await directMySQLService.deleteDeal(id!);
    }
    
    return await directMySQLService.makeDirectRequest(endpoint, options);
  }

  private async handleCallbacksRequest(endpoint: string, options: RequestInit): Promise<any> {
    if (options.method === 'POST') {
      const callbackData = JSON.parse(options.body as string);
      return await directMySQLService.createCallback(callbackData);
    } else if (options.method === 'PUT') {
      const url = new URL(`https://vmaxcom.org/api/${endpoint}`);
      const id = url.searchParams.get('id');
      const callbackData = JSON.parse(options.body as string);
      return await directMySQLService.updateCallback(id!, callbackData);
    } else if (options.method === 'DELETE') {
      const url = new URL(`https://vmaxcom.org/api/${endpoint}`);
      const id = url.searchParams.get('id');
      return await directMySQLService.deleteCallback(id!);
    }
    
    return await directMySQLService.makeDirectRequest(endpoint, options);
  }

  // Users API
  async getUsers(filters: Record<string, string> = {}): Promise<User[]> {
    return await directMySQLService.getUsers(filters);
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; id: string }> {
    return await directMySQLService.makeDirectRequest('users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id: string, userData: Partial<User>): Promise<{ success: boolean }> {
    return await directMySQLService.makeDirectRequest(`users?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  // Deals API
  async getDeals(filters: Record<string, string> = {}): Promise<Deal[]> {
    return await directMySQLService.getDeals(filters);
  }

  async createDeal(dealData: Omit<Deal, 'id' | 'createdAt' | 'updatedAt' | 'dealId'>): Promise<{ success: boolean; id: string; dealId: string }> {
    return await directMySQLService.createDeal(dealData);
  }

  async updateDeal(id: string, dealData: Partial<Deal>): Promise<{ success: boolean }> {
    return await directMySQLService.updateDeal(id, dealData);
  }

  async deleteDeal(id: string): Promise<{ success: boolean }> {
    return await directMySQLService.deleteDeal(id);
  }

  // Callbacks API
  async getCallbacks(filters: Record<string, string> = {}): Promise<Callback[]> {
    return await directMySQLService.getCallbacks(filters);
  }

  async createCallback(callbackData: Omit<Callback, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; id: string }> {
    return await directMySQLService.createCallback(callbackData);
  }

  async updateCallback(id: string, callbackData: Partial<Callback>): Promise<{ success: boolean }> {
    return await directMySQLService.updateCallback(id, callbackData);
  }

  async deleteCallback(id: string): Promise<{ success: boolean }> {
    return await directMySQLService.deleteCallback(id);
  }

  // Sales Targets API
  async getSalesTargets(filters: Record<string, string> = {}): Promise<SalesTarget[]> {
    return await directMySQLService.getTargets(filters);
  }

  async createSalesTarget(targetData: Omit<SalesTarget, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; id: string }> {
    return await directMySQLService.makeDirectRequest('targets', {
      method: 'POST',
      body: JSON.stringify(targetData),
    });
  }

  async updateSalesTarget(id: string, targetData: Partial<SalesTarget>): Promise<{ success: boolean }> {
    return await directMySQLService.makeDirectRequest(`targets?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(targetData),
    });
  }

  async deleteSalesTarget(id: string): Promise<{ success: boolean }> {
    return await directMySQLService.makeDirectRequest(`targets?id=${id}`, {
      method: 'DELETE',
    });
  }

  // Notifications API
  async getNotifications(filters: Record<string, string> = {}): Promise<Notification[]> {
    return await directMySQLService.getNotifications(filters);
  }

  async createNotification(notificationData: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; id: string }> {
    return await directMySQLService.createNotification(notificationData);
  }

  async markNotificationAsRead(id: string): Promise<{ success: boolean }> {
    return await directMySQLService.makeDirectRequest(`notifications?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify({ read: true }),
    });
  }

  async deleteNotification(id: string): Promise<{ success: boolean }> {
    return await directMySQLService.makeDirectRequest(`notifications?id=${id}`, {
      method: 'DELETE',
    });
  }

  // Analytics API
  async getCompanyAnalytics(filters: Record<string, string> = {}): Promise<any> {
    return await directMySQLService.getDashboardStats();
  }

  async getCallbackAnalytics(filters: Record<string, string> = {}): Promise<any> {
    return await directMySQLService.getAnalytics(filters);
  }
}

// Export the direct API service instance
export const apiService = new DirectApiService();
export default apiService;

// Export types for compatibility
// All types are exported as interfaces above
