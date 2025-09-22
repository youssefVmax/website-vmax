<?php
<<<<<<< HEAD
/**
 * Simple Database Connection Test
 * Tests the new db.php connection handler
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

try {
    // Include our database connection
    require_once 'db.php';
    
    // Test the connection
    $db = getDB();
    $testResult = $db->testConnection();
    
    if ($testResult['status'] === 'success') {
        // Test database and tables
        $conn = $db->getConnection();
        
        // Check if database exists and get tables
        $tables = [];
        $result = $conn->query("SHOW TABLES");
        if ($result) {
            while ($row = $result->fetch_array()) {
                $tableName = $row[0];
                $countResult = $conn->query("SELECT COUNT(*) as count FROM `$tableName`");
                $count = $countResult ? $countResult->fetch_assoc()['count'] : 0;
                $tables[] = [
                    'name' => $tableName,
                    'records' => $count
                ];
            }
        }
        
        // Get database info
        $dbInfo = [
            'database_name' => DB_NAME,
            'host' => DB_HOST,
            'user' => DB_USER,
            'server_version' => $conn->server_info,
            'connection_id' => $conn->thread_id,
            'charset' => $conn->character_set_name()
        ];
        
        echo json_encode([
            'status' => 'success',
            'message' => 'Database connection successful',
            'database_info' => $dbInfo,
            'tables' => $tables,
            'total_tables' => count($tables),
            'timestamp' => date('Y-m-d H:i:s')
        ], JSON_PRETTY_PRINT);
        
    } else {
        echo json_encode([
            'status' => 'error',
            'message' => $testResult['message'],
            'timestamp' => date('Y-m-d H:i:s')
        ], JSON_PRETTY_PRINT);
    }
    
=======
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
>>>>>>> 17d1a6406371f8cd1978d0d360068bb35674436b
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
<<<<<<< HEAD
        'message' => 'Connection test failed',
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
=======
        'message' => 'An error occurred',
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s'),
>>>>>>> 17d1a6406371f8cd1978d0d360068bb35674436b
    ], JSON_PRETTY_PRINT);
}
?>
