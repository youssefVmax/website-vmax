// Direct MySQL Connection Service - Bypasses Next.js API routes
class DirectMySQLService {
  private baseUrl = 'http://vmaxcom.org/api';

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
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`MySQL API responded with status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`Direct MySQL ${endpoint} response:`, data);
      
      return data;
    } catch (error) {
      console.error(`Direct MySQL ${endpoint} error:`, error);
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
