import { useState, useEffect, useCallback } from 'react';
import { targetService } from '@/lib/firebase-services';
import { Target } from '@/types/firebase';

export function useFirebaseTargets(userId?: string, userRole?: string) {
  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTargets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await targetService.getTargets(userId, userRole);
      setTargets(data);
    } catch (err) {
      console.error('Error fetching targets:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch targets'));
    } finally {
      setLoading(false);
    }
  }, [userId, userRole]);

  useEffect(() => {
    fetchTargets();
  }, [fetchTargets]);

  const addTarget = useCallback(async (target: Omit<Target, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newTarget = await targetService.addTarget(target);
      setTargets(prev => [...prev, newTarget]);
      return newTarget;
    } catch (err) {
      console.error('Error adding target:', err);
      throw err;
    }
  }, []);

  const updateTarget = useCallback(async (id: string, updates: Partial<Target>) => {
    try {
      const updatedTarget = await targetService.updateTarget(id, updates);
      setTargets(prev => 
        prev.map(target => 
          target.id === id ? updatedTarget : target
        )
      );
      return updatedTarget;
    } catch (err) {
      console.error('Error updating target:', err);
      throw err;
    }
  }, []);

  const deleteTarget = useCallback(async (id: string) => {
    try {
      await targetService.deleteTarget(id);
      setTargets(prev => prev.filter(target => target.id !== id));
    } catch (err) {
      console.error('Error deleting target:', err);
      throw err;
    }
  }, []);

  return {
    targets,
    loading,
    error,
    addTarget,
    updateTarget,
    deleteTarget,
    refresh: fetchTargets,
  };
}
