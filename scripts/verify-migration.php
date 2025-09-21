<?php
/**
 * VMAX MySQL Migration Verification Script
 * Run this script to verify the migration was successful
 */

require_once '../api/config.php';

class MigrationVerifier {
    private $conn;
    private $results = [];
    
    public function __construct() {
        $this->conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        
        if ($this->conn->connect_error) {
            die("Connection failed: " . $this->conn->connect_error);
        }
        
        $this->conn->set_charset("utf8mb4");
    }
    
    public function runVerification() {
        echo "🚀 Starting VMAX MySQL Migration Verification...\n\n";
        
        $this->testDatabaseConnection();
        $this->testTableStructure();
        $this->testIndexes();
        $this->testSampleData();
        $this->testUserAuthentication();
        $this->testTeamLeaderFunctionality();
        $this->testDataIntegrity();
        
        $this->printResults();
    }
    
    private function testDatabaseConnection() {
        echo "📡 Testing Database Connection...\n";
        
        try {
            $result = $this->conn->query("SELECT VERSION() as version");
            if ($result) {
                $row = $result->fetch_assoc();
                $this->addResult("Database Connection", "✅ PASS", "MySQL Version: " . $row['version']);
            } else {
                $this->addResult("Database Connection", "❌ FAIL", "Could not query database");
            }
        } catch (Exception $e) {
            $this->addResult("Database Connection", "❌ FAIL", $e->getMessage());
        }
    }
    
    private function testTableStructure() {
        echo "🗄️ Testing Table Structure...\n";
        
        $requiredTables = [
            'users', 'deals', 'callbacks', 'targets', 'notifications',
            'target_progress', 'settings', 'activity_log', 'user_sessions',
            'deal_history', 'callback_history', 'team_metrics'
        ];
        
        foreach ($requiredTables as $table) {
            $result = $this->conn->query("SHOW TABLES LIKE '$table'");
            if ($result && $result->num_rows > 0) {
                $this->addResult("Table: $table", "✅ EXISTS", "");
            } else {
                $this->addResult("Table: $table", "❌ MISSING", "Table not found");
            }
        }
    }
    
    private function testIndexes() {
        echo "📊 Testing Indexes...\n";
        
        $indexTests = [
            ['table' => 'deals', 'column' => 'SalesAgentID', 'name' => 'idx_deals_sales_agent'],
            ['table' => 'callbacks', 'column' => 'SalesAgentID', 'name' => 'idx_callbacks_sales_agent'],
            ['table' => 'users', 'column' => 'username', 'name' => 'idx_users_username'],
            ['table' => 'targets', 'column' => 'agentId', 'name' => 'idx_targets_agent']
        ];
        
        foreach ($indexTests as $test) {
            $result = $this->conn->query("SHOW INDEX FROM {$test['table']} WHERE Column_name = '{$test['column']}'");
            if ($result && $result->num_rows > 0) {
                $this->addResult("Index: {$test['name']}", "✅ EXISTS", "");
            } else {
                $this->addResult("Index: {$test['name']}", "⚠️ MISSING", "Consider adding for performance");
            }
        }
    }
    
    private function testSampleData() {
        echo "📝 Testing Sample Data...\n";
        
        // Test default settings
        $result = $this->conn->query("SELECT COUNT(*) as count FROM settings");
        if ($result) {
            $row = $result->fetch_assoc();
            if ($row['count'] > 0) {
                $this->addResult("Default Settings", "✅ LOADED", "{$row['count']} settings found");
            } else {
                $this->addResult("Default Settings", "⚠️ EMPTY", "No default settings found");
            }
        }
        
        // Test manager user
        $result = $this->conn->query("SELECT COUNT(*) as count FROM users WHERE role = 'manager'");
        if ($result) {
            $row = $result->fetch_assoc();
            if ($row['count'] > 0) {
                $this->addResult("Manager Users", "✅ FOUND", "{$row['count']} manager(s) found");
            } else {
                $this->addResult("Manager Users", "⚠️ MISSING", "No manager users found");
            }
        }
    }
    
    private function testUserAuthentication() {
        echo "🔐 Testing User Authentication...\n";
        
        // Test password hashing
        $testPassword = 'test123';
        $hashedPassword = password_hash($testPassword, PASSWORD_DEFAULT);
        
        if (password_verify($testPassword, $hashedPassword)) {
            $this->addResult("Password Hashing", "✅ WORKING", "PHP password functions operational");
        } else {
            $this->addResult("Password Hashing", "❌ FAIL", "Password hashing not working");
        }
        
        // Test user roles
        $result = $this->conn->query("SELECT DISTINCT role FROM users");
        if ($result) {
            $roles = [];
            while ($row = $result->fetch_assoc()) {
                $roles[] = $row['role'];
            }
            $this->addResult("User Roles", "✅ FOUND", "Roles: " . implode(', ', $roles));
        }
    }
    
