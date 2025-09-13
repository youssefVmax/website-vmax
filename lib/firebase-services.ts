import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { Sale, User, Notification, Target, Settings, COLLECTIONS } from '@/types/firebase';

// Sales operations
export const salesService = {
  // Get all sales with optional filtering
  async getSales(userRole?: string, userId?: string, userName?: string): Promise<Sale[]> {
    try {
      // Helper to safely extract time in milliseconds from various timestamp shapes
      const getTimeMs = (value: any): number => {
        if (!value) return 0;
        try {
          // Firestore Timestamp
          if (typeof value?.toMillis === 'function') return value.toMillis();
          // Date
          if (value instanceof Date) return value.getTime();
          // Firestore Timestamp-like object with seconds
          if (typeof value === 'object' && typeof value.seconds === 'number') return value.seconds * 1000;
          // ISO string or other parsable string
          if (typeof value === 'string') return new Date(value).getTime() || 0;
          // number already milliseconds
          if (typeof value === 'number') return value;
        } catch {}
        return 0;
      };
      // For managers, get all sales without filtering to avoid index issues
      if (userRole === 'manager') {
        const q = query(collection(db, COLLECTIONS.SALES));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            created_at: data.created_at?.toDate?.() || data.created_at,
            updated_at: data.updated_at?.toDate?.() || data.updated_at
          } as Sale;
        });
      }
      
      // For salesmen and customer service, use simple queries without orderBy to avoid composite index
      if (userRole === 'salesman' && (userId || userName)) {
        let q;
        if (userName) {
          const normalizedUserName = userName.toLowerCase().trim();
          // Try multiple field variations to match different data structures
          const queries = [
            query(collection(db, COLLECTIONS.SALES), where('sales_agent_norm', '==', normalizedUserName)),
            query(collection(db, COLLECTIONS.SALES), where('sales_agent', '==', userName)),
            query(collection(db, COLLECTIONS.SALES), where('closing_agent', '==', userName)),
            query(collection(db, COLLECTIONS.SALES), where('SalesAgentID', '==', userId || '')),
            query(collection(db, COLLECTIONS.SALES), where('closing_agent_id', '==', userId || ''))
          ];
          
          let allSales: Sale[] = [];
          for (const query_item of queries) {
            try {
              const snapshot = await getDocs(query_item);
              const sales = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                  id: doc.id,
                  ...data,
                  created_at: data.created_at?.toDate?.() || data.created_at,
                  updated_at: data.updated_at?.toDate?.() || data.updated_at
                } as Sale;
              });
              allSales = [...allSales, ...sales];
            } catch (error) {
              console.log('Query failed, trying next:', error);
            }
          }
          
          // Remove duplicates based on document ID
          const uniqueSales = allSales.filter((sale, index, self) => 
            index === self.findIndex(s => s.id === sale.id)
          );
          
          return uniqueSales.sort((a, b) => getTimeMs(b.created_at) - getTimeMs(a.created_at));
        } else if (userId) {
          // Try multiple field variations for userId
          const queries = [
            query(collection(db, COLLECTIONS.SALES), where('SalesAgentID', '==', userId)),
            query(collection(db, COLLECTIONS.SALES), where('closing_agent_id', '==', userId)),
            query(collection(db, COLLECTIONS.SALES), where('ClosingAgentID', '==', userId))
          ];
          
          let allSales: Sale[] = [];
          for (const query_item of queries) {
            try {
              const snapshot = await getDocs(query_item);
              const sales = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                  id: doc.id,
                  ...data,
                  created_at: data.created_at?.toDate?.() || data.created_at,
                  updated_at: data.updated_at?.toDate?.() || data.updated_at
                } as Sale;
              });
              allSales = [...allSales, ...sales];
            } catch (error) {
              console.log('Query failed, trying next:', error);
            }
          }
          
          // Remove duplicates based on document ID
          const uniqueSales = allSales.filter((sale, index, self) => 
            index === self.findIndex(s => s.id === sale.id)
          );
          
          return uniqueSales.sort((a, b) => getTimeMs(b.created_at) - getTimeMs(a.created_at));
        } else {
          q = query(collection(db, COLLECTIONS.SALES));
          const snapshot = await getDocs(q);
          const sales = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              created_at: data.created_at?.toDate?.() || data.created_at,
              updated_at: data.updated_at?.toDate?.() || data.updated_at
            } as Sale;
          });
          return sales.sort((a, b) => getTimeMs(b.created_at) - getTimeMs(a.created_at));
        }
      } 
      
      if (userRole === 'customer-service' && (userId || userName)) {
        let q;
        if (userName) {
          const normalizedUserName = userName.toLowerCase().trim();
          q = query(
            collection(db, COLLECTIONS.SALES),
            where('closing_agent_norm', '==', normalizedUserName)
          );
        } else if (userId) {
          q = query(
            collection(db, COLLECTIONS.SALES),
            where('ClosingAgentID', '==', userId)
          );
        } else {
          q = query(collection(db, COLLECTIONS.SALES));
        }
        
        const snapshot = await getDocs(q);
        const sales = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            created_at: data.created_at?.toDate?.() || data.created_at,
            updated_at: data.updated_at?.toDate?.() || data.updated_at
          } as Sale;
        });
        // Sort in memory instead of using orderBy to avoid index issues
        return sales.sort((a, b) => getTimeMs(b.created_at) - getTimeMs(a.created_at));
      }
      
      // Default case - get all sales
      const q = query(collection(db, COLLECTIONS.SALES));
      const snapshot = await getDocs(q);
      const sales = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          created_at: data.created_at?.toDate?.() || data.created_at,
          updated_at: data.updated_at?.toDate?.() || data.updated_at
        } as Sale;
      });
      return sales.sort((a, b) => getTimeMs(b.created_at) - getTimeMs(a.created_at));
    } catch (error) {
      console.error('Error fetching sales:', error);
      throw error;
    }
  },

  // Add new sale
  async addSale(sale: Omit<Sale, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    try {
      const saleData = {
        ...sale,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, COLLECTIONS.SALES), saleData);
      return docRef.id;
    } catch (error) {
      console.error('Error adding sale:', error);
      throw error;
    }
  },

  // Update sale
  async updateSale(id: string, updates: Partial<Sale>): Promise<void> {
    try {
      const saleRef = doc(db, COLLECTIONS.SALES, id);
      await updateDoc(saleRef, {
        ...updates,
        updated_at: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating sale:', error);
      throw error;
    }
  },

  // Delete sale
  async deleteSale(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTIONS.SALES, id));
    } catch (error) {
      console.error('Error deleting sale:', error);
      throw error;
    }
  },

  // Real-time sales listener
  onSalesChange(callback: (sales: Sale[]) => void, userRole?: string, userId?: string, userName?: string) {
    // For managers, get all sales
    if (userRole === 'manager') {
      const q = query(collection(db, COLLECTIONS.SALES));
      return onSnapshot(q, (snapshot) => {
        const sales = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            created_at: data.created_at?.toDate?.() || data.created_at,
            updated_at: data.updated_at?.toDate?.() || data.updated_at
          } as Sale;
        });
        callback(sales);
      });
    }
    
    // For salesmen, we need to handle multiple queries for real-time updates
    if (userRole === 'salesman' && (userId || userName)) {
      // Since onSnapshot doesn't support multiple queries, we'll listen to all sales
      // and filter on the client side for real-time updates
      const q = query(collection(db, COLLECTIONS.SALES));
      
      return onSnapshot(q, (snapshot) => {
        const allSales = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            created_at: data.created_at?.toDate?.() || data.created_at,
            updated_at: data.updated_at?.toDate?.() || data.updated_at
          } as Sale;
        });
        
        // Filter sales for the specific salesman
        const filteredSales = allSales.filter(sale => {
          if (userName) {
            const normalizedUserName = userName.toLowerCase().trim();
            return (
              (sale as any).sales_agent_norm === normalizedUserName ||
              (sale as any).sales_agent === userName ||
              (sale as any).closing_agent === userName
            );
          }
          if (userId) {
            return (
              (sale as any).SalesAgentID === userId ||
              (sale as any).closing_agent_id === userId ||
              (sale as any).ClosingAgentID === userId
            );
          }
          return false;
        });
        
        callback(filteredSales);
      });
    }
    
    // For customer service
    if (userRole === 'customer-service' && (userId || userName)) {
      const q = query(collection(db, COLLECTIONS.SALES));
      
      return onSnapshot(q, (snapshot) => {
        const allSales = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            created_at: data.created_at?.toDate?.() || data.created_at,
            updated_at: data.updated_at?.toDate?.() || data.updated_at
          } as Sale;
        });
        
        // Filter sales for the specific customer service agent
        const filteredSales = allSales.filter(sale => {
          if (userName) {
            const normalizedUserName = userName.toLowerCase().trim();
            return (sale as any).closing_agent_norm === normalizedUserName;
          }
          if (userId) {
            return (sale as any).ClosingAgentID === userId;
          }
          return false;
        });
        
        callback(filteredSales);
      });
    }
    
    // Default case - listen to all sales
    const q = query(collection(db, COLLECTIONS.SALES));
    return onSnapshot(q, (snapshot) => {
      const sales = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          created_at: data.created_at?.toDate?.() || data.created_at,
          updated_at: data.updated_at?.toDate?.() || data.updated_at
        } as Sale;
      });
      callback(sales);
    });
  }
};

