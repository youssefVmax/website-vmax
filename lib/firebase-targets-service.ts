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
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { Target, TeamTarget } from '@/types/firebase';

export class FirebaseTargetsService {
  private targetsCollection = collection(db, 'targets');
  private teamTargetsCollection = collection(db, 'team_targets');
  private usersCollection = collection(db, 'users');

  // Get all targets for a manager or specific user
  async getTargets(userId?: string, userRole?: string): Promise<Target[]> {
    try {
      let q;
      
      if (userRole === 'manager') {
        // Managers see all targets they created - remove orderBy to avoid index issues
        q = query(
          this.targetsCollection,
          where('managerId', '==', userId)
        );
      } else {
        // Salespeople see only their own targets - remove orderBy to avoid index issues
        q = query(
          this.targetsCollection,
          where('agentId', '==', userId)
        );
      }

      const snapshot = await getDocs(q);
      const targets = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Target[];
      
      // Sort in memory to avoid composite index requirements
      return targets.sort((a, b) => {
        const aTime = a.created_at?.toMillis() || 0;
        const bTime = b.created_at?.toMillis() || 0;
        return bTime - aTime;
      });
    } catch (error) {
      console.error('Error fetching targets:', error);
      throw error;
    }
  }

  // Get team targets
  async getTeamTargets(managerId?: string): Promise<TeamTarget[]> {
    try {
      const q = query(
        this.teamTargetsCollection,
        where('managerId', '==', managerId)
      );

      const snapshot = await getDocs(q);
      const teamTargets = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TeamTarget[];
      
      // Sort in memory to avoid composite index requirements
      return teamTargets.sort((a, b) => {
        const aTime = a.created_at?.toMillis() || 0;
        const bTime = b.created_at?.toMillis() || 0;
        return bTime - aTime;
      });
    } catch (error) {
      console.error('Error fetching team targets:', error);
      throw error;
    }
  }

  // Add individual target
  async addTarget(target: Omit<Target, 'id' | 'created_at' | 'updated_at'>): Promise<Target> {
    try {
      const now = Timestamp.now();
      const targetData = {
        ...target,
        created_at: now,
        updated_at: now
      };

      const docRef = await addDoc(this.targetsCollection, targetData);
      
      return {
        id: docRef.id,
        ...targetData
      };
    } catch (error) {
      console.error('Error adding target:', error);
      throw error;
    }
  }

  // Add team target
  async addTeamTarget(teamTarget: Omit<TeamTarget, 'id' | 'created_at' | 'updated_at'>): Promise<TeamTarget> {
    try {
      const now = Timestamp.now();
      const targetData = {
        ...teamTarget,
        created_at: now,
        updated_at: now
      };

      const docRef = await addDoc(this.teamTargetsCollection, targetData);
      
      return {
        id: docRef.id,
        ...targetData
      };
    } catch (error) {
      console.error('Error adding team target:', error);
      throw error;
    }
  }

  // Update target
  async updateTarget(id: string, updates: Partial<Target>): Promise<Target> {
    try {
      const targetRef = doc(this.targetsCollection, id);
      const updateData = {
        ...updates,
        updated_at: Timestamp.now()
      };

      await updateDoc(targetRef, updateData);
      
      const updatedDoc = await getDoc(targetRef);
      return {
        id: updatedDoc.id,
        ...updatedDoc.data()
      } as Target;
    } catch (error) {
      console.error('Error updating target:', error);
      throw error;
    }
  }

  // Update team target
  async updateTeamTarget(id: string, updates: Partial<TeamTarget>): Promise<TeamTarget> {
    try {
      const targetRef = doc(this.teamTargetsCollection, id);
      const updateData = {
        ...updates,
        updated_at: Timestamp.now()
      };

      await updateDoc(targetRef, updateData);
      
      const updatedDoc = await getDoc(targetRef);
      return {
        id: updatedDoc.id,
        ...updatedDoc.data()
      } as TeamTarget;
    } catch (error) {
      console.error('Error updating team target:', error);
      throw error;
    }
  }

  // Delete target
  async deleteTarget(id: string): Promise<void> {
    try {
      const targetRef = doc(this.targetsCollection, id);
      await deleteDoc(targetRef);
    } catch (error) {
      console.error('Error deleting target:', error);
      throw error;
    }
  }

  // Delete team target
  async deleteTeamTarget(id: string): Promise<void> {
    try {
      const targetRef = doc(this.teamTargetsCollection, id);
      await deleteDoc(targetRef);
    } catch (error) {
      console.error('Error deleting team target:', error);
      throw error;
    }
  }

