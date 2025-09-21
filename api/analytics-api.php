<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$method = $_SERVER['REQUEST_METHOD'];
$endpoint = $_GET['endpoint'] ?? '';

try {
    $mysqlService = new MySQLService();
    
    switch ($endpoint) {
        case 'sales-kpis':
            handleSalesKPIs($mysqlService);
            break;
        case 'callback-kpis':
            handleCallbackKPIs($mysqlService);
            break;
        case 'dashboard-stats':
            handleDashboardStats($mysqlService);
            break;
        case 'agent-performance':
            handleAgentPerformance($mysqlService);
            break;
        case 'revenue-analytics':
            handleRevenueAnalytics($mysqlService);
            break;
        case 'conversion-metrics':
            handleConversionMetrics($mysqlService);
            break;
        default:
            throw new Exception('Invalid endpoint');
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

function handleSalesKPIs($mysqlService) {
    $userRole = $_GET['user_role'] ?? 'salesman';
    $userId = $_GET['user_id'] ?? null;
    $dateRange = $_GET['date_range'] ?? 'month';
    $team = $_GET['team'] ?? null;
    
    $dateCondition = getDateCondition($dateRange);
    $roleCondition = getRoleCondition($userRole, $userId, $team);
    
    // Total sales and deals
    $totalQuery = "SELECT 
        COUNT(*) as total_deals,
        COALESCE(SUM(amount), 0) as total_revenue,
        COALESCE(AVG(amount), 0) as avg_deal_size,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_deals,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_deals,
        COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as today_deals,
        COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN amount ELSE 0 END), 0) as today_revenue
        FROM deals 
        WHERE 1=1 $dateCondition $roleCondition";
    
    $totals = $mysqlService->query($totalQuery)[0];
    
    // Sales by agent
    $agentQuery = "SELECT 
        sales_agent as agent,
        COUNT(*) as deals,
        COALESCE(SUM(amount), 0) as revenue,
        COALESCE(AVG(amount), 0) as avg_deal_size,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as conversions
        FROM deals 
        WHERE 1=1 $dateCondition $roleCondition
        GROUP BY sales_agent 
        ORDER BY revenue DESC";
    
    $salesByAgent = $mysqlService->query($agentQuery);
    
    // Daily trend (last 30 days)
    $trendQuery = "SELECT 
        DATE(created_at) as date,
        COUNT(*) as deals,
        COALESCE(SUM(amount), 0) as revenue,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as conversions
        FROM deals 
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) $roleCondition
        GROUP BY DATE(created_at) 
        ORDER BY date ASC";
    
    $dailyTrend = $mysqlService->query($trendQuery);
    
    // Monthly trend (last 12 months)
    $monthlyQuery = "SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as deals,
        COALESCE(SUM(amount), 0) as revenue,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as conversions
        FROM deals 
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) $roleCondition
        GROUP BY DATE_FORMAT(created_at, '%Y-%m') 
        ORDER BY month ASC";
    
    $monthlyTrend = $mysqlService->query($monthlyQuery);
    
    // Sales by service/program
    $serviceQuery = "SELECT 
        service,
        COUNT(*) as deals,
        COALESCE(SUM(amount), 0) as revenue
        FROM deals 
        WHERE 1=1 $dateCondition $roleCondition
        GROUP BY service 
        ORDER BY revenue DESC";
    
    $salesByService = $mysqlService->query($serviceQuery);
    
    $programQuery = "SELECT 
        program,
        COUNT(*) as deals,
        COALESCE(SUM(amount), 0) as revenue
        FROM deals 
        WHERE 1=1 $dateCondition $roleCondition
        GROUP BY program 
        ORDER BY revenue DESC";
    
    $salesByProgram = $mysqlService->query($programQuery);
    
    // Recent deals
    $recentQuery = "SELECT * FROM deals 
        WHERE 1=1 $roleCondition
        ORDER BY created_at DESC 
        LIMIT 10";
    
    $recentDeals = $mysqlService->query($recentQuery);
    
    echo json_encode([
        'totals' => $totals,
        'salesByAgent' => $salesByAgent,
        'dailyTrend' => $dailyTrend,
        'monthlyTrend' => $monthlyTrend,
        'salesByService' => $salesByService,
        'salesByProgram' => $salesByProgram,
        'recentDeals' => $recentDeals
    ]);
}

