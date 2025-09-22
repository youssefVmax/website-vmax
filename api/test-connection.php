<?php
// MySQL Connection Test Script for VMAX Sales System
// This script tests the database connection and provides detailed diagnostics

header('Content-Type: text/html; charset=utf-8');
echo "<h1>VMAX MySQL Connection Test</h1>";
echo "<pre>";

require_once 'config.php';

echo "=== VMAX MySQL Connection Diagnostics ===\n\n";

// Test 1: Configuration Check
echo "1. Configuration Check:\n";
echo "   - Host: " . DB_HOST . "\n";
echo "   - User: " . DB_USER . "\n";
echo "   - Database: " . DB_NAME . "\n";
echo "   - Password: " . (DB_PASS ? "[SET - " . strlen(DB_PASS) . " characters]" : "[NOT SET]") . "\n\n";

// Test 2: Basic MySQL Connection (without database)
echo "2. Testing MySQL Server Connection:\n";
try {
    $conn_test = new mysqli(DB_HOST, DB_USER, DB_PASS);
    if ($conn_test->connect_error) {
        echo "   ❌ FAILED: " . $conn_test->connect_error . "\n";
        echo "\n   POSSIBLE SOLUTIONS:\n";
        echo "   - Check if MySQL server is running\n";
        echo "   - Verify username and password are correct\n";
        echo "   - Check if MySQL is running on port 3306\n";
        echo "   - Try connecting with: mysql -u " . DB_USER . " -p\n\n";
        exit;
    } else {
        echo "   ✅ SUCCESS: Connected to MySQL server\n";
        echo "   - Server Version: " . $conn_test->server_info . "\n";
        echo "   - Protocol Version: " . $conn_test->protocol_version . "\n\n";
    }
} catch (Exception $e) {
    echo "   ❌ EXCEPTION: " . $e->getMessage() . "\n\n";
    exit;
}

// Test 3: Database Existence Check
echo "3. Testing Database Existence:\n";
try {
    $result = $conn_test->query("SHOW DATABASES LIKE '" . DB_NAME . "'");
    if ($result->num_rows > 0) {
        echo "   ✅ SUCCESS: Database '" . DB_NAME . "' exists\n\n";
    } else {
        echo "   ❌ FAILED: Database '" . DB_NAME . "' does not exist\n";
        echo "\n   CREATING DATABASE:\n";
        
        // Try to create database
        if ($conn_test->query("CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")) {
            echo "   ✅ SUCCESS: Database '" . DB_NAME . "' created\n\n";
        } else {
            echo "   ❌ FAILED: Could not create database: " . $conn_test->error . "\n";
            echo "\n   MANUAL SOLUTION:\n";
            echo "   Run this SQL command in MySQL:\n";
            echo "   CREATE DATABASE `" . DB_NAME . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n\n";
        }
    }
} catch (Exception $e) {
    echo "   ❌ EXCEPTION: " . $e->getMessage() . "\n\n";
}

// Test 4: Full Connection with Database
echo "4. Testing Full Database Connection:\n";
try {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    if ($conn->connect_error) {
        echo "   ❌ FAILED: " . $conn->connect_error . "\n\n";
    } else {
        echo "   ✅ SUCCESS: Connected to database '" . DB_NAME . "'\n";
        $conn->set_charset("utf8mb4");
        echo "   - Character set: utf8mb4\n\n";
    }
} catch (Exception $e) {
    echo "   ❌ EXCEPTION: " . $e->getMessage() . "\n\n";
    exit;
}

// Test 5: Check Required Tables
echo "5. Checking Required Tables:\n";
$required_tables = ['users', 'deals', 'callbacks', 'targets', 'target_progress', 'notifications'];
$existing_tables = [];

