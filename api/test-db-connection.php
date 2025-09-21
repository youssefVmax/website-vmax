<?php
// Include the config file
require_once 'config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    // Test database connection
    $conn = getDbConnection();
    
    // Test a simple query
    $stmt = $conn->query("SELECT 1 AS test, DATABASE() AS db_name, USER() AS db_user, VERSION() AS db_version");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Get list of tables
    $stmt = $conn->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    // Get PHP version
    $phpVersion = phpversion();
    
    // Prepare response
    $response = [
        'status' => 'success',
        'database' => [
            'name' => $result['db_name'],
            'user' => $result['db_user'],
            'version' => $result['db_version'],
            'connection' => 'success',
            'tables' => $tables,
        ],
        'server' => [
            'php_version' => $phpVersion,
            'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
            'remote_addr' => $_SERVER['REMOTE_ADDR'] ?? 'Unknown',
        ],
        'timestamp' => date('Y-m-d H:i:s'),
    ];
    
    echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Database connection failed',
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s'),
    ], JSON_PRETTY_PRINT);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'An error occurred',
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s'),
    ], JSON_PRETTY_PRINT);
}
?>
