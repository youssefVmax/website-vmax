import { Callback as ApiCallback } from './api-service';
import directMySQLService from './direct-mysql-service';
import { databaseService } from './mysql-database-service';

export interface Callback extends ApiCallback {
  // Additional fields for compatibility
  created_at?: string;
  updated_at?: string;
  converted_to_deal?: boolean;
}

export interface CallbacksService {
  addCallback: (callbackData: Omit<Callback, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateCallback: (id: string, updates: Partial<Callback> & Record<string, any>, updatedBy?: any, userContext?: { userRole?: string; userId?: string; managedTeam?: string }) => Promise<void>;
  deleteCallback: (id: string, userContext?: { userRole?: string; userId?: string; managedTeam?: string }) => Promise<void>;
  getCallbacks: (userRole?: string, userId?: string, userName?: string, managedTeam?: string) => Promise<Callback[]>;
  getCallbackById: (id: string) => Promise<Callback | null>;
  getCallbacksByTeam: (team: string) => Promise<Callback[]>;
  getTeamCallbackAnalytics: (team: string) => Promise<any>;
  onCallbacksChange: (callback: (callbacks: Callback[]) => void, userRole?: string, userId?: string, userName?: string, managedTeam?: string) => () => void;
}

class MySQLCallbacksService implements CallbacksService {
  private listeners: { [key: string]: (callbacks: Callback[]) => void } = {};
  private pollInterval: NodeJS.Timeout | null = null;

  async addCallback(callbackData: Omit<Callback, 'id' | 'createdAt' | 'updatedAt'>, createdBy?: any): Promise<string> {
    try {
      const callbackPayload = {
        customerName: callbackData.customerName,
        phoneNumber: callbackData.phoneNumber,
        email: callbackData.email,
        salesAgentId: callbackData.salesAgentId || createdBy?.id,
        salesAgentName: callbackData.salesAgentName || createdBy?.name,
        salesTeam: callbackData.salesTeam || createdBy?.team,
        firstCallDate: callbackData.firstCallDate,
        firstCallTime: callbackData.firstCallTime,
        scheduledDate: callbackData.scheduledDate,
        scheduledTime: callbackData.scheduledTime,
        status: callbackData.status || 'pending',
        priority: callbackData.priority || 'medium',
        callbackReason: callbackData.callbackReason,
        callbackNotes: callbackData.callbackNotes,
        followUpRequired: callbackData.followUpRequired || false,
        createdBy: callbackData.createdBy || createdBy?.name,
        createdById: callbackData.createdById || createdBy?.id
      };

      // Use enhanced database service with full tracking
      const callbackId = await databaseService.createCallbackWithTracking(callbackPayload, createdBy);
      
      // Trigger listeners
      this.notifyListeners();
      
      return callbackId;
    } catch (error) {
      console.error('Error creating callback:', error);
      throw error;
    }
  }

  async updateCallback(id: string, updates: Partial<Callback> & Record<string, any>, updatedBy?: any, userContext?: { userRole?: string; userId?: string; managedTeam?: string }): Promise<void> {
    try {
      // Get old callback for history tracking
      const oldCallbacks = await directMySQLService.getCallbacks({ id });
      const oldCallback = oldCallbacks.length > 0 ? oldCallbacks[0] : null;

      await directMySQLService.updateCallback(id, updates, userContext);

      // Log callback history if significant changes
      if (oldCallback && updatedBy) {
        await databaseService.logCallbackHistory({
          callback_id: id,
          changed_by: updatedBy.id,
          change_type: 'UPDATE',
          old_status: oldCallback.status,
          new_status: updates.status,
          old_scheduled_date: oldCallback.scheduled_date,
          new_scheduled_date: updates.scheduled_date,
          notes: `Updated by ${updatedBy.name}`
        });

        // Log activity
        await databaseService.logActivity({
          user_id: updatedBy.id,
          action: 'UPDATE',
          entity_type: 'callback',
          entity_id: id,
          old_values: oldCallback,
          new_values: updates
        });

        // Update team metrics
        await databaseService.updateTeamMetrics(oldCallback.sales_team);
      }
      
      // Trigger listeners
      this.notifyListeners();
    } catch (error) {
      console.error('Error updating callback:', error);
      throw error;
    }
  }

