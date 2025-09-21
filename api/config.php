<?php
// Prevent direct access to this file
if (!defined('ABSPATH') && !defined('API_ROOT')) {
    header('HTTP/1.0 403 Forbidden');
    die('Direct access not allowed');
}

// Database configuration
define('DB_HOST', 'localhost');
define('DB_USER', 'root'); // Changed from root for better security
define('DB_PASS', ''); // Consider using a more secure password
define('DB_NAME', 'vmax');

// Application configuration
define('APP_NAME', 'VMax CRM');
define('APP_VERSION', '1.0.0');

// Security configuration
// Generate a secure random key: bin2hex(random_bytes(32))
define('JWT_SECRET', '4f7d9a3e1b8c6f0a9d2e5b8c4a7f1e3d6b9a2c5e8f0d3b1a7c4e9f2d5b8a3');
define('JWT_ALGORITHM', 'HS256');
define('JWT_EXPIRE', 3600); // 1 hour
define('SESSION_TIMEOUT', 3600); // 1 hour

// API configuration
define('API_BASE_URL', '/api/');

// CORS configuration
define('ALLOWED_ORIGINS', [
    'http://vmaxcom.org',
    'https://vmaxcom.org',
    'http://localhost:3000', // For local developmen
]);

// Error reporting
if (getenv('APP_ENV') === 'production') {
    error_reporting(0);
    ini_set('display_errors', 0);
    ini_set('log_errors', 1);
    ini_set('error_log', __DIR__ . '/../logs/php_errors.log');
} else {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
}

// Timezone
date_default_timezone_set('UTC');

// Set security headers
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: strict-origin-when-cross-origin');

// Create logs directory if it doesn't exist
if (!file_exists(__DIR__ . '/../logs')) {
    mkdir(__DIR__ . '/../logs', 0755, true);
}

// Database connection function
function getDbConnection() {
    static $conn;
    
    if (!isset($conn)) {
        try {
            $conn = new PDO(
                "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
                DB_USER,
                DB_PASS,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ]
            );
        } catch (PDOException $e) {
            error_log("Database connection failed: " . $e->getMessage());
            if (getenv('APP_ENV') !== 'production') {
                die("Database connection failed: " . $e->getMessage());
            } else {
                die("Database connection error. Please try again later.");
            }
        }
    }
    
    return $conn;
}

// JWT functions
function generateJWT($payload) {
    $header = json_encode(['typ' => 'JWT', 'alg' => JWT_ALGORITHM]);
    $payload['exp'] = time() + JWT_EXPIRE;
    $payload['iat'] = time();
    $payload = json_encode($payload);
    
    $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
    $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));
    
    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, JWT_SECRET, true);
    $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    
    return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
}

function validateJWT($jwt) {
    $tokenParts = explode('.', $jwt);
    if (count($tokenParts) !== 3) {
        return false;
    }
    
    list($base64UrlHeader, $base64UrlPayload, $signature) = $tokenParts;
    
    $signature = str_replace(['-', '_'], ['+', '/'], $signature);
    $signature = base64_decode($signature);
    
    $header = base64_decode(str_replace(['-', '_'], ['+', '/'], $base64UrlHeader));
    $header = json_decode($header, true);
    
    if (!isset($header['alg']) || $header['alg'] !== JWT_ALGORITHM) {
        return false;
    }
    
    $expectedSignature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, JWT_SECRET, true);
    
    if (!hash_equals($signature, $expectedSignature)) {
        return false;
    }
    
    $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $base64UrlPayload)), true);
    
    if (isset($payload['exp']) && $payload['exp'] < time()) {
        return false;
    }
    
    return $payload;
}

// CORS headers
function setCorsHeaders() {
    $http_origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
    
    if (in_array($http_origin, ALLOWED_ORIGINS)) {
        header("Access-Control-Allow-Origin: $http_origin");
    }
    
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Access-Control-Allow-Credentials: true');
    
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        header('HTTP/1.1 200 OK');
        exit();
    }
}

// Set CORS headers with additional security headers
function setSecurityHeaders() {
    header('X-Frame-Options: DENY');
    header('X-Content-Type-Options: nosniff');
    header('X-XSS-Protection: 1; mode=block');
    header('Referrer-Policy: same-origin');
    header('Permissions-Policy: geolocation=(), microphone=()');
    header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
}

setCorsHeaders();
setSecurityHeaders();
?>
