import { useState, useEffect, useCallback } from 'react';
import { salesService } from '@/lib/firebase-services';
import { Sale, SalesMetrics } from '@/types/firebase';

export function useFirebaseSalesData(userRole: string, userId?: string, userName?: string) {
  const [salesData, setSalesData] = useState<Sale[]>([]);
  const [metrics, setMetrics] = useState<SalesMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const calculateMetrics = useCallback((sales: Sale[]): SalesMetrics => {
    const totalSales = sales.reduce((sum, sale) => sum + ((sale as any).amount_paid || sale.amount || 0), 0);
    const totalDeals = sales.length;
    const averageDealSize = totalDeals > 0 ? totalSales / totalDeals : 0;

    const salesByAgent = sales.reduce((acc, sale) => {
      const agent = (sale as any).sales_agent_norm || sale.sales_agent || 'Unknown';
      acc[agent] = (acc[agent] || 0) + ((sale as any).amount_paid || sale.amount || 0);
      return acc;
    }, {} as Record<string, number>);

    const salesByService = sales.reduce((acc, sale) => {
      const service = (sale as any).product_type || sale.type_service || 'Other';
      acc[service] = (acc[service] || 0) + ((sale as any).amount_paid || sale.amount || 0);
      return acc;
    }, {} as Record<string, number>);

    const recentSales = [...sales]
      .sort((a, b) => new Date((b as any).signup_date || b.date).getTime() - new Date((a as any).signup_date || a.date).getTime())
      .slice(0, 5);

    return {
      totalSales,
      totalDeals,
      averageDealSize,
      salesByAgent,
      salesByService,
      recentSales,
    };
  }, []);

  const fetchSalesData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Debug: trace identifiers used for fetching sales
      console.debug('[useFirebaseSalesData] fetchSalesData params:', { userRole, userId, userName });
      const sales = await salesService.getSales(userRole, userId, userName);
      setSalesData(sales);
      setMetrics(calculateMetrics(sales));
      console.debug('[useFirebaseSalesData] fetched sales count:', sales?.length ?? 0);
    } catch (err) {
      console.error('Error fetching sales data:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch sales data'));
    } finally {
      setLoading(false);
    }
  }, [userRole, userId, userName, calculateMetrics]);

  useEffect(() => {
    fetchSalesData();

    // Set up real-time listener
    const unsubscribe = salesService.onSalesChange(
      (sales) => {
        setSalesData(sales);
        setMetrics(calculateMetrics(sales));
        setLoading(false);
        if ((sales?.length ?? 0) === 0) {
          console.warn('[useFirebaseSalesData] real-time listener: no sales matched for', { userRole, userId, userName });
        }
      },
      userRole,
      userId,
      userName
    );

    return () => {
      unsubscribe();
    };
  }, [fetchSalesData, calculateMetrics, userRole, userId, userName]);

  const addSale = useCallback(async (sale: Omit<Sale, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      await salesService.addSale(sale);
      // Real-time listener will update the data automatically
    } catch (err) {
      console.error('Error adding sale:', err);
      throw err;
    }
  }, []);

  const updateSale = useCallback(async (id: string, updates: Partial<Sale>) => {
    try {
      await salesService.updateSale(id, updates);
      // Real-time listener will update the data automatically
    } catch (err) {
      console.error('Error updating sale:', err);
      throw err;
    }
  }, []);

  const deleteSale = useCallback(async (id: string) => {
    try {
      await salesService.deleteSale(id);
      // Real-time listener will update the data automatically
    } catch (err) {
      console.error('Error deleting sale:', err);
      throw err;
    }
  }, []);

  return {
    sales: salesData,
    metrics,
    loading,
    error,
    refresh: fetchSalesData,
    addSale,
    updateSale,
    deleteSale,
  };
}
