<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/mysql-service.php';

class DealsAPI {
    private $db;
    
    public function __construct() {
        $this->db = new MySQLService();
    }
    
    public function getDeals() {
        try {
            $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 25;
            $offset = ($page - 1) * $limit;
            
            $filters = $this->buildFilters();
            $whereClause = $filters['where'];
            $params = $filters['params'];
            
            // Get total count
            $countQuery = "SELECT COUNT(*) as total FROM deals" . $whereClause;
            $totalResult = $this->db->query($countQuery, $params);
            $total = $totalResult[0]['total'];
            
            // Get paginated data
            $query = "SELECT * FROM deals" . $whereClause . " ORDER BY created_at DESC LIMIT ? OFFSET ?";
            $params[] = $limit;
            $params[] = $offset;
            
            $deals = $this->db->query($query, $params);
            
            return [
                'success' => true,
                'data' => $deals,
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
        
        // Amount range filters
        if (isset($_GET['amount_min']) && !empty($_GET['amount_min'])) {
            $where[] = "amount_paid >= ?";
            $params[] = (float)$_GET['amount_min'];
        }
        
        if (isset($_GET['amount_max']) && !empty($_GET['amount_max'])) {
            $where[] = "amount_paid <= ?";
            $params[] = (float)$_GET['amount_max'];
        }
        
        // Search filter
        if (isset($_GET['search']) && !empty($_GET['search'])) {
            $searchTerm = '%' . $_GET['search'] . '%';
            $where[] = "(customer_name LIKE ? OR email LIKE ? OR phone_number LIKE ?)";
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
    
    public function getDealStats() {
        try {
            $filters = $this->buildFilters();
            $whereClause = $filters['where'];
            $params = $filters['params'];
            
            $query = "SELECT 
                COUNT(*) as total_deals,
                SUM(amount_paid) as total_revenue,
                AVG(amount_paid) as avg_deal_value,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_deals,
                COUNT(CASE WHEN status = 'closed-won' THEN 1 END) as closed_deals,
                COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as today_deals
                FROM deals" . $whereClause;
            
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
    
    public function createDeal($data) {
        try {
            return $this->db->createDeal($data);
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    public function updateDeal($id, $data) {
        try {
            return $this->db->updateDeal($id, $data);
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    public function deleteDeal($id) {
        try {
            return $this->db->deleteDeal($id);
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
}

// Handle the request
try {
    $api = new DealsAPI();
    $method = $_SERVER['REQUEST_METHOD'];
    
    switch ($method) {
        case 'GET':
            if (isset($_GET['action']) && $_GET['action'] === 'stats') {
                echo json_encode($api->getDealStats());
            } else {
                echo json_encode($api->getDeals());
            }
            break;
            
        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid JSON input']);
                break;
            }
            
            $result = $api->createDeal($input);
            if ($result['success']) {
                http_response_code(201);
            } else {
                http_response_code(400);
            }
            echo json_encode($result);
            break;
            
        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input || !isset($input['id'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Deal ID required']);
                break;
            }
            
            $result = $api->updateDeal($input['id'], $input);
            echo json_encode($result);
            break;
            
        case 'DELETE':
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input || !isset($input['id'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Deal ID required']);
                break;
            }
            
            $result = $api->deleteDeal($input['id']);
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
