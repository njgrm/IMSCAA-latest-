<?php
// toggle_time_slot.php
ini_set('display_errors', 0);
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);
require_once __DIR__ . '/cors.php';
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

$userId = (int)$_SESSION['user_id'];
$clubId = (int)$_SESSION['club_id'];

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Get input data
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON input']);
    exit;
}

// Validate required fields
$required_fields = ['slot_id', 'is_active'];
foreach ($required_fields as $field) {
    if (!isset($input[$field])) {
        http_response_code(400);
        echo json_encode(['error' => "Missing required field: $field"]);
        exit;
    }
}

$slotId = (int)$input['slot_id'];
$isActive = (bool)$input['is_active'];

try {
    $pdo = new PDO("mysql:host=localhost;dbname=db_imscca", "root", "");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Verify that the time slot belongs to the user's club
    $checkSql = "
        SELECT ts.slot_id, ts.slot_name, ts.is_active, r.title 
        FROM attendance_time_slots ts
        INNER JOIN requirements r ON ts.requirement_id = r.requirement_id
        WHERE ts.slot_id = :slot_id 
          AND r.club_id = :club_id 
          AND r.requirement_type = 'event'
    ";
    
    $checkStmt = $pdo->prepare($checkSql);
    $checkStmt->bindParam(':slot_id', $slotId, PDO::PARAM_INT);
    $checkStmt->bindParam(':club_id', $clubId, PDO::PARAM_INT);
    $checkStmt->execute();
    
    if ($checkStmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Time slot not found or access denied']);
        exit;
    }

    $slotInfo = $checkStmt->fetch(PDO::FETCH_ASSOC);
    $currentStatus = (bool)$slotInfo['is_active'];

    // Check if the status is actually changing
    if ($currentStatus === $isActive) {
        echo json_encode([
            'success' => true,
            'message' => 'Time slot status is already ' . ($isActive ? 'active' : 'inactive'),
            'time_slot' => [
                'slot_id' => $slotId,
                'slot_name' => $slotInfo['slot_name'],
                'is_active' => $isActive
            ]
        ]);
        exit;
    }

    // Update the time slot status
    $updateSql = "
        UPDATE attendance_time_slots 
        SET is_active = :is_active
        WHERE slot_id = :slot_id
    ";
    
    $updateStmt = $pdo->prepare($updateSql);
    $updateStmt->bindParam(':is_active', $isActive, PDO::PARAM_BOOL);
    $updateStmt->bindParam(':slot_id', $slotId, PDO::PARAM_INT);
    
    $updateStmt->execute();
    
    // Return the updated time slot
    $returnSql = "
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
        WHERE ts.slot_id = :slot_id
    ";
    
    $returnStmt = $pdo->prepare($returnSql);
    $returnStmt->bindParam(':slot_id', $slotId, PDO::PARAM_INT);
    $returnStmt->execute();
    
    $updatedSlot = $returnStmt->fetch(PDO::FETCH_ASSOC);
    
    // Convert types
    $updatedSlot['slot_id'] = (int)$updatedSlot['slot_id'];
    $updatedSlot['requirement_id'] = (int)$updatedSlot['requirement_id'];
    $updatedSlot['is_active'] = (bool)$updatedSlot['is_active'];
    
    $statusText = $isActive ? 'enabled' : 'disabled';
    
    echo json_encode([
        'success' => true,
        'message' => "Time slot {$statusText} successfully",
        'time_slot' => $updatedSlot
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}
?> 