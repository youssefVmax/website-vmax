interface ConnectionHealth {
  status: 'healthy' | 'unhealthy' | 'error';
  database: {
    connected: boolean;
    responseTime: string;
    pool: any;
  };
  system: {
    uptime: number;
    memory: any;
    version: string;
    platform: string;
    timestamp: string;
  };
  services: {
    unifiedData: string;
    analytics: string;
    userManagement: string;
  };
}

interface ApiEndpoint {
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  status: 'active' | 'inactive' | 'error';
  lastChecked?: Date;
  responseTime?: number;
}

class ConnectionManager {
  private endpoints: Map<string, ApiEndpoint> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private listeners: Set<(health: ConnectionHealth) => void> = new Set();

  constructor() {
    this.initializeEndpoints();
    this.startHealthMonitoring();
  }

  private initializeEndpoints() {
    const endpoints: ApiEndpoint[] = [
      {
        name: 'Unified Data API',
        url: '/api/unified-data',
        method: 'GET',
        status: 'active'
      },
      {
        name: 'Analytics API',
        url: '/api/analytics',
        method: 'GET',
        status: 'active'
      },
      {
        name: 'Health Check',
        url: '/api/health',
        method: 'GET',
        status: 'active'
      }
    ];

    endpoints.forEach(endpoint => {
      this.endpoints.set(endpoint.name, endpoint);
    });

    console.log('🔄 ConnectionManager: Initialized with', endpoints.length, 'endpoints');
  }

  /**
   * Start automatic health monitoring
   */
  private startHealthMonitoring() {
    // Check health every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      this.checkSystemHealth();
    }, 30000);

    // Initial health check
    this.checkSystemHealth();
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Check overall system health
   */
  async checkSystemHealth(): Promise<ConnectionHealth> {
    try {
      console.log('🔍 ConnectionManager: Checking system health...');
      
      const response = await fetch('/api/health');
      const health: ConnectionHealth = await response.json();
      
      // Update endpoint statuses
      this.updateEndpointStatus('Health Check', response.ok ? 'active' : 'error');
      
      // Notify listeners
      this.notifyListeners(health);
      
      console.log('✅ ConnectionManager: System health check completed:', health.status);
      return health;
      
    } catch (error) {
      console.error('❌ ConnectionManager: Health check failed:', error);
      
      const errorHealth: ConnectionHealth = {
        status: 'error',
        database: {
          connected: false,
          responseTime: 'N/A',
          pool: { status: 'error' }
        },
        system: {
          uptime: 0,
          memory: {},
          version: 'unknown',
          platform: 'unknown',
          timestamp: new Date().toISOString()
        },
        services: {
          unifiedData: 'error',
          analytics: 'error',
          userManagement: 'error'
        }
      };
      
      this.notifyListeners(errorHealth);
      return errorHealth;
    }
  }

  /**
   * Test specific API endpoint
   */
  async testEndpoint(endpointName: string, params?: Record<string, string>): Promise<boolean> {
    const endpoint = this.endpoints.get(endpointName);
    if (!endpoint) {
      console.error('❌ ConnectionManager: Unknown endpoint:', endpointName);
      return false;
    }

    try {
      console.log('🔍 ConnectionManager: Testing endpoint:', endpointName);
      
      const startTime = Date.now();
      let url = endpoint.url;
      
      // Add query parameters if provided
      if (params) {
        const queryParams = new URLSearchParams(params);
        url += `?${queryParams.toString()}`;
      }
      
      const response = await fetch(url, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const responseTime = Date.now() - startTime;
      const isHealthy = response.ok;
      
      // Update endpoint status
      this.updateEndpointStatus(endpointName, isHealthy ? 'active' : 'error', responseTime);
      
      console.log(`${isHealthy ? '✅' : '❌'} ConnectionManager: Endpoint ${endpointName} test completed in ${responseTime}ms`);
      return isHealthy;
      
    } catch (error) {
      console.error('❌ ConnectionManager: Endpoint test failed:', endpointName, error);
      this.updateEndpointStatus(endpointName, 'error');
      return false;
    }
  }

  /**
   * Test unified data API with specific parameters
   */
  async testUnifiedDataAPI(userRole: string = 'manager', dataTypes: string = 'deals'): Promise<boolean> {
    return this.testEndpoint('Unified Data API', {
      userRole,
      dataTypes,
      limit: '10'
    });
  }

  /**
   * Test analytics API
   */
  async testAnalyticsAPI(userRole: string = 'manager'): Promise<boolean> {
    return this.testEndpoint('Analytics API', {
      userRole
    });
  }

  /**
   * Get all endpoint statuses
   */
  getEndpointStatuses(): ApiEndpoint[] {
    return Array.from(this.endpoints.values());
  }

  /**
   * Update endpoint status
   */
  private updateEndpointStatus(name: string, status: 'active' | 'inactive' | 'error', responseTime?: number) {
    const endpoint = this.endpoints.get(name);
    if (endpoint) {
      endpoint.status = status;
      endpoint.lastChecked = new Date();
      if (responseTime !== undefined) {
        endpoint.responseTime = responseTime;
      }
      this.endpoints.set(name, endpoint);
    }
  }

  /**
   * Add health change listener
   */
  addHealthListener(listener: (health: ConnectionHealth) => void): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of health changes
   */
  private notifyListeners(health: ConnectionHealth) {
    this.listeners.forEach(listener => {
      try {
        listener(health);
      } catch (error) {
        console.error('❌ ConnectionManager: Error notifying listener:', error);
      }
    });
  }

  /**
   * Get connection statistics
   */
  getConnectionStats() {
    const endpoints = this.getEndpointStatuses();
    const activeEndpoints = endpoints.filter(e => e.status === 'active').length;
    const errorEndpoints = endpoints.filter(e => e.status === 'error').length;
    
    return {
      total: endpoints.length,
      active: activeEndpoints,
      errors: errorEndpoints,
      healthPercentage: Math.round((activeEndpoints / endpoints.length) * 100),
      endpoints
    };
  }

  /**
   * Force refresh all connections
   */
  async refreshAllConnections(): Promise<void> {
    console.log('🔄 ConnectionManager: Refreshing all connections...');
    
    const promises = Array.from(this.endpoints.keys()).map(name => 
      this.testEndpoint(name)
    );
    
    await Promise.allSettled(promises);
    await this.checkSystemHealth();
    
    console.log('✅ ConnectionManager: All connections refreshed');
  }
}

// Export singleton instance
export const connectionManager = new ConnectionManager();
export default connectionManager;
