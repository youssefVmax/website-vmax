/**
 * Standardized User Types and Role System
 * This file defines the canonical user types used throughout the application
 */

// Standardized role enum - this is the single source of truth
export type UserRole = 'manager' | 'team_leader' | 'salesman' 

// Role constants for consistent usage
export const USER_ROLES = {
  MANAGER: 'manager' as const,
  TEAM_LEADER: 'team_leader' as const,
  SALESMAN: 'salesman' as const,
} as const;

// Role display names
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  manager: 'Manager',
  team_leader: 'Team Leader',
  salesman: 'Salesman',

};

// Role permissions
export interface RolePermissions {
  canViewAllData: boolean;
  canEditAllData: boolean;
  canExportData: boolean;
  canManageUsers: boolean;
  canViewTeamData: boolean;
  canEditOwnData: boolean;
  canCreateNotifications: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  manager: {
    canViewAllData: true,
    canEditAllData: true,
    canExportData: true,
    canManageUsers: true,
    canViewTeamData: true,
    canEditOwnData: true,
    canCreateNotifications: true,
  },
  team_leader: {
    canViewAllData: false,
    canEditAllData: false,
    canExportData: false,
    canManageUsers: false,
    canViewTeamData: true,
    canEditOwnData: true,
    canCreateNotifications: false,
  },
  salesman: {
    canViewAllData: false,
    canEditAllData: false,
    canExportData: false,
    canManageUsers: false,
    canViewTeamData: false,
    canEditOwnData: true,
    canCreateNotifications: false,
  }
};

// User interface
export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  team?: string;
  managedTeam?: string; // For team leaders
  password?: string;
  created_by?: string;
  is_active?: boolean;
  created_at?: Date;
  updated_at?: Date;
  
  // Backward compatibility properties
  full_name?: string;
  team_name?: string;
  team_id?: number;
}

// Authentication response
export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
}

// Role validation functions
export function isValidRole(role: string): role is UserRole {
  return Object.values(USER_ROLES).includes(role as UserRole);
}

export function hasPermission(userRole: UserRole, permission: keyof RolePermissions): boolean {
  return ROLE_PERMISSIONS[userRole][permission];
}

export function canAccessData(userRole: UserRole, dataOwnerId?: string, userId?: string, managedTeam?: string, dataTeam?: string): boolean {
  // Managers can access all data
  if (userRole === USER_ROLES.MANAGER) {
    return true;
  }
  
  // Users can always access their own data
  if (dataOwnerId && userId && dataOwnerId === userId) {
    return true;
  }
  
  // Team leaders can access their managed team's data
  if (userRole === USER_ROLES.TEAM_LEADER && managedTeam && dataTeam && managedTeam === dataTeam) {
    return true;
  }
  
  // Salesmen can only access their own data
  return false;
}

// Team constants
export const TEAMS = {
  ALI_ASHRAF: 'ALI ASHRAF',
  CS_TEAM: 'CS TEAM',
  MANAGEMENT: 'MANAGEMENT',
} as const;

export type TeamName = typeof TEAMS[keyof typeof TEAMS];

// Export for backward compatibility
export type { UserRole as Role };