try {
    $result = $conn->query("SHOW TABLES");
    if ($result) {
        while ($row = $result->fetch_array()) {
            $existing_tables[] = $row[0];
        }
        
        echo "   Existing tables: " . count($existing_tables) . "\n";
        foreach ($existing_tables as $table) {
            echo "   - " . $table . "\n";
        }
        echo "\n";
        
        $missing_tables = array_diff($required_tables, $existing_tables);
        if (empty($missing_tables)) {
            echo "   ✅ SUCCESS: All required tables exist\n\n";
        } else {
            echo "   ⚠️  WARNING: Missing tables: " . implode(', ', $missing_tables) . "\n";
            echo "\n   SOLUTION: Run the database setup scripts:\n";
            echo "   1. Execute: database/tables.sql\n";
            echo "   2. Execute: database/additional_tables.sql\n";
            echo "   3. Or visit: api/database-setup.php?setup=true\n\n";
        }
    }
} catch (Exception $e) {
    echo "   ❌ EXCEPTION: " . $e->getMessage() . "\n\n";
}

// Test 6: Test Sample Query
echo "6. Testing Sample Query:\n";
try {
    if (in_array('users', $existing_tables)) {
        $result = $conn->query("SELECT COUNT(*) as count FROM users");
        if ($result) {
            $row = $result->fetch_assoc();
            echo "   ✅ SUCCESS: Query executed successfully\n";
            echo "   - Users count: " . $row['count'] . "\n\n";
        } else {
            echo "   ❌ FAILED: Query failed: " . $conn->error . "\n\n";
        }
    } else {
        echo "   ⚠️  SKIPPED: Users table doesn't exist\n\n";
    }
} catch (Exception $e) {
    echo "   ❌ EXCEPTION: " . $e->getMessage() . "\n\n";
}

// Test 7: Test API Service Class
echo "7. Testing MySQLService Class:\n";
try {
    include_once 'mysql-service.php';
    $service = new MySQLService();
    echo "   ✅ SUCCESS: MySQLService class instantiated\n";
    
    // Test a simple method
    if (in_array('users', $existing_tables)) {
        $users = $service->getUsers();
        echo "   ✅ SUCCESS: getUsers() method works\n";
        echo "   - Returned " . count($users) . " users\n\n";
    } else {
        echo "   ⚠️  SKIPPED: Cannot test methods without users table\n\n";
    }
} catch (Exception $e) {
    echo "   ❌ FAILED: MySQLService error: " . $e->getMessage() . "\n\n";
}

// Test 8: PHP Extensions Check
echo "8. PHP Extensions Check:\n";
$required_extensions = ['mysqli', 'json', 'mbstring'];
foreach ($required_extensions as $ext) {
    if (extension_loaded($ext)) {
        echo "   ✅ " . $ext . " extension loaded\n";
    } else {
        echo "   ❌ " . $ext . " extension NOT loaded\n";
    }
}
echo "\n";

// Summary and Recommendations
echo "=== SUMMARY & RECOMMENDATIONS ===\n\n";

if ($conn && !$conn->connect_error) {
    echo "✅ DATABASE CONNECTION: SUCCESSFUL\n";
    
    if (count($existing_tables) >= count($required_tables)) {
        echo "✅ DATABASE SETUP: COMPLETE\n";
        echo "\nYour VMAX Sales System database is ready to use!\n";
        echo "\nNext steps:\n";
        echo "1. Test your frontend application\n";
        echo "2. Check API endpoints: api/mysql-service.php?path=users\n";
        echo "3. Login with: admin / admin123 or manager / manage@Vmax\n";
    } else {
        echo "⚠️  DATABASE SETUP: INCOMPLETE\n";
        echo "\nTo complete setup:\n";
        echo "1. Run: php api/database-setup.php\n";
        echo "2. Or visit: api/database-setup.php?setup=true\n";
        echo "3. Execute SQL files in database/ folder\n";
    }
} else {
    echo "❌ DATABASE CONNECTION: FAILED\n";
    echo "\nTo fix connection issues:\n";
    echo "1. Start MySQL service: net start mysql (Windows) or sudo service mysql start (Linux)\n";
    echo "2. Check MySQL is running on port 3306\n";
    echo "3. Verify credentials in api/config.php\n";
    echo "4. Test manual connection: mysql -u " . DB_USER . " -p\n";
}

echo "\n=== END OF DIAGNOSTICS ===\n";

// Close connections
if (isset($conn_test)) $conn_test->close();
if (isset($conn)) $conn->close();

echo "</pre>";
?>
