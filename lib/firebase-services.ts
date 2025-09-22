// MySQL-based replacement for Firebase services
import { dealsService, DealsService } from './mysql-deals-service';
import { callbacksService, CallbacksService } from './mysql-callbacks-service';
import { notificationService } from './mysql-notifications-service';
import { directMySQLService } from './direct-mysql-service';

// Sales Service (using deals service as base)
class MySQLSalesService {
  async addSale(saleData: any): Promise<string> {
    // Convert sale data to deal format
    const dealData = {
      customer_name: saleData.customer_name,
      email: saleData.email,
      phone_number: saleData.phone,
      country: saleData.country,
      amount_paid: saleData.amount,
      service_tier: saleData.type_service,
      sales_agent: saleData.sales_agent,
      closing_agent: saleData.closing_agent,
      sales_team: saleData.team,
      signup_date: saleData.date,
      duration_months: saleData.duration_months,
      DealID: saleData.DealID,
      SalesAgentID: saleData.SalesAgentID,
      ClosingAgentID: saleData.ClosingAgentID,
      status: 'closed',
      stage: 'closed-won'
    };

    const user = {
      id: saleData.SalesAgentID,
      name: saleData.sales_agent,
      team: saleData.team
    };

    return dealsService.createDeal(dealData, user);
  }

  async getSales(filters?: any): Promise<any[]> {
    const deals = await dealsService.getDeals('manager');
    return deals.filter((deal: any) => deal.status === 'closed' || deal.stage === 'closed-won');
  }
}

// User Service
class MySQLUserService {
  async addUser(userData: any): Promise<string> {
    try {
      const userPayload = {
        name: userData.name,
        email: userData.email,
        role: userData.role,
        team: userData.team,
        SalesAgentID: userData.SalesAgentID,
        ClosingAgentID: userData.ClosingAgentID,
        isActive: userData.isActive !== false
      };

      const response = await directMySQLService.makeDirectRequest('users-api.php', {
        method: 'POST',
        body: JSON.stringify(userPayload)
      });

      return response.id || response.user_id;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<any | null> {
    try {
      const response = await directMySQLService.getUsers({ email });
      const users = Array.isArray(response) ? response : (response.users || []);
      return users.find((user: any) => user.email === email) || null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  }

  async getUsers(filters?: any): Promise<any[]> {
    try {
      const response = await directMySQLService.getUsers(filters || {});
      return Array.isArray(response) ? response : (response.users || []);
    } catch (error) {
      console.error('Error getting users:', error);
      return [];
    }
  }

  async updateUser(id: string, updates: any): Promise<void> {
    try {
      await directMySQLService.makeDirectRequest(`users-api.php?id=${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      await directMySQLService.makeDirectRequest(`users-api.php?id=${id}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
}

// Export services
export const salesService = new MySQLSalesService();
export const userService = new MySQLUserService();
export { notificationService };

// Export for backward compatibility
export default {
  salesService,
  userService,
  notificationService
};
