// API Configuration
export const API_CONFIG = {
  // Base URL for all API requests
  BASE_URL: 'http://vmaxcom.org',
  
  // API endpoints
  ENDPOINTS: {
    AUTH: '/api/auth.php',
    USERS: '/api/users-api.php',
    DEALS: '/api/deals-api.php',
    CALLBACKS: '/api/callbacks-api.php',
    NOTIFICATIONS: '/api/notifications-api.php',
    ANALYTICS: '/api/analytics-api.php',
  },
  
  // Default headers for API requests
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  
  // Timeout for API requests in milliseconds
  TIMEOUT: 30000, // 30 seconds
  
  // Retry configuration
  RETRY: {
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000, // 1 second
  },
};

// Get full API URL for an endpoint
export function getApiUrl(endpoint: string): string {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
}

// Check if running in development mode
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

// Log API configuration (only in development)
if (IS_DEVELOPMENT) {
  console.log('API Configuration:', {
    baseUrl: API_CONFIG.BASE_URL,
    environment: process.env.NODE_ENV,
  });
}
