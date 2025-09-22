<?php
/**
 * VMAX Sales System - MySQL Service API
 * Updated to use centralized database connection
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);


if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'db.php';

class MySQLService {
    private $db;
    private $conn;
    
    public function __construct() {
        try {
            $this->db = getDB();
            $this->conn = $this->db->getConnection();
        } catch (Exception $e) {
            throw new Exception("Database connection failed: " . $e->getMessage());
        }
    }

    // Generic query helper used by endpoint wrappers (SELECT with optional bound params)
    public function query($sql, $params = []) {
        try {
            $stmt = $this->conn->prepare($sql);
            if ($stmt === false) {
                throw new Exception("Prepare failed: " . $this->conn->error);
            }

            if (!empty($params)) {
                $types = '';
                $bind = [];
                foreach ($params as $p) {
                    if (is_int($p)) { $types .= 'i'; }
                    elseif (is_float($p) || is_double($p)) { $types .= 'd'; }
                    elseif (is_null($p)) { $types .= 's'; $p = null; }
                    else { $types .= 's'; }
                    $bind[] = $p;
                }
                $stmt->bind_param($types, ...$bind);
            }

            if (!$stmt->execute()) {
                throw new Exception("Execute failed: " . $stmt->error);
            }

            $result = $stmt->get_result();
            if ($result) {
                return $result->fetch_all(MYSQLI_ASSOC);
            }

            // Non-SELECT statements
            return [ 'affected_rows' => $stmt->affected_rows ];
        } catch (Exception $e) {
            throw new Exception("Query error: " . $e->getMessage());
        }
    }
    
    // Users Management
    public function getUsers($filters = []) {
        $sql = "SELECT * FROM users WHERE 1=1";
        $params = [];
        $types = "";
        
        if (!empty($filters['role'])) {
            $sql .= " AND role = ?";
            $params[] = $filters['role'];
            $types .= "s";
        }
        
        if (!empty($filters['team'])) {
            $sql .= " AND team = ?";
            $params[] = $filters['team'];
            $types .= "s";
        }
        
        $sql .= " ORDER BY created_at DESC";
        
        $stmt = $this->conn->prepare($sql);
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $result = $stmt->get_result();
        
        return $result->fetch_all(MYSQLI_ASSOC);
    }
    
    public function createUser($userData) {
        $sql = "INSERT INTO users (id, username, email, password, name, phone, role, team, managedTeam, created_by, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
        
        $id = $this->generateId('user_');
        $hashedPassword = password_hash($userData['password'], PASSWORD_DEFAULT);
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("ssssssssss", 
            $id,
            $userData['username'],
            $userData['email'],
            $hashedPassword,
            $userData['name'],
            $userData['phone'],
            $userData['role'],
            $userData['team'],
            $userData['managedTeam'] ?? null,
            $userData['createdBy']
        );
        
        if ($stmt->execute()) {
            return ['success' => true, 'id' => $id];
        } else {
            throw new Exception("Error creating user: " . $stmt->error);
        }
    }
    
    public function updateUser($id, $userData) {
        $sql = "UPDATE users SET username=?, email=?, name=?, phone=?, role=?, team=?, managedTeam=?, updated_at=NOW() WHERE id=?";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("ssssssss",
            $userData['username'],
            $userData['email'],
            $userData['name'],
            $userData['phone'],
            $userData['role'],
            $userData['team'],
            $userData['managedTeam'] ?? '',
            $id
        );
        
        if ($stmt->execute()) {
            return ['success' => true];
        } else {
            throw new Exception("Error updating user: " . $stmt->error);
        }
    }
    
    // Deals Management
    public function getDeals($filters = []) {
        $sql = "SELECT d.*, u.name as salesAgentName FROM deals d 
                LEFT JOIN users u ON d.SalesAgentID = u.id WHERE 1=1";
        $params = [];
        $types = "";
        
        if (!empty($filters['salesAgentId'])) {
            $sql .= " AND d.SalesAgentID = ?";
            $params[] = $filters['salesAgentId'];
            $types .= "s";
        }
        
        if (!empty($filters['salesTeam'])) {
            $sql .= " AND d.sales_team = ?";
            $params[] = $filters['salesTeam'];
            $types .= "s";
        }
        
        if (!empty($filters['status'])) {
            $sql .= " AND d.status = ?";
            $params[] = $filters['status'];
            $types .= "s";
        }
        
        if (!empty($filters['stage'])) {
            $sql .= " AND d.stage = ?";
            $params[] = $filters['stage'];
            $types .= "s";
        }
        
        $sql .= " ORDER BY d.created_at DESC";
        
        $stmt = $this->conn->prepare($sql);
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $result = $stmt->get_result();
        
        return $result->fetch_all(MYSQLI_ASSOC);
    }
    
    public function createDeal($dealData) {
        $sql = "INSERT INTO deals (id, DealID, customer_name, email, phone_number, country, custom_country, amount_paid, 
                service_tier, SalesAgentID, sales_team, stage, status, priority, created_by, signup_date, end_date, 
                duration_years, duration_months, number_of_users, notes, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
        
        $id = $this->generateId('deal_');
        $dealId = $this->generateDealId();
        
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("sssssssssssssssssssss",
            $id,
            $dealId,
            $dealData['customerName'],
            $dealData['email'],
            $dealData['phoneNumber'],
            $dealData['country'],
            $dealData['customCountry'] ?? null,
            $dealData['amountPaid'] ?? 0,
            $dealData['serviceTier'] ?? 'Silver',
            $dealData['salesAgentId'],
            $dealData['salesTeam'],
            $dealData['stage'] ?? 'prospect',
            $dealData['status'] ?? 'active',
            $dealData['priority'] ?? 'medium',
            $dealData['createdBy'],
            $dealData['signupDate'],
            $dealData['endDate'],
            $dealData['durationYears'] ?? null,
            $dealData['durationMonths'] ?? null,
            $dealData['numberOfUsers'] ?? null,
            $dealData['notes'] ?? null
        );
        
        if ($stmt->execute()) {
            return ['success' => true, 'id' => $id, 'dealId' => $dealId];
        } else {
            throw new Exception("Error creating deal: " . $stmt->error);
        }
    }
    
    public function updateDeal($id, $dealData) {
        $sql = "UPDATE deals SET customer_name=?, email=?, phone_number=?, country=?, amount_paid=?, 
                service_tier=?, stage=?, status=?, priority=?, updated_at=NOW() WHERE id=?";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("ssssdsssss",
            $dealData['customerName'],
            $dealData['email'],
            $dealData['phoneNumber'],
            $dealData['country'],
            $dealData['amountPaid'],
            $dealData['serviceTier'],
            $dealData['stage'],
            $dealData['status'],
            $dealData['priority'],
            $id
        );
        
        if ($stmt->execute()) {
            return ['success' => true];
        } else {
            throw new Exception("Error updating deal: " . $stmt->error);
        }
    }

    public function deleteDeal($id) {
        $sql = "DELETE FROM deals WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        if ($stmt === false) {
            throw new Exception("Prepare failed: " . $this->conn->error);
        }
        $stmt->bind_param("s", $id);
        if ($stmt->execute()) {
            return ['success' => true, 'deleted' => $stmt->affected_rows];
        } else {
            throw new Exception("Error deleting deal: " . $stmt->error);
        }
    }
    
    // Callbacks Management
    public function getCallbacks($filters = []) {
        $sql = "SELECT c.*, u.name as salesAgentName FROM callbacks c 
                LEFT JOIN users u ON c.SalesAgentID = u.id WHERE 1=1";
        $params = [];
        $types = "";
        
        if (!empty($filters['salesAgentId'])) {
            $sql .= " AND c.SalesAgentID = ?";
            $params[] = $filters['salesAgentId'];
            $types .= "s";
        }
        
        if (!empty($filters['salesTeam'])) {
            $sql .= " AND c.sales_team = ?";
            $params[] = $filters['salesTeam'];
            $types .= "s";
        }
        
        if (!empty($filters['status'])) {
            $sql .= " AND c.status = ?";
            $params[] = $filters['status'];
            $types .= "s";
        }
        
        $sql .= " ORDER BY c.scheduled_date ASC, c.created_at DESC";
        
        $stmt = $this->conn->prepare($sql);
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $result = $stmt->get_result();
        
        return $result->fetch_all(MYSQLI_ASSOC);
    }
    
    public function createCallback($callbackData) {
        $sql = "INSERT INTO callbacks (id, customer_name, phone_number, email, SalesAgentID, sales_agent, 
                sales_team, first_call_date, first_call_time, scheduled_date, scheduled_time, status, priority, 
                callback_reason, callback_notes, follow_up_required, created_by, created_by_id, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
        
        $id = $this->generateId('callback_');
        
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("ssssssssssssssssss",
            $id,
            $callbackData['customerName'],
            $callbackData['phoneNumber'],
            $callbackData['email'] ?? null,
            $callbackData['salesAgentId'],
            $callbackData['salesAgentName'],
            $callbackData['salesTeam'] ?? null,
            $callbackData['firstCallDate'],
            $callbackData['firstCallTime'] ?? null,
            $callbackData['scheduledDate'] ?? null,
            $callbackData['scheduledTime'] ?? null,
            $callbackData['status'] ?? 'pending',
            $callbackData['priority'] ?? 'medium',
            $callbackData['callbackReason'] ?? null,
            $callbackData['callbackNotes'] ?? null,
            $callbackData['followUpRequired'] ? 1 : 0,
            $callbackData['createdBy'],
            $callbackData['createdById']
        );
        
        if ($stmt->execute()) {
            return ['success' => true, 'id' => $id];
        } else {
            throw new Exception("Error creating callback: " . $stmt->error);
        }
    }
    
    // Sales Targets Management
    public function getSalesTargets($filters = []) {
        $sql = "SELECT t.*, u.name as agentName FROM targets t 
                LEFT JOIN users u ON t.agentId = u.id WHERE 1=1";
        $params = [];
        $types = "";
        
        if (!empty($filters['agentId'])) {
            $sql .= " AND t.agentId = ?";
            $params[] = $filters['agentId'];
            $types .= "s";
        }
        
        if (!empty($filters['period'])) {
            $sql .= " AND t.period = ?";
            $params[] = $filters['period'];
            $types .= "s";
        }
        
        $sql .= " ORDER BY t.period DESC, t.created_at DESC";
        
        $stmt = $this->conn->prepare($sql);
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $result = $stmt->get_result();
        
        return $result->fetch_all(MYSQLI_ASSOC);
    }
    
    public function createSalesTarget($targetData) {
        $sql = "INSERT INTO targets (id, agentId, agentName, managerId, managerName, period, 
                monthlyTarget, dealsTarget, type, description, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
        
        $id = $this->generateId('target_');
        
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("ssssssdiis",
            $id,
            $targetData['agentId'],
            $targetData['agentName'],
            $targetData['managerId'],
            $targetData['managerName'],
            $targetData['period'],
            $targetData['monthlyTarget'],
            $targetData['dealsTarget'],
            $targetData['type'] ?? 'individual',
            $targetData['description']
        );
        
        if ($stmt->execute()) {
            return ['success' => true, 'id' => $id];
        } else {
            throw new Exception("Error creating sales target: " . $stmt->error);
        }
    }
    
    public function updateCallback($id, $callbackData) {
        $sql = "UPDATE callbacks SET customer_name=?, phone_number=?, email=?, scheduled_date=?, 
                scheduled_time=?, status=?, priority=?, callback_reason=?, callback_notes=?, 
                follow_up_required=?, updated_at=NOW() WHERE id=?";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("sssssssssss",
            $callbackData['customerName'],
            $callbackData['phoneNumber'],
            $callbackData['email'],
            $callbackData['scheduledDate'],
            $callbackData['scheduledTime'],
            $callbackData['status'],
            $callbackData['priority'],
            $callbackData['callbackReason'],
            $callbackData['callbackNotes'],
            $callbackData['followUpRequired'] ? 1 : 0,
            $id
        );
        
        if ($stmt->execute()) {
            return ['success' => true];
        } else {
            throw new Exception("Error updating callback: " . $stmt->error);
        }
    }

    public function deleteCallback($id) {
        $sql = "DELETE FROM callbacks WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        if ($stmt === false) {
            throw new Exception("Prepare failed: " . $this->conn->error);
        }
        $stmt->bind_param("s", $id);
        if ($stmt->execute()) {
            return ['success' => true, 'deleted' => $stmt->affected_rows];
        } else {
            throw new Exception("Error deleting callback: " . $stmt->error);
        }
    }
    
    public function updateSalesTarget($id, $targetData) {
        $sql = "UPDATE targets SET agentId=?, agentName=?, managerId=?, managerName=?, period=?, 
                monthlyTarget=?, dealsTarget=?, type=?, description=?, updated_at=NOW() WHERE id=?";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("ssssssdiiss",
            $targetData['agentId'],
            $targetData['agentName'],
            $targetData['managerId'],
            $targetData['managerName'],
            $targetData['period'],
            $targetData['monthlyTarget'],
            $targetData['dealsTarget'],
            $targetData['type'],
            $targetData['description'],
            $id
        );
        
        if ($stmt->execute()) {
            return ['success' => true];
        } else {
            throw new Exception("Error updating sales target: " . $stmt->error);
        }
    }
    
    // Notifications Management
    public function getNotifications($filters = []) {
        $sql = "SELECT * FROM notifications WHERE 1=1";
        $params = [];
        $types = "";
        
        if (!empty($filters['to'])) {
            $sql .= " AND JSON_CONTAINS(\`to\`, ?)"; 
            $params[] = '"' . $filters['to'] . '"';
            $types .= "s";
        }
        
        if (!empty($filters['isRead'])) {
            $sql .= " AND isRead = ?";
            $params[] = $filters['isRead'];
            $types .= "i";
        }
        
        $sql .= " ORDER BY timestamp DESC";
        
        $stmt = $this->conn->prepare($sql);
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $result = $stmt->get_result();
        
        return $result->fetch_all(MYSQLI_ASSOC);
    }
    
    public function createNotification($notificationData) {
        $sql = "INSERT INTO notifications (id, title, message, type, \`to\`, \`from\`, timestamp, 
                isRead, actionRequired, customerName, customerPhone, customerEmail, salesAgent, 
                salesAgentId, callbackId, callbackStatus, callbackReason, priority, scheduledDate, 
                scheduledTime, teamName, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";
        
        $id = $this->generateId('notif_');
        
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("sssssssiiissssssssssss",
            $id,
            $notificationData['title'],
            $notificationData['message'],
            $notificationData['type'],
            json_encode($notificationData['to']),
            $notificationData['from'],
            $notificationData['timestamp'] ?? date('Y-m-d H:i:s'),
            $notificationData['isRead'] ?? 0,
            $notificationData['actionRequired'] ?? 0,
            $notificationData['customerName'] ?? '',
            $notificationData['customerPhone'] ?? '',
            $notificationData['customerEmail'] ?? '',
            $notificationData['salesAgent'] ?? '',
            $notificationData['salesAgentId'] ?? '',
            $notificationData['callbackId'] ?? '',
            $notificationData['callbackStatus'] ?? '',
            $notificationData['callbackReason'] ?? '',
            $notificationData['priority'] ?? 'medium',
            $notificationData['scheduledDate'] ?? null,
            $notificationData['scheduledTime'] ?? '',
            $notificationData['teamName'] ?? ''
        );
        
        if ($stmt->execute()) {
            return ['success' => true, 'id' => $id];
        } else {
            throw new Exception("Error creating notification: " . $stmt->error);
        }
    }
    
    public function updateNotification($id, $notificationData) {
        $sql = "UPDATE notifications SET isRead=?, actionRequired=? WHERE id=?";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("iis",
            $notificationData['isRead'],
            $notificationData['actionRequired'] ?? 0,
            $id
        );
        
        if ($stmt->execute()) {
            return ['success' => true];
        } else {
            throw new Exception("Error updating notification: " . $stmt->error);
        }
    }

    // Analytics and Reports
    public function getDashboardAnalytics($filters = []) {
        $analytics = [];
        
        // Total deals
        $sql = "SELECT COUNT(*) as totalDeals, SUM(amount_paid) as totalRevenue FROM deals WHERE 1=1";
        $params = [];
        $types = "";
        
        if (!empty($filters['salesTeam'])) {
            $sql .= " AND sales_team = ?";
            $params[] = $filters['salesTeam'];
            $types .= "s";
        }
        
        if (!empty($filters['salesAgentId'])) {
            $sql .= " AND SalesAgentID = ?";
            $params[] = $filters['salesAgentId'];
            $types .= "s";
        }
        
        $stmt = $this->conn->prepare($sql);
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $result = $stmt->get_result();
        $analytics['deals'] = $result->fetch_assoc();
        
        // Callbacks summary
        $sql = "SELECT status, COUNT(*) as count FROM callbacks WHERE 1=1";
        if (!empty($filters['salesTeam'])) {
            $sql .= " AND sales_team = ?";
        }
        if (!empty($filters['salesAgentId'])) {
            $sql .= " AND SalesAgentID = ?";
        }
        $sql .= " GROUP BY status";
        
        $stmt = $this->conn->prepare($sql);
        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }
        $stmt->execute();
        $result = $stmt->get_result();
        $analytics['callbacks'] = $result->fetch_all(MYSQLI_ASSOC);
        
        return $analytics;
    }
    
    // Utility Methods
    private function generateId($prefix = '') {
        return $prefix . uniqid() . '_' . time();
    }
    
    private function generateDealId() {
        return 'DEAL-' . time() . rand(100, 999) . '-' . rand(100, 999);
    }
    
    public function __destruct() {
        if ($this->conn) {
            $this->conn->close();
        }
    }
}

// Handle API requests
try {
    $service = new MySQLService();
    $method = $_SERVER['REQUEST_METHOD'];
    $path = $_GET['path'] ?? '';
    
    switch ($path) {
        case 'users':
            if ($method === 'GET') {
                $filters = $_GET;
                unset($filters['path']);
                echo json_encode($service->getUsers($filters));
            } elseif ($method === 'POST') {
                $data = json_decode(file_get_contents('php://input'), true);
                echo json_encode($service->createUser($data));
            } elseif ($method === 'PUT') {
                $id = $_GET['id'];
                $data = json_decode(file_get_contents('php://input'), true);
                echo json_encode($service->updateUser($id, $data));
            }
            break;
            
        case 'deals':
            if ($method === 'GET') {
                $filters = $_GET;
                unset($filters['path']);
                echo json_encode($service->getDeals($filters));
            } elseif ($method === 'POST') {
                $data = json_decode(file_get_contents('php://input'), true);
                echo json_encode($service->createDeal($data));
            } elseif ($method === 'PUT') {
                $id = $_GET['id'];
                $data = json_decode(file_get_contents('php://input'), true);
                echo json_encode($service->updateDeal($id, $data));
            }
            break;
            
        case 'callbacks':
            if ($method === 'GET') {
                $filters = $_GET;
                unset($filters['path']);
                echo json_encode($service->getCallbacks($filters));
            } elseif ($method === 'POST') {
                $data = json_decode(file_get_contents('php://input'), true);
                echo json_encode($service->createCallback($data));
            } elseif ($method === 'PUT') {
                $id = $_GET['id'];
                $data = json_decode(file_get_contents('php://input'), true);
                echo json_encode($service->updateCallback($id, $data));
            }
            break;
            
        case 'targets':
            if ($method === 'GET') {
                $filters = $_GET;
                unset($filters['path']);
                echo json_encode($service->getSalesTargets($filters));
            } elseif ($method === 'POST') {
                $data = json_decode(file_get_contents('php://input'), true);
                echo json_encode($service->createSalesTarget($data));
            } elseif ($method === 'PUT') {
                $id = $_GET['id'];
                $data = json_decode(file_get_contents('php://input'), true);
                echo json_encode($service->updateSalesTarget($id, $data));
            }
            break;
            
        case 'analytics':
            if ($method === 'GET') {
                $filters = $_GET;
                unset($filters['path']);
                echo json_encode($service->getDashboardAnalytics($filters));
            }
            break;
            
        case 'notifications':
            if ($method === 'GET') {
                $filters = $_GET;
                unset($filters['path']);
                echo json_encode($service->getNotifications($filters));
            } elseif ($method === 'POST') {
                $data = json_decode(file_get_contents('php://input'), true);
                echo json_encode($service->createNotification($data));
            } elseif ($method === 'PUT') {
                $id = $_GET['id'];
                $data = json_decode(file_get_contents('php://input'), true);
                echo json_encode($service->updateNotification($id, $data));
            }
            break;
            
        default:
            http_response_code(404);
            echo json_encode(['error' => 'Endpoint not found']);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
