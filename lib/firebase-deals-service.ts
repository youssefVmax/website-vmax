// MySQL Deals Service - replaces Firebase with MySQL database calls
import { apiService } from './api-service';

export interface Deal {
  id: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  amount: number;
  status: 'active' | 'closed' | 'cancelled';
  sales_agent: string;
  service?: string;
  program?: string;
  created_at: string;
  updated_at: string;
  country?: string;
  invoice_link?: string;
}

class MySQLDealsService {
  async getDeals(): Promise<Deal[]> {
    try {
      const response = await apiService.makeRequest('/api/mysql-service.php?path=deals');
      return response.deals || [];
    } catch (error) {
      console.error('Error fetching deals from MySQL:', error);
      return [];
    }
  }

  async getDealById(id: string): Promise<Deal | null> {
    try {
      const deals = await this.getDeals();
      return deals.find(d => d.id === id) || null;
    } catch (error) {
      console.error('Error fetching deal by ID from MySQL:', error);
      return null;
    }
  }

  async createDeal(dealData: Omit<Deal, 'id' | 'created_at' | 'updated_at'>): Promise<Deal> {
    try {
      const response = await apiService.makeRequest('/api/mysql-service.php?path=deals', {
        method: 'POST',
        body: JSON.stringify(dealData)
      });
      return response.data;
    } catch (error) {
      console.error('Error creating deal in MySQL:', error);
      throw error;
    }
  }

  async updateDeal(id: string, updates: Partial<Deal>): Promise<Deal | null> {
    try {
      const response = await apiService.makeRequest(`/api/mysql-service.php?path=deals&id=${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      return response.data || null;
    } catch (error) {
      console.error('Error updating deal in MySQL:', error);
      return null;
    }
  }

  async deleteDeal(id: string): Promise<boolean> {
    try {
      await apiService.makeRequest(`/api/mysql-service.php?path=deals&id=${id}`, {
        method: 'DELETE'
      });
      return true;
    } catch (error) {
      console.error('Error deleting deal from MySQL:', error);
      return false;
    }
  }

  // Polling-based change detection (replaces Firebase real-time listeners)
  onDealsChange(callback: (deals: Deal[]) => void): () => void {
    let intervalId: NodeJS.Timeout;
    
    // Initial load
    this.getDeals().then(callback);
    
    // Poll for changes every 30 seconds
    intervalId = setInterval(async () => {
      try {
        const deals = await this.getDeals();
        callback(deals);
      } catch (error) {
        console.error('Error polling deals changes:', error);
      }
    }, 30000);
    
    // Return unsubscribe function
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }
}

// Export singleton instance
export const mysqlDealsService = new MySQLDealsService();
export default mysqlDealsService;
