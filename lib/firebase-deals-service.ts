import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { notificationService } from './firebase-services';
import { targetsService } from './firebase-targets-service';
import { COLLECTIONS } from '@/types/firebase';

// Safe timestamp conversion helper
function safeToDate(timestamp: any): Date | null {
  if (!timestamp) return null;
  
  try {
    // If it's already a Date object
    if (timestamp instanceof Date) {
      return timestamp;
    }
    
    // If it's a Firestore timestamp with toDate method
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    
    // If it's a Firestore timestamp with seconds property
    if (timestamp && typeof timestamp === 'object' && typeof timestamp.seconds === 'number') {
      return new Date(timestamp.seconds * 1000);
    }
    
    // If it's a string, try to parse it
    if (typeof timestamp === 'string') {
      return new Date(timestamp);
    }
    
    // If it's a number (milliseconds)
    if (typeof timestamp === 'number') {
      return new Date(timestamp);
    }
    
    return null;
  } catch (error) {
    console.error('Error converting timestamp:', error, timestamp);
    return null;
  }
}

export interface Deal {
  id?: string;
  DealID: string;
  signup_date: string;
  end_date: string;
  customer_name: string;
  email: string;
  phone_number: string;
  country: string;
  amount_paid: number;
  paid_per_month: number;
  duration_months: number;
  sales_agent: string;
  closing_agent: string;
  sales_team: string;
  product_type: string;
  service_tier: string;
  data_month: number;
  data_year: number;
  invoice_link?: string;
  is_ibo_player: boolean;
  is_bob_player: boolean;
  is_smarters: boolean;
  is_ibo_pro: boolean;
  days_remaining: number;
  paid_per_day: number;
  duration_mean_paid: number;
  agent_avg_paid: number;
  is_above_avg: boolean;
  paid_rank: number;
  end_year: number;
  sales_agent_norm: string;
  closing_agent_norm: string;
  SalesAgentID: string;
  ClosingAgentID: string;
  
  // Additional tracking fields
  status: 'pending' | 'active' | 'completed' | 'cancelled' | 'refunded';
  stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed-won' | 'closed-lost';
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  commission_sales?: number;
  commission_closing?: number;
  created_at?: Timestamp;
  updated_at?: Timestamp;
  created_by: string;
  created_by_id: string;
}

export interface DealAnalytics {
  totalDeals: number;
  totalRevenue: number;
  averageDealSize: number;
  conversionRate: number;
  dealsByStatus: Record<string, number>;
  dealsByStage: Record<string, number>;
  dealsByAgent: Record<string, { deals: number; revenue: number }>;
  dealsByTeam: Record<string, { deals: number; revenue: number }>;
  dealsByService: Record<string, { deals: number; revenue: number }>;
  monthlyTrends: Array<{ month: string; deals: number; revenue: number }>;
  topPerformers: Array<{ agent: string; deals: number; revenue: number }>;
}

export class FirebaseDealsService {
  private readonly COLLECTION = 'deals';

  // Generate automatic DealID
  private generateDealID(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `DEAL-${timestamp}-${random}`;
  }

  // Calculate automatic fields
  private calculateAutomaticFields(dealData: any, currentUser: any): any {
    const signupDate = new Date(dealData.signup_date);
    const endDate = new Date(signupDate);
    endDate.setMonth(endDate.getMonth() + dealData.duration_months);
    
    const today = new Date();
    const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    const paidPerDay = dealData.amount_paid / (dealData.duration_months * 30);
    
    return {
      ...dealData,
      DealID: dealData.DealID || this.generateDealID(),
      end_date: endDate.toISOString().split('T')[0],
      data_month: signupDate.getMonth() + 1,
      data_year: signupDate.getFullYear(),
      end_year: endDate.getFullYear(),
      days_remaining: daysRemaining,
      paid_per_day: Math.round(paidPerDay * 100) / 100,
      paid_per_month: dealData.paid_per_month || dealData.amount_paid / dealData.duration_months,
      sales_agent_norm: dealData.sales_agent.toLowerCase().replace(/\s+/g, '_'),
      closing_agent_norm: dealData.closing_agent.toLowerCase().replace(/\s+/g, '_'),
      SalesAgentID: dealData.SalesAgentID || currentUser?.id || '',
      ClosingAgentID: dealData.ClosingAgentID || currentUser?.id || '',
      created_by: dealData.created_by || currentUser?.name || 'Unknown',
      created_by_id: dealData.created_by_id || currentUser?.id || '',
      status: dealData.status || 'active',
      stage: dealData.stage || 'closed-won',
      priority: dealData.priority || 'medium'
    };
  }

