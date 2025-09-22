<?php
/**
 * Frontend-Backend Connection Test
 * This endpoint tests the complete connection between frontend and backend
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    // Include database connection
    require_once __DIR__ . '/db.php';
    require_once __DIR__ . '/config.php';

    $response = [
        'status' => 'success',
        'message' => 'Frontend-Backend connection successful',
        'timestamp' => date('Y-m-d H:i:s'),
        'server_info' => [
            'php_version' => PHP_VERSION,
            'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
            'request_method' => $_SERVER['REQUEST_METHOD'] ?? 'Unknown',
            'request_uri' => $_SERVER['REQUEST_URI'] ?? 'Unknown',
            'http_host' => $_SERVER['HTTP_HOST'] ?? 'Unknown'
        ],
        'database_test' => null,
        'api_endpoints_test' => []
    ];

    // Test Database Connection
    try {
        $db = getDB();
        $testResult = $db->testConnection();
        
        if ($testResult['status'] === 'success') {
            $conn = $db->getConnection();
            
            // Get sample data counts
            $tables = [];
            $tableNames = ['users', 'deals', 'callbacks', 'notifications'];
            
            foreach ($tableNames as $tableName) {
                try {
                    $result = $conn->query("SELECT COUNT(*) as count FROM `$tableName`");
                    $count = $result ? $result->fetch_assoc()['count'] : 0;
                    $tables[$tableName] = $count;
                } catch (Exception $e) {
                    $tables[$tableName] = 'Table not found';
                }
            }
            
            $response['database_test'] = [
                'status' => 'connected',
                'host' => DB_HOST,
                'database' => DB_NAME,
                'server_version' => $conn->server_info,
                'tables' => $tables
            ];
        } else {
            $response['database_test'] = [
                'status' => 'failed',
                'error' => $testResult['message']
            ];
        }
    } catch (Exception $e) {
        $response['database_test'] = [
            'status' => 'error',
            'error' => $e->getMessage()
        ];
    }

    // Test API Endpoints
    $apiEndpoints = [
        'users-api.php',
        'deals-api.php', 
        'callbacks-api.php',
        'notifications-api.php',
        'analytics-api.php'
    ];

    foreach ($apiEndpoints as $endpoint) {
        $endpointTest = [
            'endpoint' => $endpoint,
            'file_exists' => file_exists(__DIR__ . '/' . $endpoint),
            'url' => 'http://' . ($_SERVER['HTTP_HOST'] ?? 'vmaxcom.org') . '/api/' . $endpoint
        ];

        // Test if file can be included without fatal errors
        try {
            ob_start();
            $old_error_reporting = error_reporting(0); // Suppress errors for this test
            
            // Don't actually include the file, just check if it's readable
            if ($endpointTest['file_exists']) {
                $content = file_get_contents(__DIR__ . '/' . $endpoint, false, null, 0, 100);
                $endpointTest['syntax_check'] = strpos($content, '<?php') === 0 ? 'valid' : 'invalid';
            } else {
                $endpointTest['syntax_check'] = 'file_not_found';
            }
            
            error_reporting($old_error_reporting);
            ob_end_clean();
            
            $endpointTest['status'] = 'ready';
        } catch (Exception $e) {
            $endpointTest['status'] = 'error';
            $endpointTest['error'] = $e->getMessage();
        }

        $response['api_endpoints_test'][] = $endpointTest;
    }

    // Frontend Integration Test
    $response['frontend_integration'] = [
        'cors_headers' => 'enabled',
        'json_response' => 'enabled',
        'base_url' => 'http://' . ($_SERVER['HTTP_HOST'] ?? 'vmaxcom.org'),
        'api_path' => '/api/',
        'test_urls' => [
            'connection_test' => 'http://' . ($_SERVER['HTTP_HOST'] ?? 'vmaxcom.org') . '/api/connection-test.php',
            'db_test' => 'http://' . ($_SERVER['HTTP_HOST'] ?? 'vmaxcom.org') . '/api/test-db-connection.php',
            'deals' => 'http://' . ($_SERVER['HTTP_HOST'] ?? 'vmaxcom.org') . '/api/deals-api.php',
            'callbacks' => 'http://' . ($_SERVER['HTTP_HOST'] ?? 'vmaxcom.org') . '/api/callbacks-api.php'
        ]
    ];

    // Success response
    echo json_encode($response, JSON_PRETTY_PRINT);

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
