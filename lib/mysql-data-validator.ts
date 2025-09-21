import { apiService } from './api-service';
import { databaseService } from './mysql-database-service';

/**
 * MySQL Data Validator - Ensures all data operations are properly connected
 * and using the correct MySQL tables with proper validation
 */
export class MySQLDataValidator {
  private static instance: MySQLDataValidator;

  public static getInstance(): MySQLDataValidator {
    if (!MySQLDataValidator.instance) {
      MySQLDataValidator.instance = new MySQLDataValidator();
    }
    return MySQLDataValidator.instance;
  }

  // Validate database connection and table structure
  async validateDatabaseConnection(): Promise<{
    connected: boolean;
    tables: string[];
    indexes: string[];
    errors: string[];
  }> {
    const result = {
      connected: false,
      tables: [] as string[],
      indexes: [] as string[],
      errors: [] as string[]
    };

    try {
      // Test basic connection
      await apiService.makeRequest('test_connection');
      result.connected = true;

      // Check required tables exist
      const requiredTables = [
        'users', 'deals', 'callbacks', 'targets', 'notifications',
        'target_progress', 'settings', 'activity_log', 'user_sessions',
        'deal_history', 'callback_history', 'team_metrics'
      ];

      for (const table of requiredTables) {
        try {
          await apiService.makeRequest(`check_table&table=${table}`);
          result.tables.push(table);
        } catch (error) {
          result.errors.push(`Table ${table} not found or inaccessible`);
        }
      }

      // Check critical indexes exist
      const criticalIndexes = [
        'idx_deals_sales_team',
        'idx_deals_sales_agent',
        'idx_callbacks_sales_team',
        'idx_callbacks_sales_agent',
        'idx_users_role',
        'idx_users_team'
      ];

      for (const index of criticalIndexes) {
        try {
          await apiService.makeRequest(`check_index&index=${index}`);
          result.indexes.push(index);
        } catch (error) {
          result.errors.push(`Index ${index} not found - performance may be affected`);
        }
      }

    } catch (error) {
      result.errors.push(`Database connection failed: ${error}`);
    }

    return result;
  }

  // Validate team leader data access
  async validateTeamLeaderAccess(userId: string, managedTeam: string): Promise<{
    valid: boolean;
    personalDeals: number;
    teamDeals: number;
    personalCallbacks: number;
    teamCallbacks: number;
    errors: string[];
  }> {
    const result = {
      valid: false,
      personalDeals: 0,
      teamDeals: 0,
      personalCallbacks: 0,
      teamCallbacks: 0,
      errors: [] as string[]
    };

    try {
      // Test personal data access
      const personalDeals = await apiService.getDeals({ salesAgentId: userId });
      result.personalDeals = personalDeals.length;

      const personalCallbacks = await apiService.getCallbacks({ salesAgentId: userId });
      result.personalCallbacks = personalCallbacks.length;

      // Test team data access
      const teamDeals = await apiService.getDeals({ salesTeam: managedTeam });
      result.teamDeals = teamDeals.length;

      const teamCallbacks = await apiService.getCallbacks({ salesTeam: managedTeam });
      result.teamCallbacks = teamCallbacks.length;

      result.valid = true;

    } catch (error) {
      result.errors.push(`Team leader data access validation failed: ${error}`);
    }

    return result;
  }

  // Validate data integrity across all tables
  async validateDataIntegrity(): Promise<{
    valid: boolean;
    orphanedDeals: number;
    orphanedCallbacks: number;
    missingUsers: string[];
    inconsistentTeams: string[];
    errors: string[];
  }> {
    const result = {
      valid: true,
      orphanedDeals: 0,
      orphanedCallbacks: 0,
      missingUsers: [] as string[],
      inconsistentTeams: [] as string[],
      errors: [] as string[]
    };

    try {
      // Check for orphaned deals (deals without valid users)
      const deals = await apiService.getDeals();
      const users = await apiService.getUsers();
      const userIds = new Set(users.map(u => u.id));

      for (const deal of deals) {
        if (deal.salesAgentId && !userIds.has(deal.salesAgentId)) {
          result.orphanedDeals++;
          result.missingUsers.push(deal.salesAgentId);
        }
      }

      // Check for orphaned callbacks
      const callbacks = await apiService.getCallbacks();
      for (const callback of callbacks) {
        if (callback.salesAgentId && !userIds.has(callback.salesAgentId)) {
          result.orphanedCallbacks++;
          if (!result.missingUsers.includes(callback.salesAgentId)) {
            result.missingUsers.push(callback.salesAgentId);
          }
        }
      }

      // Check team consistency
      const teams = new Set(users.map(u => u.team).filter(Boolean));
      const dealTeams = new Set(deals.map(d => d.salesTeam).filter(Boolean));
      const callbackTeams = new Set(callbacks.map(c => c.salesTeam).filter(Boolean));

      for (const team of dealTeams) {
        if (!teams.has(team)) {
          result.inconsistentTeams.push(team);
        }
      }

      for (const team of callbackTeams) {
        if (!teams.has(team) && !result.inconsistentTeams.includes(team)) {
          result.inconsistentTeams.push(team);
        }
      }

      if (result.orphanedDeals > 0 || result.orphanedCallbacks > 0 || result.inconsistentTeams.length > 0) {
        result.valid = false;
      }

    } catch (error) {
      result.valid = false;
      result.errors.push(`Data integrity validation failed: ${error}`);
    }

    return result;
  }

