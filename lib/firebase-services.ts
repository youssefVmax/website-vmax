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
      let q = query(collection(db, COLLECTIONS.SALES), orderBy('created_at', 'desc'));
      
      // Apply role-based filtering
      if (userRole === 'salesman' && (userId || userName)) {
        if (userName) {
          const normalizedUserName = userName.toLowerCase().trim();
          q = query(
            collection(db, COLLECTIONS.SALES),
            where('sales_agent_norm', '==', normalizedUserName)
          );
        } else if (userId) {
          q = query(
            collection(db, COLLECTIONS.SALES),
            where('SalesAgentID', '==', userId)
          );
        }
      } else if (userRole === 'customer-service' && (userId || userName)) {
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
        }
      }
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale));
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
    let q = query(collection(db, COLLECTIONS.SALES), orderBy('created_at', 'desc'));
    
    // Apply role-based filtering
    if (userRole === 'salesman' && (userId || userName)) {
      if (userName) {
        const normalizedUserName = userName.toLowerCase().trim();
        q = query(
          collection(db, COLLECTIONS.SALES),
          where('sales_agent_norm', '==', normalizedUserName)
        );
      } else if (userId) {
        q = query(
          collection(db, COLLECTIONS.SALES),
          where('SalesAgentID', '==', userId)
        );
      }
    } else if (userRole === 'customer-service' && (userId || userName)) {
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
      }
    }

    return onSnapshot(q, (snapshot) => {
      const sales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale));
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
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
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
        limit(100)
      );
      
      const snapshot = await getDocs(q);
      let notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      
      // Filter on client side to avoid index requirements
      if (userId) {
        notifications = notifications.filter(notification => 
          !notification.to || 
          notification.to.includes(userId) || 
          notification.to.includes('all')
        );
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
        // Other users see only their targets
        q = query(
          collection(db, COLLECTIONS.TARGETS),
          where('agentId', '==', userId),
          orderBy('created_at', 'desc')
        );
      }
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Target));
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