function handleCallbackKPIs($mysqlService) {
    $userRole = $_GET['user_role'] ?? 'salesman';
    $userId = $_GET['user_id'] ?? null;
    $dateRange = $_GET['date_range'] ?? 'month';
    $team = $_GET['team'] ?? null;
    
    $dateCondition = getDateCondition($dateRange);
    $roleCondition = getRoleCondition($userRole, $userId, $team, 'callbacks');
    
    // Total callback metrics
    $totalQuery = "SELECT 
        COUNT(*) as total_callbacks,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_callbacks,
        COUNT(CASE WHEN status = 'contacted' THEN 1 END) as contacted_callbacks,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_callbacks,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_callbacks,
        COUNT(CASE WHEN converted_to_deal = 1 THEN 1 END) as converted_callbacks,
        COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as today_callbacks,
        COUNT(CASE WHEN DATE(created_at) = CURDATE() AND status = 'completed' THEN 1 END) as today_completed
        FROM callbacks 
        WHERE 1=1 $dateCondition $roleCondition";
    
    $totals = $mysqlService->query($totalQuery)[0];
    
    // Calculate conversion rate
    $totals['conversion_rate'] = $totals['total_callbacks'] > 0 
        ? ($totals['completed_callbacks'] / $totals['total_callbacks']) * 100 
        : 0;
    
    // Callbacks by agent
    $agentQuery = "SELECT 
        created_by as agent,
        COUNT(*) as callbacks,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN converted_to_deal = 1 THEN 1 END) as conversions,
        AVG(CASE 
            WHEN status != 'pending' AND updated_at IS NOT NULL 
            THEN TIMESTAMPDIFF(HOUR, created_at, updated_at) 
            ELSE NULL 
        END) as avg_response_hours
        FROM callbacks 
        WHERE 1=1 $dateCondition $roleCondition
        GROUP BY created_by 
        ORDER BY callbacks DESC";
    
    $callbacksByAgent = $mysqlService->query($agentQuery);
    
    // Add conversion rates
    foreach ($callbacksByAgent as &$agent) {
        $agent['conversion_rate'] = $agent['callbacks'] > 0 
            ? ($agent['completed'] / $agent['callbacks']) * 100 
            : 0;
    }
    
    // Daily trend
    $trendQuery = "SELECT 
        DATE(created_at) as date,
        COUNT(*) as callbacks,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN converted_to_deal = 1 THEN 1 END) as conversions
        FROM callbacks 
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) $roleCondition
        GROUP BY DATE(created_at) 
        ORDER BY date ASC";
    
    $dailyTrend = $mysqlService->query($trendQuery);
    
    // Status distribution
    $statusQuery = "SELECT 
        status,
        COUNT(*) as count,
        (COUNT(*) * 100.0 / (SELECT COUNT(*) FROM callbacks WHERE 1=1 $roleCondition)) as percentage
        FROM callbacks 
        WHERE 1=1 $dateCondition $roleCondition
        GROUP BY status 
        ORDER BY count DESC";
    
    $statusDistribution = $mysqlService->query($statusQuery);
    
    // Priority breakdown
    $priorityQuery = "SELECT 
        priority,
        COUNT(*) as count
        FROM callbacks 
        WHERE 1=1 $dateCondition $roleCondition
        GROUP BY priority 
        ORDER BY 
            CASE priority 
                WHEN 'high' THEN 1 
                WHEN 'medium' THEN 2 
                WHEN 'low' THEN 3 
                ELSE 4 
            END";
    
    $priorityBreakdown = $mysqlService->query($priorityQuery);
    
    // Recent callbacks
    $recentQuery = "SELECT * FROM callbacks 
        WHERE 1=1 $roleCondition
        ORDER BY created_at DESC 
        LIMIT 10";
    
    $recentCallbacks = $mysqlService->query($recentQuery);
    
    // Response time metrics
    $responseQuery = "SELECT 
        AVG(TIMESTAMPDIFF(HOUR, created_at, updated_at)) as avg_hours,
        MIN(TIMESTAMPDIFF(HOUR, created_at, updated_at)) as fastest_hours,
        MAX(TIMESTAMPDIFF(HOUR, created_at, updated_at)) as slowest_hours
        FROM callbacks 
        WHERE status != 'pending' AND updated_at IS NOT NULL $dateCondition $roleCondition";
    
    $responseMetrics = $mysqlService->query($responseQuery)[0] ?? [
        'avg_hours' => 0, 'fastest_hours' => 0, 'slowest_hours' => 0
    ];
    
    echo json_encode([
        'totals' => $totals,
        'callbacksByAgent' => $callbacksByAgent,
        'dailyTrend' => $dailyTrend,
        'statusDistribution' => $statusDistribution,
        'priorityBreakdown' => $priorityBreakdown,
        'recentCallbacks' => $recentCallbacks,
        'responseMetrics' => $responseMetrics
    ]);
}

