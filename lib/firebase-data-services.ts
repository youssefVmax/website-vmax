"use client"

import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { notificationService } from './firebase-services';

// Data Files Service
export const dataFilesService = {
  // Create a new data file record
  async createDataFile(fileData: {
    name: string;
    type: 'csv' | 'xlsx' | 'txt';
    size: string;
    assignedTo: string[];
    recordCount: number;
    uploadedBy: string;
    uploadedById: string;
    notes?: string;
  }) {
    try {
      const docRef = await addDoc(collection(db, 'dataFiles'), {
        ...fileData,
        status: 'active',
        uploadDate: serverTimestamp(),
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });
      
      // Create notification for assigned users
      for (const assignedUser of fileData.assignedTo) {
        await notificationService.addNotification({
          title: 'New Data File Assigned',
          message: `You have been assigned a new data file: ${fileData.name}`,
          type: 'info',
          priority: 'medium',
          from: fileData.uploadedBy,
          to: [assignedUser],
          isRead: false,
          actionRequired: true
        });
      }
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating data file:', error);
      throw error;
    }
  },

  // Get all data files (for managers)
  async getAllDataFiles() {
    try {
      const q = query(
        collection(db, 'dataFiles'),
        orderBy('created_at', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        // Convert Firestore timestamps to serializable format
        return {
          id: doc.id,
          ...data,
          uploadDate: data.uploadDate?.toDate?.() || data.uploadDate,
          created_at: data.created_at?.toDate?.() || data.created_at,
          updated_at: data.updated_at?.toDate?.() || data.updated_at
        };
      });
    } catch (error) {
      console.error('Error fetching data files:', error);
      throw error;
    }
  },

  // Get data files assigned to a specific user
  async getAssignedDataFiles(userName: string) {
    try {
      const q = query(
        collection(db, 'dataFiles'),
        where('assignedTo', 'array-contains', userName),
        orderBy('created_at', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        // Convert Firestore timestamps to serializable format
        return {
          id: doc.id,
          ...data,
          uploadDate: data.uploadDate?.toDate?.() || data.uploadDate,
          created_at: data.created_at?.toDate?.() || data.created_at,
          updated_at: data.updated_at?.toDate?.() || data.updated_at
        };
      });
    } catch (error) {
      console.error('Error fetching assigned data files:', error);
      throw error;
    }
  },

  // Update data file
  async updateDataFile(fileId: string, updates: any) {
    try {
      await updateDoc(doc(db, 'dataFiles', fileId), {
        ...updates,
        updated_at: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating data file:', error);
      throw error;
    }
  },

  // Delete data file
  async deleteDataFile(fileId: string) {
    try {
      await deleteDoc(doc(db, 'dataFiles', fileId));
    } catch (error) {
      console.error('Error deleting data file:', error);
      throw error;
    }
  },

  // Real-time listener for data files
  onDataFilesChange(callback: (files: any[]) => void, userRole: string, userName?: string) {
    let q;
    if (userRole === 'manager') {
      q = query(
        collection(db, 'dataFiles'),
        orderBy('created_at', 'desc')
      );
    } else {
      q = query(
        collection(db, 'dataFiles'),
        where('assignedTo', 'array-contains', userName || ''),
        orderBy('created_at', 'desc')
      );
    }

    return onSnapshot(q, (snapshot) => {
      const files = snapshot.docs.map(doc => {
        const data = doc.data();
        // Convert Firestore timestamps to serializable format
        return {
          id: doc.id,
          ...data,
          uploadDate: data.uploadDate?.toDate?.() || data.uploadDate,
          created_at: data.created_at?.toDate?.() || data.created_at,
          updated_at: data.updated_at?.toDate?.() || data.updated_at
        };
      });
      callback(files);
    });
  }
};

// Number Assignments Service
export const numberAssignmentsService = {
  // Create number assignment
  async createNumberAssignment(assignmentData: {
    numbers: string[];
    assignedTo: string;
    assignedBy: string;
    assignedById: string;
    notes?: string;
  }) {
    try {
      const docRef = await addDoc(collection(db, 'numberAssignments'), {
        ...assignmentData,
        status: 'assigned',
        assignDate: serverTimestamp(),
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });

      // Create notification for assigned user
      await notificationService.addNotification({
        title: 'Phone Numbers Assigned',
        message: `You have been assigned ${assignmentData.numbers.length} phone numbers for sales activities.`,
        type: 'info',
        priority: 'medium',
        from: assignmentData.assignedBy,
        to: [assignmentData.assignedTo],
        isRead: false,
        actionRequired: true
      });

      return docRef.id;
    } catch (error) {
      console.error('Error creating number assignment:', error);
      throw error;
    }
  },

  // Get all number assignments (for managers)
  async getAllNumberAssignments() {
    try {
      const q = query(
        collection(db, 'numberAssignments'),
        orderBy('created_at', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        // Convert Firestore timestamps to serializable format
        return {
          id: doc.id,
          ...data,
          uploadDate: data.uploadDate?.toDate?.() || data.uploadDate,
          created_at: data.created_at?.toDate?.() || data.created_at,
          updated_at: data.updated_at?.toDate?.() || data.updated_at
        };
      });
    } catch (error) {
      console.error('Error fetching number assignments:', error);
      throw error;
    }
  },

  // Get assignments for a specific user
  async getUserAssignments(userName: string) {
    try {
      const q = query(
        collection(db, 'numberAssignments'),
        where('assignedTo', '==', userName),
        orderBy('created_at', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        // Convert Firestore timestamps to serializable format
        return {
          id: doc.id,
          ...data,
          uploadDate: data.uploadDate?.toDate?.() || data.uploadDate,
          created_at: data.created_at?.toDate?.() || data.created_at,
          updated_at: data.updated_at?.toDate?.() || data.updated_at
        };
      });
    } catch (error) {
      console.error('Error fetching user assignments:', error);
      throw error;
    }
  },

  // Update assignment status
  async updateAssignmentStatus(assignmentId: string, status: string, dealId?: string) {
    try {
      const updates: any = {
        status,
        updated_at: serverTimestamp()
      };
      if (dealId) {
        updates.dealId = dealId;
      }
      await updateDoc(doc(db, 'numberAssignments', assignmentId), updates);
    } catch (error) {
      console.error('Error updating assignment status:', error);
      throw error;
    }
  },

  // Delete assignment
  async deleteAssignment(assignmentId: string) {
    try {
      await deleteDoc(doc(db, 'numberAssignments', assignmentId));
    } catch (error) {
      console.error('Error deleting assignment:', error);
      throw error;
    }
  },

  // Real-time listener for assignments
  onAssignmentsChange(callback: (assignments: any[]) => void, userRole: string, userName?: string) {
    let q;
    if (userRole === 'manager') {
      q = query(
        collection(db, 'numberAssignments'),
        orderBy('created_at', 'desc')
      );
    } else {
      q = query(
        collection(db, 'numberAssignments'),
        where('assignedTo', '==', userName || ''),
        orderBy('created_at', 'desc')
      );
    }

    return onSnapshot(q, (snapshot) => {
      const assignments = snapshot.docs.map(doc => {
        const data = doc.data();
        // Convert Firestore timestamps to serializable format
        return {
          id: doc.id,
          ...data,
          assignDate: data.assignDate?.toDate?.() || data.assignDate,
          created_at: data.created_at?.toDate?.() || data.created_at,
          updated_at: data.updated_at?.toDate?.() || data.updated_at
        };
      });
      callback(assignments);
    });
  }
};
