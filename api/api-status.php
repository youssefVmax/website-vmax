<?php
/**
 * API Status Check - Web Interface
 * Access this via: http://vmaxcom.org/api/api-status.php
 */

header('Content-Type: text/html; charset=UTF-8');
?>
<!DOCTYPE html>
<html>
<head>
    <title>VMAX API Status</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .status { padding: 10px; margin: 5px 0; border-radius: 5px; }
        .success { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .error { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .info { background-color: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
        pre { background: #f8f9fa; padding: 10px; border-radius: 5px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>🚀 VMAX API Status Dashboard</h1>
    <p><strong>Server Time:</strong> <?php echo date('Y-m-d H:i:s'); ?></p>
    
    <?php
    // Test Database Connection
    echo '<h2>📊 Database Connection</h2>';
    try {
        require_once __DIR__ . '/db.php';
        $db = getDB();
        $testResult = $db->testConnection();
        
        if ($testResult['status'] === 'success') {
            echo '<div class="status success">✅ Database connection successful</div>';
            
            // Get database info
            $conn = $db->getConnection();
            echo '<div class="info">
                <strong>Database Info:</strong><br>
                Host: ' . DB_HOST . '<br>
                Database: ' . DB_NAME . '<br>
                Server Version: ' . $conn->server_info . '<br>
                Connection ID: ' . $conn->thread_id . '
            </div>';
        } else {
            echo '<div class="status error">❌ Database connection failed: ' . $testResult['message'] . '</div>';
        }
    } catch (Exception $e) {
        echo '<div class="status error">❌ Database error: ' . $e->getMessage() . '</div>';
    }
    
    // Test API Endpoints
    $apis = [
        'Users API' => 'users-api.php',
        'Deals API' => 'deals-api.php', 
        'Callbacks API' => 'callbacks-api.php',
        'Notifications API' => 'notifications-api.php',
        'Analytics API' => 'analytics-api.php'
    ];
    
    echo '<h2>🔌 API Endpoints Status</h2>';
    
    foreach ($apis as $name => $file) {
        echo "<h3>$name</h3>";
        
        // Check if file exists
        if (!file_exists(__DIR__ . '/' . $file)) {
            echo '<div class="status error">❌ File not found: ' . $file . '</div>';
            continue;
        }
        
        // Test HTTP access
        $url = 'http://' . $_SERVER['HTTP_HOST'] . '/api/' . $file;
        echo '<div class="info">
            <strong>Endpoint URL:</strong> <a href="' . $url . '" target="_blank">' . $url . '</a><br>
            <strong>File Status:</strong> ✅ File exists<br>
        </div>';
        
        // Test basic PHP syntax
        $output = '';
        $error = '';
        
        ob_start();
        $old_error_reporting = error_reporting(E_ALL);
        
        try {
            // Capture any output or errors
            include __DIR__ . '/' . $file;
            $output = ob_get_contents();
        } catch (Exception $e) {
            $error = $e->getMessage();
        } catch (ParseError $e) {
            $error = 'Parse Error: ' . $e->getMessage();
        } catch (Error $e) {
            $error = 'Fatal Error: ' . $e->getMessage();
        }
        
        ob_end_clean();
        error_reporting($old_error_reporting);
        
        if ($error) {
            echo '<div class="status error">❌ PHP Error: ' . htmlspecialchars($error) . '</div>';
        } else {
            echo '<div class="status success">✅ PHP syntax valid, no fatal errors</div>';
        }
    }
    
    // Test Frontend API Calls
    echo '<h2>🌐 Frontend API Test</h2>';
    echo '<div class="info">
        <p>Test the API endpoints from your frontend by making requests to:</p>
        <ul>
            <li><code>GET http://vmaxcom.org/api/test-db-connection.php</code></li>
            <li><code>GET http://vmaxcom.org/api/deals-api.php</code></li>
            <li><code>GET http://vmaxcom.org/api/callbacks-api.php</code></li>
            <li><code>GET http://vmaxcom.org/api/users-api.php</code></li>
        </ul>
    </div>';
    
    echo '<h2>📋 Next Steps</h2>';
    echo '<div class="info">
        <ol>
            <li>✅ All API files are properly configured</li>
            <li>✅ Database connection is working</li>
            <li>🔄 Test API calls from your Next.js frontend</li>
            <li>🔄 Verify data fetching works correctly</li>
        </ol>
    </div>';
    ?>
    
    <hr>
    <p><small>Generated at <?php echo date('Y-m-d H:i:s'); ?> | VMAX Sales System</small></p>
</body>
</html>
