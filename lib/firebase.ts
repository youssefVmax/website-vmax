// MySQL-based replacement for Firebase config
// This file provides compatibility for components that import Firebase

// Mock Firebase app and database objects for compatibility
export const app = {
  name: 'mysql-app',
  options: {
    projectId: 'mysql-database'
  }
};

export const db = {
  type: 'mysql',
  host: process.env.DB_HOST || 'vmaxcom.org',
  database: process.env.DB_NAME || 'vmax'
};

// Export commonly used Firebase functions as no-ops or MySQL equivalents
export const collection = (db: any, collectionName: string) => ({
  name: collectionName,
  type: 'mysql-table'
});

export const getDocs = async (collectionRef: any) => ({
  forEach: (callback: (doc: any) => void) => {
    // This would be replaced by actual MySQL queries in real usage
    console.warn('getDocs called on MySQL compatibility layer');
  },
  docs: [],
  size: 0
});

export const doc = (db: any, collection: string, id: string) => ({
  id,
  collection,
  type: 'mysql-document'
});

export const getDoc = async (docRef: any) => ({
  exists: () => false,
  data: () => ({}),
  id: docRef.id
});

export const addDoc = async (collectionRef: any, data: any) => ({
  id: `mysql_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
});

export const updateDoc = async (docRef: any, data: any) => {
  console.warn('updateDoc called on MySQL compatibility layer');
};

export const deleteDoc = async (docRef: any) => {
  console.warn('deleteDoc called on MySQL compatibility layer');
};

// Firebase Timestamp compatibility
export const Timestamp = {
  now: () => new Date(),
  fromDate: (date: Date) => date,
  fromMillis: (millis: number) => new Date(millis)
};

// Default export for compatibility
export default {
  app,
  db,
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp
};
