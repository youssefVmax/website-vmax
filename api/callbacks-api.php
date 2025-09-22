<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/mysql-service.php';

class CallbacksAPI {
    private $db;
    
    public function __construct() {
        $this->db = new MySQLService();
    }
    
    public function getCallbacks() {
        try {
            $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 25;
            $offset = ($page - 1) * $limit;
            
            $filters = $this->buildFilters();
            $whereClause = $filters['where'];
            $params = $filters['params'];
            
            // Get total count
            $countQuery = "SELECT COUNT(*) as total FROM callbacks" . $whereClause;
            $totalResult = $this->db->query($countQuery, $params);
            $total = $totalResult[0]['total'];
            
            // Get paginated data
            $query = "SELECT * FROM callbacks" . $whereClause . " ORDER BY created_at DESC LIMIT ? OFFSET ?";
            $params[] = $limit;
            $params[] = $offset;
            
            $callbacks = $this->db->query($query, $params);
            
            return [
                'success' => true,
                'data' => $callbacks,
                'pagination' => [
                    'current_page' => $page,
                    'per_page' => $limit,
                    'total' => (int)$total,
                    'total_pages' => ceil($total / $limit),
                    'has_next' => $page < ceil($total / $limit),
                    'has_prev' => $page > 1
                ]
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    private function buildFilters() {
        $where = [];
        $params = [];
        
        // Date filters
        if (isset($_GET['date_from']) && !empty($_GET['date_from'])) {
            $where[] = "DATE(created_at) >= ?";
            $params[] = $_GET['date_from'];
        }
        
        if (isset($_GET['date_to']) && !empty($_GET['date_to'])) {
            $where[] = "DATE(created_at) <= ?";
            $params[] = $_GET['date_to'];
        }
        
        // Month filter
        if (isset($_GET['month']) && !empty($_GET['month'])) {
            $where[] = "DATE_FORMAT(created_at, '%Y-%m') = ?";
            $params[] = $_GET['month'];
        }
        
        // Status filter
        if (isset($_GET['status']) && !empty($_GET['status'])) {
            $where[] = "status = ?";
            $params[] = $_GET['status'];
        }
        
        // Sales agent filter
        if (isset($_GET['sales_agent']) && !empty($_GET['sales_agent'])) {
            $where[] = "sales_agent LIKE ?";
            $params[] = '%' . $_GET['sales_agent'] . '%';
        }
        
        // Priority filter
        if (isset($_GET['priority']) && !empty($_GET['priority'])) {
            $where[] = "priority = ?";
            $params[] = $_GET['priority'];
        }
        
        // Scheduled date filters
        if (isset($_GET['scheduled_from']) && !empty($_GET['scheduled_from'])) {
            $where[] = "DATE(scheduled_date) >= ?";
            $params[] = $_GET['scheduled_from'];
        }
        
        if (isset($_GET['scheduled_to']) && !empty($_GET['scheduled_to'])) {
            $where[] = "DATE(scheduled_date) <= ?";
            $params[] = $_GET['scheduled_to'];
        }
        
        // Search filter
        if (isset($_GET['search']) && !empty($_GET['search'])) {
            $searchTerm = '%' . $_GET['search'] . '%';
            $where[] = "(customer_name LIKE ? OR email LIKE ? OR phone_number LIKE ? OR callback_notes LIKE ?)";
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        }
        
        $whereClause = empty($where) ? '' : ' WHERE ' . implode(' AND ', $where);
        
        return [
            'where' => $whereClause,
            'params' => $params
        ];
    }
    
    public function getCallbackStats() {
        try {
            $filters = $this->buildFilters();
            $whereClause = $filters['where'];
            $params = $filters['params'];
            
            $query = "SELECT 
                COUNT(*) as total_callbacks,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_callbacks,
                COUNT(CASE WHEN status = 'contacted' THEN 1 END) as contacted_callbacks,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_callbacks,
                COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as today_callbacks,
                COUNT(CASE WHEN DATE(scheduled_date) = CURDATE() THEN 1 END) as scheduled_today,
                COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority,
                COUNT(CASE WHEN priority = 'medium' THEN 1 END) as medium_priority,
                COUNT(CASE WHEN priority = 'low' THEN 1 END) as low_priority
                FROM callbacks" . $whereClause;
            
            $stats = $this->db->query($query, $params);
            
            return [
                'success' => true,
                'data' => $stats[0]
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    public function createCallback($data) {
        try {
            return $this->db->createCallback($data);
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    public function updateCallback($id, $data) {
        try {
            return $this->db->updateCallback($id, $data);
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    public function deleteCallback($id) {
        try {
            return $this->db->deleteCallback($id);
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    public function updateCallbackStatus() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['id']) || !isset($input['status'])) {
                throw new Exception('Missing required fields: id and status');
            }
            
            $query = "UPDATE callbacks SET status = ?, updated_at = NOW() WHERE id = ?";
            $params = [$input['status'], $input['id']];
            
            $this->db->query($query, $params);
            
            return [
                'success' => true,
                'message' => 'Callback status updated successfully'
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
}

$api = new CallbacksAPI();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        if (isset($_GET['action']) && $_GET['action'] === 'stats') {
            echo json_encode($api->getCallbackStats());
        } else {
            echo json_encode($api->getCallbacks());
        }
        break;
        
    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        if (isset($input['action']) && $input['action'] === 'updateStatus') {
            echo json_encode($api->updateCallbackStatus());
        } else {
            $result = $api->createCallback($input);
            echo json_encode($result);
        }
        break;
        
    case 'PUT':
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input || !isset($input['id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Missing callback ID']);
            break;
        }
        
        $result = $api->updateCallback($input['id'], $input);
        echo json_encode($result);
        break;
        
    case 'DELETE':
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input || !isset($input['id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Missing callback ID']);
            break;
        }
        
        $result = $api->deleteCallback($input['id']);
        echo json_encode($result);
        break;
        
    default:
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}
?>
