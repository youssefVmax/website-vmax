import { useState, useEffect } from 'react';

export interface Sale {
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
}

interface SalesMetrics {
  totalSales: number;
  totalDeals: number;
  averageDealSize: number;
  salesByAgent: Record<string, number>;
  salesByService: Record<string, number>;
  recentSales: Sale[];
}

export function useSalesData(userRole: string, userId?: string, userName?: string) {
  const [salesData, setSalesData] = useState<Sale[]>([]);
  const [metrics, setMetrics] = useState<SalesMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/sales');
        if (!response.ok) {
          throw new Error('Failed to fetch sales data');
        }
        let data = await response.json();
        
        // Filter data based on user role and exact name matching
        if (userRole === 'salesman' && userName) {
          // Match by exact normalized name for salesmen
          const normalizedUserName = userName.toLowerCase().trim();
          data = data.filter((sale: Sale) => {
            const salesAgentMatch = sale.sales_agent_norm?.toLowerCase().trim() === normalizedUserName;
            const closingAgentMatch = sale.closing_agent_norm?.toLowerCase().trim() === normalizedUserName;
            const idMatch = sale.SalesAgentID === userId || sale.ClosingAgentID === userId;
            
            return salesAgentMatch || closingAgentMatch || idMatch;
          });
        } else if (userRole === 'customer-service' && userName) {
          // Customer service sees deals they're involved in as closing agents
          const normalizedUserName = userName.toLowerCase().trim();
          data = data.filter((sale: Sale) => {
            const closingAgentMatch = sale.closing_agent_norm?.toLowerCase().trim() === normalizedUserName;
            const idMatch = sale.ClosingAgentID === userId;
            
            return closingAgentMatch || idMatch;
          });
        }
        // Manager sees all data (no filter)
        
        setSalesData(data);
        
        // Calculate metrics
        const totalSales = data.reduce((sum: number, sale: Sale) => sum + (sale.amount || 0), 0);
        const totalDeals = data.length;
        const averageDealSize = totalDeals > 0 ? totalSales / totalDeals : 0;
        
        // Group by agent
        const salesByAgent = data.reduce((acc: Record<string, number>, sale: Sale) => {
          const agent = sale.sales_agent || 'Unknown';
          acc[agent] = (acc[agent] || 0) + (sale.amount || 0);
          return acc;
        }, {});
        
        // Group by service
        const salesByService = data.reduce((acc: Record<string, number>, sale: Sale) => {
          const service = sale.type_service || 'Other';
          acc[service] = (acc[service] || 0) + (sale.amount || 0);
          return acc;
        }, {});
        
        // Get recent sales (last 5)
        const recentSales = [...data]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 5);
        
        setMetrics({
          totalSales,
          totalDeals,
          averageDealSize,
          salesByAgent,
          salesByService,
          recentSales,
        });
        
      } catch (err) {
        console.error('Error fetching sales data:', err);
        setError(err instanceof Error ? err : new Error('Failed to load sales data'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userRole, userId, userName]);

  return {
    sales: salesData,
    metrics,
    loading,
    error,
    refresh: async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/sales');
        if (!response.ok) {
          throw new Error('Failed to fetch sales data');
        }
        const data = await response.json();
        setSalesData(data);
        return data;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to refresh data'));
        throw err;
      } finally {
        setLoading(false);
      }
    }
  };
}