// Client-side service that calls Next.js API routes (not PHP directly)
import { API_CONFIG } from './config'

export class DirectMySQLService {
  // Force all requests through Next.js API on same origin so they show in Network tab
  // and avoid direct calls to external PHP host.
  private baseUrl = `/api`;

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

  async makeDirectRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}/${endpoint}`;

    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          ...options.headers,
        },
        ...options,
        signal: this.createTimeoutSignal(API_CONFIG.TIMEOUT || 30000),
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
      console.warn(`Direct MySQL ${endpoint} error:`, error);
      throw error;
    }
  }

  // Updated to use unified API to prevent connection issues
  async getDeals(filters: Record<string, string> = {}): Promise<any> {
    try {
      console.log('🔄 DirectMySQLService: Fetching deals via Next.js deals API');
      const queryParams = new URLSearchParams({
        limit: '1000',
        ...filters
      });
      
      const response = await fetch(`${this.baseUrl}/deals?${queryParams.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        signal: this.createTimeoutSignal(API_CONFIG.TIMEOUT || 10000),
      });

      if (!response.ok) {
        throw new Error(`Deals API responded with status: ${response.status}`);
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
      
      const response = await fetch(`/api/callbacks?${params.toString()}`);
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
      console.log('🔄 DirectMySQLService: Fetching targets via unified API');
      const params = new URLSearchParams({
        userRole: 'manager',
        dataTypes: 'targets',
        limit: '1000',
        ...filters
      });
      
      const response = await fetch(`/api/unified-data?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.success ? (result.data.targets || []) : [];
    } catch (error) {
      console.error('❌ DirectMySQLService: Error fetching targets:', error);
      return [];
    }
  }

  async getNotifications(filters: Record<string, string> = {}): Promise<any> {
    try {
      console.log('🔄 DirectMySQLService: Fetching notifications via unified API');
      const params = new URLSearchParams({
        userRole: 'manager',
        dataTypes: 'notifications',
        limit: '1000',
        ...filters
      });
      
      const response = await fetch(`/api/unified-data?${params.toString()}`);
      if (!response.ok) {
        // Try to get more detailed error information
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMessage += ` - ${errorData.message}`;
          }
          console.error('❌ DirectMySQLService: Detailed error:', errorData);
        } catch (parseError) {
          console.error('❌ DirectMySQLService: Could not parse error response');
        }
        
        // If unified-data API fails, try fallback approach
        console.warn('⚠️ DirectMySQLService: Unified API failed, trying fallback...');
        return await this.getNotificationsFallback(filters);
      }
      
      const result = await response.json();
      return result.success ? (result.data.notifications || []) : [];
    } catch (error) {
      console.error('❌ DirectMySQLService: Error fetching notifications:', error);
      console.warn('⚠️ DirectMySQLService: Trying fallback approach...');
      return await this.getNotificationsFallback(filters);
    }
  }

  private async getNotificationsFallback(filters: Record<string, string> = {}): Promise<any> {
    try {
      console.log('🔄 DirectMySQLService: Using fallback notifications approach');
      // Try direct notifications API if it exists
      const response = await fetch('/api/notifications?limit=1000');
      if (response.ok) {
        const result = await response.json();
        return Array.isArray(result) ? result : (result.data || []);
      }
      
      // If all else fails, return empty array
      console.warn('⚠️ DirectMySQLService: All notification fetching methods failed, returning empty array');
      return [];
    } catch (error) {
      console.error('❌ DirectMySQLService: Fallback also failed:', error);
      return [];
    }
  }

  async getUsers(filters: Record<string, string> = {}): Promise<any> {
    try {
      console.log('🔄 DirectMySQLService: Fetching users via unified API');
      const params = new URLSearchParams({
        userRole: 'manager',
        dataTypes: 'users',
        limit: '1000',
        ...filters
      });
      
      const response = await fetch(`/api/unified-data?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.success ? (result.data.users || []) : [];
    } catch (error) {
      console.error('❌ DirectMySQLService: Error fetching users:', error);
      return [];
    }
  }

  // Analytics endpoints
  async getDashboardStats(): Promise<any> {
    return this.makeDirectRequest('analytics-api.php?endpoint=dashboard-stats');
  }

  async getAnalytics(filters: Record<string, string> = {}): Promise<any> {
    const queryParams = new URLSearchParams(filters);
    return this.makeDirectRequest(`analytics-api.php?${queryParams.toString()}`);
  }

  // Create operations
  async createDeal(dealData: any): Promise<any> {
    return this.makeDirectRequest('deals-api.php', {
      method: 'POST',
      body: JSON.stringify(dealData)
    });
  }

  async createCallback(callbackData: any): Promise<any> {
    return this.makeDirectRequest('callbacks-api.php', {
      method: 'POST',
      body: JSON.stringify(callbackData)
    });
  }

  async createNotification(notificationData: any): Promise<any> {
    return this.makeDirectRequest('notifications-api.php', {
      method: 'POST',
      body: JSON.stringify(notificationData)
    });
  }

  // Update operations
  async updateCallback(id: string, callbackData: any): Promise<any> {
    try {
      const response = await fetch('/api/callbacks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, ...callbackData })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('❌ DirectMySQLService: Error updating callback:', error);
      throw error;
    }
  }

  // Delete operations
  async deleteDeal(id: string): Promise<any> {
    try {
      const response = await fetch(`/api/deals?id=${id}`, {
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

  async deleteCallback(id: string): Promise<any> {
    try {
      const response = await fetch(`/api/callbacks?id=${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('❌ DirectMySQLService: Error deleting callback:', error);
      throw error;
    }
  }
}

export const directMySQLService = new DirectMySQLService();
export default directMySQLService;