function handleDashboardStats($mysqlService) {
    $userRole = $_GET['user_role'] ?? 'salesman';
    $userId = $_GET['user_id'] ?? null;
    $team = $_GET['team'] ?? null;
    
    $roleCondition = getRoleCondition($userRole, $userId, $team);
    $callbackRoleCondition = getRoleCondition($userRole, $userId, $team, 'callbacks');
    
    // Quick stats for dashboard
    $statsQuery = "SELECT 
        (SELECT COUNT(*) FROM deals WHERE 1=1 $roleCondition) as total_deals,
        (SELECT COALESCE(SUM(amount), 0) FROM deals WHERE 1=1 $roleCondition) as total_revenue,
        (SELECT COUNT(*) FROM deals WHERE DATE(created_at) = CURDATE() $roleCondition) as today_deals,
        (SELECT COALESCE(SUM(amount), 0) FROM deals WHERE DATE(created_at) = CURDATE() $roleCondition) as today_revenue,
        (SELECT COUNT(*) FROM callbacks WHERE 1=1 $callbackRoleCondition) as total_callbacks,
        (SELECT COUNT(*) FROM callbacks WHERE status = 'pending' $callbackRoleCondition) as pending_callbacks,
        (SELECT COUNT(*) FROM callbacks WHERE DATE(created_at) = CURDATE() $callbackRoleCondition) as today_callbacks";
    
    $stats = $mysqlService->query($statsQuery)[0];
    
    echo json_encode($stats);
}

function handleAgentPerformance($mysqlService) {
    $userRole = $_GET['user_role'] ?? 'manager';
    $dateRange = $_GET['date_range'] ?? 'month';
    $team = $_GET['team'] ?? null;
    
    $dateCondition = getDateCondition($dateRange);
    $roleCondition = getRoleCondition($userRole, null, $team);
    
    // Agent performance metrics
    $performanceQuery = "SELECT 
        d.sales_agent as agent,
        COUNT(d.id) as total_deals,
        COALESCE(SUM(d.amount), 0) as total_revenue,
        COALESCE(AVG(d.amount), 0) as avg_deal_size,
        COUNT(CASE WHEN d.status = 'closed' THEN 1 END) as closed_deals,
        COALESCE(c.callback_count, 0) as total_callbacks,
        COALESCE(c.completed_callbacks, 0) as completed_callbacks,
        COALESCE(c.avg_response_time, 0) as avg_response_time
        FROM deals d
        LEFT JOIN (
            SELECT 
                created_by,
                COUNT(*) as callback_count,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_callbacks,
                AVG(CASE 
                    WHEN status != 'pending' AND updated_at IS NOT NULL 
                    THEN TIMESTAMPDIFF(HOUR, created_at, updated_at) 
                    ELSE NULL 
                END) as avg_response_time
            FROM callbacks 
            WHERE 1=1 $dateCondition
            GROUP BY created_by
        ) c ON d.sales_agent = c.created_by
        WHERE 1=1 $dateCondition $roleCondition
        GROUP BY d.sales_agent
        ORDER BY total_revenue DESC";
    
    $performance = $mysqlService->query($performanceQuery);
    
    // Add calculated metrics
    foreach ($performance as &$agent) {
        $agent['conversion_rate'] = $agent['total_deals'] > 0 
            ? ($agent['closed_deals'] / $agent['total_deals']) * 100 
            : 0;
        $agent['callback_conversion_rate'] = $agent['total_callbacks'] > 0 
            ? ($agent['completed_callbacks'] / $agent['total_callbacks']) * 100 
            : 0;
    }
    
    echo json_encode($performance);
}

