<?php
/**
 * VMAX Sales System - Complete Database Setup Script
 * This script will create the database, tables, and initial data
 */

header('Content-Type: text/html; charset=utf-8');
echo "<h1>VMAX Sales System - Database Setup</h1>";
echo "<pre>";

require_once 'api/config.php';

class VMaxDatabaseSetup {
    private $conn;
    private $conn_no_db;
    
    public function __construct() {
        echo "=== VMAX Database Setup Starting ===\n\n";
    }
    
    public function run() {
        try {
            $this->step1_testConnection();
            $this->step2_createDatabase();
            $this->step3_connectToDatabase();
            $this->step4_createTables();
            $this->step5_createAdditionalTables();
            $this->step6_createDefaultUsers();
            $this->step7_verifySetup();
            
            echo "\n🎉 SUCCESS: VMAX Sales System database setup completed!\n";
            echo "\nYou can now:\n";
            echo "1. Start your web server\n";
            echo "2. Access your application\n";
            echo "3. Login with: admin / admin123\n";
            echo "4. Test API: api/mysql-service.php?path=users\n";
            
        } catch (Exception $e) {
            echo "\n❌ ERROR: " . $e->getMessage() . "\n";
            echo "Please check the error above and try again.\n";
        }
    }
    
    private function step1_testConnection() {
        echo "Step 1: Testing MySQL Connection...\n";
        
        $this->conn_no_db = new mysqli(DB_HOST, DB_USER, DB_PASS);
        if ($this->conn_no_db->connect_error) {
            throw new Exception("Cannot connect to MySQL server: " . $this->conn_no_db->connect_error);
        }
        
        echo "✅ Connected to MySQL server (Version: " . $this->conn_no_db->server_info . ")\n\n";
    }
    
    private function step2_createDatabase() {
        echo "Step 2: Creating Database...\n";
        
        // Check if database exists
        $result = $this->conn_no_db->query("SHOW DATABASES LIKE '" . DB_NAME . "'");
        if ($result->num_rows > 0) {
            echo "✅ Database '" . DB_NAME . "' already exists\n\n";
        } else {
            $sql = "CREATE DATABASE `" . DB_NAME . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci";
            if ($this->conn_no_db->query($sql)) {
                echo "✅ Database '" . DB_NAME . "' created successfully\n\n";
            } else {
                throw new Exception("Failed to create database: " . $this->conn_no_db->error);
            }
        }
    }
    
    private function step3_connectToDatabase() {
        echo "Step 3: Connecting to Database...\n";
        
        $this->conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        if ($this->conn->connect_error) {
            throw new Exception("Cannot connect to database: " . $this->conn->connect_error);
        }
        
        $this->conn->set_charset("utf8mb4");
        echo "✅ Connected to database '" . DB_NAME . "'\n\n";
    }
    
    private function step4_createTables() {
        echo "Step 4: Creating Main Tables...\n";
        
        // Read and execute tables.sql
        $sql_file = __DIR__ . '/database/tables.sql';
        if (file_exists($sql_file)) {
            $sql_content = file_get_contents($sql_file);
            
            // Remove USE statement and comments
            $sql_content = preg_replace('/^USE\s+\w+;/m', '', $sql_content);
            $sql_content = preg_replace('/^--.*$/m', '', $sql_content);
            
            // Split by semicolon and execute each statement
            $statements = array_filter(array_map('trim', explode(';', $sql_content)));
            
            foreach ($statements as $statement) {
                if (!empty($statement) && !preg_match('/^\s*(SET|USE)/', $statement)) {
                    if (!$this->conn->query($statement)) {
                        echo "⚠️  Warning: " . $this->conn->error . "\n";
                    }
                }
            }
            
            echo "✅ Main tables created from tables.sql\n";
        } else {
            echo "⚠️  Warning: tables.sql not found, creating tables manually\n";
            $this->createTablesManually();
        }
        
        echo "\n";
    }
    
    private function step5_createAdditionalTables() {
        echo "Step 5: Creating Additional Tables...\n";
        
        // Read and execute additional_tables.sql
        $sql_file = __DIR__ . '/database/additional_tables.sql';
        if (file_exists($sql_file)) {
            $sql_content = file_get_contents($sql_file);
            
            // Remove USE statement and comments
            $sql_content = preg_replace('/^USE\s+\w+;/m', '', $sql_content);
            $sql_content = preg_replace('/^--.*$/m', '', $sql_content);
            
            // Split by semicolon and execute each statement
            $statements = array_filter(array_map('trim', explode(';', $sql_content)));
            
            foreach ($statements as $statement) {
                if (!empty($statement) && !preg_match('/^\s*(SET|USE|COMMIT)/', $statement)) {
                    if (!$this->conn->query($statement)) {
                        echo "⚠️  Warning: " . $this->conn->error . "\n";
                    }
                }
            }
            
            echo "✅ Additional tables and indexes created\n";
        } else {
            echo "⚠️  Warning: additional_tables.sql not found\n";
        }
        
        echo "\n";
    }
    
