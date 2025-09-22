<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/db.php';

class UsersAPI {
    private $conn;
    
    public function __construct() {
        // Use centralized database connection
        $db = getDB();
        $this->conn = $db->getConnection();
        $this->createUsersTable();
    }
    
    private function createUsersTable() {
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
        
        // Create default admin user if not exists
        $this->createDefaultUsers();
    }
    
    private function createDefaultUsers() {
        $checkSql = "SELECT COUNT(*) as count FROM users WHERE role = 'admin'";
        $result = $this->conn->query($checkSql);
        $row = $result->fetch_assoc();
        
        if ($row['count'] == 0) {
            $adminId = $this->generateId('user_');
            $hashedPassword = password_hash('admin123', PASSWORD_DEFAULT);
            
            $sql = "INSERT INTO users (id, username, email, password, name, role, status, created_at) 
                    VALUES (?, 'admin', 'admin@vmax.com', ?, 'System Administrator', 'admin', 'active', NOW())";
            
            $stmt = $this->conn->prepare($sql);
            $stmt->bind_param("ss", $adminId, $hashedPassword);
            $stmt->execute();
        }
    }
    
    public function getUsers($filters = []) {
        $sql = "SELECT id, username, email, name, phone, role, team, managedTeam, status, last_login, created_at, updated_at FROM users WHERE 1=1";
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
        
        if (!empty($filters['status'])) {
            $sql .= " AND status = ?";
            $params[] = $filters['status'];
            $types .= "s";
        }
        
        if (!empty($filters['search'])) {
            $sql .= " AND (name LIKE ? OR username LIKE ? OR email LIKE ?)";
            $searchTerm = '%' . $filters['search'] . '%';
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $types .= "sss";
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
    
    public function createUser($data) {
        $id = $this->generateId('user_');
        
        // Check if username or email already exists
        $checkSql = "SELECT COUNT(*) as count FROM users WHERE username = ? OR email = ?";
        $checkStmt = $this->conn->prepare($checkSql);
        $checkStmt->bind_param("ss", $data['username'], $data['email']);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        $checkRow = $checkResult->fetch_assoc();
        
        if ($checkRow['count'] > 0) {
            throw new Exception("Username or email already exists");
        }
        
        $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
        
        $sql = "INSERT INTO users (id, username, email, password, name, phone, role, team, managedTeam, status, created_by, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("sssssssssss",
            $id,
            $data['username'],
            $data['email'],
            $hashedPassword,
            $data['name'],
            $data['phone'] ?? '',
            $data['role'],
            $data['team'] ?? '',
            $data['managedTeam'] ?? '',
            $data['status'] ?? 'active',
            $data['created_by'] ?? ''
        );
        
        if ($stmt->execute()) {
            return [
                'success' => true,
                'id' => $id,
                'user' => [
                    'id' => $id,
                    'username' => $data['username'],
                    'email' => $data['email'],
                    'name' => $data['name'],
                    'phone' => $data['phone'] ?? '',
                    'role' => $data['role'],
                    'team' => $data['team'] ?? '',
                    'managedTeam' => $data['managedTeam'] ?? '',
                    'status' => $data['status'] ?? 'active'
                ]
            ];
        } else {
            throw new Exception("Error creating user: " . $stmt->error);
        }
    }
    
    public function updateUser($id, $data) {
        $sql = "UPDATE users SET username=?, email=?, name=?, phone=?, role=?, team=?, managedTeam=?, status=?, updated_at=NOW() WHERE id=?";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("sssssssss",
            $data['username'],
            $data['email'],
            $data['name'],
            $data['phone'] ?? '',
            $data['role'],
            $data['team'] ?? '',
            $data['managedTeam'] ?? '',
            $data['status'] ?? 'active',
            $id
        );
        
        if ($stmt->execute()) {
            if ($stmt->affected_rows > 0) {
                return ['success' => true, 'message' => 'User updated successfully'];
            } else {
                throw new Exception("User not found or no changes made");
            }
        } else {
            throw new Exception("Error updating user: " . $stmt->error);
        }
    }
    
    public function deleteUser($id) {
        // Don't allow deletion of admin users
        $checkSql = "SELECT role FROM users WHERE id = ?";
        $checkStmt = $this->conn->prepare($checkSql);
        $checkStmt->bind_param("s", $id);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        $user = $checkResult->fetch_assoc();
        
        if (!$user) {
            throw new Exception("User not found");
        }
        
        if ($user['role'] === 'admin') {
            throw new Exception("Cannot delete admin users");
        }
        
        $sql = "DELETE FROM users WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("s", $id);
        
        if ($stmt->execute()) {
            return ['success' => true, 'message' => 'User deleted successfully'];
        } else {
            throw new Exception("Error deleting user: " . $stmt->error);
        }
    }
    
    public function authenticateUser($username, $password) {
        $sql = "SELECT id, username, email, password, name, phone, role, team, managedTeam, status FROM users WHERE (username = ? OR email = ?) AND status = 'active'";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("ss", $username, $username);
        $stmt->execute();
        $result = $stmt->get_result();
        $user = $result->fetch_assoc();
        
        if ($user && password_verify($password, $user['password'])) {
            // Update last login
            $updateSql = "UPDATE users SET last_login = NOW() WHERE id = ?";
            $updateStmt = $this->conn->prepare($updateSql);
            $updateStmt->bind_param("s", $user['id']);
            $updateStmt->execute();
            
            // Remove password from response
            unset($user['password']);
            
            return [
                'success' => true,
                'user' => $user
            ];
        } else {
            return [
                'success' => false,
                'message' => 'Invalid credentials'
            ];
        }
    }
    
    private function generateId($prefix = '') {
        return $prefix . uniqid() . '_' . mt_rand(1000, 9999);
    }
}

// Handle the request
try {
    $api = new UsersAPI();
    $method = $_SERVER['REQUEST_METHOD'];
    $path = $_SERVER['REQUEST_URI'];
    
    switch ($method) {
        case 'GET':
            if (strpos($path, '/auth') !== false) {
                // Authentication endpoint
                $username = $_GET['username'] ?? '';
                $password = $_GET['password'] ?? '';
                
                if ($username && $password) {
                    $result = $api->authenticateUser($username, $password);
                    echo json_encode($result);
                } else {
                    http_response_code(400);
                    echo json_encode(['error' => 'Username and password required']);
                }
            } else {
                // Get users endpoint
                $filters = [];
                if (isset($_GET['role'])) $filters['role'] = $_GET['role'];
                if (isset($_GET['team'])) $filters['team'] = $_GET['team'];
                if (isset($_GET['status'])) $filters['status'] = $_GET['status'];
                if (isset($_GET['search'])) $filters['search'] = $_GET['search'];
                
                $users = $api->getUsers($filters);
                echo json_encode($users);
            }
            break;
            
        case 'POST':
            if (strpos($path, '/auth') !== false) {
                // Authentication via POST
                $input = json_decode(file_get_contents('php://input'), true);
                if (!$input || !isset($input['username']) || !isset($input['password'])) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Username and password required']);
                    break;
                }
                
                $result = $api->authenticateUser($input['username'], $input['password']);
                echo json_encode($result);
            } else {
                // Create user
                $input = json_decode(file_get_contents('php://input'), true);
                if (!$input) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Invalid JSON input']);
                    break;
                }
                
                $result = $api->createUser($input);
                http_response_code(201);
                echo json_encode($result);
            }
            break;
            
        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input || !isset($input['id'])) {
                http_response_code(400);
                echo json_encode(['error' => 'User ID required']);
                break;
            }
            
            $result = $api->updateUser($input['id'], $input);
            echo json_encode($result);
            break;
            
        case 'DELETE':
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input || !isset($input['id'])) {
                http_response_code(400);
                echo json_encode(['error' => 'User ID required']);
                break;
            }
            
            $result = $api->deleteUser($input['id']);
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
