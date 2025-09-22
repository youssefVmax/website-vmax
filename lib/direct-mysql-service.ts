// Client-side service that calls Next.js API routes (not PHP directly)
import { API_CONFIG } from './config'

class DirectMySQLService {
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
        signal: this.createTimeoutSignal(API_CONFIG.TIMEOUT || 10000),
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

  // Direct MySQL API calls
  async getDeals(filters: Record<string, string> = {}): Promise<any> {
    const queryParams = new URLSearchParams(filters);
    return this.makeDirectRequest(`mysql-service.php?path=deals&${queryParams.toString()}`);
  }

  async getCallbacks(filters: Record<string, string> = {}): Promise<any> {
    const queryParams = new URLSearchParams(filters);
    return this.makeDirectRequest(`mysql-service.php?path=callbacks&${queryParams.toString()}`);
  }

  async getTargets(filters: Record<string, string> = {}): Promise<any> {
    const queryParams = new URLSearchParams(filters);
    return this.makeDirectRequest(`mysql-service.php?path=targets&${queryParams.toString()}`);
  }

  async getNotifications(filters: Record<string, string> = {}): Promise<any> {
    const queryParams = new URLSearchParams(filters);
    return this.makeDirectRequest(`mysql-service.php?path=notifications&${queryParams.toString()}`);
  }

  async getUsers(filters: Record<string, string> = {}): Promise<any> {
    const queryParams = new URLSearchParams(filters);
    return this.makeDirectRequest(`mysql-service.php?path=users&${queryParams.toString()}`);
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
  async updateDeal(id: string, dealData: any): Promise<any> {
    return this.makeDirectRequest(`deals-api.php?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(dealData)
    });
  }

  async updateCallback(id: string, callbackData: any): Promise<any> {
    return this.makeDirectRequest(`callbacks-api.php?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(callbackData)
    });
  }

  // Delete operations
  async deleteDeal(id: string): Promise<any> {
    return this.makeDirectRequest(`deals-api.php?id=${id}`, {
      method: 'DELETE'
    });
  }

  async deleteCallback(id: string): Promise<any> {
    return this.makeDirectRequest(`callbacks-api.php?id=${id}`, {
      method: 'DELETE'
    });
  }
}

export const directMySQLService = new DirectMySQLService();
export default directMySQLService;
