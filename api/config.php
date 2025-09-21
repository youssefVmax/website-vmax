<?php
// Database configuration
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'vmax');

// Application configuration
define('APP_NAME', 'VMax CRM');
define('APP_VERSION', '1.0.0');

// Security configuration
define('JWT_SECRET', 'your-secret-key-here');
define('SESSION_TIMEOUT', 3600); // 1 hour

// API configuration
define('API_BASE_URL', '/api/');

// Error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Timezone
date_default_timezone_set('UTC');
?>
