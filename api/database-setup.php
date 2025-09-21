<?php
require_once 'config.php';

class DatabaseSetup {
    private $conn;
    
    public function __construct() {
        $this->conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        
        if ($this->conn->connect_error) {
            throw new Exception("Connection failed: " . $this->conn->connect_error);
        }
        
        $this->conn->set_charset("utf8mb4");
    }
    
    public function setupDatabase() {
        echo "Setting up VMax CRM Database...\n";
        
        // Create all tables
        $this->createUsersTable();
        $this->createDealsTable();
        $this->createCallbacksTable();
        $this->createNotificationsTable();
        
        // Create default data
        $this->createDefaultUsers();
        
        echo "Database setup completed successfully!\n";
    }
    
    private function createUsersTable() {
        echo "Creating users table...\n";
        
        $sql = "CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(50) PRIMARY KEY,
            username VARCHAR(100) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            name VARCHAR(100) NOT NULL,
            phone VARCHAR(20),
            role ENUM('admin', 'manager', 'team-leader', 'salesman') NOT NULL,
            team VARCHAR(100),
            managedTeam VARCHAR(100),
            status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
            last_login TIMESTAMP NULL,
            created_by VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_role (role),
            INDEX idx_team (team),
            INDEX idx_status (status),
            INDEX idx_email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        
        if (!$this->conn->query($sql)) {
            throw new Exception("Error creating users table: " . $this->conn->error);
        }
        
        echo "Users table created successfully.\n";
    }
    
    private function createDealsTable() {
        echo "Creating deals table...\n";
        
        $sql = "CREATE TABLE IF NOT EXISTS deals (
            id VARCHAR(50) PRIMARY KEY,
            DealID VARCHAR(50) UNIQUE,
            customer_name VARCHAR(255) NOT NULL,
            email VARCHAR(255),
            phone_number VARCHAR(20),
            country VARCHAR(100),
            custom_country VARCHAR(100),
            amount_paid DECIMAL(10,2) DEFAULT 0,
            service_tier ENUM('Silver', 'Gold', 'Premium') DEFAULT 'Silver',
            product_type VARCHAR(100),
            sales_agent VARCHAR(100),
            sales_agent_norm VARCHAR(100),
            closing_agent VARCHAR(100),
            closing_agent_norm VARCHAR(100),
            sales_team VARCHAR(100),
            SalesAgentID VARCHAR(50),
            ClosingAgentID VARCHAR(50),
            stage ENUM('lead', 'qualified', 'proposal', 'negotiation', 'closed-won', 'closed-lost') DEFAULT 'lead',
            status ENUM('active', 'inactive', 'completed', 'cancelled') DEFAULT 'active',
            priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
            signup_date DATE,
            duration_years INT DEFAULT 1,
            duration_months INT DEFAULT 12,
            number_of_users INT DEFAULT 1,
            notes TEXT,
            username VARCHAR(100),
            invoice VARCHAR(255),
            device_id VARCHAR(100),
            device_key VARCHAR(255),
            invoice_link VARCHAR(500),
            created_by VARCHAR(100),
            created_by_id VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_sales_agent (SalesAgentID),
            INDEX idx_closing_agent (ClosingAgentID),
            INDEX idx_team (sales_team),
            INDEX idx_status (status),
            INDEX idx_stage (stage),
            INDEX idx_signup_date (signup_date),
            INDEX idx_created_at (created_at),
            FOREIGN KEY (SalesAgentID) REFERENCES users(id) ON DELETE SET NULL,
            FOREIGN KEY (ClosingAgentID) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        
        if (!$this->conn->query($sql)) {
            throw new Exception("Error creating deals table: " . $this->conn->error);
        }
        
        echo "Deals table created successfully.\n";
    }
    
