import { 
  collection, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { dealsService, Deal } from './firebase-deals-service';
import { userService } from './firebase-user-service';
import { User } from './auth';

export interface UserPerformanceMetrics {
  userId: string;
  userName: string;
  userRole: string;
  team: string;
  totalDeals: number;
  totalRevenue: number;
  averageDealSize: number;
  conversionRate: number;
  dealsThisMonth: number;
  revenueThisMonth: number;
  dealsLastMonth: number;
  revenueLastMonth: number;
  growthRate: number;
  topServices: Array<{ service: string; deals: number; revenue: number }>;
  dealsByStatus: Record<string, number>;
  dealsByStage: Record<string, number>;
  monthlyTrends: Array<{ month: string; deals: number; revenue: number }>;
  performanceRank: number;
  targetAchievement: number;
  commissionEarned: number;
}

export interface TeamAnalytics {
  teamName: string;
  totalMembers: number;
  activeMembers: number;
  totalDeals: number;
  totalRevenue: number;
  averageDealSize: number;
  topPerformer: string;
  memberPerformance: UserPerformanceMetrics[];
  teamTargets: {
    monthly: number;
    achieved: number;
    percentage: number;
  };
  serviceDistribution: Record<string, { deals: number; revenue: number }>;
}

export interface CompanyAnalytics {
  totalUsers: number;
  activeUsers: number;
  totalDeals: number;
  totalRevenue: number;
  averageDealSize: number;
  conversionRate: number;
  topTeams: Array<{ team: string; deals: number; revenue: number }>;
  topPerformers: Array<{ user: string; deals: number; revenue: number }>;
  serviceAnalytics: Record<string, { deals: number; revenue: number; growth: number }>;
  monthlyGrowth: Array<{ month: string; deals: number; revenue: number; users: number }>;
  usersByRole: Record<string, number>;
  dealsByPriority: Record<string, number>;
  revenueByTeam: Record<string, number>;
}

export class FirebaseUserAnalyticsService {
  // Get user performance metrics
  async getUserPerformanceMetrics(userId: string): Promise<UserPerformanceMetrics | null> {
    try {
      const user = await userService.getUserById(userId);
      if (!user) return null;

      const userDeals = await dealsService.getDealsByAgent(userId);
      const analytics = await dealsService.getDealsAnalytics(userId);
      
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

      const dealsThisMonth = userDeals.filter(deal => {
        const dealDate = new Date(deal.signup_date);
        return dealDate.getMonth() === currentMonth && dealDate.getFullYear() === currentYear;
      });

      const dealsLastMonth = userDeals.filter(deal => {
        const dealDate = new Date(deal.signup_date);
        return dealDate.getMonth() === lastMonth && dealDate.getFullYear() === lastMonthYear;
      });

      const revenueThisMonth = dealsThisMonth.reduce((sum, deal) => sum + deal.amount_paid, 0);
      const revenueLastMonth = dealsLastMonth.reduce((sum, deal) => sum + deal.amount_paid, 0);
      
      const growthRate = revenueLastMonth > 0 
        ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100 
        : 0;

      // Calculate top services
      const serviceStats = userDeals.reduce((acc, deal) => {
        if (!acc[deal.product_type]) {
          acc[deal.product_type] = { deals: 0, revenue: 0 };
        }
        acc[deal.product_type].deals += 1;
        acc[deal.product_type].revenue += deal.amount_paid;
        return acc;
      }, {} as Record<string, { deals: number; revenue: number }>);

      const topServices = Object.entries(serviceStats)
        .map(([service, data]) => ({ service, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Calculate commission (assuming 5% for sales agent)
      const commissionEarned = analytics.totalRevenue * 0.05;

      return {
        userId,
        userName: user.name,
        userRole: user.role,
        team: user.team || 'Unassigned',
        totalDeals: analytics.totalDeals,
        totalRevenue: analytics.totalRevenue,
        averageDealSize: analytics.averageDealSize,
        conversionRate: analytics.conversionRate,
        dealsThisMonth: dealsThisMonth.length,
        revenueThisMonth,
        dealsLastMonth: dealsLastMonth.length,
        revenueLastMonth,
        growthRate,
        topServices,
        dealsByStatus: analytics.dealsByStatus,
        dealsByStage: analytics.dealsByStage,
        monthlyTrends: analytics.monthlyTrends,
        performanceRank: 0, // Will be calculated in team context
        targetAchievement: 0, // Will be calculated based on targets
        commissionEarned
      };
    } catch (error) {
      console.error('Error fetching user performance metrics:', error);
      return null;
    }
  }

  // Get team analytics
  async getTeamAnalytics(teamName: string): Promise<TeamAnalytics | null> {
    try {
      const teamUsers = await userService.getUsersByTeam(teamName);
      const teamDeals = await dealsService.getDealsByTeam(teamName);
      
      const memberPerformance: UserPerformanceMetrics[] = [];
      
      for (const user of teamUsers) {
        if (user.id) {
          const metrics = await this.getUserPerformanceMetrics(user.id);
          if (metrics) {
            memberPerformance.push(metrics);
          }
        }
      }

      // Sort by revenue and assign ranks
      memberPerformance.sort((a, b) => b.totalRevenue - a.totalRevenue);
      memberPerformance.forEach((member, index) => {
        member.performanceRank = index + 1;
      });

      const totalRevenue = teamDeals.reduce((sum, deal) => sum + deal.amount_paid, 0);
      const averageDealSize = teamDeals.length > 0 ? totalRevenue / teamDeals.length : 0;
      const topPerformer = memberPerformance.length > 0 ? memberPerformance[0].userName : 'N/A';

      // Service distribution
      const serviceDistribution = teamDeals.reduce((acc, deal) => {
        if (!acc[deal.product_type]) {
          acc[deal.product_type] = { deals: 0, revenue: 0 };
        }
        acc[deal.product_type].deals += 1;
        acc[deal.product_type].revenue += deal.amount_paid;
        return acc;
      }, {} as Record<string, { deals: number; revenue: number }>);

      return {
        teamName,
        totalMembers: teamUsers.length,
        activeMembers: teamUsers.filter(user => (user as any).isActive !== false).length,
        totalDeals: teamDeals.length,
        totalRevenue,
        averageDealSize,
        topPerformer,
        memberPerformance,
        teamTargets: {
          monthly: 100000, // Default target, should be configurable
          achieved: totalRevenue,
          percentage: (totalRevenue / 100000) * 100
        },
        serviceDistribution
      };
    } catch (error) {
      console.error('Error fetching team analytics:', error);
      return null;
    }
  }

  // Get company-wide analytics
  async getCompanyAnalytics(): Promise<CompanyAnalytics> {
    try {
      const allUsers = await userService.getAllUsers();
      const allDeals = await dealsService.getAllDeals();
      const analytics = await dealsService.getDealsAnalytics();

      const activeUsers = allUsers.filter(user => (user as any).isActive !== false);
      
      // Users by role
      const usersByRole = allUsers.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Top teams
      const topTeams = Object.entries(analytics.dealsByTeam)
        .map(([team, data]) => ({ team, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Service analytics with growth calculation
      const serviceAnalytics: Record<string, { deals: number; revenue: number; growth: number }> = {};
      
      const currentMonth = new Date().getMonth();
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      
      Object.entries(analytics.dealsByService).forEach(([service, data]) => {
        const currentMonthDeals = allDeals.filter(deal => {
          const dealDate = new Date(deal.signup_date);
          return dealDate.getMonth() === currentMonth && deal.product_type === service;
        });
        
        const lastMonthDeals = allDeals.filter(deal => {
          const dealDate = new Date(deal.signup_date);
          return dealDate.getMonth() === lastMonth && deal.product_type === service;
        });

        const currentRevenue = currentMonthDeals.reduce((sum, deal) => sum + deal.amount_paid, 0);
        const lastRevenue = lastMonthDeals.reduce((sum, deal) => sum + deal.amount_paid, 0);
        
        const growth = lastRevenue > 0 ? ((currentRevenue - lastRevenue) / lastRevenue) * 100 : 0;
        
        serviceAnalytics[service] = {
          deals: data.deals,
          revenue: data.revenue,
          growth
        };
      });

      // Monthly growth trends
      const monthlyGrowth = this.calculateMonthlyGrowth(allDeals, allUsers);

      // Deals by priority
      const dealsByPriority = allDeals.reduce((acc, deal) => {
        acc[deal.priority] = (acc[deal.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Revenue by team
      const revenueByTeam = Object.entries(analytics.dealsByTeam).reduce((acc, [team, data]) => {
        acc[team] = data.revenue;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalUsers: allUsers.length,
        activeUsers: activeUsers.length,
        totalDeals: analytics.totalDeals,
        totalRevenue: analytics.totalRevenue,
        averageDealSize: analytics.averageDealSize,
        conversionRate: analytics.conversionRate,
        topTeams,
        topPerformers: analytics.topPerformers.map(performer => ({ 
          user: performer.agent, 
          deals: performer.deals, 
          revenue: performer.revenue 
        })),
        serviceAnalytics,
        monthlyGrowth,
        usersByRole,
        dealsByPriority,
        revenueByTeam
      };
    } catch (error) {
      console.error('Error fetching company analytics:', error);
      throw new Error('Failed to fetch company analytics');
    }
  }

  // Calculate monthly growth trends
  private calculateMonthlyGrowth(deals: Deal[], users: User[]): Array<{ month: string; deals: number; revenue: number; users: number }> {
    const monthlyData: Record<string, { deals: number; revenue: number; users: Set<string> }> = {};
    
    // Process deals
    deals.forEach(deal => {
      const date = new Date(deal.signup_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { deals: 0, revenue: 0, users: new Set() };
      }
      monthlyData[monthKey].deals += 1;
      monthlyData[monthKey].revenue += deal.amount_paid;
      monthlyData[monthKey].users.add(deal.SalesAgentID);
    });

    return Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        deals: data.deals,
        revenue: data.revenue,
        users: data.users.size
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12); // Last 12 months
  }

  // Get user leaderboard
  async getUserLeaderboard(limit: number = 10): Promise<UserPerformanceMetrics[]> {
    try {
      const allUsers = await userService.getAllUsers();
      const leaderboard: UserPerformanceMetrics[] = [];

      for (const user of allUsers) {
        if (user.id && user.role === 'salesman') {
          const metrics = await this.getUserPerformanceMetrics(user.id);
          if (metrics) {
            leaderboard.push(metrics);
          }
        }
      }

      return leaderboard
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, limit)
        .map((user, index) => ({ ...user, performanceRank: index + 1 }));
    } catch (error) {
      console.error('Error fetching user leaderboard:', error);
      return [];
    }
  }

  // Real-time analytics listener
  onAnalyticsChange(callback: (analytics: CompanyAnalytics) => void) {
    // Listen to deals changes and recalculate analytics
    return dealsService.onDealsChange(async () => {
      try {
        const analytics = await this.getCompanyAnalytics();
        callback(analytics);
      } catch (error) {
        console.error('Error in analytics change listener:', error);
      }
    });
  }
}

// Export singleton instance
export const userAnalyticsService = new FirebaseUserAnalyticsService();
