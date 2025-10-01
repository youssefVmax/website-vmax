import { notificationService } from './mysql-notifications-service'
import { userService } from './mysql-services'

export interface TeamNotificationOptions {
  title: string
  message: string
  type: 'deal' | 'callback' | 'info' | 'warning' | 'success' | 'error'
  priority?: 'low' | 'medium' | 'high'
  teamName?: string
  dealId?: string
  dealName?: string
  dealValue?: number
  callbackId?: string
  from?: string
  fromAvatar?: string
}

class TeamNotificationService {
  /**
   * Send notification to team leaders and managers for team-specific events
   */
  async notifyTeamLeaders(options: TeamNotificationOptions): Promise<void> {
    try {
      const {
        title,
        message,
        type,
        priority = 'medium',
        teamName,
        dealId,
        dealName,
        dealValue,
        callbackId,
        from = 'System',
        fromAvatar
      } = options

      // Get all users to find team leaders and managers
      const allUsers = await userService.getAllUsers()
      
      // Find team leaders for the specific team
      const teamLeaders = allUsers.filter(user => 
        user.role === 'team_leader' && 
        (user.managedTeam === teamName || user.team === teamName)
      )
      
      // Find managers (they see all notifications)
      const managers = allUsers.filter(user => user.role === 'manager')
      
      // Combine recipients
      const recipients = [...teamLeaders, ...managers]
      
      if (recipients.length === 0) {
        console.log('No team leaders or managers found for notification')
        return
      }

      // Create notification for each recipient
      for (const recipient of recipients) {
        const notification = {
          title,
          message: `${message}${teamName ? ` (Team: ${teamName})` : ''}`,
          type,
          priority,
          from,
          fromAvatar,
          to: [recipient.id],
          userId: recipient.id,
          userRole: recipient.role,
          isRead: false,
          dealId,
          dealName,
          dealValue,
          callbackId,
          teamName,
          isManagerMessage: false,
          actionRequired: type === 'deal' || type === 'callback'
        }

        await notificationService.addNotification(notification)
      }

      console.log(`Team notification sent to ${recipients.length} recipients for team: ${teamName}`)
    } catch (error) {
      console.error('Error sending team notification:', error)
    }
  }

  /**
   * Notify when a new deal is created for a team
   */
  async notifyNewDeal(dealData: {
    dealId: string
    dealName: string
    dealValue: number
    teamName: string
    salesAgent: string
  }): Promise<void> {
    await this.notifyTeamLeaders({
      title: 'New Deal Created',
      message: `${dealData.salesAgent} created a new deal: ${dealData.dealName} worth $${dealData.dealValue.toLocaleString()}`,
      type: 'deal',
      priority: 'medium',
      teamName: dealData.teamName,
      dealId: dealData.dealId,
      dealName: dealData.dealName,
      dealValue: dealData.dealValue,
      from: dealData.salesAgent
    })
  }

  /**
   * Notify when a deal is updated or closed
   */
  async notifyDealUpdate(dealData: {
    dealId: string
    dealName: string
    dealValue: number
    teamName: string
    salesAgent: string
    status: string
    updateType: 'updated' | 'closed' | 'approved'
  }): Promise<void> {
    const typeMap = {
      'updated': 'info' as const,
      'closed': 'success' as const,
      'approved': 'success' as const
    }

    await this.notifyTeamLeaders({
      title: `Deal ${dealData.updateType.charAt(0).toUpperCase() + dealData.updateType.slice(1)}`,
      message: `${dealData.salesAgent} ${dealData.updateType} deal: ${dealData.dealName} worth $${dealData.dealValue.toLocaleString()}`,
      type: typeMap[dealData.updateType],
      priority: dealData.updateType === 'closed' ? 'high' : 'medium',
      teamName: dealData.teamName,
      dealId: dealData.dealId,
      dealName: dealData.dealName,
      dealValue: dealData.dealValue,
      from: dealData.salesAgent
    })
  }

  /**
   * Notify when a new callback is created for a team
   */
  async notifyNewCallback(callbackData: {
    callbackId: string
    customerName: string
    teamName: string
    salesAgent: string
    priority?: 'low' | 'medium' | 'high'
  }): Promise<void> {
    await this.notifyTeamLeaders({
      title: 'New Callback Created',
      message: `${callbackData.salesAgent} created a new callback for ${callbackData.customerName}`,
      type: 'callback',
      priority: callbackData.priority || 'medium',
      teamName: callbackData.teamName,
      callbackId: callbackData.callbackId,
      from: callbackData.salesAgent
    })
  }

  /**
   * Notify when a callback is completed or converted
   */
  async notifyCallbackUpdate(callbackData: {
    callbackId: string
    customerName: string
    teamName: string
    salesAgent: string
    status: 'completed' | 'converted' | 'cancelled'
  }): Promise<void> {
    const statusMessages = {
      'completed': 'completed callback for',
      'converted': 'converted callback to deal for',
      'cancelled': 'cancelled callback for'
    };

    const statusTypes = {
      'completed': 'success' as const,
      'converted': 'success' as const,
      'cancelled': 'warning' as const
    };

    await this.notifyTeamLeaders({
      title: `Callback ${callbackData.status.charAt(0).toUpperCase() + callbackData.status.slice(1)}`,
      message: `${callbackData.salesAgent} ${statusMessages[callbackData.status]} ${callbackData.customerName}`,
      type: statusTypes[callbackData.status],
      priority: callbackData.status === 'converted' ? 'high' : 'medium',
      teamName: callbackData.teamName,
      callbackId: callbackData.callbackId,
      from: callbackData.salesAgent
    })
  }

  /**
   * Send general team announcement
   */
  async sendTeamAnnouncement(announcementData: {
    title: string
    message: string
    teamName?: string
    priority?: 'low' | 'medium' | 'high'
    from: string
    fromAvatar?: string
  }): Promise<void> {
    await this.notifyTeamLeaders({
      title: announcementData.title,
      message: announcementData.message,
      type: 'info',
      priority: announcementData.priority || 'medium',
      teamName: announcementData.teamName,
      from: announcementData.from,
      fromAvatar: announcementData.fromAvatar
    })
  }
}

export const teamNotificationService = new TeamNotificationService()
