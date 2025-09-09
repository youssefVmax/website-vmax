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
  orderBy
} from 'firebase/firestore';
import { db } from './firebase';
import { User } from './auth';

const COLLECTIONS = {
  USERS: 'users'
};

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
      const user = await this.getUserByUsername(username);
      if (user && user.password === password) {
        return user;
      }
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
      await updateDoc(docRef, {
        ...updates,
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Failed to update user');
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
