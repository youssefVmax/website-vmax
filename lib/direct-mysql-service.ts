// Client-side service that calls Next.js API routes (not PHP directly)
import { requestManager } from './request-manager';

class DirectMySQLService {
  // Force all requests through proper domain with HTTPS
  private baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ? 
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api` :
    (typeof window !== 'undefined' && window.location.hostname === 'localhost' 
      ? `http://localhost:3001/api` 
      : `/api`); // Use same-origin in production to avoid CORS issues

  // Create a timeout signal that works across browsers
  private createTimeoutSignal(ms: number): AbortSignal | undefined {
    try {
      // AbortSignal.timeout is available in modern browsers/node, but guard just in case
      // @ts-ignore
      if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
        // @ts-ignore
        return AbortSignal.timeout(ms)
      }
    } catch {}
    // Fallback: manual AbortController
    try {
      const controller = new AbortController()
      const id = setTimeout(() => controller.abort(), ms)
      // Best-effort cleanup when aborted
      controller.signal.addEventListener('abort', () => clearTimeout(id), { once: true })
      return controller.signal
    } catch {
      return undefined
    }
  }

  async createNotification(notificationData: any): Promise<any> {
    try {
      console.log('🔄 DirectMySQLService: Creating notification via notifications API');
      const response = await requestManager.fetch(`${this.baseUrl}/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(notificationData)
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('❌ DirectMySQLService: Error creating notification:', error);
      throw error;
    }
  }

  async makeDirectRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}/${endpoint}`;

    try {
      const response = await requestManager.fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          ...options.headers,
        },
        ...options,
        // Timeout is handled by requestManager
      });

      if (!response.ok) {
        throw new Error(`MySQL API responded with status: ${response.status}`);
      }

      const data = await response.json();
      // Reduce noisy logs in production; keep in dev for visibility
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Direct MySQL ${endpoint} response:`, data);
      }
      return data;
    } catch (error) {
      // Avoid error overlay spam; warn instead, and include endpoint for context
      throw error;
    }
  }

  // Updated to use unified API to prevent connection issues
  async getDeals(filters: Record<string, string> = {}, userContext?: { userRole?: string; userId?: string; managedTeam?: string }): Promise<any> {
    try {
      console.log('🔄 DirectMySQLService: Fetching deals via Next.js deals API');
      
      // Build query parameters including user context for role-based filtering
      const queryParams = new URLSearchParams({
        limit: '1000',
        ...filters
      });
      
      // Add user context for role-based filtering
      if (userContext?.userRole) queryParams.set('userRole', userContext.userRole);
      if (userContext?.userId) queryParams.set('userId', userContext.userId);
      if (userContext?.managedTeam) queryParams.set('managedTeam', userContext.managedTeam);
      
      console.log('🔒 Fetching deals with role context:', { userContext, filters });
      
      const response = await requestManager.fetch(`${this.baseUrl}/deals?${queryParams.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ DirectMySQLService: Deals API response:', result);
      return result.success ? (result.deals || []) : [];
    } catch (error) {
      console.error('❌ DirectMySQLService: Error fetching deals:', error);
      return [];
    }
  }

  async getCallbacks(filters: Record<string, string> = {}): Promise<any> {
    try {
      console.log('🔄 DirectMySQLService: Fetching callbacks via callbacks API');
      
      // Use direct callbacks API for better role-based filtering
      const params = new URLSearchParams({
        limit: '1000',
        ...filters
      });
      
      // Use direct fetch instead of requestManager to avoid caching issues
      const response = await fetch(`${this.baseUrl}/callbacks?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.success ? (result.callbacks || []) : [];
    } catch (error) {
      console.error('❌ DirectMySQLService: Error fetching callbacks:', error);
      return [];
    }
  }

  async getTargets(filters: Record<string, string> = {}): Promise<any> {
    try {
      console.log('🔄 DirectMySQLService: Fetching targets via targets API');
      const params = new URLSearchParams({
        limit: '1000',
        ...filters
      });
      
      const response = await requestManager.fetch(`${this.baseUrl}/targets?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.success ? (result.targets || []) : [];
    } catch (error) {
      console.error('❌ DirectMySQLService: Error fetching targets:', error);
      return [];
    }
  }

  private async getNotificationsFromAPI(filters: Record<string, string> = {}): Promise<any[]> {
    try {
      console.log('🔄 DirectMySQLService: Fetching notifications via notifications API');
      const params = new URLSearchParams({
        limit: '100',
        ...filters,
      });
      
      const response = await fetch(`${this.baseUrl}/notifications?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.error('❌ DirectMySQLService: notifications API error', response.status, response.statusText);
        return [];
      }
      
      const result = await response.json();
      console.log('✅ DirectMySQLService: Notifications fetched successfully');
      
      // Next.js notifications route returns { notifications: [...], total, ... }
      if (Array.isArray(result)) return result;
      if (Array.isArray(result.notifications)) return result.notifications;
      return [];
    } catch (error) {
      console.error('❌ DirectMySQLService: Error fetching notifications:', error);
      return [];
    }
  }

  async getNotifications(filters: Record<string, string> = {}): Promise<any[]> {
    return this.getNotificationsFromAPI(filters);
  }

  async getUsers(filters: Record<string, string> = {}): Promise<any> {
    try {
      console.log('🔄 DirectMySQLService: Fetching users via users API');
      const params = new URLSearchParams({
        limit: '1000',
        ...filters
      });

      const response = await fetch(`${this.baseUrl}/users?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        console.error('❌ DirectMySQLService: Users API error:', errorMessage);
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ DirectMySQLService: Users fetched successfully:', result.users?.length || 0, 'users');
      return result.success ? (result.users || []) : [];
    } catch (error) {
      console.error('❌ DirectMySQLService: Error fetching users:', error);
      return [];
    }
  }

  // Analytics endpoints - Updated to use Next.js API
  async getDashboardStats(): Promise<any> {
    try {
      console.log('🔄 DirectMySQLService: Fetching dashboard stats via Next.js analytics API');

      // Use Next.js analytics API instead of PHP
      const response = await fetch(`${this.baseUrl}/analytics`, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ DirectMySQLService: Dashboard stats fetched successfully');
      return result;
    } catch (error) {
      console.error('❌ DirectMySQLService: Error fetching dashboard stats:', error);
      return {};
    }
  }

  async getAnalytics(filters: Record<string, string> = {}): Promise<any> {
    try {
      console.log('🔄 DirectMySQLService: Fetching analytics via Next.js analytics API');
      const params = new URLSearchParams({
        userRole: 'manager',
        dateRange: 'today',
        ...filters
      });

      // Use Next.js analytics API instead of PHP
      const response = await fetch(`${this.baseUrl}/analytics?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ DirectMySQLService: Analytics fetched successfully');
      return result;
    } catch (error) {
      console.error('❌ DirectMySQLService: Error fetching analytics:', error);
      return {};
    }
  }

  // Create operations - Updated to use Next.js APIs
  async createDeal(dealData: any): Promise<any> {
    try {
      console.log('🔄 DirectMySQLService: Creating deal via deals API');
      console.log('🔍 Deal data being sent:', dealData);
      
      const response = await requestManager.fetch(`${this.baseUrl}/deals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dealData)
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('❌ DirectMySQLService: Error creating deal:', error);
      throw error;
    }
  }

  async updateDeal(id: string, dealData: any): Promise<any> {
    try {
      console.log('🔄 DirectMySQLService: Updating deal via deals API');
      console.log('🔍 Deal data being sent:', dealData);
      
      const response = await requestManager.fetch(`${this.baseUrl}/deals?id=${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id, ...dealData })
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('❌ DirectMySQLService: Error updating deal:', error);
      throw error;
    }
  }

  async createCallback(callbackData: any): Promise<any> {
    try {
      console.log('🔄 DirectMySQLService: Creating callback via callbacks API');
      const response = await requestManager.fetch('/api/callbacks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(callbackData)
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('❌ DirectMySQLService: Error creating callback:', error);
      throw error;
    }
  }

  async updateCallback(id: string, callbackData: any, userContext?: { userRole?: string; userId?: string; managedTeam?: string }): Promise<any> {
    try {
      console.log('🔄 DirectMySQLService: Updating callback via callbacks API');
      
      // Build query parameters for role-based permissions
      const queryParams = new URLSearchParams();
      if (userContext?.userRole) queryParams.set('userRole', userContext.userRole);
      if (userContext?.userId) queryParams.set('userId', userContext.userId);
      if (userContext?.managedTeam) queryParams.set('managedTeam', userContext.managedTeam);
      
      const queryString = queryParams.toString();
      const url = `${this.baseUrl}/callbacks${queryString ? `?${queryString}` : ''}`;
      
      console.log('🔒 Update callback with role context:', { 
        url, 
        userContext, 
        baseUrl: this.baseUrl,
        environment: {
          hostname: typeof window !== 'undefined' ? window.location.hostname : 'server',
          NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL
        }
      });
      
      const response = await requestManager.fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        // Include role information in body as well for API compatibility
        body: JSON.stringify({ 
          id, 
          ...callbackData,
          ...(userContext || {})
        })
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Update callback failed:', { status: response.status, statusText: response.statusText, body: errorText });
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('❌ DirectMySQLService: Error updating callback:', error);
      throw error;
    }
  }


  // Delete operations - Updated to use request manager
  async deleteDeal(id: string): Promise<any> {
    try {
      console.log('🔄 DirectMySQLService: Deleting deal via deals API');
      const response = await requestManager.fetch(`${this.baseUrl}/deals?id=${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('❌ DirectMySQLService: Error deleting deal:', error);
      throw error;
    }
  }

  async deleteCallback(id: string, userContext?: { userRole?: string; userId?: string; managedTeam?: string }): Promise<any> {
    try {
      console.log('🔄 DirectMySQLService: Deleting callback via callbacks API');
      
      // Build query parameters for role-based permissions
      const queryParams = new URLSearchParams();
      queryParams.set('id', id);
      if (userContext?.userRole) queryParams.set('userRole', userContext.userRole);
      if (userContext?.userId) queryParams.set('userId', userContext.userId);
      if (userContext?.managedTeam) queryParams.set('managedTeam', userContext.managedTeam);
      
      const url = `${this.baseUrl}/callbacks?${queryParams.toString()}`;
      console.log('🔒 Delete callback with role context:', { url, userContext, baseUrl: this.baseUrl });
      
      const response = await requestManager.fetch(url, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Delete callback failed:', { status: response.status, statusText: response.statusText, body: errorText });
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('❌ DirectMySQLService: Error deleting callback:', error);
      throw error;
    }
  }
}

const directMySQLService = new DirectMySQLService();
export default directMySQLService;
