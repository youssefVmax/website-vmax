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
}

export interface Notification {
  id?: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  userId?: string;
  userRole?: string;
  isRead: boolean;
  created_at?: Timestamp;
  expires_at?: Timestamp;
}

export interface Target {
  id?: string;
  agentId: string;
  agentName: string;
  team: string;
  monthlyTarget: number;
  dealsTarget: number;
  period: string;
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
  SETTINGS: 'settings'
} as const;
