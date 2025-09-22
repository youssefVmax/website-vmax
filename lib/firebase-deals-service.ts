// MySQL-based replacement for Firebase deals service
import { dealsService, DealsService } from './mysql-deals-service';
import { Deal as ApiDeal } from './api-service';

// Export Deal interface for compatibility
export interface Deal extends ApiDeal {
  // Additional fields for backward compatibility
  DealID?: string;
  phone_number?: string;
  sales_agent?: string;
  closing_agent?: string;
  sales_team?: string;
}

class FirebaseDealsService {
  // Firebase-compatible method names
  async getAllDeals(): Promise<Deal[]> {
    return dealsService.getDeals('manager');
  }

  async getDealsForUser(userId: string, userRole: string = 'salesman'): Promise<Deal[]> {
    return dealsService.getDeals(userRole, userId);
  }

  // Firebase-style listener with different signature
  onDealsUpdate(callback: (deals: Deal[]) => void, userRole: string = 'manager', userId?: string): () => void {
    return dealsService.onDealsChange(callback, userRole, userId);
  }

  async getDealById(id: string): Promise<Deal | null> {
    return dealsService.getDealById(id);
  }

  // Delegate other methods to MySQL service
  async createDeal(dealData: any, user: any): Promise<string> {
    return dealsService.createDeal(dealData, user);
  }

  async updateDeal(id: string, updates: Partial<Deal>): Promise<void> {
    return dealsService.updateDeal(id, updates);
  }

  async deleteDeal(id: string): Promise<void> {
    return dealsService.deleteDeal(id);
  }

  async getDealsByAgent(agentId: string): Promise<Deal[]> {
    return dealsService.getDealsByAgent(agentId);
  }

  async getDealsByTeam(team: string): Promise<Deal[]> {
    return dealsService.getDealsByTeam(team);
  }
}

// Export the MySQL service with Firebase-compatible interface
export { dealsService };

// Export default instance
export default new FirebaseDealsService();
