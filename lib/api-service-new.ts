// DIRECT MYSQL API SERVICE - BYPASSES ALL FAILING NEXT.JS ROUTES
import { directMySQLService } from './direct-mysql-service';

// Type definitions
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
}

// Export the direct API service instance
export const apiService = new DirectApiService();
export default apiService;