    private function createCallbacksTable() {
        echo "Creating callbacks table...\n";
        
        $sql = "CREATE TABLE IF NOT EXISTS callbacks (
            id VARCHAR(50) PRIMARY KEY,
            customer_name VARCHAR(255) NOT NULL,
            phone_number VARCHAR(20) NOT NULL,
            email VARCHAR(255),
            sales_agent VARCHAR(100),
            sales_agent_norm VARCHAR(100),
            sales_team VARCHAR(100),
            SalesAgentID VARCHAR(50),
            first_call_date DATE,
            first_call_time TIME,
            scheduled_date DATE,
            scheduled_time TIME,
            callback_notes TEXT,
            callback_reason VARCHAR(255),
            status ENUM('pending', 'contacted', 'completed', 'cancelled', 'converted') DEFAULT 'pending',
            priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
            follow_up_required BOOLEAN DEFAULT TRUE,
            converted_to_deal BOOLEAN DEFAULT FALSE,
            deal_id VARCHAR(50),
            created_by VARCHAR(100),
            created_by_id VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_sales_agent (SalesAgentID),
            INDEX idx_team (sales_team),
            INDEX idx_status (status),
            INDEX idx_priority (priority),
            INDEX idx_scheduled_date (scheduled_date),
            INDEX idx_created_at (created_at),
            FOREIGN KEY (SalesAgentID) REFERENCES users(id) ON DELETE SET NULL,
            FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        
        if (!$this->conn->query($sql)) {
            throw new Exception("Error creating callbacks table: " . $this->conn->error);
        }
        
        echo "Callbacks table created successfully.\n";
    }
    
    private function createNotificationsTable() {
        echo "Creating notifications table...\n";
        
        $sql = "CREATE TABLE IF NOT EXISTS notifications (
            id VARCHAR(50) PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            type ENUM('info', 'success', 'warning', 'error') DEFAULT 'info',
            priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
            target_users JSON NOT NULL,
            created_by VARCHAR(50),
            created_by_name VARCHAR(100),
            is_read BOOLEAN DEFAULT FALSE,
            read_by JSON DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_created_at (created_at),
            INDEX idx_type (type),
            INDEX idx_priority (priority)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        
        if (!$this->conn->query($sql)) {
            throw new Exception("Error creating notifications table: " . $this->conn->error);
        }
        
        echo "Notifications table created successfully.\n";
    }
    
    private function createDefaultUsers() {
        echo "Creating default users...\n";
        
        // Check if admin exists
        $checkSql = "SELECT COUNT(*) as count FROM users WHERE role = 'admin'";
        $result = $this->conn->query($checkSql);
        $row = $result->fetch_assoc();
        
        if ($row['count'] == 0) {
            $users = [
                [
                    'id' => 'user_admin_' . uniqid(),
                    'username' => 'admin',
                    'email' => 'admin@vmax.com',
                    'password' => password_hash('admin123', PASSWORD_DEFAULT),
                    'name' => 'System Administrator',
                    'role' => 'admin',
                    'status' => 'active'
                ],
                [
                    'id' => 'user_manager_' . uniqid(),
                    'username' => 'manager',
                    'email' => 'manager@vmax.com',
                    'password' => password_hash('manage@Vmax', PASSWORD_DEFAULT),
                    'name' => 'Sales Manager',
                    'role' => 'manager',
                    'status' => 'active'
                ]
            ];
            
            foreach ($users as $user) {
                $sql = "INSERT INTO users (id, username, email, password, name, role, status, created_at) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())";
                
                $stmt = $this->conn->prepare($sql);
                $stmt->bind_param("sssssss", 
                    $user['id'], 
                    $user['username'], 
                    $user['email'], 
                    $user['password'], 
                    $user['name'], 
                    $user['role'], 
                    $user['status']
                );
                
                if ($stmt->execute()) {
                    echo "Created user: " . $user['username'] . "\n";
                } else {
                    echo "Error creating user " . $user['username'] . ": " . $stmt->error . "\n";
                }
            }
        } else {
            echo "Default users already exist.\n";
        }
    }
    
    public function showTables() {
        echo "\nDatabase Tables:\n";
        echo "================\n";
        
        $result = $this->conn->query("SHOW TABLES");
        while ($row = $result->fetch_array()) {
            $tableName = $row[0];
            $countResult = $this->conn->query("SELECT COUNT(*) as count FROM `$tableName`");
            $count = $countResult->fetch_assoc()['count'];
            echo "- $tableName ($count records)\n";
        }
    }
}

// Run setup if called directly
if (php_sapi_name() === 'cli' || (isset($_GET['setup']) && $_GET['setup'] === 'true')) {
    try {
        $setup = new DatabaseSetup();
        $setup->setupDatabase();
        $setup->showTables();
        
        if (php_sapi_name() !== 'cli') {
            echo "<pre>Database setup completed successfully!</pre>";
        }
    } catch (Exception $e) {
        echo "Error: " . $e->getMessage() . "\n";
    }
}
?>
