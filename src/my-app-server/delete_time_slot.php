<?php
require_once __DIR__ . '/bootstrap.php'; require_method('POST','DELETE'); $actor=require_roles('adviser');
// delete_time_slot.php
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
if (!isset($input['slot_id']) || empty($input['slot_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'slot_id is required']);
    exit;
}

$slotId = (int)$input['slot_id'];

// Debug logging
error_log("Delete time slot request - slot_id: " . $slotId);

if ($slotId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid slot_id']);
    exit;
}

try {
    $pdo = db();
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Verify that the time slot exists and belongs to the user's club
    $checkSql = "
        SELECT ts.slot_id, ts.slot_name, r.title, r.club_id
        FROM attendance_time_slots ts
        INNER JOIN requirements r ON ts.requirement_id = r.requirement_id
        WHERE ts.slot_id = :slot_id AND r.club_id = :club_id
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

    // Check if there are any attendance records for this time slot
    $attendanceCheckSql = "
        SELECT COUNT(*) as record_count
        FROM attendance_records
        WHERE slot_id = :slot_id
    ";

    $attendanceStmt = $pdo->prepare($attendanceCheckSql);
    $attendanceStmt->bindParam(':slot_id', $slotId, PDO::PARAM_INT);
    $attendanceStmt->execute();

    $attendanceResult = $attendanceStmt->fetch(PDO::FETCH_ASSOC);
    $hasRecords = $attendanceResult['record_count'] > 0;

    $pdo->beginTransaction();

    try {
        if ($hasRecords) {
            $deleteRecordsSql = "DELETE FROM attendance_records WHERE slot_id = :slot_id";
            $deleteRecordsStmt = $pdo->prepare($deleteRecordsSql);
            $deleteRecordsStmt->bindParam(':slot_id', $slotId, PDO::PARAM_INT);
            $deleteRecordsStmt->execute();
        }

        $deleteSql = "DELETE FROM attendance_time_slots WHERE slot_id = :slot_id";
        $deleteStmt = $pdo->prepare($deleteSql);
        $deleteStmt->bindParam(':slot_id', $slotId, PDO::PARAM_INT);
        $deleteStmt->execute();

        $pdo->commit();

        $message = 'Time slot deleted successfully';
        if ($hasRecords) {
            $message .= '. Associated attendance records were also removed.';
        }

        echo json_encode([
            'success' => true,
            'message' => $message,
            'deleted_slot' => [
                'slot_id' => $slotId,
                'slot_name' => $slotInfo['slot_name'],
                'had_attendance_records' => $hasRecords
            ]
        ]);

    } catch (Exception $e) {
        $pdo->rollback();
        throw $e;
    }

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
