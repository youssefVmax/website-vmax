<?php
/**
 * Schema API - lists database tables and row counts
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/db.php';

$response = [
    'success' => false,
    'tables' => [],
    'totalTables' => 0,
    'timestamp' => date('c'),
];

try {
    $db = getDB();
    $conn = $db->getConnection();

    // Get current database name
    $result = $conn->query('SELECT DATABASE() as dbname');
    $row = $result ? $result->fetch_assoc() : null;
    $databaseName = $row && isset($row['dbname']) ? $row['dbname'] : null;

    if (!$databaseName) {
        throw new Exception('No active database selected');
    }

    // List tables and counts
    $tables = [];
    $tablesResult = $conn->query("SHOW TABLES");
    if ($tablesResult) {
        while ($t = $tablesResult->fetch_array()) {
            $tableName = $t[0];
            // Count rows
            $count = 0;
            $countRes = $conn->query("SELECT COUNT(*) as c FROM `{$tableName}`");
            if ($countRes) {
                $countRow = $countRes->fetch_assoc();
                $count = (int)($countRow['c'] ?? 0);
                $countRes->free_result();
            }
            $tables[] = [
                'name' => $tableName,
                'count' => $count,
            ];
        }
        $tablesResult->free_result();
    }

    $response['success'] = true;
    $response['database'] = $databaseName;
    $response['tables'] = $tables;
    $response['totalTables'] = count($tables);
    echo json_encode($response, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    $response['error'] = $e->getMessage();
    echo json_encode($response, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
}