    private function testTeamLeaderFunctionality() {
        echo "👥 Testing Team Leader Functionality...\n";
        
        // Test team leader users
        $result = $this->conn->query("SELECT COUNT(*) as count FROM users WHERE role = 'team-leader'");
        if ($result) {
            $row = $result->fetch_assoc();
            $this->addResult("Team Leaders", "ℹ️ INFO", "{$row['count']} team leader(s) found");
        }
        
        // Test managedTeam field
        $result = $this->conn->query("SELECT COUNT(*) as count FROM users WHERE managedTeam IS NOT NULL AND managedTeam != ''");
        if ($result) {
            $row = $result->fetch_assoc();
            $this->addResult("Managed Teams", "ℹ️ INFO", "{$row['count']} users with managed teams");
        }
        
        // Test team filtering capability
        $result = $this->conn->query("SELECT DISTINCT sales_team FROM deals WHERE sales_team IS NOT NULL");
        if ($result) {
            $teams = [];
            while ($row = $result->fetch_assoc()) {
                $teams[] = $row['sales_team'];
            }
            if (!empty($teams)) {
                $this->addResult("Sales Teams", "✅ FOUND", "Teams: " . implode(', ', $teams));
            } else {
                $this->addResult("Sales Teams", "ℹ️ INFO", "No sales teams in deals data yet");
            }
        }
    }
    
    private function testDataIntegrity() {
        echo "🔍 Testing Data Integrity...\n";
        
        // Test foreign key relationships
        $fkTests = [
            "SELECT COUNT(*) as count FROM deals d LEFT JOIN users u ON d.SalesAgentID = u.id WHERE d.SalesAgentID IS NOT NULL AND u.id IS NULL",
            "SELECT COUNT(*) as count FROM callbacks c LEFT JOIN users u ON c.SalesAgentID = u.id WHERE c.SalesAgentID IS NOT NULL AND u.id IS NULL",
            "SELECT COUNT(*) as count FROM targets t LEFT JOIN users u ON t.agentId = u.id WHERE t.agentId IS NOT NULL AND u.id IS NULL"
        ];
        
        $fkNames = ['Deals-Users FK', 'Callbacks-Users FK', 'Targets-Users FK'];
        
        foreach ($fkTests as $index => $query) {
            $result = $this->conn->query($query);
            if ($result) {
                $row = $result->fetch_assoc();
                if ($row['count'] == 0) {
                    $this->addResult($fkNames[$index], "✅ VALID", "No orphaned records");
                } else {
                    $this->addResult($fkNames[$index], "⚠️ ISSUES", "{$row['count']} orphaned records found");
                }
            }
        }
    }
    
    private function addResult($test, $status, $details) {
        $this->results[] = [
            'test' => $test,
            'status' => $status,
            'details' => $details
        ];
    }
    
    private function printResults() {
        echo "\n" . str_repeat("=", 60) . "\n";
        echo "📋 VERIFICATION RESULTS\n";
        echo str_repeat("=", 60) . "\n\n";
        
        $passed = 0;
        $failed = 0;
        $warnings = 0;
        
        foreach ($this->results as $result) {
            printf("%-30s %s %s\n", 
                $result['test'], 
                $result['status'], 
                $result['details']
            );
            
            if (strpos($result['status'], '✅') !== false) $passed++;
            elseif (strpos($result['status'], '❌') !== false) $failed++;
            elseif (strpos($result['status'], '⚠️') !== false) $warnings++;
        }
        
        echo "\n" . str_repeat("-", 60) . "\n";
        echo "📊 SUMMARY:\n";
        echo "✅ Passed: $passed\n";
        echo "❌ Failed: $failed\n";
        echo "⚠️ Warnings: $warnings\n";
        echo "ℹ️ Total Tests: " . count($this->results) . "\n";
        
        if ($failed == 0) {
            echo "\n🎉 Migration verification completed successfully!\n";
            echo "Your VMAX system is ready for production use.\n";
        } else {
            echo "\n⚠️ Some tests failed. Please review and fix issues before production deployment.\n";
        }
    }
    
    public function __destruct() {
        if ($this->conn) {
            $this->conn->close();
        }
    }
}

// Run the verification
$verifier = new MigrationVerifier();
$verifier->runVerification();

?>
