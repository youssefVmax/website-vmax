<?php
// Block direct access via browser but allow includes
if ((isset($_SERVER['SCRIPT_FILENAME']) && basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME']))) {
    header('HTTP/1.0 403 Forbidden');
    exit('Direct access not allowed');
}

// =========================
// Database configuration
// =========================
// Production MySQL credentials
// Host: vmaxcom.org
// User: youssef
// Pass: Vmaxllc#2004youssef
// DB:   vmax

define('DB_HOST', 'vmaxcom.org');
define('DB_USER', 'youssef');
define('DB_PASS', 'Vmaxllc#2004youssef');
define('DB_NAME', 'vmax');
define('DB_PORT', 3306);

// =========================
// Application configuration
// =========================
if (!defined('APP_NAME')) {
    define('APP_NAME', 'VMax CRM');
}
if (!defined('APP_VERSION')) {
    define('APP_VERSION', '1.0.0');
}

// =========================
// Error reporting
// =========================
// Show errors in development, hide in production (set APP_ENV=production to hide)
if (getenv('APP_ENV') === 'production') {
    error_reporting(0);
    ini_set('display_errors', '0');
    ini_set('log_errors', '1');
} else {
    error_reporting(E_ALL);
    ini_set('display_errors', '1');
}

// =========================
// Defaults
// =========================
if (!ini_get('date.timezone')) {
    date_default_timezone_set('UTC');
}

?>
