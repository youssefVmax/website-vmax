import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { User } from './auth';
import { COLLECTIONS } from '@/types/firebase';

export class FirebaseUserService {
  // Create a new user (only manager can do this)
  async createUser(userData: Omit<User, 'id' | 'created_at'>): Promise<string> {
    try {
      const userWithTimestamp = {
        ...userData,
        created_at: new Date().toISOString(),
        created_by: 'manager-001'
      };
      
      const docRef = await addDoc(collection(db, COLLECTIONS.USERS), userWithTimestamp);
      return docRef.id;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  // Get all users
  async getAllUsers(): Promise<User[]> {
    try {
      const q = query(collection(db, COLLECTIONS.USERS), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      } as User));
    } catch (error) {
      console.error('Error fetching users:', error);
      throw new Error('Failed to fetch users');
    }
  }

  // Get user by ID
  async getUserById(id: string): Promise<User | null> {
    try {
      const docRef = doc(db, COLLECTIONS.USERS, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        } as User;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }

  // Get user by username (for authentication)
  async getUserByUsername(username: string): Promise<User | null> {
    try {
      const q = query(collection(db, COLLECTIONS.USERS), where('username', '==', username));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data()
        } as User;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user by username:', error);
      return null;
    }
  }

  // Authenticate user with username and password
  async authenticateUser(username: string, password: string): Promise<User | null> {
    try {
      console.log('Firebase: Looking for user with username:', username);
      const user = await this.getUserByUsername(username);
      console.log('Firebase: Found user:', user ? user.name : 'null');
      if (user && user.password === password) {
        console.log('Firebase: Password match successful');
        return user;
      }
      console.log('Firebase: Password match failed or user not found');
      return null;
    } catch (error) {
      console.error('Error authenticating user:', error);
      return null;
    }
  }

