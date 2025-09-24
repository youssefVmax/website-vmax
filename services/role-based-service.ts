import { User } from "@/lib/auth"

export interface RolePermissions {
  canExport: boolean
  canCreateNotifications: boolean
  canManageUsers: boolean
  canViewAllPerformance: boolean
  canAssignTargets: boolean
  canRespondToFeedback: boolean
  canSubmitFeedback: boolean
  dataAccess: {
    deals: { own: boolean; team: boolean; all: boolean }
    callbacks: { own: boolean; team: boolean; all: boolean }
    targets: { own: boolean; team: boolean; all: boolean }
    notifications: { own: boolean; team: boolean; all: boolean }
    feedback: { own: boolean; team: boolean; all: boolean }
    analytics: { own: boolean; team: boolean; all: boolean }
  }
}

export class RoleBasedService {
  static getPermissions(userRole: string): RolePermissions {
    switch (userRole) {
      case 'manager':
        return {
          canExport: true,
          canCreateNotifications: true,
          canManageUsers: true,
          canViewAllPerformance: true,
          canAssignTargets: true,
          canRespondToFeedback: true,
          canSubmitFeedback: true,
          dataAccess: {
            deals: { own: true, team: true, all: true },
            callbacks: { own: true, team: true, all: true },
            targets: { own: true, team: true, all: true },
            notifications: { own: true, team: true, all: true },
            feedback: { own: true, team: true, all: true },
            analytics: { own: true, team: true, all: true }
          }
        }
      
      case 'team_leader':
        return {
          canExport: false,
          canCreateNotifications: false,
          canManageUsers: false,
          canViewAllPerformance: false,
          canAssignTargets: false,
          canRespondToFeedback: false,
          canSubmitFeedback: true,
          dataAccess: {
            deals: { own: true, team: true, all: false },
            callbacks: { own: true, team: true, all: false },
            targets: { own: true, team: true, all: false },
            notifications: { own: true, team: false, all: false },
            feedback: { own: true, team: false, all: false },
            analytics: { own: true, team: true, all: false }
          }
        }
      
      case 'salesman':
        return {
          canExport: false,
          canCreateNotifications: false,
          canManageUsers: false,
          canViewAllPerformance: false,
          canAssignTargets: false,
          canRespondToFeedback: false,
          canSubmitFeedback: true,
          dataAccess: {
            deals: { own: true, team: false, all: false },
            callbacks: { own: true, team: false, all: false },
            targets: { own: true, team: false, all: false },
            notifications: { own: true, team: false, all: false },
            feedback: { own: true, team: false, all: false },
            analytics: { own: true, team: false, all: false }
          }
        }
      
      default:
        return {
          canExport: false,
          canCreateNotifications: false,
          canManageUsers: false,
          canViewAllPerformance: false,
          canAssignTargets: false,
          canRespondToFeedback: false,
          canSubmitFeedback: false,
          dataAccess: {
            deals: { own: false, team: false, all: false },
            callbacks: { own: false, team: false, all: false },
            targets: { own: false, team: false, all: false },
            notifications: { own: false, team: false, all: false },
            feedback: { own: false, team: false, all: false },
            analytics: { own: false, team: false, all: false }
          }
        }
    }
  }

  static buildApiParams(user: User, entityType: 'deals' | 'callbacks' | 'targets' | 'notifications' | 'feedback'): URLSearchParams {
    const params = new URLSearchParams()
    
    // Always include user info for role-based filtering
    params.append('userId', user.id.toString())
    params.append('userRole', user.role)
    
    // Add team info for team leaders
    if (user.role === 'team_leader' && user.managedTeam) {
      params.append('managedTeam', user.managedTeam)
    }
    
    return params
  }

  static async fetchData(
    endpoint: string, 
    user: User, 
    entityType: 'deals' | 'callbacks' | 'targets' | 'notifications' | 'feedback',
    additionalParams?: Record<string, string>
  ) {
    const params = this.buildApiParams(user, entityType)
    
    // Add any additional parameters
    if (additionalParams) {
      Object.entries(additionalParams).forEach(([key, value]) => {
        params.append(key, value)
      })
    }
    
    const response = await fetch(`${endpoint}?${params}`)
    return response.json()
  }

  static async createData(
    endpoint: string,
    user: User,
    data: any
  ) {
    // Add user context to the data
    const enrichedData = {
      ...data,
      createdById: user.id,
      createdBy: user.name,
      salesAgentId: user.role === 'salesman' ? user.id : data.salesAgentId,
      salesAgent: user.role === 'salesman' ? user.name : data.salesAgent,
      salesTeam: user.role === 'salesman' ? user.team : data.salesTeam
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(enrichedData)
    })
    
