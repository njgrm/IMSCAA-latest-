<?php
// get_time_slots.php
ini_set('display_errors', 0);
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

session_start();

// Check authentication
if (empty($_SESSION['user_id']) || empty($_SESSION['club_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated']);
    exit;
}

$clubId = (int)$_SESSION['club_id'];

try {
    $pdo = new PDO("mysql:host=localhost;dbname=imscca", "root", "");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Build the SQL query
    $sql = "
        SELECT 
            ts.slot_id,
            ts.requirement_id,
            ts.slot_name,
            ts.start_time,
            ts.end_time,
            ts.date,
            ts.is_active,
            ts.created_at,
            r.title as event_title
        FROM attendance_time_slots ts
        INNER JOIN requirements r ON ts.requirement_id = r.requirement_id
        WHERE r.club_id = :club_id
    ";

    $params = [':club_id' => $clubId];

    // Filter by requirement_id if provided
    if (isset($_GET['requirement_id']) && !empty($_GET['requirement_id'])) {
        $sql .= " AND ts.requirement_id = :requirement_id";
        $params[':requirement_id'] = (int)$_GET['requirement_id'];
    }

    // Filter by active status if specified
    if (isset($_GET['active_only']) && $_GET['active_only'] === 'true') {
        $sql .= " AND ts.is_active = 1";
    }

    $sql .= " ORDER BY ts.date ASC, ts.start_time ASC";

    $stmt = $pdo->prepare($sql);
    
    foreach ($params as $param => $value) {
        $stmt->bindValue($param, $value, is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR);
    }
    
    $stmt->execute();
    $slots = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Convert numeric fields to proper types
    foreach ($slots as &$slot) {
        $slot['slot_id'] = (int)$slot['slot_id'];
        $slot['requirement_id'] = (int)$slot['requirement_id'];
        $slot['is_active'] = (bool)$slot['is_active'];
    }
    
    echo json_encode($slots);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}
?> 