import directMySQLService from './direct-mysql-service';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  priority: 'low' | 'medium' | 'high';
  from: string;
  fromAvatar?: string;
  to: string[];
  timestamp: Date;
  isRead: boolean;
  actionRequired?: boolean;
  
  // Deal-related fields
  dealId?: string;
  dealName?: string;
  dealStage?: string;
  dealValue?: number;
  
  // Callback-related fields
  callbackId?: string;
  callbackStatus?: string;
  callbackReason?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  
  // Sales-related fields
  salesAgent?: string;
  salesAgentId?: string;
  teamName?: string;
  
  // Target-related fields
  targetId?: string;
  
  // System fields
  isManagerMessage?: boolean;
  userRole?: string;
  scheduledDate?: string;
  scheduledTime?: string;
}

export interface NotificationService {
  getNotifications: (userId: string, userRole: string) => Promise<Notification[]>;
  addNotification: (notification: any) => Promise<string>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
  onNotificationsChange: (callback: (notifications: Notification[]) => void, userId: string, userRole: string) => () => void;
}

class MySQLNotificationService implements NotificationService {
  private listeners: { [key: string]: (notifications: Notification[]) => void } = {};
  private pollInterval: NodeJS.Timeout | null = null;

  async getNotifications(userId: string, userRole: string): Promise<Notification[]> {
    try {
      const filters: Record<string, string> = {
        userRole,
        userId,
      };
      // Filter notifications based on user role and targeting
      if (userRole !== 'manager') {
        // API supports userRole/userId filtering; no need to send 'to' explicitly, but keep as hint
        filters.to = userId;
      }
      const notifications = await directMySQLService.getNotifications(filters);
      
      return notifications.map(this.mapNotification).filter((notification: Notification) => {
        // Additional filtering logic
        if (userRole === 'manager') {
          return true; // Managers see all notifications
        }
        
        // Check if notification is targeted to this user
        const targetArray = Array.isArray(notification.to) ? notification.to : [];
        return targetArray.includes('ALL') || targetArray.includes(userId);
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  async addNotification(notification: any): Promise<string> {
    try {
      const notificationData = {
        title: notification.title,
        message: notification.message,
        type: notification.type || 'info',
        to: Array.isArray(notification.to) ? notification.to : [notification.to].filter(Boolean),
        from: notification.from || 'System',
        timestamp: notification.timestamp || new Date().toISOString(),
        isRead: notification.isRead || false,
        actionRequired: notification.actionRequired || false,
        
        // Optional fields
        customerName: notification.customerName,
        customerPhone: notification.customerPhone,
        customerEmail: notification.customerEmail,
        salesAgent: notification.salesAgent,
        salesAgentId: notification.salesAgentId,
        callbackId: notification.callbackId,
        callbackStatus: notification.callbackStatus,
        callbackReason: notification.callbackReason,
        priority: notification.priority || 'medium',
        scheduledDate: notification.scheduledDate,
        scheduledTime: notification.scheduledTime,
        teamName: notification.teamName,
        isManagerMessage: notification.isManagerMessage || false,
        targetId: notification.targetId,
        userRole: notification.userRole
      };

      const result = await directMySQLService.createNotification(notificationData);
      
      // Trigger listeners
      this.notifyListeners();
      
      return result.id;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  async markAsRead(id: string): Promise<void> {
    try {
      await directMySQLService.makeDirectRequest(`notifications`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isRead: true })
      });
      
      // Trigger listeners
      this.notifyListeners();
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    try {
      // Get all unread notifications for the user
      const notifications = await this.getNotifications(userId, 'salesman');
      const unreadNotifications = notifications.filter(n => !n.isRead);
      
      // Mark each as read
      await Promise.all(
        unreadNotifications.map(notification =>
          directMySQLService.makeDirectRequest('notifications', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: notification.id, isRead: true })
          })
        )
      );
      
      // Trigger listeners
      this.notifyListeners();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  onNotificationsChange(
    callback: (notifications: Notification[]) => void,
    userId: string,
    userRole: string
  ): () => void {
    const listenerId = `${userId}_${userRole}_${Date.now()}`;
    
    this.listeners[listenerId] = callback;
    
    // Start polling if not already started
    if (!this.pollInterval) {
      this.startPolling();
    }
    
    // Initial data fetch
    this.getNotifications(userId, userRole).then(callback);
    
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

  private startPolling(): void {
    this.pollInterval = setInterval(() => {
      this.notifyListeners();
    }, 15000); // Poll every 15 seconds
  }

  private async notifyListeners(): Promise<void> {
    for (const [listenerId, callback] of Object.entries(this.listeners)) {
      try {
        const [userId, userRole] = listenerId.split('_');
        const notifications = await this.getNotifications(userId, userRole);
        callback(notifications);
      } catch (error) {
        console.error('Error notifying listener:', error);
      }
    }
  }

  private mapNotification(data: any): Notification {
    return {
      id: data.id,
      title: data.title || '',
      message: data.message || '',
      type: data.type || 'info',
      priority: data.priority || 'medium',
      from: data.from || 'System',
      fromAvatar: data.fromAvatar,
      to: Array.isArray(data.to) ? data.to : (data.to ? JSON.parse(data.to) : []),
      timestamp: new Date(data.timestamp || data.created_at),
      isRead: data.isRead || false,
      actionRequired: data.actionRequired || false,
      
      // Optional fields
      dealId: data.dealId,
      dealName: data.dealName,
      dealStage: data.dealStage,
      dealValue: data.dealValue,
      callbackId: data.callbackId,
      callbackStatus: data.callbackStatus,
      callbackReason: data.callbackReason,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerEmail: data.customerEmail,
      salesAgent: data.salesAgent,
      salesAgentId: data.salesAgentId,
      teamName: data.teamName,
      targetId: data.targetId,
      isManagerMessage: data.isManagerMessage || false,
      userRole: data.userRole,
      scheduledDate: data.scheduledDate,
      scheduledTime: data.scheduledTime
    };
  }

  // Utility methods for creating specific notification types
  async createCallbackNotification(callbackData: any, type: 'created' | 'updated' | 'overdue'): Promise<string> {
    const notification = {
      title: `Callback ${type}`,
      message: `Callback for ${callbackData.customerName} has been ${type}`,
      type: type === 'overdue' ? 'warning' : 'info',
      priority: type === 'overdue' ? 'high' : 'medium',
      to: callbackData.salesAgentId ? [callbackData.salesAgentId] : ['ALL'],
      customerName: callbackData.customerName,
      customerPhone: callbackData.phoneNumber,
      customerEmail: callbackData.email,
      salesAgent: callbackData.salesAgentName,
      salesAgentId: callbackData.salesAgentId,
      callbackId: callbackData.id,
      callbackStatus: callbackData.status,
      callbackReason: callbackData.callbackReason,
      teamName: callbackData.salesTeam,
      scheduledDate: callbackData.scheduledDate,
      scheduledTime: callbackData.scheduledTime
    };

    return this.addNotification(notification);
  }

  async createDealNotification(dealData: any, type: 'created' | 'updated' | 'closed'): Promise<string> {
    const notification = {
      title: `Deal ${type}`,
      message: `Deal for ${dealData.customerName} has been ${type}`,
      type: type === 'closed' ? 'success' : 'info',
      priority: type === 'closed' ? 'high' : 'medium',
      to: dealData.salesAgentId ? [dealData.salesAgentId] : ['ALL'],
      customerName: dealData.customerName,
      customerPhone: dealData.phoneNumber,
      customerEmail: dealData.email,
      salesAgent: dealData.salesAgentName,
      salesAgentId: dealData.salesAgentId,
      dealId: dealData.id,
      dealName: `${dealData.customerName} - ${dealData.serviceTier}`,
      dealStage: dealData.stage,
      dealValue: dealData.amountPaid,
      teamName: dealData.salesTeam
    };

    return this.addNotification(notification);
  }

  async createTargetNotification(targetData: any, type: 'created' | 'updated' | 'achieved'): Promise<string> {
    const notification = {
      title: `Target ${type}`,
      message: `Sales target for ${targetData.agentName} has been ${type}`,
      type: type === 'achieved' ? 'success' : 'info',
      priority: type === 'achieved' ? 'high' : 'medium',
      to: [targetData.agentId, targetData.managerId],
      salesAgent: targetData.agentName,
      salesAgentId: targetData.agentId,
      targetId: targetData.id,
      isManagerMessage: true
    };

    return this.addNotification(notification);
  }
}

export const notificationService = new MySQLNotificationService();