    return response.json()
  }

  static async updateData(
    endpoint: string,
    user: User,
    id: string,
    updates: any
  ) {
    // Check permissions before updating
    const permissions = this.getPermissions(user.role)
    
    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id,
        ...updates,
        updatedBy: user.name,
        updatedById: user.id
      })
    })
    
    return response.json()
  }

  static async deleteData(
    endpoint: string,
    user: User,
    id: string
  ) {
    // Check permissions before deleting
    const permissions = this.getPermissions(user.role)
    
    const response = await fetch(`${endpoint}?id=${id}`, {
      method: 'DELETE'
    })
    
    return response.json()
  }

  static canUserEdit(user: User, item: any, entityType: 'deals' | 'callbacks'): boolean {
    const permissions = this.getPermissions(user.role)
    
    // Managers can edit everything
    if (user.role === 'manager') {
      return true
    }
    
    // Team leaders can edit their own items
    if (user.role === 'team_leader') {
      return item.SalesAgentID === user.id || item.salesAgentId === user.id
    }
    
    // Salesmen can edit their own items
    if (user.role === 'salesman') {
      return item.SalesAgentID === user.id || item.salesAgentId === user.id
    }
    
    return false
  }

  static canUserDelete(user: User, item: any, entityType: 'deals' | 'callbacks'): boolean {
    // Same logic as edit for now
    return this.canUserEdit(user, item, entityType)
  }

  static getFilteredColumns(user: User, entityType: 'deals' | 'callbacks') {
    const baseColumns = {
      deals: [
        { key: 'id', label: 'ID', editable: false },
        { key: 'customer_name', label: 'Customer', type: 'text' as const },
        { key: 'amount_paid', label: 'Amount', type: 'number' as const },
        { 
          key: 'status', 
          label: 'Status', 
          type: 'select' as const,
          options: [
            { value: 'active', label: 'Active' },
            { value: 'pending', label: 'Pending' },
            { value: 'closed', label: 'Closed' },
            { value: 'cancelled', label: 'Cancelled' }
          ]
        },
        { 
          key: 'stage', 
          label: 'Stage', 
          type: 'select' as const,
          options: [
            { value: 'prospect', label: 'Prospect' },
            { value: 'qualified', label: 'Qualified' },
            { value: 'proposal', label: 'Proposal' },
            { value: 'negotiation', label: 'Negotiation' },
            { value: 'closed', label: 'Closed' }
          ]
        },
        { key: 'sales_agent', label: 'Agent', editable: false },
        { key: 'created_at', label: 'Created', type: 'date' as const, editable: false }
      ],
      callbacks: [
        { key: 'id', label: 'ID', editable: false },
        { key: 'customer_name', label: 'Customer', type: 'text' as const },
        { key: 'phone_number', label: 'Phone', type: 'text' as const },
        { 
          key: 'status', 
          label: 'Status', 
          type: 'select' as const,
          options: [
            { value: 'pending', label: 'Pending' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' }
          ]
        },
        { 
          key: 'priority', 
          label: 'Priority', 
          type: 'select' as const,
          options: [
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
            { value: 'urgent', label: 'Urgent' }
          ]
        },
        { key: 'callback_notes', label: 'Notes', type: 'textarea' as const },
        { key: 'scheduled_date', label: 'Scheduled', type: 'date' as const },
        { key: 'sales_agent', label: 'Agent', editable: false }
      ]
    }

    // For now, return all columns. In the future, we could filter based on role
    return baseColumns[entityType]
  }

  static getDashboardTabs(user: User): Array<{ key: string; label: string; icon?: string }> {
    switch (user.role) {
      case 'manager':
        return [
          { key: 'all_deals', label: 'All Deals', icon: 'deals' },
          { key: 'all_callbacks', label: 'All Callbacks', icon: 'callbacks' },
          { key: 'team_performance', label: 'Team Performance', icon: 'analytics' },
          { key: 'notifications', label: 'Notifications', icon: 'notifications' },
          { key: 'feedback', label: 'Feedback', icon: 'feedback' }
        ]
      
      case 'team_leader':
        return [
          { key: 'my_deals', label: 'My Deals', icon: 'deals' },
          { key: 'my_callbacks', label: 'My Callbacks', icon: 'callbacks' },
          { key: 'team_deals', label: 'Team Deals', icon: 'team' },
          { key: 'team_callbacks', label: 'Team Callbacks', icon: 'team' },
          { key: 'notifications', label: 'Notifications', icon: 'notifications' },
          { key: 'feedback', label: 'Feedback', icon: 'feedback' }
        ]
      
      case 'salesman':
        return [
          { key: 'my_deals', label: 'My Deals', icon: 'deals' },
          { key: 'my_callbacks', label: 'My Callbacks', icon: 'callbacks' },
          { key: 'my_performance', label: 'My Performance', icon: 'analytics' },
          { key: 'notifications', label: 'Notifications', icon: 'notifications' },
          { key: 'feedback', label: 'Feedback', icon: 'feedback' }
        ]
      
      default:
        return []
    }
  }
}
