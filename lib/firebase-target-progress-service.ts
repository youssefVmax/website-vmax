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
  writeBatch,
  increment
} from 'firebase/firestore';
import { db } from './firebase';

export interface TargetProgress {
  id?: string;
  targetId: string;
  agentId: string;
  agentName: string;
  period: string; // "January 2025"
  monthlyTarget: number;
  dealsTarget: number;
  currentSales: number;
  currentDeals: number;
  remainingTarget: number;
  remainingDeals: number;
  progressPercentage: number;
  dealsProgressPercentage: number;
  status: 'on-track' | 'behind' | 'exceeded';
  lastUpdated: Timestamp;
  dealHistory: Array<{
    dealId: string;
    dealAmount: number;
    customerName: string;
    date: Timestamp;
  }>;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export class FirebaseTargetProgressService {
  private readonly COLLECTION = 'target_progress';

  // Initialize target progress when a target is created
  async initializeTargetProgress(target: any): Promise<string> {
    try {
      const progressData: Omit<TargetProgress, 'id'> = {
        targetId: target.id,
        agentId: target.agentId,
        agentName: target.agentName,
        period: target.period,
        monthlyTarget: target.monthlyTarget,
        dealsTarget: target.dealsTarget,
        currentSales: 0,
        currentDeals: 0,
        remainingTarget: target.monthlyTarget,
        remainingDeals: target.dealsTarget,
        progressPercentage: 0,
        dealsProgressPercentage: 0,
        status: 'on-track',
        lastUpdated: Timestamp.now(),
        dealHistory: [],
        created_at: Timestamp.now(),
        updated_at: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, this.COLLECTION), progressData);
      return docRef.id;
    } catch (error) {
      console.error('Error initializing target progress:', error);
      throw error;
    }
  }