// User operations
export const userService = {
  async getUsers(): Promise<User[]> {
    try {
      const q = query(collection(db, COLLECTIONS.USERS), orderBy('name', 'asc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          created_at: data.created_at?.toDate?.() || data.created_at,
          updated_at: data.updated_at?.toDate?.() || data.updated_at
        } as User;
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  async getUser(id: string): Promise<User | null> {
    try {
      const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, id));
      return userDoc.exists() ? { id: userDoc.id, ...userDoc.data() } as User : null;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  },

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const q = query(collection(db, COLLECTIONS.USERS), where('email', '==', email));
      const snapshot = await getDocs(q);
      return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as User;
    } catch (error) {
      console.error('Error fetching user by email:', error);
      throw error;
    }
  },

  async addUser(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    try {
      const userData = {
        ...user,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        isActive: true
      };
      const docRef = await addDoc(collection(db, COLLECTIONS.USERS), userData);
      return docRef.id;
    } catch (error) {
      console.error('Error adding user:', error);
      throw error;
    }
  },

  async updateUser(id: string, updates: Partial<User>): Promise<void> {
    try {
      const userRef = doc(db, COLLECTIONS.USERS, id);
      await updateDoc(userRef, {
        ...updates,
        updated_at: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }
};

// Notifications operations
export const notificationService = {
  async getNotifications(userId?: string, userRole?: string): Promise<Notification[]> {
    try {
      // Use simple query without composite index requirement
      const q = query(
        collection(db, COLLECTIONS.NOTIFICATIONS),
        orderBy('created_at', 'desc'),
        limit(200) // Increased limit to ensure we get all relevant notifications
      );
      
      const snapshot = await getDocs(q);
      let notifications = snapshot.docs.map(doc => {
        const data = doc.data();
        
        // Helper function to safely convert timestamps
        const safeToDate = (value: any) => {
          if (!value) return null;
          try {
            // Firestore Timestamp
            if (typeof value?.toDate === 'function') return value.toDate();
            // Date object
            if (value instanceof Date) return value;
            // ISO string
            if (typeof value === 'string') return new Date(value);
            // Firestore Timestamp-like object with seconds
            if (typeof value === 'object' && typeof value.seconds === 'number') {
              return new Date(value.seconds * 1000);
            }
            // Number (milliseconds)
            if (typeof value === 'number') return new Date(value);
          } catch (error) {
            console.warn('Failed to convert timestamp:', value, error);
          }
          return value;
        };
        
        return {
          id: doc.id,
          ...data,
          created_at: safeToDate(data.created_at),
          timestamp: safeToDate(data.timestamp)
        } as unknown;
      }) as Notification[];
      
      // Filter on client side to avoid index requirements
      if (userId || userRole) {
        notifications = notifications.filter(notification => {
          const to = (notification.to || []) as any[]
          
          // Managers should see all deal notifications
          if (userRole === 'manager' && notification.type === 'deal') {
            return true;
          }
          
          // Accept if broadcast to all
          if (to.includes('all')) return true;
          
          // Accept if explicit user id match
          if (userId && to.includes(userId)) return true;
          
          // Accept if role-based targeting
          if (userRole && to.includes(userRole)) return true;
          
          // For managers, also check if notification is for any manager role
          if (userRole === 'manager' && to.includes('manager')) {
            return true;
          }
          
          return to.length === 0; // no 'to' means visible to all by default
        });
      }
      
      return notifications;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Return empty array to prevent app crash
      return [];
    }
  },

  async addNotification(notification: Omit<Notification, 'id' | 'created_at'>): Promise<string> {
    try {
      const notificationData = {
        ...notification,
        created_at: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), notificationData);
      return docRef.id;
    } catch (error) {
      console.error('Error adding notification:', error);
      throw error;
    }
  },

  async markAsRead(id: string): Promise<void> {
    try {
      const notificationRef = doc(db, COLLECTIONS.NOTIFICATIONS, id);
      await updateDoc(notificationRef, { isRead: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  async markAllAsRead(userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, COLLECTIONS.NOTIFICATIONS),
        where('isRead', '==', false)
      );
      
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      snapshot.docs.forEach(doc => {
        const notification = doc.data() as Notification;
        // Only mark as read if user is in the 'to' array or user is manager
        if (!notification.to || notification.to.includes(userId) || notification.to.includes('all')) {
          batch.update(doc.ref, { isRead: true });
        }
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }
};

// Target service functions
export const targetService = {
  async getTargets(userId?: string, userRole?: string): Promise<Target[]> {
    try {
      let q;
      if (userRole === 'manager' || !userId) {
        // Managers see all targets
        q = query(
          collection(db, COLLECTIONS.TARGETS),
          orderBy('created_at', 'desc')
        );
      } else {
        // Other users see only their targets - remove orderBy to avoid composite index
        q = query(
          collection(db, COLLECTIONS.TARGETS),
          where('agentId', '==', userId)
        );
      }
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          created_at: data.created_at?.toDate?.() || data.created_at,
          updated_at: data.updated_at?.toDate?.() || data.updated_at
        } as Target;
      });
    } catch (error) {
      console.error('Error getting targets:', error);
      throw error;
    }
  },

  async addTarget(target: Omit<Target, 'id' | 'created_at' | 'updated_at'>): Promise<Target> {
    try {
      const docRef = await addDoc(collection(db, COLLECTIONS.TARGETS), {
        ...target,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });
      
      const newDoc = await getDoc(docRef);
      return { id: newDoc.id, ...newDoc.data() } as Target;
    } catch (error) {
      console.error('Error adding target:', error);
      throw error;
    }
  },

  async updateTarget(id: string, updates: Partial<Target>): Promise<Target> {
    try {
      const docRef = doc(db, COLLECTIONS.TARGETS, id);
      await updateDoc(docRef, {
        ...updates,
        updated_at: serverTimestamp()
      });
      
      const updatedDoc = await getDoc(docRef);
      return { id: updatedDoc.id, ...updatedDoc.data() } as Target;
    } catch (error) {
      console.error('Error updating target:', error);
      throw error;
    }
  },

  async deleteTarget(id: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.TARGETS, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting target:', error);
      throw error;
    }
  }
};

// Settings operations
export const settingsService = {
  async getSettings(userId: string): Promise<Settings | null> {
    try {
      const q = query(collection(db, COLLECTIONS.SETTINGS), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Settings;
    } catch (error) {
      console.error('Error fetching settings:', error);
      throw error;
    }
  },

  async updateSettings(userId: string, settings: Omit<Settings, 'id' | 'userId' | 'created_at' | 'updated_at'>): Promise<void> {
    try {
      const q = query(collection(db, COLLECTIONS.SETTINGS), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        // Create new settings
        await addDoc(collection(db, COLLECTIONS.SETTINGS), {
          ...settings,
          userId,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
        });
      } else {
        // Update existing settings
        const settingsRef = doc(db, COLLECTIONS.SETTINGS, snapshot.docs[0].id);
        await updateDoc(settingsRef, {
          ...settings,
          updated_at: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }
};
