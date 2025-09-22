<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/db.php';

class NotificationsAPI {
    private $conn;
    
    public function __construct() {
        // Use centralized database connection
        $db = getDB();
        $this->conn = $db->getConnection();
        $this->createNotificationsTable();
    }
    
    private function createNotificationsTable() {
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
    }
    
    public function getNotifications($filters = []) {
        $sql = "SELECT * FROM notifications WHERE 1=1";
        $params = [];
        $types = "";
        
        // Filter by user access
        if (!empty($filters['userId'])) {
            $userId = $filters['userId'];
            $role = $filters['role'] ?? '';
            
            if ($role !== 'manager') {
                // Non-managers only see notifications targeted to them or ALL
                $sql .= " AND (JSON_CONTAINS(target_users, ?, '$') OR JSON_CONTAINS(target_users, '\"ALL\"', '$'))";
                $params[] = '"' . $userId . '"';
                $types .= "s";
            }
        }
        
        if (!empty($filters['type'])) {
            $sql .= " AND type = ?";
            $params[] = $filters['type'];
            $types .= "s";
        }
        
        if (!empty($filters['priority'])) {
            $sql .= " AND priority = ?";
            $params[] = $filters['priority'];
            $types .= "s";
        }
        
        $sql .= " ORDER BY created_at DESC";
        
        $stmt = $this->conn->prepare($sql);
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $result = $stmt->get_result();
        
        $notifications = [];
        while ($row = $result->fetch_assoc()) {
            $row['target_users'] = json_decode($row['target_users'], true);
            $row['read_by'] = json_decode($row['read_by'], true) ?: [];
            $row['to'] = $row['target_users']; // For compatibility
            $row['read'] = $row['is_read'];
            $row['timestamp'] = $row['created_at'];
            $notifications[] = $row;
        }
        
        return $notifications;
    }
    
    public function createNotification($data) {
        $id = $this->generateId('notif_');
        
        $sql = "INSERT INTO notifications (id, title, message, type, priority, target_users, created_by, created_by_name, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())";
        
        $targetUsers = json_encode($data['to'] ?? ['ALL']);
        $type = $data['type'] ?? 'info';
        $priority = $data['priority'] ?? 'medium';
        
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("ssssssss",
            $id,
            $data['title'] ?? 'Notification',
            $data['message'] ?? '',
            $type,
            $priority,
            $targetUsers,
            $data['created_by'] ?? '',
            $data['created_by_name'] ?? ''
        );
        
        if ($stmt->execute()) {
            return [
                'success' => true,
                'id' => $id,
                'notification' => [
                    'id' => $id,
                    'title' => $data['title'] ?? 'Notification',
                    'message' => $data['message'] ?? '',
                    'type' => $type,
                    'priority' => $priority,
                    'to' => $data['to'] ?? ['ALL'],
                    'timestamp' => date('Y-m-d H:i:s'),
                    'read' => false
                ]
            ];
        } else {
            throw new Exception("Error creating notification: " . $stmt->error);
        }
    }
    
    public function updateNotification($data) {
        if (!empty($data['markAllForUser'])) {
            // Mark all notifications as read for a specific user
            $userId = $data['userId'];
            $sql = "UPDATE notifications SET is_read = TRUE, 
                    read_by = JSON_ARRAY_APPEND(COALESCE(read_by, JSON_ARRAY()), '$', ?)
                    WHERE (JSON_CONTAINS(target_users, ?, '$') OR JSON_CONTAINS(target_users, '\"ALL\"', '$'))
                    AND NOT JSON_CONTAINS(COALESCE(read_by, JSON_ARRAY()), ?, '$')";
            
            $stmt = $this->conn->prepare($sql);
            $userIdJson = '"' . $userId . '"';
            $stmt->bind_param("sss", $userId, $userIdJson, $userIdJson);
            
            if ($stmt->execute()) {
                return ['success' => true, 'message' => 'All notifications marked as read'];
            } else {
                throw new Exception("Error updating notifications: " . $stmt->error);
            }
        } else {
            // Mark single notification as read
            $id = $data['id'];
            $userId = $data['userId'] ?? '';
            
            $sql = "UPDATE notifications SET is_read = TRUE, 
                    read_by = JSON_ARRAY_APPEND(COALESCE(read_by, JSON_ARRAY()), '$', ?)
                    WHERE id = ?";
            
            $stmt = $this->conn->prepare($sql);
            $stmt->bind_param("ss", $userId, $id);
            
            if ($stmt->execute()) {
                return ['success' => true, 'message' => 'Notification marked as read'];
            } else {
                throw new Exception("Error updating notification: " . $stmt->error);
            }
        }
    }
    
    private function generateId($prefix = '') {
        return $prefix . uniqid() . '_' . mt_rand(1000, 9999);
    }
}

// Handle the request
try {
    $api = new NotificationsAPI();
    $method = $_SERVER['REQUEST_METHOD'];
    
    switch ($method) {
        case 'GET':
            $filters = [];
            if (isset($_GET['userId'])) $filters['userId'] = $_GET['userId'];
            if (isset($_GET['role'])) $filters['role'] = $_GET['role'];
            if (isset($_GET['type'])) $filters['type'] = $_GET['type'];
            if (isset($_GET['priority'])) $filters['priority'] = $_GET['priority'];
            
            $notifications = $api->getNotifications($filters);
            echo json_encode($notifications);
            break;
            
        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid JSON input']);
                break;
            }
            
            $result = $api->createNotification($input);
            http_response_code(201);
            echo json_encode($result);
            break;
            
        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid JSON input']);
                break;
            }
            
            $result = $api->updateNotification($input);
            echo json_encode($result);
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
            break;
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
