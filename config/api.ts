/**
 * Central API Configuration and Utility
 * This is the ONLY file that should be used for API requests throughout the application
 */

// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.NODE_ENV === 'production' 
    ? 'https://vmaxcom.org' 
    : 'http://localhost:3001',
  
  TIMEOUT: 30000, // 30 seconds
  
  ENDPOINTS: {
    // Analytics & Dashboard
    ANALYTICS: '/api/analytics',
    ANALYTICS_DETAILED: '/api/analytics/detailed',
    
    // Core Data
    DEALS: '/api/deals',
    CALLBACKS: '/api/callbacks', 
    NOTIFICATIONS: '/api/notifications',
    TARGETS: '/api/targets',
    USERS: '/api/users',
    
    // Authentication
    AUTH: '/api/auth',
    USER_PROFILE: '/api/user-profile',
    
    // Specialized
    EXPORT: '/api/export',
    FEEDBACK: '/api/feedback',
    PERMISSIONS: '/api/permissions',
    HEALTH: '/api/health',
    
    // Legacy endpoints (to be removed)
    MYSQL_SERVICE: '/api/mysql-service.php',
    ANALYTICS_PHP: '/api/analytics-api.php',
  } as const,
  
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  } as const,
} as const;

// Request options interface
export interface ApiRequestOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

// Response wrapper interface
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  total?: number;
  page?: number;
  limit?: number;
}

// Error class for API errors
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: Response
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Get the full API URL for an endpoint
 */
export function getApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_CONFIG.BASE_URL}/${cleanEndpoint}`;
}

/**
 * Enhanced API request function with retry logic and better error handling
 * ZERO CACHING - Always fetches fresh data
 */
async function apiRequest<T = any>(
  endpoint: string, 
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const {
    method = 'GET',
    headers = {},
    body,
    retries = 3,
    retryDelay = 1000,
    timeout = 30000,
  } = options;

  // Build the full URL with cache-busting parameter
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? process.env.NEXT_PUBLIC_API_URL || ''
    : '';
  
  // Add cache-busting parameter to prevent any caching
  const separator = endpoint.includes('?') ? '&' : '?';
  const cacheBuster = `_t=${Date.now()}&_r=${Math.random().toString(36).substr(2, 9)}`;
  const url = `${baseUrl}${endpoint}${separator}${cacheBuster}`;

  // Prepare headers with anti-cache directives
  const requestHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
    'X-Requested-With': 'XMLHttpRequest',
    'X-Cache-Control': 'no-cache',
    ...headers,
  };

  // Prepare fetch options with no-cache directives
  const fetchOptions: RequestInit = {
    method,
    headers: requestHeaders,
    // CRITICAL: Disable all caching
    cache: 'no-store',
    // Force fresh requests
    next: { 
      revalidate: 0,
      tags: [`fresh-${Date.now()}`]
    },
  };

  if (body && method !== 'GET') {
    fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(`🚀 API Request (attempt ${attempt + 1}/${retries + 1}):`, {
        method: fetchOptions.method || 'GET',
        url,
        headers: Object.keys(requestHeaders)
      });

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle HTTP errors
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.message || errorMessage;
        } catch {
          // Use the raw text if it's not JSON
          errorMessage = errorText || errorMessage;
        }

        throw new ApiError(errorMessage, response.status, response);
      }

      // Parse response
      const contentType = response.headers.get('content-type');
      let data: any;

      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      console.log(`✅ API Request successful:`, {
        status: response.status,
        dataType: typeof data,
        hasData: !!data
      });

      // Return standardized response
      if (typeof data === 'object' && data !== null) {
        return {
          success: true,
          ...data
        };
      } else {
        return {
          success: true,
          data
        };
      }

    } catch (error) {
      lastError = error as Error;
      
      console.error(`❌ API Request failed (attempt ${attempt + 1}):`, {
        error: lastError.message,
        url,
        willRetry: attempt < retries
      });

      // Don't retry on certain errors
      if (error instanceof ApiError && error.status && error.status < 500) {
        break;
      }

      // Wait before retry (exponential backoff)
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
      }
    }
  }

  // All retries failed
  return {
    success: false,
    error: lastError?.message || 'Request failed after all retries'
  };
}

/**
 * Convenience methods for different HTTP verbs
 */
export const api = {
  get: <T = any>(endpoint: string, options?: ApiRequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, data?: any, options?: ApiRequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T = any>(endpoint: string, data?: any, options?: ApiRequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T = any>(endpoint: string, options?: ApiRequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),

  patch: <T = any>(endpoint: string, data?: any, options?: ApiRequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),
};

/**
 * Build query string from parameters
 */
export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Specialized API methods for common operations
 */
export const apiMethods = {
  // Dashboard analytics
  getDashboardStats: (filters?: Record<string, any>) => {
    const queryString = filters ? buildQueryString(filters) : '';
    return api.get(`${API_CONFIG.ENDPOINTS.ANALYTICS}${queryString}`);
  },

  // Deals
  getDeals: (filters?: Record<string, any>) => {
    const queryString = filters ? buildQueryString(filters) : '';
    return api.get(`${API_CONFIG.ENDPOINTS.DEALS}${queryString}`);
  },

  createDeal: (dealData: any) => 
    api.post(API_CONFIG.ENDPOINTS.DEALS, dealData),

  updateDeal: (id: string, updates: any) => 
    api.put(`${API_CONFIG.ENDPOINTS.DEALS}?id=${id}`, updates),

  deleteDeal: (id: string) => 
    api.delete(`${API_CONFIG.ENDPOINTS.DEALS}?id=${id}`),

  // Callbacks
  getCallbacks: (filters?: Record<string, any>) => {
    const queryString = filters ? buildQueryString(filters) : '';
    return api.get(`${API_CONFIG.ENDPOINTS.CALLBACKS}${queryString}`);
  },

  createCallback: (callbackData: any) => 
    api.post(API_CONFIG.ENDPOINTS.CALLBACKS, callbackData),

  updateCallback: (id: string, updates: any) => 
    api.put(`${API_CONFIG.ENDPOINTS.CALLBACKS}?id=${id}`, updates),

  deleteCallback: (id: string) => 
    api.delete(`${API_CONFIG.ENDPOINTS.CALLBACKS}?id=${id}`),

  // Notifications
  getNotifications: (filters?: Record<string, any>) => {
    const queryString = filters ? buildQueryString(filters) : '';
    return api.get(`${API_CONFIG.ENDPOINTS.NOTIFICATIONS}${queryString}`);
  },

  createNotification: (notificationData: any) => 
    api.post(API_CONFIG.ENDPOINTS.NOTIFICATIONS, notificationData),

  // Authentication
  authenticate: (credentials: { username: string; password: string }) =>
    api.post(API_CONFIG.ENDPOINTS.AUTH, credentials),

  getUserProfile: (userId: string) =>
    api.get(`${API_CONFIG.ENDPOINTS.USER_PROFILE}?user_id=${userId}`),

  // Health check
  healthCheck: () => 
    api.get(API_CONFIG.ENDPOINTS.HEALTH),
};

// Export everything for easy access
export default {
  API_CONFIG,
  getApiUrl,
  apiRequest,
  api,
  apiMethods,
  buildQueryString,
  ApiError,
};
