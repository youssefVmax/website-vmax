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
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { COLLECTIONS } from '@/types/firebase';

export interface Callback {
  id?: string;
  customer_name: string;
  phone_number: string;
  email: string;
  sales_agent: string;
  sales_team: string;
  first_call_date: string;
  first_call_time: string;
  callback_notes: string;
  callback_reason: string;
  status: 'pending' | 'contacted' | 'completed' | 'cancelled';
  created_by: string;
  created_by_id: string;
  SalesAgentID: string;
  created_at?: any;
  updated_at?: any;
  converted_to_deal?: boolean;
  converted_at?: string;
  converted_by?: string;
}

export const callbacksService = {
  // Get all callbacks with optional filtering
  async getCallbacks(userRole?: string, userId?: string, userName?: string): Promise<Callback[]> {
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

      let q = query(
        collection(db, COLLECTIONS.CALLBACKS || 'callbacks'),
        orderBy('created_at', 'desc')
      );
      
      if (userRole === 'manager') {
        // Managers see all callbacks - use default query
      } else if (userRole === 'salesman' && (userId || userName)) {
        // Salesmen see only their callbacks
        if (userName) {
          q = query(
            collection(db, COLLECTIONS.CALLBACKS || 'callbacks'),
            where('sales_agent', '==', userName)
          );
        } else if (userId) {
          q = query(
            collection(db, COLLECTIONS.CALLBACKS || 'callbacks'),
            where('SalesAgentID', '==', userId)
          );
        }
      }

      const snapshot = await getDocs(q);
      const callbacks = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          created_at: data.created_at?.toDate?.() || data.created_at,
          updated_at: data.updated_at?.toDate?.() || data.updated_at
        } as Callback;
      });

      // Sort in memory to avoid index issues
      return callbacks.sort((a, b) => getTimeMs(b.created_at) - getTimeMs(a.created_at));
    } catch (error) {
      console.error('Error fetching callbacks:', error);
      throw error;
    }
  },

  // Add new callback
  async addCallback(callback: Omit<Callback, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    try {
      const callbackData = {
        ...callback,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, COLLECTIONS.CALLBACKS || 'callbacks'), callbackData);
      return docRef.id;
    } catch (error) {
      console.error('Error adding callback:', error);
      throw error;
    }
  },

  // Update callback
  async updateCallback(id: string, updates: Partial<Callback>): Promise<void> {
    try {
      const callbackRef = doc(db, COLLECTIONS.CALLBACKS || 'callbacks', id);
      await updateDoc(callbackRef, {
        ...updates,
        updated_at: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating callback:', error);
      throw error;
    }
  },

  // Delete callback
  async deleteCallback(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTIONS.CALLBACKS || 'callbacks', id));
    } catch (error) {
      console.error('Error deleting callback:', error);
      throw error;
    }
  },

  // Real-time callbacks listener
  onCallbacksChange(callback: (callbacks: Callback[]) => void, userRole?: string, userId?: string, userName?: string) {
    let q = query(
      collection(db, COLLECTIONS.CALLBACKS || 'callbacks'),
      orderBy('created_at', 'desc')
    );
    
    // Apply role-based filtering
    if (userRole === 'salesman' && (userId || userName)) {
      if (userId) {
        q = query(
          collection(db, COLLECTIONS.CALLBACKS || 'callbacks'),
          where('SalesAgentID', '==', userId)
        );
      } else if (userName) {
        q = query(
          collection(db, COLLECTIONS.CALLBACKS || 'callbacks'),
          where('sales_agent', '==', userName)
        );
      }
    }
    // For managers (userRole === 'manager') or no role specified, listen to ALL callbacks

    return onSnapshot(q, (snapshot) => {
      const callbacks = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          created_at: data.created_at?.toDate?.() || data.created_at,
          updated_at: data.updated_at?.toDate?.() || data.updated_at
        } as Callback;
      });
      callback(callbacks);
    });
  }
};