  // Update user
  async updateUser(id: string, updates: Partial<User>): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.USERS, id);
      // Read current user to capture old name for fallback updates
      const existingSnap = await getDoc(docRef);
      const oldName = existingSnap.exists() ? (existingSnap.data() as any)?.name : undefined;
      await updateDoc(docRef, {
        ...updates,
        updated_at: new Date().toISOString()
      });

      // If display name changed, propagate to denormalized collections
      if (updates.name) {
        await this.propagateUserNameChange(id, updates.name, oldName);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Failed to update user');
    }
  }

  // Propagate updated user name to all denormalized references across collections
  async propagateUserNameChange(userId: string, newName: string, oldName?: string): Promise<void> {
    try {
      const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, '_');

      // 1) Update deals collection: sales_agent and/or closing_agent
      const dealsCol = collection(db, 'deals');
      const [salesQSnap, closingQSnap] = await Promise.all([
        getDocs(query(dealsCol, where('SalesAgentID', '==', userId))),
        getDocs(query(dealsCol, where('ClosingAgentID', '==', userId)))
      ]);

      const dealsBatch = writeBatch(db);
      salesQSnap.forEach(docSnap => {
        dealsBatch.update(docSnap.ref, {
          sales_agent: newName,
          sales_agent_norm: normalize(newName)
        });
      });
      closingQSnap.forEach(docSnap => {
        dealsBatch.update(docSnap.ref, {
          closing_agent: newName,
          closing_agent_norm: normalize(newName)
        });
      });
      await dealsBatch.commit();

      // Fallback by oldName for legacy deals missing IDs
      if (oldName) {
        const [dealsByOldSalesName, dealsByOldClosingName] = await Promise.all([
          getDocs(query(dealsCol, where('sales_agent', '==', oldName))),
          getDocs(query(dealsCol, where('closing_agent', '==', oldName)))
        ]);
        const dealsFallbackBatch = writeBatch(db);
        dealsByOldSalesName.forEach(docSnap => {
          const data = docSnap.data() as any;
          if (!data?.SalesAgentID || data.SalesAgentID === userId) {
            dealsFallbackBatch.update(docSnap.ref, {
              sales_agent: newName,
              sales_agent_norm: normalize(newName)
            });
          }
        });
        dealsByOldClosingName.forEach(docSnap => {
          const data = docSnap.data() as any;
          if (!data?.ClosingAgentID || data.ClosingAgentID === userId) {
            dealsFallbackBatch.update(docSnap.ref, {
              closing_agent: newName,
              closing_agent_norm: normalize(newName)
            });
          }
        });
        await dealsFallbackBatch.commit();
      }

      // 2) Update SALES mirror collection (both sales and closing agent names)
      const salesCol = collection(db, COLLECTIONS.SALES);
      const [salesMirrorSnap, closingMirrorSnap] = await Promise.all([
        getDocs(query(salesCol, where('SalesAgentID', '==', userId))),
        getDocs(query(salesCol, where('ClosingAgentID', '==', userId)))
      ]);
      const salesBatch = writeBatch(db);
      salesMirrorSnap.forEach(docSnap => {
        salesBatch.update(docSnap.ref, {
          sales_agent: newName,
          sales_agent_norm: normalize(newName)
        });
      });
      closingMirrorSnap.forEach(docSnap => {
        salesBatch.update(docSnap.ref, {
          closing_agent: newName,
          closing_agent_norm: normalize(newName)
        });
      });
      await salesBatch.commit();

      // Fallback by oldName for legacy SALES mirror rows missing IDs
      if (oldName) {
        const [salesByOldSalesName, salesByOldClosingName] = await Promise.all([
          getDocs(query(salesCol, where('sales_agent', '==', oldName))),
          getDocs(query(salesCol, where('closing_agent', '==', oldName)))
        ]);
        const salesFallbackBatch = writeBatch(db);
        salesByOldSalesName.forEach(docSnap => {
          const data = docSnap.data() as any;
          if (!data?.SalesAgentID || data.SalesAgentID === userId) {
            salesFallbackBatch.update(docSnap.ref, {
              sales_agent: newName,
              sales_agent_norm: normalize(newName)
            });
          }
        });
        salesByOldClosingName.forEach(docSnap => {
          const data = docSnap.data() as any;
          if (!data?.ClosingAgentID || data.ClosingAgentID === userId) {
            salesFallbackBatch.update(docSnap.ref, {
              closing_agent: newName,
              closing_agent_norm: normalize(newName)
            });
          }
        });
        await salesFallbackBatch.commit();
      }

      // 3) Update targets collection (agentName)
      const targetsCol = collection(db, 'targets');
      const targetsSnap = await getDocs(query(targetsCol, where('agentId', '==', userId)));
      const targetsBatch = writeBatch(db);
      targetsSnap.forEach(docSnap => {
        targetsBatch.update(docSnap.ref, {
          agentName: newName
        });
      });
      await targetsBatch.commit();

      // 4) Update target_progress via dedicated service helper
      try {
        const { targetProgressService } = await import('./firebase-target-progress-service');
        await targetProgressService.updateAgentName(userId, newName);
      } catch (e) {
        console.error('Failed updating target_progress agent names:', e);
      }

      // 5) Update callbacks where embedded agent names are stored
      try {
        const callbacksCol = collection(db, COLLECTIONS.CALLBACKS);
        const [cbByAgentIdSnap, cbByCreatorIdSnap] = await Promise.all([
          getDocs(query(callbacksCol, where('SalesAgentID', '==', userId))),
          getDocs(query(callbacksCol, where('created_by_id', '==', userId)))
        ]);
        const cbBatch = writeBatch(db);
        cbByAgentIdSnap.forEach(docSnap => {
          cbBatch.update(docSnap.ref, { sales_agent: newName });
        });
        cbByCreatorIdSnap.forEach(docSnap => {
          cbBatch.update(docSnap.ref, { created_by: newName });
        });
        await cbBatch.commit();
        // Fallback by old name if IDs were missing
        if (oldName) {
          const [cbByOldNameSnap, cbByOldCreatorNameSnap] = await Promise.all([
            getDocs(query(callbacksCol, where('sales_agent', '==', oldName))),
            getDocs(query(callbacksCol, where('created_by', '==', oldName)))
          ]);
          const cbFallbackBatch = writeBatch(db);
          cbByOldNameSnap.forEach(docSnap => {
            const data = docSnap.data() as any;
            if (!data?.SalesAgentID || data.SalesAgentID === userId) {
              cbFallbackBatch.update(docSnap.ref, { sales_agent: newName });
            }
          });
          cbByOldCreatorNameSnap.forEach(docSnap => {
            const data = docSnap.data() as any;
            if (!data?.created_by_id || data.created_by_id === userId) {
              cbFallbackBatch.update(docSnap.ref, { created_by: newName });
            }
          });
          await cbFallbackBatch.commit();
        }
      } catch (e) {
        console.error('Failed updating callbacks agent names:', e);
      }

      // 6) Update notifications where embedded agent names are stored
      const notificationsCol = collection(db, 'notifications');
      const [notifSalesSnap, notifClosingSnap] = await Promise.all([
        getDocs(query(notificationsCol, where('salesAgentId', '==', userId))),
        getDocs(query(notificationsCol, where('closingAgentId', '==', userId)))
      ]);
      const notifBatch = writeBatch(db);
      notifSalesSnap.forEach(docSnap => {
        notifBatch.update(docSnap.ref, { salesAgent: newName });
      });
      notifClosingSnap.forEach(docSnap => {
        notifBatch.update(docSnap.ref, { closingAgent: newName });
      });
      await notifBatch.commit();

      // Fallback for legacy notifications that store names without IDs
      if (oldName) {
        const [notifFromSnap, notifCreatedBySnap] = await Promise.all([
          getDocs(query(notificationsCol, where('from', '==', oldName))),
          getDocs(query(notificationsCol, where('createdBy', '==', oldName)))
        ]);
        const notifFallbackBatch = writeBatch(db);
        notifFromSnap.forEach(docSnap => {
          const data = docSnap.data() as any;
          if (!data?.salesAgentId || data.salesAgentId === userId) {
            notifFallbackBatch.update(docSnap.ref, { from: newName });
          }
        });
        notifCreatedBySnap.forEach(docSnap => {
          const data = docSnap.data() as any;
          if (!data?.createdById || data.createdById === userId) {
            notifFallbackBatch.update(docSnap.ref, { createdBy: newName });
          }
        });
        await notifFallbackBatch.commit();
      }

      console.log(`✅ Propagated user name change for ${userId} -> ${newName}`);
    } catch (err) {
      console.error('Error propagating user name change:', err);
      // Don't throw to avoid breaking UI flow; surface via logs
    }
  }

  // Delete user
  async deleteUser(id: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.USERS, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error('Failed to delete user');
    }
  }

  // Get users by role
  async getUsersByRole(role: User['role']): Promise<User[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.USERS), 
        where('role', '==', role)
      );
      const querySnapshot = await getDocs(q);
      
      const users = querySnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      } as User));
      
      // Sort in memory instead of using Firestore orderBy
      return users.sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA; // desc order
      });
    } catch (error) {
      console.error('Error fetching users by role:', error);
      return [];
    }
  }

  // Get users by team
  async getUsersByTeam(team: string): Promise<User[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.USERS), 
        where('team', '==', team),
        orderBy('created_at', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      } as User));
    } catch (error) {
      console.error('Error fetching users by team:', error);
      return [];
    }
  }

  // Check if username exists
  async usernameExists(username: string): Promise<boolean> {
    try {
      const user = await this.getUserByUsername(username);
      return user !== null;
    } catch (error) {
      console.error('Error checking username:', error);
      return false;
    }
  }
}

// Export singleton instance
export const userService = new FirebaseUserService();
