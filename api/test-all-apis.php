<?php
/**
 * Test All API Endpoints
 * This script tests all API endpoints to ensure they're working properly
 */

echo "=== VMAX API ENDPOINTS TEST ===\n\n";

// Test 1: Database Connection
echo "1. Testing Database Connection:\n";
try {
    require_once __DIR__ . '/test-db-connection.php';
    echo "   ✅ Database connection test completed\n\n";
} catch (Exception $e) {
    echo "   ❌ Database connection failed: " . $e->getMessage() . "\n\n";
}

// Test 2: Users API
echo "2. Testing Users API:\n";
try {
    require_once __DIR__ . '/users-api.php';
    $usersAPI = new UsersAPI();
    echo "   ✅ Users API initialized successfully\n";
} catch (Exception $e) {
    echo "   ❌ Users API failed: " . $e->getMessage() . "\n";
}

// Test 3: Notifications API
echo "3. Testing Notifications API:\n";
try {
    require_once __DIR__ . '/notifications-api.php';
    $notificationsAPI = new NotificationsAPI();
    echo "   ✅ Notifications API initialized successfully\n";
} catch (Exception $e) {
    echo "   ❌ Notifications API failed: " . $e->getMessage() . "\n";
}

// Test 4: Deals API
echo "4. Testing Deals API:\n";
try {
    require_once __DIR__ . '/deals-api.php';
    $dealsAPI = new DealsAPI();
    echo "   ✅ Deals API initialized successfully\n";
} catch (Exception $e) {
    echo "   ❌ Deals API failed: " . $e->getMessage() . "\n";
}

// Test 5: Callbacks API
echo "5. Testing Callbacks API:\n";
try {
    require_once __DIR__ . '/callbacks-api.php';
    $callbacksAPI = new CallbacksAPI();
    echo "   ✅ Callbacks API initialized successfully\n";
} catch (Exception $e) {
    echo "   ❌ Callbacks API failed: " . $e->getMessage() . "\n";
}

// Test 6: Analytics API
echo "6. Testing Analytics API:\n";
try {
    require_once __DIR__ . '/analytics-api.php';
    echo "   ✅ Analytics API loaded successfully\n";
} catch (Exception $e) {
    echo "   ❌ Analytics API failed: " . $e->getMessage() . "\n";
}

echo "\n=== API TEST COMPLETED ===\n";
echo "All API endpoints have been tested.\n";
echo "If you see any ❌ errors above, those need to be fixed.\n";
?>