  // Update target progress when a deal is created
  async updateProgressOnDealCreation(agentId: string, dealAmount: number, dealId: string, customerName: string, period: string): Promise<void> {
    try {
      // Find the target progress record for this agent and period
      const q = query(
        collection(db, this.COLLECTION),
        where('agentId', '==', agentId),
        where('period', '==', period)
      );

      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const batch = writeBatch(db);
        
        snapshot.docs.forEach(doc => {
          const progressRef = doc.ref;
          const currentData = doc.data() as TargetProgress;
          
          const newCurrentSales = currentData.currentSales + dealAmount;
          const newCurrentDeals = currentData.currentDeals + 1;
          const newRemainingTarget = Math.max(0, currentData.monthlyTarget - newCurrentSales);
          const newRemainingDeals = Math.max(0, currentData.dealsTarget - newCurrentDeals);
          const newProgressPercentage = (newCurrentSales / currentData.monthlyTarget) * 100;
          const newDealsProgressPercentage = (newCurrentDeals / currentData.dealsTarget) * 100;
          
          // Determine status
          let status: 'on-track' | 'behind' | 'exceeded' = 'on-track';
          if (newProgressPercentage >= 100 || newDealsProgressPercentage >= 100) {
            status = 'exceeded';
          } else if (newProgressPercentage < 70 && newDealsProgressPercentage < 70) {
            status = 'behind';
          }

          // Add deal to history
          const newDealEntry = {
            dealId,
            dealAmount,
            customerName,
            date: Timestamp.now()
          };

          const updatedDealHistory = [...(currentData.dealHistory || []), newDealEntry];

          batch.update(progressRef, {
            currentSales: newCurrentSales,
            currentDeals: newCurrentDeals,
            remainingTarget: newRemainingTarget,
            remainingDeals: newRemainingDeals,
            progressPercentage: newProgressPercentage,
            dealsProgressPercentage: newDealsProgressPercentage,
            status,
            lastUpdated: Timestamp.now(),
            dealHistory: updatedDealHistory,
            updated_at: Timestamp.now()
          });
        });

        await batch.commit();
      }
    } catch (error) {
      console.error('Error updating target progress:', error);
      throw error;
    }
  }

  // Get target progress for an agent
  async getAgentTargetProgress(agentId: string, period?: string): Promise<TargetProgress[]> {
    try {
      let q = query(
        collection(db, this.COLLECTION),
        where('agentId', '==', agentId),
        orderBy('created_at', 'desc')
      );

      if (period) {
        q = query(
          collection(db, this.COLLECTION),
          where('agentId', '==', agentId),
          where('period', '==', period)
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as TargetProgress));
    } catch (error) {
      console.error('Error fetching agent target progress:', error);
      return [];
    }
  }

  // Get all target progress (for managers)
  async getAllTargetProgress(): Promise<TargetProgress[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        orderBy('updated_at', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as TargetProgress));
    } catch (error) {
      console.error('Error fetching all target progress:', error);
      return [];
    }
  }

  // Get target progress by period
  async getTargetProgressByPeriod(period: string): Promise<TargetProgress[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('period', '==', period),
        orderBy('progressPercentage', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as TargetProgress));
    } catch (error) {
      console.error('Error fetching target progress by period:', error);
      return [];
    }
  }

  // Update target when target values are modified
  async updateTargetValues(targetId: string, newMonthlyTarget: number, newDealsTarget: number): Promise<void> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('targetId', '==', targetId)
      );

      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const batch = writeBatch(db);
        
        snapshot.docs.forEach(doc => {
          const progressRef = doc.ref;
          const currentData = doc.data() as TargetProgress;
          
          const newRemainingTarget = Math.max(0, newMonthlyTarget - currentData.currentSales);
          const newRemainingDeals = Math.max(0, newDealsTarget - currentData.currentDeals);
          const newProgressPercentage = (currentData.currentSales / newMonthlyTarget) * 100;
          const newDealsProgressPercentage = (currentData.currentDeals / newDealsTarget) * 100;
          
          // Determine status
          let status: 'on-track' | 'behind' | 'exceeded' = 'on-track';
          if (newProgressPercentage >= 100 || newDealsProgressPercentage >= 100) {
            status = 'exceeded';
          } else if (newProgressPercentage < 70 && newDealsProgressPercentage < 70) {
            status = 'behind';
          }

          batch.update(progressRef, {
            monthlyTarget: newMonthlyTarget,
            dealsTarget: newDealsTarget,
            remainingTarget: newRemainingTarget,
            remainingDeals: newRemainingDeals,
            progressPercentage: newProgressPercentage,
            dealsProgressPercentage: newDealsProgressPercentage,
            status,
            updated_at: Timestamp.now()
          });
        });

        await batch.commit();
      }
    } catch (error) {
      console.error('Error updating target values:', error);
      throw error;
    }
  }

  // Delete target progress when target is deleted
  async deleteTargetProgress(targetId: string): Promise<void> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('targetId', '==', targetId)
      );

      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const batch = writeBatch(db);
        
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });

        await batch.commit();
      }
    } catch (error) {
      console.error('Error deleting target progress:', error);
      throw error;
    }
  }

  // Get team performance summary
  async getTeamPerformanceSummary(period: string): Promise<{
    totalTeamTarget: number;
    totalTeamSales: number;
    totalTeamDeals: number;
    teamProgressPercentage: number;
    memberCount: number;
    topPerformers: Array<{
      agentName: string;
      progressPercentage: number;
      currentSales: number;
    }>;
  }> {
    try {
      const progressData = await this.getTargetProgressByPeriod(period);
      
      const totalTeamTarget = progressData.reduce((sum, p) => sum + p.monthlyTarget, 0);
      const totalTeamSales = progressData.reduce((sum, p) => sum + p.currentSales, 0);
      const totalTeamDeals = progressData.reduce((sum, p) => sum + p.currentDeals, 0);
      const teamProgressPercentage = totalTeamTarget > 0 ? (totalTeamSales / totalTeamTarget) * 100 : 0;
      
      const topPerformers = progressData
        .sort((a, b) => b.progressPercentage - a.progressPercentage)
        .slice(0, 5)
        .map(p => ({
          agentName: p.agentName,
          progressPercentage: p.progressPercentage,
          currentSales: p.currentSales
        }));

      return {
        totalTeamTarget,
        totalTeamSales,
        totalTeamDeals,
        teamProgressPercentage,
        memberCount: progressData.length,
        topPerformers
      };
    } catch (error) {
      console.error('Error getting team performance summary:', error);
      throw error;
    }
  }

  // Handle deal deletion/refund (reverse the progress)
  async reverseProgressOnDealDeletion(agentId: string, dealAmount: number, dealId: string, period: string): Promise<void> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('agentId', '==', agentId),
        where('period', '==', period)
      );

      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const batch = writeBatch(db);
        
        snapshot.docs.forEach(doc => {
          const progressRef = doc.ref;
          const currentData = doc.data() as TargetProgress;
          
          const newCurrentSales = Math.max(0, currentData.currentSales - dealAmount);
          const newCurrentDeals = Math.max(0, currentData.currentDeals - 1);
          const newRemainingTarget = currentData.monthlyTarget - newCurrentSales;
          const newRemainingDeals = currentData.dealsTarget - newCurrentDeals;
          const newProgressPercentage = (newCurrentSales / currentData.monthlyTarget) * 100;
          const newDealsProgressPercentage = (newCurrentDeals / currentData.dealsTarget) * 100;
          
          // Determine status
          let status: 'on-track' | 'behind' | 'exceeded' = 'on-track';
          if (newProgressPercentage >= 100 || newDealsProgressPercentage >= 100) {
            status = 'exceeded';
          } else if (newProgressPercentage < 70 && newDealsProgressPercentage < 70) {
            status = 'behind';
          }

          // Remove deal from history
          const updatedDealHistory = (currentData.dealHistory || []).filter(deal => deal.dealId !== dealId);

          batch.update(progressRef, {
            currentSales: newCurrentSales,
            currentDeals: newCurrentDeals,
            remainingTarget: newRemainingTarget,
            remainingDeals: newRemainingDeals,
            progressPercentage: newProgressPercentage,
            dealsProgressPercentage: newDealsProgressPercentage,
            status,
            lastUpdated: Timestamp.now(),
            dealHistory: updatedDealHistory,
            updated_at: Timestamp.now()
          });
        });

        await batch.commit();
      }
    } catch (error) {
      console.error('Error reversing target progress:', error);
      throw error;
    }
  }
}

export const targetProgressService = new FirebaseTargetProgressService();