  async deleteCallback(id: string, userContext?: { userRole?: string; userId?: string; managedTeam?: string }): Promise<void> {
    try {
      await directMySQLService.deleteCallback(id, userContext);
      
      // Trigger listeners
      this.notifyListeners();
    } catch (error) {
      console.error('Error deleting callback:', error);
      throw error;
    }
  }

  async getCallbacksByTeam(team: string): Promise<Callback[]> {
    try {
      const callbacks = await directMySQLService.getCallbacks({ salesTeam: team });
      return callbacks;
    } catch (error) {
      console.error('Error fetching callbacks by team:', error);
      return [];
    }
  }

  async getTeamCallbackAnalytics(team: string): Promise<any> {
    try {
      const callbacks = await this.getCallbacksByTeam(team);
      
      const totalCallbacks = callbacks.length;
      const pendingCallbacks = callbacks.filter(c => c.status === 'pending').length;
      const completedCallbacks = callbacks.filter(c => c.status === 'completed').length;
      const convertedCallbacks = callbacks.filter(c => c.converted_to_deal).length;
      
      // Agent breakdown
      const agentBreakdown = callbacks.reduce((acc, callback) => {
        const agent = callback.salesAgentName || 'Unknown';
        if (!acc[agent]) {
          acc[agent] = { total: 0, pending: 0, completed: 0, converted: 0 };
        }
        acc[agent].total += 1;
        if (callback.status === 'pending') acc[agent].pending += 1;
        if (callback.status === 'completed') acc[agent].completed += 1;
        if (callback.converted_to_deal) acc[agent].converted += 1;
        return acc;
      }, {} as Record<string, { total: number; pending: number; completed: number; converted: number }>);
      
      return {
        totalCallbacks,
        pendingCallbacks,
        completedCallbacks,
        convertedCallbacks,
        agentBreakdown
      };
    } catch (error) {
      console.error('Error fetching team callback analytics:', error);
      throw error;
    }
  }

  async getCallbacks(
    userRole?: string, 
    userId?: string, 
    userName?: string, 
    managedTeam?: string
  ): Promise<Callback[]> {
    try {
      const filters: Record<string, string> = {};
      
      if (userRole === 'salesman' && userId) {
        filters.salesAgentId = userId;
      } else if (userRole === 'team_leader' && managedTeam) {
        filters.salesTeam = managedTeam;
      }
      // Managers can see all callbacks (no filters)
      
      const response = await directMySQLService.getCallbacks(filters);
      const callbacks = Array.isArray(response) ? response : (response.callbacks || []);
      return callbacks;
    } catch (error) {
      console.error('Error fetching callbacks:', error);
      return [];
    }
  }

  async getCallbackById(id: string): Promise<Callback | null> {
    try {
      const callbacks = await directMySQLService.getCallbacks({ id });
      return callbacks.length > 0 ? callbacks[0] : null;
    } catch (error) {
      console.error('Error fetching callback by ID:', error);
      return null;
    }
  }

  onCallbacksChange(
    callback: (callbacks: Callback[]) => void,
    userRole?: string,
    userId?: string,
    userName?: string,
    managedTeam?: string
  ): () => void {
    const listenerId = `${userRole || 'all'}_${userId || 'all'}_${userName || 'all'}_${managedTeam || 'all'}_${Date.now()}`;
    
    this.listeners[listenerId] = callback;
    
    // Start polling if not already started
    if (!this.pollInterval) {
      this.startPolling();
    }
    
    // Initial data fetch
    this.getCallbacks(userRole, userId, userName, managedTeam).then(callback);
    
    // Return unsubscribe function
    return () => {
      delete this.listeners[listenerId];
      
      // Stop polling if no listeners
      if (Object.keys(this.listeners).length === 0 && this.pollInterval) {
        clearInterval(this.pollInterval);
        this.pollInterval = null;
      }
    };
  }