  // Test all CRUD operations for each role
  async testCRUDOperations(testUser: { id: string; name: string; role: string; team?: string; managedTeam?: string }): Promise<{
    success: boolean;
    operations: {
      createDeal: boolean;
      updateDeal: boolean;
      deleteDeal: boolean;
      createCallback: boolean;
      updateCallback: boolean;
      deleteCallback: boolean;
    };
    errors: string[];
  }> {
    const result = {
      success: false,
      operations: {
        createDeal: false,
        updateDeal: false,
        deleteDeal: false,
        createCallback: false,
        updateCallback: false,
        deleteCallback: false
      },
      errors: [] as string[]
    };

    try {
      // Test deal operations
      const testDeal = {
        customerName: 'Test Customer',
        email: 'test@example.com',
        phoneNumber: '1234567890',
        amountPaid: 1000,
        serviceTier: 'Silver',
        salesTeam: testUser.team || 'TEST_TEAM',
        stage: 'prospect',
        status: 'active'
      };

      try {
        const dealId = await databaseService.createDealWithTracking(testDeal, testUser);
        result.operations.createDeal = true;

        await apiService.updateDeal(dealId, { stage: 'qualified' });
        result.operations.updateDeal = true;

        await apiService.deleteDeal(dealId);
        result.operations.deleteDeal = true;
      } catch (error) {
        result.errors.push(`Deal operations failed: ${error}`);
      }

      // Test callback operations
      const testCallback = {
        customerName: 'Test Customer',
        phoneNumber: '1234567890',
        email: 'test@example.com',
        salesTeam: testUser.team || 'TEST_TEAM',
        status: 'pending',
        priority: 'medium',
        callbackReason: 'Follow up'
      };

      try {
        const callbackId = await databaseService.createCallbackWithTracking(testCallback, testUser);
        result.operations.createCallback = true;

        await apiService.updateCallback(callbackId, { status: 'completed' });
        result.operations.updateCallback = true;

        await apiService.deleteCallback(callbackId);
        result.operations.deleteCallback = true;
      } catch (error) {
        result.errors.push(`Callback operations failed: ${error}`);
      }

      const successCount = Object.values(result.operations).filter(Boolean).length;
      result.success = successCount === 6;

    } catch (error) {
      result.errors.push(`CRUD operations test failed: ${error}`);
    }

    return result;
  }

  // Generate comprehensive system health report
  async generateHealthReport(): Promise<{
    overall: 'healthy' | 'warning' | 'critical';
    database: any;
    dataIntegrity: any;
    performance: {
      avgResponseTime: number;
      slowQueries: string[];
    };
    recommendations: string[];
  }> {
    const report = {
      overall: 'healthy' as 'healthy' | 'warning' | 'critical',
      database: await this.validateDatabaseConnection(),
      dataIntegrity: await this.validateDataIntegrity(),
      performance: {
        avgResponseTime: 0,
        slowQueries: [] as string[]
      },
      recommendations: [] as string[]
    };

    // Determine overall health
    if (!report.database.connected || !report.dataIntegrity.valid) {
      report.overall = 'critical';
    } else if (report.database.errors.length > 0 || report.dataIntegrity.orphanedDeals > 0) {
      report.overall = 'warning';
    }

    // Generate recommendations
    if (!report.database.connected) {
      report.recommendations.push('Fix database connection issues immediately');
    }

    if (report.database.tables.length < 12) {
      report.recommendations.push('Run database migration scripts to create missing tables');
    }

    if (report.dataIntegrity.orphanedDeals > 0) {
      report.recommendations.push(`Clean up ${report.dataIntegrity.orphanedDeals} orphaned deals`);
    }

    if (report.dataIntegrity.orphanedCallbacks > 0) {
      report.recommendations.push(`Clean up ${report.dataIntegrity.orphanedCallbacks} orphaned callbacks`);
    }

    if (report.dataIntegrity.inconsistentTeams.length > 0) {
      report.recommendations.push('Fix team name inconsistencies across tables');
    }

    return report;
  }
}

export const dataValidator = MySQLDataValidator.getInstance();
