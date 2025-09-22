<?php
/**
 * Simple Database Connection Test
 * Uses the centralized db.php (mysqli) connection handler
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    // Include our database connection
    require_once __DIR__ . '/db.php';

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

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Connection test failed',
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT);
}
?>