  // ✅ OPTIMIZATION: Disabled auto-polling
  // Listeners now trigger only on explicit data changes
  // Reduces unnecessary re-renders and API load
  private startPolling(): void {
    // Polling disabled - use manual refresh instead
  }

  private async notifyListeners(): Promise<void> {
    for (const [listenerId, callback] of Object.entries(this.listeners)) {
      try {
        const [userRole, userId, userName, managedTeam] = listenerId.split('_');
        const callbacks = await this.getCallbacks(
          userRole !== 'all' ? userRole : undefined,
          userId !== 'all' ? userId : undefined,
          userName !== 'all' ? userName : undefined,
          managedTeam !== 'all' ? managedTeam : undefined
        );
        callback(callbacks);
      } catch (error) {
        console.error('Error notifying listener:', error);
      }
    }
  }

  // Additional methods for callback analytics
  async getCallbackAnalytics(filters?: any): Promise<any> {
    try {
      const callbacks = await this.getCallbacks(filters?.userRole, filters?.userId, filters?.userName, filters?.managedTeam);
      
      const totalCallbacks = callbacks.length;
      const pendingCallbacks = callbacks.filter(cb => cb.status === 'pending').length;
      const completedCallbacks = callbacks.filter(cb => cb.status === 'completed').length;
      const contactedCallbacks = callbacks.filter(cb => cb.status === 'contacted').length;
      
      // Group by status
      const callbacksByStatus = callbacks.reduce((acc, callback) => {
        const status = callback.status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Group by priority
      const callbacksByPriority = callbacks.reduce((acc, callback) => {
        const priority = callback.priority || 'medium';
        acc[priority] = (acc[priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Agent performance
      const agentPerformance = callbacks.reduce((acc, callback) => {
        const agent = callback.salesAgentName || 'Unknown';
        if (!acc[agent]) {
          acc[agent] = { total: 0, completed: 0, pending: 0 };
        }
        acc[agent].total += 1;
        if (callback.status === 'completed') acc[agent].completed += 1;
        if (callback.status === 'pending') acc[agent].pending += 1;
        return acc;
      }, {} as Record<string, { total: number; completed: number; pending: number }>);
      
      return {
        totalCallbacks,
        pendingCallbacks,
        completedCallbacks,
        contactedCallbacks,
        callbacksByStatus,
        callbacksByPriority,
        agentPerformance,
        callbacks
      };
    } catch (error) {
      console.error('Error fetching callback analytics:', error);
      throw error;
    }
  }
}

export const callbacksService = new MySQLCallbacksService();

// Utility functions for callback management
export const CallbackUtils = {
  getStatusColor: (status: string): string => {
    const colors: Record<string, string> = {
      'pending': '#F59E0B',
      'contacted': '#3B82F6',
      'completed': '#10B981',
      'cancelled': '#6B7280'
    };
    return colors[status] || '#6B7280';
  },
  
  getPriorityColor: (priority: string): string => {
    const colors: Record<string, string> = {
      'low': '#10B981',
      'medium': '#F59E0B',
      'high': '#EF4444'
    };
    return colors[priority] || '#F59E0B';
  },
  
  formatCallbackDate: (date: string): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  },
  
  isOverdue: (scheduledDate: string): boolean => {
    if (!scheduledDate) return false;
    return new Date(scheduledDate) < new Date();
  },
  
  getDaysUntilCallback: (scheduledDate: string): number => {
    if (!scheduledDate) return 0;
    const today = new Date();
    const scheduled = new Date(scheduledDate);
    const diffTime = scheduled.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
};
