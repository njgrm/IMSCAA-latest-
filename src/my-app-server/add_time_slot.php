<?php
// add_time_slot.php
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
$required_fields = ['requirement_id', 'slot_name', 'start_time', 'end_time', 'date'];
foreach ($required_fields as $field) {
    if (empty($input[$field])) {
        http_response_code(400);
        echo json_encode(['error' => "Missing required field: $field"]);
        exit;
    }
}

$requirementId = (int)$input['requirement_id'];
$slotName = trim($input['slot_name']);
$startTime = trim($input['start_time']);
$endTime = trim($input['end_time']);
$date = trim($input['date']);

// Validate time format
if (!preg_match('/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/', $startTime)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid start time format. Use HH:MM']);
    exit;
}

if (!preg_match('/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/', $endTime)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid end time format. Use HH:MM']);
    exit;
}

// Validate date format
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid date format. Use YYYY-MM-DD']);
    exit;
}

// Validate that end time is after start time
if (strtotime($endTime) <= strtotime($startTime)) {
    http_response_code(400);
    echo json_encode(['error' => 'End time must be after start time']);
    exit;
}

try {
    $pdo = new PDO("mysql:host=localhost;dbname=imscca", "root", "");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Verify that the requirement belongs to the user's club and is an event
    $checkSql = "
        SELECT requirement_id, title 
        FROM requirements 
        WHERE requirement_id = :requirement_id 
          AND club_id = :club_id 
          AND requirement_type = 'event'
    ";
    
    $checkStmt = $pdo->prepare($checkSql);
    $checkStmt->bindParam(':requirement_id', $requirementId, PDO::PARAM_INT);
    $checkStmt->bindParam(':club_id', $clubId, PDO::PARAM_INT);
    $checkStmt->execute();
    
    if ($checkStmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Event not found or access denied']);
        exit;
    }

    // Check for time slot conflicts
    $conflictSql = "
        SELECT slot_id, slot_name 
        FROM attendance_time_slots 
        WHERE requirement_id = :requirement_id 
          AND date = :date 
          AND is_active = 1
          AND (
            (start_time <= :start_time AND end_time > :start_time) OR
            (start_time < :end_time AND end_time >= :end_time) OR
            (start_time >= :start_time AND end_time <= :end_time)
          )
    ";
    
    $conflictStmt = $pdo->prepare($conflictSql);
    $conflictStmt->bindParam(':requirement_id', $requirementId, PDO::PARAM_INT);
    $conflictStmt->bindParam(':date', $date);
    $conflictStmt->bindParam(':start_time', $startTime);
    $conflictStmt->bindParam(':end_time', $endTime);
    $conflictStmt->execute();
    
    if ($conflictStmt->rowCount() > 0) {
        $conflict = $conflictStmt->fetch(PDO::FETCH_ASSOC);
        http_response_code(409);
        echo json_encode([
            'error' => 'Time slot conflicts with existing slot: ' . $conflict['slot_name']
        ]);
        exit;
    }

    // Insert the new time slot
    $insertSql = "
        INSERT INTO attendance_time_slots 
        (requirement_id, slot_name, start_time, end_time, date, is_active, created_at) 
        VALUES (:requirement_id, :slot_name, :start_time, :end_time, :date, 1, NOW())
    ";
    
    $insertStmt = $pdo->prepare($insertSql);
    $insertStmt->bindParam(':requirement_id', $requirementId, PDO::PARAM_INT);
    $insertStmt->bindParam(':slot_name', $slotName);
    $insertStmt->bindParam(':start_time', $startTime);
    $insertStmt->bindParam(':end_time', $endTime);
    $insertStmt->bindParam(':date', $date);
    
    $insertStmt->execute();
    
    $slotId = $pdo->lastInsertId();
    
    // Return the created time slot
    $returnSql = "
        SELECT 
            slot_id,
            requirement_id,
            slot_name,
            start_time,
            end_time,
            date,
            is_active,
            created_at
        FROM attendance_time_slots 
        WHERE slot_id = :slot_id
    ";
    
    $returnStmt = $pdo->prepare($returnSql);
    $returnStmt->bindParam(':slot_id', $slotId, PDO::PARAM_INT);
    $returnStmt->execute();
    
    $newSlot = $returnStmt->fetch(PDO::FETCH_ASSOC);
    
    // Convert types
    $newSlot['slot_id'] = (int)$newSlot['slot_id'];
    $newSlot['requirement_id'] = (int)$newSlot['requirement_id'];
    $newSlot['is_active'] = (bool)$newSlot['is_active'];
    
    echo json_encode([
        'success' => true,
        'message' => 'Time slot created successfully',
        'time_slot' => $newSlot
    ]);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}
?> 