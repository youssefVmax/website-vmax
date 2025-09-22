<?php
/**
 * VMAX Sales System - Database Connection Handler
 * Centralized database connection using config.php settings
 */

require_once __DIR__ . '/config.php';

class DatabaseConnection {
    private static $instance = null;
    private $connection;
    
    private function __construct() {
        try {
            $this->connection = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
            
            if ($this->connection->connect_error) {
                throw new Exception("Connection failed: " . $this->connection->connect_error);
            }
            
            // Set charset to UTF-8MB4 for full Unicode support
            if (!$this->connection->set_charset('utf8mb4')) {
                throw new Exception("Error setting charset: " . $this->connection->error);
            }
            
            // Set timezone
            $this->connection->query("SET time_zone = '+00:00'");
            
        } catch (Exception $e) {
            $this->handleConnectionError($e->getMessage());
        }
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    public function getConnection() {
        // Check if connection is still alive
        if (!$this->connection->ping()) {
            // Reconnect if connection is lost
            $this->__construct();
        }
        return $this->connection;
    }
    
    public function testConnection() {
        try {
            $result = $this->connection->query("SELECT 1 as test");
            if ($result) {
                return [
                    'status' => 'success',
                    'message' => 'Database connection successful',
                    'server_info' => $this->connection->server_info,
                    'host_info' => $this->connection->host_info
                ];
            } else {
                throw new Exception("Test query failed");
            }
        } catch (Exception $e) {
            return [
                'status' => 'error',
                'message' => 'Connection test failed: ' . $e->getMessage()
            ];
        }
    }
    
    public function executeQuery($sql, $params = [], $types = '') {
        try {
            if (empty($params)) {
                $result = $this->connection->query($sql);
                if ($result === false) {
                    throw new Exception($this->connection->error);
                }
                return $result;
            } else {
                $stmt = $this->connection->prepare($sql);
                if (!$stmt) {
                    throw new Exception($this->connection->error);
                }
                
                if (!empty($types) && !empty($params)) {
                    $stmt->bind_param($types, ...$params);
                }
                
                $stmt->execute();
                return $stmt->get_result();
            }
        } catch (Exception $e) {
            throw new Exception("Query execution failed: " . $e->getMessage());
        }
    }
    
    public function getLastInsertId() {
        return $this->connection->insert_id;
    }
    
    public function getAffectedRows() {
        return $this->connection->affected_rows;
    }
    
    private function handleConnectionError($message) {
        if (!headers_sent()) {
            http_response_code(500);
            header('Content-Type: application/json');
        }
        
        echo json_encode([
            'status' => 'error',
            'message' => 'Database connection failed',
            'details' => $message,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        exit;
    }
    
    public function close() {
        if ($this->connection) {
            $this->connection->close();
        }
    }
    
    // Prevent cloning
    private function __clone() {}
    
    // Prevent unserialization
    public function __wakeup() {
        throw new Exception("Cannot unserialize singleton");
    }
}

// Global connection instance for backward compatibility
$db = DatabaseConnection::getInstance();
$conn = $db->getConnection();

// Function to get database instance (recommended way)
function getDB() {
    return DatabaseConnection::getInstance();
}

// Function to get raw connection (for legacy code)
function getConnection() {
    return DatabaseConnection::getInstance()->getConnection();
}
?>