function handleRevenueAnalytics($mysqlService) {
    $userRole = $_GET['user_role'] ?? 'manager';
    $userId = $_GET['user_id'] ?? null;
    $team = $_GET['team'] ?? null;
    
    $roleCondition = getRoleCondition($userRole, $userId, $team);
    
    // Revenue by time periods
    $revenueQuery = "SELECT 
        'today' as period,
        COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN amount ELSE 0 END), 0) as revenue,
        COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as deals
        FROM deals WHERE 1=1 $roleCondition
        UNION ALL
        SELECT 
        'week' as period,
        COALESCE(SUM(CASE WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN amount ELSE 0 END), 0) as revenue,
        COUNT(CASE WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 END) as deals
        FROM deals WHERE 1=1 $roleCondition
        UNION ALL
        SELECT 
        'month' as period,
        COALESCE(SUM(CASE WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN amount ELSE 0 END), 0) as revenue,
        COUNT(CASE WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as deals
        FROM deals WHERE 1=1 $roleCondition";
    
    $revenueByPeriod = $mysqlService->query($revenueQuery);
    
    echo json_encode($revenueByPeriod);
}

function handleConversionMetrics($mysqlService) {
    $userRole = $_GET['user_role'] ?? 'manager';
    $userId = $_GET['user_id'] ?? null;
    $team = $_GET['team'] ?? null;
    
    $roleCondition = getRoleCondition($userRole, $userId, $team);
    $callbackRoleCondition = getRoleCondition($userRole, $userId, $team, 'callbacks');
    
    // Conversion funnel metrics
    $conversionQuery = "SELECT 
        (SELECT COUNT(*) FROM callbacks WHERE 1=1 $callbackRoleCondition) as total_callbacks,
        (SELECT COUNT(*) FROM callbacks WHERE status = 'contacted' $callbackRoleCondition) as contacted_callbacks,
        (SELECT COUNT(*) FROM callbacks WHERE status = 'completed' $callbackRoleCondition) as completed_callbacks,
        (SELECT COUNT(*) FROM callbacks WHERE converted_to_deal = 1 $callbackRoleCondition) as converted_to_deals,
        (SELECT COUNT(*) FROM deals WHERE status = 'closed' $roleCondition) as closed_deals";
    
    $metrics = $mysqlService->query($conversionQuery)[0];
    
    // Calculate conversion rates
    $metrics['contact_rate'] = $metrics['total_callbacks'] > 0 
        ? ($metrics['contacted_callbacks'] / $metrics['total_callbacks']) * 100 
        : 0;
    $metrics['completion_rate'] = $metrics['contacted_callbacks'] > 0 
        ? ($metrics['completed_callbacks'] / $metrics['contacted_callbacks']) * 100 
        : 0;
    $metrics['callback_to_deal_rate'] = $metrics['completed_callbacks'] > 0 
        ? ($metrics['converted_to_deals'] / $metrics['completed_callbacks']) * 100 
        : 0;
    
    echo json_encode($metrics);
}

function getDateCondition($dateRange) {
    switch ($dateRange) {
        case 'today':
            return " AND DATE(created_at) = CURDATE()";
        case 'week':
            return " AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
        case 'month':
            return " AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
        case 'quarter':
            return " AND created_at >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)";
        case 'year':
            return " AND created_at >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)";
        default:
            return "";
    }
}

function getRoleCondition($userRole, $userId = null, $team = null, $table = 'deals') {
    $condition = "";
    
    if ($userRole === 'manager') {
        // Managers see all data
        return $condition;
    } elseif ($userRole === 'team-leader' && $team) {
        // Team leaders see their team's data
        if ($table === 'callbacks') {
            $condition = " AND created_by IN (SELECT username FROM users WHERE team = '$team')";
        } else {
            $condition = " AND sales_agent IN (SELECT username FROM users WHERE team = '$team')";
        }
    } elseif ($userId) {
        // Regular users see only their data
        if ($table === 'callbacks') {
            $condition = " AND created_by = '$userId'";
        } else {
            $condition = " AND sales_agent = '$userId'";
        }
    }
    
    return $condition;
}
?>