  // Create a new deal with automatic calculations
  async createDeal(dealData: Partial<Deal>, currentUser: any): Promise<string> {
    try {
      // Calculate automatic fields
      const processedDeal = this.calculateAutomaticFields(dealData, currentUser);
      
      // Calculate analytics fields (will be updated after creation)
      const allDeals = await this.getAllDeals();
      const agentDeals = allDeals.filter(d => d.SalesAgentID === processedDeal.SalesAgentID);
      const agentTotalRevenue = agentDeals.reduce((sum, deal) => sum + deal.amount_paid, 0);
      const agentAvgPaid = agentDeals.length > 0 ? agentTotalRevenue / agentDeals.length : 0;
      
      processedDeal.agent_avg_paid = Math.round(agentAvgPaid * 100) / 100;
      processedDeal.duration_mean_paid = processedDeal.amount_paid / processedDeal.duration_months;
      processedDeal.is_above_avg = processedDeal.amount_paid > agentAvgPaid;
      processedDeal.paid_rank = this.calculatePaidRank(processedDeal.amount_paid, allDeals);
      
      const dealWithTimestamp = {
        ...processedDeal,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, this.COLLECTION), dealWithTimestamp);
      
      // ALSO save to sales collection for dashboard compatibility
      const saleData = {
        date: processedDeal.signup_date,
        customer_name: processedDeal.customer_name,
        amount: processedDeal.amount_paid,
        sales_agent: processedDeal.sales_agent,
        closing_agent: processedDeal.closing_agent,
        team: processedDeal.sales_team,
        type_service: processedDeal.service_tier,
        sales_agent_norm: processedDeal.sales_agent_norm,
        closing_agent_norm: processedDeal.closing_agent_norm,
        SalesAgentID: processedDeal.SalesAgentID,
        ClosingAgentID: processedDeal.ClosingAgentID,
        DealID: processedDeal.DealID,
        email: processedDeal.email,
        phone: processedDeal.phone_number,
        country: processedDeal.country,
        duration_months: processedDeal.duration_months,
        type_program: processedDeal.product_type,
        invoice: processedDeal.invoice_link,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      };
      
      await addDoc(collection(db, COLLECTIONS.SALES), saleData);
      
      // Update target progress for the sales agent
      await this.updateTargetProgress(
        processedDeal.SalesAgentID, 
        processedDeal.amount_paid, 
        processedDeal.data_month, 
        processedDeal.data_year,
        processedDeal.DealID,
        processedDeal.customer_name
      );

      // Create notifications for sales agent, closing agent, and managers
      const notifications = [
        // Notification for sales agent
        {
          title: 'New Deal Created',
          message: `You created a new deal for ${processedDeal.customer_name} worth $${processedDeal.amount_paid}`,
          type: 'deal' as const,
          priority: 'medium' as const,
          from: processedDeal.created_by || 'System',
          to: [processedDeal.SalesAgentID],
          dealId: docRef.id,
          dealName: processedDeal.customer_name,
          dealValue: processedDeal.amount_paid,
          dealStage: processedDeal.stage,
          isRead: false,
          actionRequired: false
        },
        // Notification for closing agent (if different from sales agent)
        ...(processedDeal.ClosingAgentID && processedDeal.ClosingAgentID !== processedDeal.SalesAgentID ? [{
          title: 'New Deal Assigned',
          message: `You've been assigned as closing agent for ${processedDeal.customer_name}'s deal`,
          type: 'deal' as const,
          priority: 'medium' as const,
          from: processedDeal.created_by || 'System',
          to: [processedDeal.ClosingAgentID],
          dealId: docRef.id,
          dealName: processedDeal.customer_name,
          dealValue: processedDeal.amount_paid,
          dealStage: processedDeal.stage,
          isRead: false,
          actionRequired: true
        }] : []),
        // Enhanced notification for all managers with detailed agent information
        {
          title: '💰 New Deal Created',
          message: `Agent ${processedDeal.created_by} created a new deal:\n• Customer: ${processedDeal.customer_name}\n• Value: $${processedDeal.amount_paid?.toLocaleString()}\n• Service: ${processedDeal.type_service || 'N/A'}\n• Stage: ${processedDeal.stage}\n• Sales Agent: ${processedDeal.sales_agent}\n• Team: ${processedDeal.sales_team || 'N/A'}`,
          type: 'deal' as const,
          priority: processedDeal.amount_paid > 10000 ? 'high' as const : 'medium' as const,
          from: processedDeal.created_by || 'System',
          to: ['manager'], // This will be expanded to all managers in notification service
          dealId: docRef.id,
          dealName: processedDeal.customer_name,
          dealValue: processedDeal.amount_paid,
          dealStage: processedDeal.stage,
          salesAgent: processedDeal.sales_agent,
          salesAgentId: processedDeal.SalesAgentID,
          closingAgent: processedDeal.closing_agent,
          closingAgentId: processedDeal.ClosingAgentID,
          serviceType: processedDeal.type_service,
          teamName: processedDeal.sales_team,
          isRead: false,
          actionRequired: false,
          timestamp: serverTimestamp()
        }
      ];

      if (processedDeal.ClosingAgentID !== processedDeal.SalesAgentID) {
        notifications.push({
          title: 'Deal Assignment',
          message: `You have been assigned as closing agent for deal "${processedDeal.customer_name}" worth $${processedDeal.amount_paid}.`,
          type: 'deal' as const,
          priority: 'medium' as const,
          from: processedDeal.created_by,
          dealStage: processedDeal.stage,
          to: [processedDeal.ClosingAgentID],
          dealId: docRef.id,
          dealName: processedDeal.customer_name,
          dealValue: processedDeal.amount_paid,
          isRead: false,
          actionRequired: true
        });
      }

      // Send notifications
      for (const notification of notifications) {
        await notificationService.addNotification(notification);
      }
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating deal:', error);
      throw new Error('Failed to create deal');
    }
  }

  // Calculate paid rank
  private calculatePaidRank(amount: number, allDeals: Deal[]): number {
    const sortedAmounts = allDeals.map(d => d.amount_paid).sort((a, b) => b - a);
    const rank = sortedAmounts.indexOf(amount) + 1;
    return rank;
  }

  // Update target progress when a deal is created
  private async updateTargetProgress(agentId: string, dealAmount: number, month: number, year: number, dealId?: string, customerName?: string): Promise<void> {
    try {
      // Find current period targets for the agent
      const currentPeriod = `${this.getMonthName(month)} ${year}`;
      
      // Get agent's targets for the current period
      const targets = await targetsService.getTargets(agentId, 'salesman');
      const currentTargets = targets.filter(target => target.period === currentPeriod);
      
      if (currentTargets.length > 0) {
        // Import target progress service
        const { targetProgressService } = await import('./firebase-target-progress-service');
        
        // Update target progress in Firebase for each matching target
        for (const target of currentTargets) {
          await targetProgressService.updateProgressOnDealCreation(
            agentId,
            dealAmount,
            dealId || `deal-${Date.now()}`,
            customerName || 'Unknown Customer',
            currentPeriod
          );
          
          console.log(`Updated target progress for agent ${agentId}, target ${target.id}, amount: $${dealAmount}`);
        }

        // Create notification about target progress update
        const progressNotifications = currentTargets.map(target => ({
          title: 'Target Progress Updated',
          message: `Your deal of $${dealAmount} for ${customerName || 'a customer'} has been deducted from your ${target.period} target. Keep up the great work!`,
          type: 'info' as const,
          priority: 'low' as const,
          from: 'System',
          to: [agentId],
          targetId: target.id,
          isRead: false,
          actionRequired: false
        }));

        // Send notifications
        for (const notification of progressNotifications) {
          await notificationService.addNotification(notification);
        }
      }
    } catch (error) {
      console.error('Error updating target progress:', error);
      // Don't throw error to avoid breaking deal creation
    }
  }

  private getMonthName(monthNumber: number): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthNumber - 1] || 'January';
  }

  // Get all deals (for managers)
  async getAllDeals(): Promise<Deal[]> {
    try {
      const q = query(collection(db, this.COLLECTION), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      } as Deal));
    } catch (error) {
      console.error('Error fetching deals:', error);
      throw new Error('Failed to fetch deals');
    }
  }

  // Get deals by agent
  async getDealsByAgent(agentId: string): Promise<Deal[]> {
    try {
      // Use simple query without orderBy to avoid composite index requirement
      const q = query(
        collection(db, this.COLLECTION),
        where('SalesAgentID', '==', agentId)
      );
      const querySnapshot = await getDocs(q);
      
      const deals = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      } as Deal));
      
      // Sort in memory to maintain order without composite index
      return deals.sort((a, b) => {
        const dateA = safeToDate(a.created_at) || new Date(0);
        const dateB = safeToDate(b.created_at) || new Date(0);
        return dateB.getTime() - dateA.getTime(); // desc order
      });
    } catch (error) {
      console.error('Error fetching deals by agent:', error);
      throw new Error('Failed to fetch deals by agent');
    }
  }

  // Get deals by team
  async getDealsByTeam(team: string): Promise<Deal[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('sales_team', '==', team),
        orderBy('created_at', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      } as Deal));
    } catch (error) {
      console.error('Error fetching deals by team:', error);
      throw new Error('Failed to fetch deals by team');
    }
  }

  // Get deal by ID
  async getDealById(dealId: string): Promise<Deal | null> {
    try {
      const docRef = doc(db, this.COLLECTION, dealId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        } as Deal;
      }
      return null;
    } catch (error) {
      console.error('Error fetching deal:', error);
      return null;
    }
  }

  // Update deal
  async updateDeal(dealId: string, updates: Partial<Deal>): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION, dealId);
      await updateDoc(docRef, {
        ...updates,
        updated_at: serverTimestamp()
      });

      // If status or stage changed, notify relevant agents
      if (updates.status || updates.stage) {
        const deal = await this.getDealById(dealId);
        if (deal) {
          await notificationService.addNotification({
            title: 'Deal Updated',
            message: `Deal "${deal.customer_name}" has been updated. Status: ${updates.status || deal.status}, Stage: ${updates.stage || deal.stage}`,
            type: 'deal',
            priority: 'medium',
            to: [deal.SalesAgentID, deal.ClosingAgentID],
            dealId: dealId,
            dealName: deal.customer_name,
            dealValue: deal.amount_paid,
            isRead: false
          });
        }
      }
    } catch (error) {
      console.error('Error updating deal:', error);
      throw new Error('Failed to update deal');
    }
  }

  // Delete deal
  async deleteDeal(dealId: string): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION, dealId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting deal:', error);
      throw new Error('Failed to delete deal');
    }
  }

  // Get deals analytics
  async getDealsAnalytics(agentId?: string, team?: string): Promise<DealAnalytics> {
    try {
      let q = query(collection(db, this.COLLECTION));
      
      if (agentId) {
        q = query(collection(db, this.COLLECTION), where('SalesAgentID', '==', agentId));
      } else if (team) {
        q = query(collection(db, this.COLLECTION), where('sales_team', '==', team));
      }
      
      const querySnapshot = await getDocs(q);
      const deals = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          created_at: safeToDate(data.created_at) || data.created_at,
          updated_at: safeToDate(data.updated_at) || data.updated_at
        } as Deal;
      });
      
      return this.calculateAnalytics(deals);
    } catch (error) {
      console.error('Error fetching deals analytics:', error);
      throw new Error('Failed to fetch deals analytics');
    }
  }

  // Calculate analytics from deals data
  private calculateAnalytics(deals: Deal[]): DealAnalytics {
    const totalDeals = deals.length;
    const totalRevenue = deals.reduce((sum, deal) => sum + deal.amount_paid, 0);
    const averageDealSize = totalDeals > 0 ? totalRevenue / totalDeals : 0;
    
    const closedWonDeals = deals.filter(deal => deal.stage === 'closed-won').length;
    const conversionRate = totalDeals > 0 ? (closedWonDeals / totalDeals) * 100 : 0;
    
    // Group by status
    const dealsByStatus = deals.reduce((acc, deal) => {
      acc[deal.status] = (acc[deal.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Group by stage
    const dealsByStage = deals.reduce((acc, deal) => {
      acc[deal.stage] = (acc[deal.stage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Group by agent
    const dealsByAgent = deals.reduce((acc, deal) => {
      if (!acc[deal.sales_agent]) {
        acc[deal.sales_agent] = { deals: 0, revenue: 0 };
      }
      acc[deal.sales_agent].deals += 1;
      acc[deal.sales_agent].revenue += deal.amount_paid;
      return acc;
    }, {} as Record<string, { deals: number; revenue: number }>);
    
    // Group by team
    const dealsByTeam = deals.reduce((acc, deal) => {
      if (!acc[deal.sales_team]) {
        acc[deal.sales_team] = { deals: 0, revenue: 0 };
      }
      acc[deal.sales_team].deals += 1;
      acc[deal.sales_team].revenue += deal.amount_paid;
      return acc;
    }, {} as Record<string, { deals: number; revenue: number }>);
    
    // Group by service
    const dealsByService = deals.reduce((acc, deal) => {
      if (!acc[deal.product_type]) {
        acc[deal.product_type] = { deals: 0, revenue: 0 };
      }
      acc[deal.product_type].deals += 1;
      acc[deal.product_type].revenue += deal.amount_paid;
      return acc;
    }, {} as Record<string, { deals: number; revenue: number }>);
    
    // Monthly trends (last 12 months)
    const monthlyTrends = this.calculateMonthlyTrends(deals);
    
    // Top performers
    const topPerformers = Object.entries(dealsByAgent)
      .map(([agent, data]) => ({ agent, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
    
    return {
      totalDeals,
      totalRevenue,
      averageDealSize,
      conversionRate,
      dealsByStatus,
      dealsByStage,
      dealsByAgent,
      dealsByTeam,
      dealsByService,
      monthlyTrends,
      topPerformers
    };
  }

  // Calculate monthly trends
  private calculateMonthlyTrends(deals: Deal[]): Array<{ month: string; deals: number; revenue: number }> {
    const monthlyData = deals.reduce((acc, deal) => {
      const date = new Date(deal.signup_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!acc[monthKey]) {
        acc[monthKey] = { deals: 0, revenue: 0 };
      }
      acc[monthKey].deals += 1;
      acc[monthKey].revenue += deal.amount_paid;
      return acc;
    }, {} as Record<string, { deals: number; revenue: number }>);
    
    return Object.entries(monthlyData)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12); // Last 12 months
  }

  // Real-time listener for deals
  onDealsChange(callback: (deals: Deal[]) => void, agentId?: string, team?: string) {
    let q = query(collection(db, this.COLLECTION), orderBy('created_at', 'desc'));
    
    if (agentId) {
      q = query(
        collection(db, this.COLLECTION),
        where('sales_agent_id', '==', agentId),
        orderBy('created_at', 'desc')
      );
    } else if (team) {
      q = query(
        collection(db, this.COLLECTION),
        where('team', '==', team),
        orderBy('created_at', 'desc')
      );
    }

    return onSnapshot(q, (snapshot) => {
      const deals = snapshot.docs.map(doc => {
        const data = doc.data();
        // Convert Firestore timestamps to serializable format
        return {
          id: doc.id,
          ...data,
          created_at: safeToDate(data.created_at) || data.created_at,
          updated_at: safeToDate(data.updated_at) || data.updated_at
        } as Deal;
      });
      callback(deals);
    });
  }
}

// Export singleton instance
export const dealsService = new FirebaseDealsService();
