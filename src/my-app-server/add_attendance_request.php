<?php
require_once __DIR__ . '/bootstrap.php'; require_method('POST'); $actor=require_operator();
// add_attendance_request.php
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

$type = $input['type'] ?? '';
$targetId = isset($input['target_id']) ? (int)$input['target_id'] : 0;
$reason = trim($input['reason'] ?? '');
$approvalType = $input['approval_type'] ?? $input['request_type'] ?? 'delete'; // Handle both names for compatibility
$newData = $input['new_data'] ?? null;

// Validate required fields
if (!$type || !$targetId || !$reason) {
    http_response_code(400);
    echo json_encode(['error' => 'Type, target_id, and reason are required']);
    exit;
}

// For edit requests, new_data is required
if ($approvalType === 'attendance_edit' && !$newData) {
    http_response_code(400);
    echo json_encode(['error' => 'new_data is required for edit requests']);
    exit;
}

try {
    $pdo = db();

    // Check if this is an attendance request and get original data
    $originalStatus = null;
    $requestedStatus = null;
    if ($type === 'attendance' || $approvalType === 'attendance_edit') {
        $stmt = $pdo->prepare("
            SELECT attendance_status FROM attendance_records
            WHERE attendance_id = ? AND club_id = ?
        ");
        $stmt->execute([$targetId, $clubId]);
        $currentRecord = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$currentRecord) {
            api_error(404, 'Attendance record not found in this club.', 'ATTENDANCE_NOT_FOUND');
        }

        $originalStatus = $currentRecord['attendance_status'];
        if ($approvalType === 'attendance_edit' && $newData) {
            $requestedStatus = $newData['attendance_status'] ?? $originalStatus;
            if (!in_array($requestedStatus, ['present', 'late', 'excused', 'absent'], true)) {
                api_error(400, 'Invalid attendance status.', 'INVALID_ATTENDANCE_STATUS');
            }
        }

        // Convert type to standard approval request type
        $type = 'attendance';
    }

    // Insert the approval request
    $stmt = $pdo->prepare("
        INSERT INTO approval_requests
        (type, approval_type, target_id, club_id, requested_by, reason, original_status, requested_status, attendance_record_id, edit_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $attendanceRecordId = ($type === 'attendance') ? $targetId : null;
    $newDataJson = $newData ? json_encode($newData) : null;

    $stmt->execute([
        $type,
        $approvalType,
        $targetId,
        $clubId,
        $userId,
        $reason,
        $originalStatus,
        $requestedStatus,
        $attendanceRecordId,
        $newDataJson
    ]);

    echo json_encode([
        'success' => true,
        'message' => ucfirst($approvalType) . ' request submitted successfully',
        'request_id' => $pdo->lastInsertId()
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
