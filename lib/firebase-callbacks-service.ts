// MySQL-based replacement for Firebase callbacks service
import { callbacksService as mysqlCallbacksService, Callback, CallbacksService } from './mysql-callbacks-service';

// Export the MySQL service with Firebase-compatible interface
export const callbacksService: CallbacksService = mysqlCallbacksService;

// Export types for compatibility
export type { Callback };

// Additional Firebase-compatible methods
export class FirebaseCallbacksService {
  // Firebase-style method names for backward compatibility
  async getAllCallbacks(): Promise<Callback[]> {
    return mysqlCallbacksService.getCallbacks('manager');
  }

  async getCallbacksForUser(userId: string, userRole: string = 'salesman'): Promise<Callback[]> {
    return mysqlCallbacksService.getCallbacks(userRole, userId);
  }

  // Firebase-style listener with different signature
  onCallbacksUpdate(callback: (callbacks: Callback[]) => void, userRole: string = 'manager', userId?: string): () => void {
    return mysqlCallbacksService.onCallbacksChange(callback, userRole, userId);
  }

  // Delegate other methods to MySQL service
  async addCallback(callbackData: Omit<Callback, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    return mysqlCallbacksService.addCallback(callbackData);
  }

  async updateCallback(id: string, updates: Partial<Callback>): Promise<void> {
    return mysqlCallbacksService.updateCallback(id, updates);
  }

  async deleteCallback(id: string): Promise<void> {
    return mysqlCallbacksService.deleteCallback(id);
  }

  async getCallbackById(id: string): Promise<Callback | null> {
    return mysqlCallbacksService.getCallbackById(id);
  }
}

// Export default instance
export default new FirebaseCallbacksService();
