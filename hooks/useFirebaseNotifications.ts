import { useState, useEffect, useCallback } from 'react';
import { notificationService } from '@/lib/firebase-services';
import { Notification } from '@/types/firebase';

export function useFirebaseNotifications(userId?: string, userRole?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await notificationService.getNotifications(userId, userRole);
      setNotifications(data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch notifications'));
    } finally {
      setLoading(false);
    }
  }, [userId, userRole]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const addNotification = useCallback(async (notification: Omit<Notification, 'id' | 'created_at'>) => {
    try {
      await notificationService.addNotification(notification);
      // Refresh notifications after adding
      await fetchNotifications();
    } catch (err) {
      console.error('Error adding notification:', err);
      throw err;
    }
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      // Update local state immediately for better UX
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === id ? { ...notif, isRead: true } : notif
        )
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
      throw err;
    }
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return {
    notifications,
    loading,
    error,
    unreadCount,
    addNotification,
    markAsRead,
    refresh: fetchNotifications,
  };
}
