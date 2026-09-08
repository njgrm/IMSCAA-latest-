<?php
require_once __DIR__ . '/bootstrap.php'; require_method('POST'); $actor=require_operator();
// update_time_slot.php
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

if (session_status() !== PHP_SESSION_ACTIVE) session_start();

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
$required_fields = ['slot_id', 'slot_name', 'start_time', 'end_time', 'date'];
foreach ($required_fields as $field) {
    if (empty($input[$field])) {
        http_response_code(400);
        echo json_encode(['error' => "Missing required field: $field"]);
        exit;
    }
}

$slotId = (int)$input['slot_id'];
$slotName = trim($input['slot_name']);
$startTime = trim($input['start_time']);
$endTime = trim($input['end_time']);
$date = trim($input['date']);

// Validate time format (should be HH:MM format from HTML time input)
// Accept both H:MM and HH:MM formats
if (!preg_match('/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/', $startTime)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid start time format. Use HH:MM. Received: ' . $startTime]);
    exit;
}

if (!preg_match('/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/', $endTime)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid end time format. Use HH:MM. Received: ' . $endTime]);
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
    $pdo = db();
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Verify that the time slot belongs to the user's club
    $checkSql = "
        SELECT ts.slot_id, ts.requirement_id, r.title
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

    $existingSlot = $checkStmt->fetch(PDO::FETCH_ASSOC);
    $requirementId = $existingSlot['requirement_id'];

    // Check for time slot conflicts (excluding current slot)
    $conflictSql = "
        SELECT slot_id, slot_name
        FROM attendance_time_slots
        WHERE requirement_id = :requirement_id
          AND slot_id != :slot_id
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
    $conflictStmt->bindParam(':slot_id', $slotId, PDO::PARAM_INT);
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

    // Update the time slot
    $updateSql = "
        UPDATE attendance_time_slots
        SET slot_name = :slot_name,
            start_time = :start_time,
            end_time = :end_time,
            date = :date
        WHERE slot_id = :slot_id
    ";

    $updateStmt = $pdo->prepare($updateSql);
    $updateStmt->bindParam(':slot_name', $slotName);
    $updateStmt->bindParam(':start_time', $startTime);
    $updateStmt->bindParam(':end_time', $endTime);
    $updateStmt->bindParam(':date', $date);
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

    echo json_encode([
        'success' => true,
        'message' => 'Time slot updated successfully',
        'time_slot' => $updatedSlot
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    error_log('IMSCCA request failure: ' . $e->getMessage());
    api_error(500, 'The request could not be completed.', 'SERVER_ERROR');
} catch (Exception $e) {
    http_response_code(500);
    error_log('IMSCCA request failure: ' . $e->getMessage());
    api_error(500, 'The request could not be completed.', 'SERVER_ERROR');
}
?>