    private function step6_createDefaultUsers() {
        echo "Step 6: Creating Default Users...\n";
        
        // Check if admin user exists
        $result = $this->conn->query("SELECT COUNT(*) as count FROM users WHERE username = 'admin'");
        $row = $result->fetch_assoc();
        
        if ($row['count'] == 0) {
            $users = [
                [
                    'id' => 'user_admin_' . uniqid(),
                    'username' => 'admin',
                    'email' => 'admin@vmax.com',
                    'password' => password_hash('admin123', PASSWORD_DEFAULT),
                    'name' => 'System Administrator',
                    'role' => 'manager',
                    'team' => 'MANAGEMENT'
                ],
                [
                    'id' => 'user_manager_' . uniqid(),
                    'username' => 'manager',
                    'email' => 'manager@vmax.com',
                    'password' => password_hash('manage@Vmax', PASSWORD_DEFAULT),
                    'name' => 'Sales Manager',
                    'role' => 'manager',
                    'team' => 'MANAGEMENT'
                ],
                [
                    'id' => 'user_teamlead_' . uniqid(),
                    'username' => 'teamleader',
                    'email' => 'teamleader@vmax.com',
                    'password' => password_hash('team@Vmax', PASSWORD_DEFAULT),
                    'name' => 'Team Leader',
                    'role' => 'team-leader',
                    'team' => 'ALI ASHRAF',
                    'managedTeam' => 'ALI ASHRAF'
                ]
            ];
            
            foreach ($users as $user) {
                $sql = "INSERT INTO users (id, username, email, password, name, role, team, managedTeam, created_at, updated_at) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
                
                $stmt = $this->conn->prepare($sql);
                $stmt->bind_param("ssssssss", 
                    $user['id'], 
                    $user['username'], 
                    $user['email'], 
                    $user['password'], 
                    $user['name'], 
                    $user['role'], 
                    $user['team'],
                    $user['managedTeam'] ?? null
                );
                
                if ($stmt->execute()) {
                    echo "✅ Created user: " . $user['username'] . " (" . $user['role'] . ")\n";
                } else {
                    echo "⚠️  Warning creating user " . $user['username'] . ": " . $stmt->error . "\n";
                }
            }
        } else {
            echo "✅ Default users already exist\n";
        }
        
        echo "\n";
    }
    
    private function step7_verifySetup() {
        echo "Step 7: Verifying Setup...\n";
        
        // Check tables
        $required_tables = ['users', 'deals', 'callbacks', 'targets', 'target_progress', 'notifications'];
        $result = $this->conn->query("SHOW TABLES");
        $existing_tables = [];
        
        while ($row = $result->fetch_array()) {
            $existing_tables[] = $row[0];
        }
        
        echo "Database Tables (" . count($existing_tables) . " total):\n";
        foreach ($existing_tables as $table) {
            $count_result = $this->conn->query("SELECT COUNT(*) as count FROM `$table`");
            $count = $count_result->fetch_assoc()['count'];
            echo "  - $table ($count records)\n";
        }
        
        $missing = array_diff($required_tables, $existing_tables);
        if (empty($missing)) {
            echo "✅ All required tables exist\n";
        } else {
            echo "⚠️  Missing tables: " . implode(', ', $missing) . "\n";
        }
        
        // Test API Service
        try {
            include_once 'api/mysql-service.php';
            $service = new MySQLService();
            $users = $service->getUsers();
            echo "✅ MySQLService working (found " . count($users) . " users)\n";
        } catch (Exception $e) {
            echo "⚠️  MySQLService error: " . $e->getMessage() . "\n";
        }
        
        echo "\n";
    }
    
    private function createTablesManually() {
        // Create users table
        $sql = "CREATE TABLE IF NOT EXISTS `users` (
            `id` VARCHAR(191) NOT NULL,
            `team` VARCHAR(191) NULL,
            `role` VARCHAR(191) NULL,
            `password` TEXT NULL,
            `phone` TEXT NULL,
            `created_by` VARCHAR(191) NULL,
            `username` VARCHAR(191) NULL,
            `email` VARCHAR(191) NULL,
            `name` VARCHAR(191) NULL,
            `created_at` DATETIME NULL,
            `updated_at` DATETIME NULL,
            `managedTeam` TEXT NULL,
            PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        
        $this->conn->query($sql);
        
        // Create other essential tables...
        // (Additional table creation code would go here)
    }
    
    public function __destruct() {
        if ($this->conn) $this->conn->close();
        if ($this->conn_no_db) $this->conn_no_db->close();
    }
}

// Run the setup
$setup = new VMaxDatabaseSetup();
$setup->run();

echo "</pre>";
?>
