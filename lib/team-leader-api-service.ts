/**
 * Team Leader API Service - Connects frontend to team leader specific APIs
 * Provides methods for fetching analytics, data, and updating personal items
 */

export interface TeamLeaderAnalytics {
  team: {
    analytics: {
      totalDeals: number;
      totalRevenue: number;
      avgDealSize: number;
      uniqueAgents: number;
      completedDeals: number;
      pendingDeals: number;
      totalCallbacks: number;
      pendingCallbacks: number;
      contactedCallbacks: number;
      completedCallbacks: number;
      cancelledCallbacks: number;
      conversionRate: number;
    };
    deals: any[];
    callbacks: any[];
    members: any[];
  };
  personal: {
    analytics: {
      totalDeals: number;
      totalRevenue: number;
      avgDealSize: number;
      completedDeals: number;
      pendingDeals: number;
      totalCallbacks: number;
      pendingCallbacks: number;
      contactedCallbacks: number;
      completedCallbacks: number;
      cancelledCallbacks: number;
      conversionRate: number;
    };
    deals: any[];
    callbacks: any[];
  };
  summary: {
    teamName: string;
    totalTeamRevenue: number;
    totalTeamDeals: number;
    personalContribution: {
      revenuePercentage: number;
      dealsPercentage: number;
    };
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: {
    dataType: string;
    search: string;
    status: string;
    sortBy: string;
    sortOrder: string;
  };
}

export interface TeamLeaderDataFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export class TeamLeaderApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://your-domain.com' 
      : 'http://localhost:3000';
  }

  /**
   * Get comprehensive analytics for team leader (team + personal)
   */
  async getAnalytics(
    userId: string, 
    managedTeam: string, 
    dateRange: string = 'all',
    endpoint: string = 'full-analytics'
  ): Promise<TeamLeaderAnalytics> {
    try {
      const params = new URLSearchParams({
        user_id: userId,
        managed_team: managedTeam,
        date_range: dateRange,
        endpoint
      });

      console.log('🔄 TeamLeaderApiService: Fetching analytics...', { userId, managedTeam, dateRange });

      const response = await fetch(`/api/team-leader-analytics?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`Analytics API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch analytics');
      }

      console.log('✅ TeamLeaderApiService: Analytics fetched successfully');
      return result.data;
    } catch (error) {
      console.error('❌ TeamLeaderApiService: Analytics error:', error);
      throw error;
    }
  }

  /**
   * Get team analytics only
   */
  async getTeamAnalytics(userId: string, managedTeam: string, dateRange: string = 'all') {
    return this.getAnalytics(userId, managedTeam, dateRange, 'team-only');
  }

  /**
   * Get personal analytics only
   */
  async getPersonalAnalytics(userId: string, managedTeam: string, dateRange: string = 'all') {
    return this.getAnalytics(userId, managedTeam, dateRange, 'personal-only');
  }

  /**
   * Get paginated team deals (read-only)
   */
  async getTeamDeals(
    userId: string, 
    managedTeam: string, 
    filters: TeamLeaderDataFilters = {}
  ): Promise<PaginatedResponse<any>> {
    return this.getData(userId, managedTeam, 'team-deals', filters);
  }

  /**
   * Get paginated team callbacks (read-only)
   */
  async getTeamCallbacks(
    userId: string, 
    managedTeam: string, 
    filters: TeamLeaderDataFilters = {}
  ): Promise<PaginatedResponse<any>> {
    return this.getData(userId, managedTeam, 'team-callbacks', filters);
  }

  /**
   * Get paginated personal deals (editable)
   */
  async getPersonalDeals(
    userId: string, 
    managedTeam: string, 
    filters: TeamLeaderDataFilters = {}
  ): Promise<PaginatedResponse<any>> {
    return this.getData(userId, managedTeam, 'personal-deals', filters);
  }

  /**
   * Get paginated personal callbacks (editable)
   */
  async getPersonalCallbacks(
    userId: string, 
    managedTeam: string, 
    filters: TeamLeaderDataFilters = {}
  ): Promise<PaginatedResponse<any>> {
    return this.getData(userId, managedTeam, 'personal-callbacks', filters);
  }

  /**
   * Generic method to get paginated data
   */
  private async getData(
    userId: string,
    managedTeam: string,
    dataType: 'team-deals' | 'team-callbacks' | 'personal-deals' | 'personal-callbacks',
    filters: TeamLeaderDataFilters = {}
  ): Promise<PaginatedResponse<any>> {
    try {
      const params = new URLSearchParams({
        user_id: userId,
        managed_team: managedTeam,
        data_type: dataType,
        page: (filters.page || 1).toString(),
        limit: (filters.limit || 25).toString(),
        search: filters.search || '',
        status: filters.status || '',
        sort_by: filters.sortBy || 'created_at',
        sort_order: filters.sortOrder || 'DESC'
      });

      console.log(`🔄 TeamLeaderApiService: Fetching ${dataType}...`, filters);

      const response = await fetch(`/api/team-leader-data?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`Data API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || `Failed to fetch ${dataType}`);
      }

      console.log(`✅ TeamLeaderApiService: ${dataType} fetched successfully`);
      return result;
    } catch (error) {
      console.error(`❌ TeamLeaderApiService: ${dataType} error:`, error);
      throw error;
    }
  }

  /**
   * Update personal deal (team leaders can only update their own deals)
   */
  async updatePersonalDeal(userId: string, dealId: string, updates: any): Promise<boolean> {
    return this.updatePersonalItem(userId, 'personal-deals', dealId, updates);
  }

  /**
   * Update personal callback (team leaders can only update their own callbacks)
   */
  async updatePersonalCallback(userId: string, callbackId: string, updates: any): Promise<boolean> {
    return this.updatePersonalItem(userId, 'personal-callbacks', callbackId, updates);
  }

  /**
   * Generic method to update personal items
   */
  private async updatePersonalItem(
    userId: string,
    dataType: 'personal-deals' | 'personal-callbacks',
    itemId: string,
    updates: any
  ): Promise<boolean> {
    try {
      const params = new URLSearchParams({
        user_id: userId,
        data_type: dataType,
        item_id: itemId
      });

      console.log(`🔄 TeamLeaderApiService: Updating ${dataType}...`, { itemId, updates });

      const response = await fetch(`/api/team-leader-data?${params.toString()}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`Update API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || `Failed to update ${dataType}`);
      }

      console.log(`✅ TeamLeaderApiService: ${dataType} updated successfully`);
      return true;
    } catch (error) {
      console.error(`❌ TeamLeaderApiService: Update ${dataType} error:`, error);
      throw error;
    }
  }

  /**
   * Test API connectivity
   */
  async testConnection(userId: string, managedTeam: string): Promise<boolean> {
    try {
      const analytics = await this.getAnalytics(userId, managedTeam, 'today', 'full-analytics');
      console.log('✅ TeamLeaderApiService: Connection test successful');
      return true;
    } catch (error) {
      console.error('❌ TeamLeaderApiService: Connection test failed:', error);
      return false;
    }
  }

  /**
   * Get real-time KPIs for dashboard cards
   */
  async getKPIs(userId: string, managedTeam: string, dateRange: string = 'all') {
    try {
      const analytics = await this.getAnalytics(userId, managedTeam, dateRange);
      
      return {
        team: {
          totalDeals: analytics.team.analytics.totalDeals,
          totalRevenue: analytics.team.analytics.totalRevenue,
          avgDealSize: analytics.team.analytics.avgDealSize,
          totalCallbacks: analytics.team.analytics.totalCallbacks,
          conversionRate: analytics.team.analytics.conversionRate
        },
        personal: {
          totalDeals: analytics.personal.analytics.totalDeals,
          totalRevenue: analytics.personal.analytics.totalRevenue,
          avgDealSize: analytics.personal.analytics.avgDealSize,
          totalCallbacks: analytics.personal.analytics.totalCallbacks,
          conversionRate: analytics.personal.analytics.conversionRate
        },
        summary: analytics.summary
      };
    } catch (error) {
      console.error('❌ TeamLeaderApiService: KPIs error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const teamLeaderApiService = new TeamLeaderApiService();
export default teamLeaderApiService;
