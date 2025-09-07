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

export function useSalesData(userRole: string, userId?: string) {
  const [salesData, setSalesData] = useState<Sale[]>([]);
  const [metrics, setMetrics] = useState<SalesMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAndProcess = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/sales');
      if (!res.ok) throw new Error(`Failed to fetch sales: ${res.status}`);
      const raw = await res.json();

      let data = ((raw as any[]) || [])
        // sanitize: required fields and numeric amount
        .filter(row => {
          const hasCustomer = Boolean(row.customer_name ?? row.customer);
          const hasDealId = Boolean(row.DealID);
          const amtRaw = row.amount ?? row.amount_paid ?? row.AMOUNT;
          const amt = typeof amtRaw === 'number' ? amtRaw : parseFloat(String(amtRaw));
          return hasCustomer && hasDealId && !isNaN(amt);
        });

      // Filter data based on user role
      if (userRole === 'salesman' && userId) {
        data = data.filter(row => row.SalesAgentID === userId || row.sales_agent_norm === userId);
      } else if (userRole === 'customer-service' && userId) {
        data = data.filter(row => row.ClosingAgentID === userId || row.closing_agent_norm === userId);
      }

      // Map to Sale interface
      const sales: Sale[] = data.map(row => ({
        date: (row.date ?? row.signup_date ?? '').toString(),
        customer_name: (row.customer_name ?? row.customer ?? '').toString(),
        amount: typeof row.amount === 'number' ? row.amount : parseFloat(String(row.amount ?? row.AMOUNT)) || 0,
        sales_agent: (row.sales_agent ?? '').toString(),
        closing_agent: (row.closing_agent ?? '').toString(),
        team: (row.team ?? '').toString(),
        type_service: (row.type_service ?? row.TYPE_SERVISE ?? '').toString(),
        sales_agent_norm: (row.sales_agent_norm ?? '').toString(),
        closing_agent_norm: (row.closing_agent_norm ?? '').toString(),
        SalesAgentID: (row.SalesAgentID ?? '').toString(),
        ClosingAgentID: (row.ClosingAgentID ?? '').toString(),
        DealID: (row.DealID ?? '').toString(),
      }));

      setSalesData(sales);

      // Calculate metrics
      const totalSales = sales.reduce((sum, sale) => sum + (sale.amount || 0), 0);
      const totalDeals = sales.length;
      const averageDealSize = totalDeals > 0 ? totalSales / totalDeals : 0;

      const salesByAgent = sales.reduce((acc, sale) => {
        const agent = sale.sales_agent || 'Unknown';
        acc[agent] = (acc[agent] || 0) + (sale.amount || 0);
        return acc;
      }, {} as Record<string, number>);

      const salesByService = sales.reduce((acc, sale) => {
        const service = sale.type_service || 'Other';
        acc[service] = (acc[service] || 0) + (sale.amount || 0);
        return acc;
      }, {} as Record<string, number>);

      const recentSales = [...sales]
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

      setLoading(false);
      return sales;
    } catch (err) {
      console.error('Error fetching sales data:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch sales data'));
      setLoading(false);
      throw err;
    }
  }, [userRole, userId]);

  useEffect(() => {
    fetchAndProcess();

    // SSE subscription for real-time updates
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/sales/stream');
      es.onmessage = (event) => {
        try {
          const rows = (JSON.parse(event.data) as any[])
            // sanitize
            .filter(row => {
              const hasCustomer = Boolean(row.customer_name ?? row.customer);
              const hasDealId = Boolean(row.DealID);
              const amtRaw = row.amount ?? row.amount_paid ?? row.AMOUNT;
              const amt = typeof amtRaw === 'number' ? amtRaw : parseFloat(String(amtRaw));
              return hasCustomer && hasDealId && !isNaN(amt);
            });

          // Filter based on user role
          let data = rows || [];
          if (userRole === 'salesman' && userId) {
            data = data.filter(row => row.SalesAgentID === userId || row.sales_agent_norm === userId);
          } else if (userRole === 'customer-service' && userId) {
            data = data.filter(row => row.ClosingAgentID === userId || row.closing_agent_norm === userId);
          }

          // Map rows to Sale shape
          const sales: Sale[] = data.map(row => ({
            date: (row.date ?? row.signup_date ?? '').toString(),
            customer_name: (row.customer_name ?? row.customer ?? '').toString(),
            amount: typeof row.amount === 'number' ? row.amount : parseFloat(String(row.amount ?? row.AMOUNT)) || 0,
            sales_agent: (row.sales_agent ?? '').toString(),
            closing_agent: (row.closing_agent ?? '').toString(),
            team: (row.team ?? '').toString(),
            type_service: (row.type_service ?? row.TYPE_SERVISE ?? '').toString(),
            sales_agent_norm: (row.sales_agent_norm ?? '').toString(),
            closing_agent_norm: (row.closing_agent_norm ?? '').toString(),
            SalesAgentID: (row.SalesAgentID ?? '').toString(),
            ClosingAgentID: (row.ClosingAgentID ?? '').toString(),
            DealID: (row.DealID ?? '').toString(),
          }));

          setSalesData(sales);

          // Recompute metrics
          const totalSales = sales.reduce((sum, sale) => sum + (sale.amount || 0), 0);
          const totalDeals = sales.length;
          const averageDealSize = totalDeals > 0 ? totalSales / totalDeals : 0;

          const salesByAgent = sales.reduce((acc, sale) => {
            const agent = sale.sales_agent || 'Unknown';
            acc[agent] = (acc[agent] || 0) + (sale.amount || 0);
            return acc;
          }, {} as Record<string, number>);

          const salesByService = sales.reduce((acc, sale) => {
            const service = sale.type_service || 'Other';
            acc[service] = (acc[service] || 0) + (sale.amount || 0);
            return acc;
          }, {} as Record<string, number>);

          const recentSales = [...sales]
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
        } catch (e) {
          console.error('Failed to parse sales SSE data', e);
        }
      };
      es.onerror = () => {
        es?.close();
      };
    } catch (e) {
      console.warn('EventSource not available; using polling only');
    }
    return () => {
      es?.close();
    };
  }, [fetchAndProcess]);

  return {
    sales: salesData,
    metrics,
    loading,
    error,
    refresh: fetchAndProcess,
  };
}