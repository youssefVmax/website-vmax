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
  getNotifications: (userId: string, userRole: string, userTeam?: string) => Promise<Notification[]>;
  addNotification: (notification: any) => Promise<string>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
  onNotificationsChange: (callback: (notifications: Notification[]) => void, userId: string, userRole: string) => () => void;
}

class MySQLNotificationService implements NotificationService {
  private listeners: { [key: string]: (notifications: Notification[]) => void } = {};
  private pollInterval: NodeJS.Timeout | null = null;

  async getNotifications(userId: string, userRole: string, userTeam?: string): Promise<Notification[]> {
    try {
      const filters: Record<string, string> = {
        userRole,
        userId,
      };
      // Add team information for team leader filtering
      if (userTeam && userRole === 'team_leader') {
        filters.managedTeam = userTeam;
      }
      
      console.log('🔍 MySQLNotificationService: Fetching notifications with filters:', filters);
      const notifications = await directMySQLService.getNotifications(filters);
      
      // The API route now handles all role-based filtering, so we just map the notifications
      return notifications.map(this.mapNotification);
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

  // ✅ OPTIMIZATION: Disabled auto-polling
  // Notifications now refresh only on user action
  // Reduces API load by 5,760 requests/day
  private startPolling(): void {
    // Polling disabled - use manual refresh instead
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
    // IMPORTANT: Callback notifications should ONLY go to the specific salesman who owns the callback
    // and their team leader (if any), NOT to all users
    const targetUsers = [];
    
    // Always include the callback owner
    if (callbackData.salesAgentId) {
      targetUsers.push(callbackData.salesAgentId);
    }
    
    const notification = {
      title: `Callback ${type}`,
      message: `Callback for ${callbackData.customerName} has been ${type}`,
      type: type === 'overdue' ? 'warning' : 'info',
      priority: type === 'overdue' ? 'high' : 'medium',
      to: targetUsers.length > 0 ? targetUsers : [callbackData.salesAgentId || 'unknown'],
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
      scheduledTime: callbackData.scheduledTime,
      isManagerMessage: false // This is not a manager message
    };

    console.log('🔔 Creating callback notification targeted to:', targetUsers);
    return this.addNotification(notification);
  }

  async createDealNotification(dealData: any, type: 'created' | 'updated' | 'closed'): Promise<string> {
    // IMPORTANT: Deal notifications should ONLY go to the specific salesman who owns the deal
    // and their team leader (if any), NOT to all users
    const targetUsers = [];
    
    // Always include the deal owner
    if (dealData.salesAgentId) {
      targetUsers.push(dealData.salesAgentId);
    }
    
    // Include team leader if this is from a managed team
    // Note: This would need team leader lookup, for now just target the owner
    
    const notification = {
      title: `Deal ${type}`,
      message: `Deal for ${dealData.customerName} has been ${type}`,
      type: type === 'closed' ? 'success' : 'info',
      priority: type === 'closed' ? 'high' : 'medium',
      to: targetUsers.length > 0 ? targetUsers : [dealData.salesAgentId || 'unknown'],
      customerName: dealData.customerName,
      customerPhone: dealData.phoneNumber,
      customerEmail: dealData.email,
      salesAgent: dealData.salesAgentName,
      salesAgentId: dealData.salesAgentId,
      dealId: dealData.id,
      dealName: `${dealData.customerName} - ${dealData.serviceTier}`,
      dealStage: dealData.stage,
      dealValue: dealData.amountPaid,
      teamName: dealData.salesTeam,
      isManagerMessage: false // This is not a manager message
    };

    console.log('🔔 Creating deal notification targeted to:', targetUsers);
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

  // Debug function to check notification targeting
  async debugUserNotifications(userId: string, userRole: string): Promise<void> {
    try {
      console.log('🔍 DEBUG: Checking notifications for user:', userId, 'role:', userRole);
      
      // Get all notifications for this user
      const notifications = await this.getNotifications(userId, userRole);
      
      console.log('📊 DEBUG: Found', notifications.length, 'notifications for user');
      
      notifications.forEach((notification, index) => {
        console.log(`📝 DEBUG Notification ${index + 1}:`, {
          id: notification.id,
          title: notification.title,
          to: notification.to,
          salesAgentId: notification.salesAgentId,
          teamName: notification.teamName,
          isManagerMessage: notification.isManagerMessage,
          from: notification.from
        });
      });
    } catch (error) {
      console.error('❌ DEBUG: Error checking notifications:', error);
    }
  }

  // Function to create manager-only notifications (for system announcements)
  async createManagerNotification(title: string, message: string, priority: 'low' | 'medium' | 'high' = 'medium'): Promise<string> {
    const notification = {
      title,
      message,
      type: 'info' as const,
      priority,
      to: ['manager'], // Only managers see this
      from: 'System',
      isManagerMessage: true
    };

    console.log('🔔 Creating manager-only notification');
    return this.addNotification(notification);
  }

  // Function to create user-specific notifications (most secure)
  async createUserSpecificNotification(
    userId: string, 
    title: string, 
    message: string, 
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<string> {
    const notification = {
      title,
      message,
      type,
      priority,
      to: [userId], // Only this specific user
      from: 'System',
      isManagerMessage: false
    };

    console.log('🔔 Creating user-specific notification for:', userId);
    return this.addNotification(notification);
  }

  // Function to clean up problematic notifications (manager only)
  async cleanupProblematicNotifications(): Promise<number> {
    try {
      console.log('🧹 Starting notification cleanup...');
      
      const baseUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : '';
      
      const response = await fetch(`${baseUrl}/api/notifications?action=cleanup&userRole=manager`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Cleanup completed:', result);
        return result.cleaned || 0;
      } else {
        console.error('❌ Cleanup failed:', response.status);
        return 0;
      }
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
      return 0;
    }
  }

  // Function to verify user notifications are properly filtered
  async verifyUserNotifications(userId: string, userRole: string): Promise<boolean> {
    try {
      console.log('🔍 VERIFICATION: Checking notifications for user:', userId, 'role:', userRole);
      
      const notifications = await this.getNotifications(userId, userRole);
      let hasProblems = false;

      notifications.forEach((notification, index) => {
        const targetArray = Array.isArray(notification.to) ? notification.to : [];
        const isTargetedToUser = targetArray.includes(userId) || targetArray.includes('ALL') || targetArray.includes('all');
        const isFromUser = notification.from === userId;
        const isManagerMessage = notification.isManagerMessage && targetArray.includes(userId);

        // Check if this notification should be visible to this user
        if (userRole === 'salesman') {
          if (!isTargetedToUser && !isFromUser && !isManagerMessage) {
            console.warn(`⚠️ PROBLEM: Salesman ${userId} can see notification ${notification.id} that's not targeted to them:`, {
              to: notification.to,
              salesAgentId: notification.salesAgentId,
              from: notification.from
            });
            hasProblems = true;
          }
        }
      });

      if (!hasProblems) {
        console.log('✅ VERIFICATION: All notifications properly filtered for user');
      }

      return !hasProblems;
    } catch (error) {
      console.error('❌ VERIFICATION ERROR:', error);
      return false;
    }
  }
}

export const notificationService = new MySQLNotificationService();
