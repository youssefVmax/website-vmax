import { useState, useEffect, useCallback } from 'react';

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

  const fetchAndProcess = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/deals');
      if (!response.ok) {
        throw new Error('Failed to fetch sales data');
      }
      let data = await response.json();
      
      // Sanitize data - ensure required fields exist
      data = data.filter((row: any) => {
        const hasCustomer = Boolean(row.customer_name);
        const hasDealId = Boolean(row.DealID);
        const hasAmount = !isNaN(parseFloat(String(row.amount || 0)));
        return hasCustomer && hasDealId && hasAmount;
      });
      
      // Filter data based on user role and exact name matching
      if (userRole === 'salesman' && userName) {
        const normalizedUserName = userName.toLowerCase().trim();
        data = data.filter((sale: Sale) => {
          const salesAgentMatch = sale.sales_agent_norm?.toLowerCase().trim() === normalizedUserName;
          const closingAgentMatch = sale.closing_agent_norm?.toLowerCase().trim() === normalizedUserName;
          const idMatch = sale.SalesAgentID === userId || sale.ClosingAgentID === userId;
          
          return salesAgentMatch || closingAgentMatch || idMatch;
        });
      } else if (userRole === 'customer-service' && userName) {
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
      const totalSales = data.reduce((sum: number, sale: Sale) => sum + (parseFloat(String(sale.amount)) || 0), 0);
      const totalDeals = data.length;
      const averageDealSize = totalDeals > 0 ? totalSales / totalDeals : 0;
      
      // Group by agent
      const salesByAgent = data.reduce((acc: Record<string, number>, sale: Sale) => {
        const agent = sale.sales_agent || 'Unknown';
        acc[agent] = (acc[agent] || 0) + (parseFloat(String(sale.amount)) || 0);
        return acc;
      }, {});
      
      // Group by service
      const salesByService = data.reduce((acc: Record<string, number>, sale: Sale) => {
        const service = sale.type_service || 'Other';
        acc[service] = (acc[service] || 0) + (parseFloat(String(sale.amount)) || 0);
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
      
      return data;
    } catch (err) {
      console.error('Error fetching sales data:', err);
      setError(err instanceof Error ? err : new Error('Failed to load sales data'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userRole, userId, userName]);

  useEffect(() => {
    fetchAndProcess();

    // Set up SSE for real-time updates
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/deals/stream');
      
      eventSource.onmessage = (event) => {
        try {
          const newData = JSON.parse(event.data);
          // Re-process the new data with the same filtering logic
          fetchAndProcess();
        } catch (e) {
          console.error('Failed to parse SSE data:', e);
        }
      };
      
      eventSource.onerror = () => {
        console.warn('SSE connection error, will retry');
        eventSource?.close();
        // Retry connection after 5 seconds
        setTimeout(() => {
          if (!eventSource || eventSource.readyState === EventSource.CLOSED) {
            fetchAndProcess();
          }
        }, 5000);
      };
    } catch (e) {
      console.warn('SSE not available, using polling fallback');
      // Fallback to polling every 10 seconds
      const pollInterval = setInterval(fetchAndProcess, 10000);
      return () => {
        clearInterval(pollInterval);
      };
    }

    return () => {
      eventSource?.close();
    };
  }, [fetchAndProcess]);

  return {
    sales: salesData,
    metrics,
    loading,
    error,
    refresh: fetchAndProcess
  };
}