  // Get teams and their members
  async getTeamsWithMembers(): Promise<Array<{id: string, name: string, members: Array<{id: string, name: string}>}>> {
    try {
      // Get all users with role 'salesman'
      const usersQuery = query(
        this.usersCollection,
        where('role', '==', 'salesman'),
        where('isActive', '==', true)
      );
      
      const usersSnapshot = await getDocs(usersQuery);
      const users = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];

      // Group users by team
      const teamsMap = new Map<string, Array<{id: string, name: string}>>();
      
      users.forEach(user => {
        const teamName = user.team || 'Unknown';
        if (!teamsMap.has(teamName)) {
          teamsMap.set(teamName, []);
        }
        teamsMap.get(teamName)!.push({
          id: user.id,
          name: user.name || user.username
        });
      });

      // Convert map to array
      return Array.from(teamsMap.entries()).map(([teamName, members]) => ({
        id: teamName.toLowerCase().replace(/\s+/g, '-'),
        name: teamName,
        members
      }));
    } catch (error) {
      console.error('Error fetching teams with members:', error);
      throw error;
    }
  }

  // Get target progress for a specific period
  async getTargetProgress(agentId: string, period: string): Promise<{
    currentSales: number;
    currentDeals: number;
    salesProgress: number;
    dealsProgress: number;
  }> {
    try {
      // Get sales data for the agent in the specified period
      const salesCollection = collection(db, 'sales');
      const [month, year] = period.split(' ');
      
      // Use simple query to avoid composite index issues
      const q = query(
        salesCollection,
        where('SalesAgentID', '==', agentId)
      );

      const snapshot = await getDocs(q);
      const allSales = snapshot.docs.map(doc => doc.data());

      // Filter sales by period in memory to avoid composite index
      const targetYear = parseInt(year);
      const targetMonth = this.getMonthNumber(month);
      
      const filteredSales = allSales.filter(sale => 
        sale.data_year === targetYear && sale.data_month === targetMonth
      );

      const currentSales = filteredSales.reduce((sum, sale) => sum + (sale.amount_paid || sale.amount || 0), 0);
      const currentDeals = filteredSales.length;

      return {
        currentSales,
        currentDeals,
        salesProgress: 0, // Will be calculated in component
        dealsProgress: 0  // Will be calculated in component
      };
    } catch (error) {
      console.error('Error fetching target progress:', error);
      return {
        currentSales: 0,
        currentDeals: 0,
        salesProgress: 0,
        dealsProgress: 0
      };
    }
  }

  private getMonthNumber(monthName: string): number {
    const months = {
      'January': 1, 'February': 2, 'March': 3, 'April': 4,
      'May': 5, 'June': 6, 'July': 7, 'August': 8,
      'September': 9, 'October': 10, 'November': 11, 'December': 12
    };
    return months[monthName as keyof typeof months] || 1;
  }

  // Bulk operations for team targets
  async createIndividualTargetsFromTeamTarget(teamTarget: TeamTarget): Promise<Target[]> {
    try {
      const batch = writeBatch(db);
      const now = Timestamp.now();
      const individualTargets: Target[] = [];

      // Calculate individual targets (distribute team target among members)
      const individualMonthlyTarget = Math.floor(teamTarget.monthlyTarget / teamTarget.members.length);
      const individualDealsTarget = Math.floor(teamTarget.dealsTarget / teamTarget.members.length);

      for (const memberId of teamTarget.members) {
        // Get member details
        const memberDoc = await getDoc(doc(this.usersCollection, memberId));
        const memberData = memberDoc.data();

        if (memberData) {
          const individualTarget: Omit<Target, 'id'> = {
            type: 'individual',
            agentId: memberId,
            agentName: memberData.name || memberData.username,
            monthlyTarget: individualMonthlyTarget,
            dealsTarget: individualDealsTarget,
            period: teamTarget.period,
            description: `Individual target derived from team: ${teamTarget.teamName}`,
            managerId: teamTarget.managerId,
            managerName: teamTarget.managerName,
            created_at: now,
            updated_at: now
          };

          const docRef = doc(this.targetsCollection);
          batch.set(docRef, individualTarget);
          
          individualTargets.push({
            id: docRef.id,
            ...individualTarget
          });
        }
      }

      await batch.commit();
      return individualTargets;
    } catch (error) {
      console.error('Error creating individual targets from team target:', error);
      throw error;
    }
  }
}

export const targetsService = new FirebaseTargetsService();
