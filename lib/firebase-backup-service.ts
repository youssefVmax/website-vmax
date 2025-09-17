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
    try {
      console.log('🔄 Starting JSON download process...');
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const defaultFilename = `firebase-backup-${timestamp}.json`;
      const finalFilename = filename || defaultFilename;

      const jsonString = JSON.stringify(backupData, null, 2);
      
      // Try multiple download methods for better compatibility
      if (this.downloadUsingDataURI(jsonString, finalFilename)) {
        console.log(`✅ Backup downloaded using data URI: ${finalFilename}`);
        return;
      }
      
      if (this.downloadUsingBlob(jsonString, finalFilename)) {
        console.log(`✅ Backup downloaded using blob: ${finalFilename}`);
        return;
      }
      
      // Fallback: show data in a new window for manual saving
      this.showBackupInNewWindow(jsonString, finalFilename);
      
    } catch (error) {
      console.error('❌ Error during download:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Fallback: show data for manual copy
      this.showBackupInNewWindow(JSON.stringify(backupData, null, 2), filename || 'firebase-backup.json');
    }
  }

  /**
   * Download using data URI (more compatible with CSP)
   */
  private downloadUsingDataURI(content: string, filename: string): boolean {
    try {
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(content);
      const link = document.createElement('a');
      link.setAttribute('href', dataUri);
      link.setAttribute('download', filename);
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      return true;
    } catch (error) {
      console.warn('Data URI download failed:', error);
      return false;
    }
  }

  /**
   * Download using blob URL
   */
  private downloadUsingBlob(content: string, filename: string): boolean {
    try {
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      
      return true;
    } catch (error) {
      console.warn('Blob download failed:', error);
      return false;
    }
  }

  /**
   * Fallback: show backup data for manual copying (CSP-compliant)
   */
  private showBackupInNewWindow(content: string, filename: string): void {
    // Instead of opening a new window with inline scripts, 
    // use a simpler approach that's CSP-compliant
    this.showBackupModal(content, filename);
  }

  /**
   * Show backup in a modal overlay (CSP-compliant)
   */
  private showBackupModal(content: string, filename: string): void {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: monospace;
    `;

    // Create modal content
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white;
      border-radius: 8px;
      padding: 20px;
      max-width: 90%;
      max-height: 90%;
      overflow: auto;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;

    // Create header
    const header = document.createElement('div');
    header.innerHTML = `
      <h2 style="margin: 0 0 15px 0; color: #333;">🔄 Firebase Backup: ${filename}</h2>
      <div style="background: #e7f3ff; padding: 15px; border-radius: 4px; margin-bottom: 20px; font-size: 14px;">
        <strong>📋 How to save this backup:</strong><br>
        1. Click in the text area below<br>
        2. Select all text (Ctrl+A)<br>
        3. Copy the text (Ctrl+C)<br>
        4. Open a text editor (Notepad, VS Code, etc.)<br>
        5. Paste and save as "${filename}"
      </div>
    `;

    // Create textarea
    const textarea = document.createElement('textarea');
    textarea.value = content;
    textarea.readOnly = true;
    textarea.style.cssText = `
      width: 100%;
      height: 400px;
      font-family: monospace;
      font-size: 12px;
      border: 1px solid #ddd;
      padding: 10px;
      margin-bottom: 15px;
      box-sizing: border-box;
    `;

    // Create buttons container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'text-align: center;';

    // Select All button
    const selectAllBtn = document.createElement('button');
    selectAllBtn.textContent = '📋 Select All';
    selectAllBtn.style.cssText = `
      background: #007cba;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      margin: 5px;
      font-size: 14px;
    `;
    selectAllBtn.addEventListener('click', () => {
      textarea.select();
      textarea.setSelectionRange(0, 99999); // For mobile devices
    });

    // Copy button
    const copyBtn = document.createElement('button');
    copyBtn.textContent = '📄 Copy to Clipboard';
    copyBtn.style.cssText = selectAllBtn.style.cssText;
    copyBtn.addEventListener('click', async () => {
      try {
        textarea.select();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(content);
          alert('✅ Backup data copied to clipboard!');
        } else {
          // Fallback for older browsers
          document.execCommand('copy');
          alert('✅ Backup data copied to clipboard!');
        }
      } catch (error) {
        alert('❌ Copy failed. Please select all text and copy manually (Ctrl+C)');
      }
    });

    // Download button
    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = '💾 Try Download';
    downloadBtn.style.cssText = selectAllBtn.style.cssText;
    downloadBtn.addEventListener('click', () => {
      this.downloadUsingDataURI(content, filename) || this.downloadUsingBlob(content, filename);
    });

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '❌ Close';
    closeBtn.style.cssText = `
      background: #dc3545;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      margin: 5px;
      font-size: 14px;
    `;
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
    });

    // Assemble modal
    buttonContainer.appendChild(selectAllBtn);
    buttonContainer.appendChild(copyBtn);
    buttonContainer.appendChild(downloadBtn);
    buttonContainer.appendChild(closeBtn);

    modal.appendChild(header);
    modal.appendChild(textarea);
    modal.appendChild(buttonContainer);
    overlay.appendChild(modal);

    // Add to page
    document.body.appendChild(overlay);

    // Auto-select text for easy copying
    setTimeout(() => {
      textarea.focus();
      textarea.select();
    }, 100);

    // Also log to console as backup
    console.log('=== FIREBASE BACKUP DATA ===');
    console.log('Filename:', filename);
    console.log('Content:', content);
    console.log('=== END BACKUP DATA ===');
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
