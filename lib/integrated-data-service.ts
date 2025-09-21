import { callbacksService, Callback } from './mysql-callbacks-service';
import { dealsService } from './mysql-deals-service';
import { mysqlAnalyticsService } from './mysql-analytics-service';

export interface IntegratedDataService {
  // Callback operations
  createCallback: (callbackData: Omit<Callback, 'id' | 'created_at' | 'updated_at'>) => Promise<string>;
  updateCallback: (id: string, updates: Partial<Callback>) => Promise<void>;
  getCallbacks: (userRole?: string, userId?: string, userName?: string) => Promise<Callback[]>;
  
  // Deal operations with callback integration
  createDealFromCallback: (callbackId: string, dealData: any, user: any) => Promise<string>;
  
  // Analytics operations
  getCallbackAnalytics: (filters?: any) => Promise<any>;
  getLiveMetrics: () => Promise<any>;
  
  // Real-time listeners
  onDataChange: (callback: (data: { callbacks: Callback[]; analytics: any }) => void, userRole?: string, userId?: string, userName?: string) => () => void;
}

class IntegratedDataServiceImpl implements IntegratedDataService {
  
  async createCallback(callbackData: Omit<Callback, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    try {
      const callbackId = await callbacksService.addCallback(callbackData);
      
      // Trigger analytics refresh
      this.refreshAnalytics();
      
      return callbackId;
    } catch (error) {
      console.error('Error creating callback:', error);
      throw error;
    }
  }
  
  async updateCallback(id: string, updates: Partial<Callback>): Promise<void> {
    try {
      await callbacksService.updateCallback(id, updates);
      
      // Trigger analytics refresh
      this.refreshAnalytics();
    } catch (error) {
      console.error('Error updating callback:', error);
      throw error;
    }
  }
  
  async getCallbacks(userRole?: string, userId?: string, userName?: string): Promise<Callback[]> {
    try {
      return await callbacksService.getCallbacks(userRole, userId, userName);
    } catch (error) {
      console.error('Error fetching callbacks:', error);
      throw error;
    }
  }
  
  async createDealFromCallback(callbackId: string, dealData: any, user: any): Promise<string> {
    try {
      // Create the deal
      const dealId = await dealsService.createDeal(dealData, user);
      
      // Update callback to mark as converted
      await callbacksService.updateCallback(callbackId, {
        status: 'completed',
        callbackNotes: 'Converted to deal'
      });
      
      // Trigger analytics refresh
      this.refreshAnalytics();
      
      return dealId;
    } catch (error) {
      console.error('Error creating deal from callback:', error);
      throw error;
    }
  }
  
  async getCallbackAnalytics(filters?: any): Promise<any> {
    try {
      return await mysqlAnalyticsService.getCallbackKPIs(filters);
    } catch (error) {
      console.error('Error fetching callback analytics:', error);
      throw error;
    }
  }
  
  async getLiveMetrics(): Promise<any> {
    try {
      return await mysqlAnalyticsService.getLiveCallbackMetrics();
    } catch (error) {
      console.error('Error fetching live metrics:', error);
      throw error;
    }
  }
  
  onDataChange(
    callback: (data: { callbacks: Callback[]; analytics: any }) => void,
    userRole?: string,
    userId?: string,
    userName?: string
  ): () => void {
    let currentCallbacks: Callback[] = [];
    let currentAnalytics: any = null;
    
    // Listen to callback changes
    const unsubscribeCallbacks = callbacksService.onCallbacksChange(
      async (callbacks) => {
        currentCallbacks = callbacks;
        
        // Refresh analytics when callbacks change
        try {
          const analytics = await this.getCallbackAnalytics({
            userRole,
            userId
          });
          currentAnalytics = analytics;
        } catch (error) {
          console.error('Error refreshing analytics:', error);
        }
        
        callback({
          callbacks: currentCallbacks,
          analytics: currentAnalytics
        });
      },
      userRole,
      userId,
      userName
    );
    
    // Return cleanup function
    return () => {
      unsubscribeCallbacks();
    };
  }
  
  private async refreshAnalytics(): Promise<void> {
    // This method can be used to trigger analytics refresh
    // Currently, analytics are refreshed automatically via real-time listeners
  }
}

export const integratedDataService = new IntegratedDataServiceImpl();

// Utility functions for data consistency
export const DataUtils = {
  // Normalize callback data for consistency
  normalizeCallback: (callback: any): Callback => {
    return {
      id: callback.id,
      customerName: callback.customer_name || callback.customerName || '',
      phoneNumber: callback.phone_number || callback.phoneNumber || '',
      email: callback.email || '',
      salesAgentName: callback.sales_agent || callback.salesAgentName || '',
      salesTeam: callback.sales_team || callback.salesTeam || '',
      firstCallDate: callback.first_call_date || callback.firstCallDate || '',
      firstCallTime: callback.first_call_time || callback.firstCallTime || '',
      callbackNotes: callback.callback_notes || callback.callbackNotes || '',
      callbackReason: callback.callback_reason || callback.callbackReason || '',
      status: callback.status || 'pending',
      createdBy: callback.created_by || callback.createdBy || '',
      createdById: callback.created_by_id || callback.createdById || '',
      salesAgentId: callback.SalesAgentID || callback.salesAgentId || '',
      createdAt: callback.created_at || callback.createdAt,
      updatedAt: callback.updated_at || callback.updatedAt,
      scheduledDate: callback.scheduledDate,
      scheduledTime: callback.scheduledTime,
      priority: callback.priority || 'medium',
      followUpRequired: callback.followUpRequired || false
    };
  },
  
  // Convert callback to deal data
  callbackToDealData: (callback: Callback, additionalData: any = {}): any => {
    return {
      customerName: callback.customerName,
      phoneNumber: callback.phoneNumber,
      email: callback.email,
      salesAgentName: callback.salesAgentName,
      salesTeam: callback.salesTeam,
      salesAgentId: callback.salesAgentId,
      createdBy: callback.createdBy,
      createdById: callback.createdById,
      notes: `Converted from callback: ${callback.callbackNotes}`,
      status: 'active',
      stage: 'qualified',
      priority: 'high',
      ...additionalData
    };
  },
  
  // Validate callback data
  validateCallbackData: (data: Partial<Callback>): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!data.customerName?.trim()) {
      errors.push('Customer name is required');
    }
    
    if (!data.phoneNumber?.trim()) {
      errors.push('Phone number is required');
    }
    
    if (!data.salesAgentName?.trim()) {
      errors.push('Sales agent is required');
    }
    
    if (!data.callbackReason?.trim()) {
      errors.push('Callback reason is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

// Event emitter for cross-component communication
class DataEventEmitter {
  private listeners: { [event: string]: Function[] } = {};
  
  on(event: string, callback: Function): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners[event]?.indexOf(callback);
      if (index !== undefined && index > -1) {
        this.listeners[event].splice(index, 1);
      }
    };
  }
  
  emit(event: string, data?: any): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }
}

export const dataEventEmitter = new DataEventEmitter();

// Event types for type safety
export const DATA_EVENTS = {
  CALLBACK_CREATED: 'callback_created',
  CALLBACK_UPDATED: 'callback_updated',
  CALLBACK_CONVERTED: 'callback_converted',
  DEAL_CREATED: 'deal_created',
  ANALYTICS_UPDATED: 'analytics_updated'
} as const;
