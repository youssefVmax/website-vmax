import { 
  collection, 
  getDocs, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db } from './firebase';
import { COLLECTIONS } from '@/types/firebase';

export interface BackupData {
  timestamp: string;
  collections: {
    [key: string]: any[];
  };
  metadata: {
    totalDocuments: number;
    collectionsCount: number;
    exportedAt: string;
    version: string;
  };
}

class FirebaseBackupService {
  private readonly collections = [
    COLLECTIONS.DEALS || 'deals',
    COLLECTIONS.CALLBACKS || 'callbacks',
    COLLECTIONS.USERS || 'users',
    COLLECTIONS.TARGETS || 'targets',
    COLLECTIONS.TARGET_PROGRESS || 'target_progress',
    COLLECTIONS.NOTIFICATIONS || 'notifications',
    'analytics', // Additional collections that might exist
    'settings',
    'logs'
  ];

  /**
   * Export all data from Firebase collections
   */
  async exportAllData(): Promise<BackupData> {
    console.log('🔄 Starting Firebase backup export...');
    
    const backupData: BackupData = {
      timestamp: new Date().toISOString(),
      collections: {},
      metadata: {
        totalDocuments: 0,
        collectionsCount: 0,
        exportedAt: new Date().toLocaleString(),
        version: '1.0.0'
      }
    };

    let totalDocs = 0;
    let successfulCollections = 0;

    for (const collectionName of this.collections) {
      try {
        console.log(`📥 Exporting collection: ${collectionName}`);
        const data = await this.exportCollection(collectionName);
        
        if (data.length > 0) {
          backupData.collections[collectionName] = data;
          totalDocs += data.length;
          successfulCollections++;
          console.log(`✅ Exported ${data.length} documents from ${collectionName}`);
        } else {
          console.log(`⚠️ Collection ${collectionName} is empty or doesn't exist`);
        }
      } catch (error) {
        console.error(`❌ Error exporting collection ${collectionName}:`, error);
        // Continue with other collections even if one fails
      }
    }

    backupData.metadata.totalDocuments = totalDocs;
    backupData.metadata.collectionsCount = successfulCollections;

    console.log(`🎉 Backup completed! Exported ${totalDocs} documents from ${successfulCollections} collections`);
    return backupData;
  }

  /**
   * Export a specific collection
   */
  private async exportCollection(collectionName: string): Promise<any[]> {
    try {
      const collectionRef = collection(db, collectionName);
      const querySnapshot = await getDocs(collectionRef);
      
      const documents = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        _collection: collectionName,
        _exportedAt: new Date().toISOString()
      }));

      return documents;
    } catch (error) {
      console.error(`Error fetching collection ${collectionName}:`, error);
      return [];
    }
  }

  /**
   * Download backup as JSON file
   */
  downloadBackupAsJSON(backupData: BackupData, filename?: string): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultFilename = `firebase-backup-${timestamp}.json`;
    const finalFilename = filename || defaultFilename;

    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = finalFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log(`📁 Backup downloaded as: ${finalFilename}`);
  }

  /**
   * Download backup as CSV files (one per collection)
   */
  downloadBackupAsCSV(backupData: BackupData): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    Object.entries(backupData.collections).forEach(([collectionName, documents]) => {
      if (documents.length === 0) return;

      const csv = this.convertToCSV(documents);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `${collectionName}-backup-${timestamp}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });

    console.log(`📁 CSV backups downloaded for ${Object.keys(backupData.collections).length} collections`);
  }

  /**
   * Convert array of objects to CSV format
   */
  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    // Get all unique keys from all objects
    const allKeys = new Set<string>();
    data.forEach(item => {
      Object.keys(item).forEach(key => allKeys.add(key));
    });

    const headers = Array.from(allKeys);
    const csvRows = [headers.join(',')];

    data.forEach(item => {
      const row = headers.map(header => {
        const value = item[header];
        if (value === null || value === undefined) return '';
        
        // Handle objects and arrays
        if (typeof value === 'object') {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        
        // Handle strings with commas or quotes
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        
        return stringValue;
      });
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  /**
   * Get backup statistics
   */
  async getBackupStatistics(): Promise<{
    collections: { name: string; count: number }[];
    totalDocuments: number;
    estimatedSize: string;
  }> {
    const stats = {
      collections: [] as { name: string; count: number }[],
      totalDocuments: 0,
      estimatedSize: '0 KB'
    };

    for (const collectionName of this.collections) {
      try {
        const collectionRef = collection(db, collectionName);
        const querySnapshot = await getDocs(collectionRef);
        const count = querySnapshot.size;
        
        if (count > 0) {
          stats.collections.push({ name: collectionName, count });
          stats.totalDocuments += count;
        }
      } catch (error) {
        console.error(`Error getting stats for ${collectionName}:`, error);
      }
    }

    // Rough estimate of size (assuming ~1KB per document on average)
    const estimatedBytes = stats.totalDocuments * 1024;
    if (estimatedBytes < 1024 * 1024) {
      stats.estimatedSize = `${Math.round(estimatedBytes / 1024)} KB`;
    } else {
      stats.estimatedSize = `${Math.round(estimatedBytes / (1024 * 1024))} MB`;
    }

    return stats;
  }

  /**
   * Export specific collections only
   */
  async exportSpecificCollections(collectionNames: string[]): Promise<BackupData> {
    console.log('🔄 Starting selective backup export...');
    
    const backupData: BackupData = {
      timestamp: new Date().toISOString(),
      collections: {},
      metadata: {
        totalDocuments: 0,
        collectionsCount: 0,
        exportedAt: new Date().toLocaleString(),
        version: '1.0.0'
      }
    };

    let totalDocs = 0;
    let successfulCollections = 0;

    for (const collectionName of collectionNames) {
      try {
        console.log(`📥 Exporting collection: ${collectionName}`);
        const data = await this.exportCollection(collectionName);
        
        if (data.length > 0) {
          backupData.collections[collectionName] = data;
          totalDocs += data.length;
          successfulCollections++;
          console.log(`✅ Exported ${data.length} documents from ${collectionName}`);
        }
      } catch (error) {
        console.error(`❌ Error exporting collection ${collectionName}:`, error);
      }
    }

    backupData.metadata.totalDocuments = totalDocs;
    backupData.metadata.collectionsCount = successfulCollections;

    return backupData;
  }
}

export const firebaseBackupService = new FirebaseBackupService();
