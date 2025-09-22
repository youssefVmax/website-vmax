// MySQL-based replacement for Firebase backup service
import { directMySQLService } from './direct-mysql-service';

export interface BackupStatistics {
  collections: Array<{
    name: string;
    count: number;
  }>;
  totalDocuments: number;
  timestamp: string;
}

export interface BackupData {
  metadata: {
    timestamp: string;
    totalDocuments: number;
    collections: string[];
    source: 'mysql';
  };
  data: Record<string, any[]>;
}

class MySQLBackupService {
  private readonly TABLES = [
    'deals',
    'callbacks', 
    'users',
    'notifications',
    'targets',
    'team_targets',
    'sales_analytics'
  ];

  async getBackupStatistics(): Promise<BackupStatistics> {
    try {
      const collections: Array<{ name: string; count: number }> = [];
      let totalDocuments = 0;

      for (const table of this.TABLES) {
        try {
          const response = await directMySQLService.makeDirectRequest(`${table}-api.php?action=count`);
          const count = response.count || 0;
          collections.push({
            name: table,
            count: count
          });
          totalDocuments += count;
        } catch (error) {
          console.warn(`Failed to get count for ${table}:`, error);
          collections.push({
            name: table,
            count: 0
          });
        }
      }

      return {
        collections,
        totalDocuments,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting backup statistics:', error);
      throw error;
    }
  }

  async exportAllData(): Promise<BackupData> {
    try {
      const data: Record<string, any[]> = {};
      const collections: string[] = [];
      let totalDocuments = 0;

      for (const table of this.TABLES) {
        try {
          let tableData: any[] = [];
          
          // Get data based on table type
          switch (table) {
            case 'deals':
              const dealsResponse = await directMySQLService.getDeals({});
              tableData = Array.isArray(dealsResponse) ? dealsResponse : (dealsResponse.deals || []);
              break;
              
            case 'callbacks':
              const callbacksResponse = await directMySQLService.getCallbacks({});
              tableData = Array.isArray(callbacksResponse) ? callbacksResponse : (callbacksResponse.callbacks || []);
              break;
              
            case 'users':
              const usersResponse = await directMySQLService.getUsers({});
              tableData = Array.isArray(usersResponse) ? usersResponse : (usersResponse.users || []);
              break;
              
            case 'notifications':
              const notificationsResponse = await directMySQLService.getNotifications({});
              tableData = Array.isArray(notificationsResponse) ? notificationsResponse : (notificationsResponse.notifications || []);
              break;
              
            case 'targets':
              const targetsResponse = await directMySQLService.getTargets({});
              tableData = Array.isArray(targetsResponse) ? targetsResponse : (targetsResponse.targets || []);
              break;
              
            case 'team_targets':
              const teamTargetsResponse = await directMySQLService.getTargets({});
              tableData = Array.isArray(teamTargetsResponse) ? teamTargetsResponse : (teamTargetsResponse.targets || []);
              break;
              
            default:
              // Generic API call for other tables
              const response = await directMySQLService.makeDirectRequest(`${table}-api.php`);
              tableData = Array.isArray(response) ? response : (response[table] || []);
          }

          data[table] = tableData;
          collections.push(table);
          totalDocuments += tableData.length;
          
        } catch (error) {
          console.warn(`Failed to export ${table}:`, error);
          data[table] = [];
          collections.push(table);
        }
      }

      return {
        metadata: {
          timestamp: new Date().toISOString(),
          totalDocuments,
          collections,
          source: 'mysql'
        },
        data
      };
    } catch (error) {
      console.error('Error exporting all data:', error);
      throw error;
    }
  }

  downloadBackupAsJSON(backupData: BackupData): void {
    try {
      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const link = document.createElement('a');
      link.href = url;
      link.download = `mysql-backup-${timestamp}.json`;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error downloading backup:', error);
      throw error;
    }
  }

  async createAndDownloadBackup(): Promise<void> {
    try {
      const backupData = await this.exportAllData();
      this.downloadBackupAsJSON(backupData);
    } catch (error) {
      console.error('Error creating backup:', error);
      throw error;
    }
  }
}

export const firebaseBackupService = new MySQLBackupService();
export default firebaseBackupService;
