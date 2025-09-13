import { Timestamp } from 'firebase/firestore';

// Firebase document interfaces
export interface Sale {
  id?: string;
  date: string;
  customer_name: string;
  amount: number;
  sales_agent: string;
  closing_agent: string;
  team: string;
  type_service: string;
  sales_agent_norm: string;
  closing_agent_norm: string;
  SalesAgentID: string;
  ClosingAgentID: string;
  DealID: string;
  email?: string;
  phone?: string;
  country?: string;
  duration_months?: number;
  type_program?: string;
  invoice?: string;
  created_at?: Timestamp;
  updated_at?: Timestamp;
}

// Enhanced Deal interface for comprehensive tracking with all required columns
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
  // Optional device identifier for the service
  device_key?: string;
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

export interface User {
  id?: string;
  name: string;
  email: string;
  role: 'manager' | 'salesman' | 'customer-service';
  team?: string;
  SalesAgentID?: string;
  ClosingAgentID?: string;
  created_at?: Timestamp;
  updated_at?: Timestamp;
  isActive?: boolean;
  username?: string;
  phone?: string;
  created_by?: string;
}

export interface Notification {
  id?: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'deal' | 'message';
  priority?: 'low' | 'medium' | 'high';
  from?: string;
  fromAvatar?: string;
  to?: string[];
  userId?: string;
  userRole?: string;
  isRead: boolean;
  dealId?: string;
  dealName?: string;
  dealStage?: string;
  dealValue?: number;
  salesAgent?: string;
  salesAgentId?: string;
  closingAgent?: string;
  closingAgentId?: string;
  createdBy?: string;
  isManagerMessage?: boolean;
  actionRequired?: boolean;
  created_at?: Timestamp;
  expires_at?: Timestamp;
}

export interface Target {
  id?: string;
  type: 'individual' | 'team';
  // For individual targets
  agentId?: string;
  agentName?: string;
  // For team targets
  teamId?: string;
  teamName?: string;
  // Common fields
  monthlyTarget: number;
  dealsTarget: number;
  period: string;
  description?: string;
  managerId: string;
  managerName: string;
  created_at?: Timestamp;
  updated_at?: Timestamp;
}

export interface TeamTarget {
  id?: string;
  teamId: string;
  teamName: string;
  monthlyTarget: number;
  dealsTarget: number;
  period: string;
  description?: string;
  managerId: string;
  managerName: string;
  members: string[]; // Array of user IDs in the team
  created_at?: Timestamp;
  updated_at?: Timestamp;
}

export interface Settings {
  id?: string;
  userId: string;
  theme: 'light' | 'dark';
  notifications: boolean;
  emailAlerts: boolean;
  dashboardLayout: string;
  created_at?: Timestamp;
  updated_at?: Timestamp;
}

// Metrics interfaces
export interface SalesMetrics {
  totalSales: number;
  totalDeals: number;
  averageDealSize: number;
  salesByAgent: Record<string, number>;
  salesByService: Record<string, number>;
  recentSales: Sale[];
}

// Firebase collection names
export const COLLECTIONS = {
  SALES: 'sales',
  USERS: 'users',
  NOTIFICATIONS: 'notifications',
  TARGETS: 'targets',
  SETTINGS: 'settings',
  CALLBACKS: 'callbacks'
} as const;
