<?php
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
    $pdo = new PDO("mysql:host=127.0.0.1;dbname=db_imscca;charset=utf8mb4", "root", "", [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    // Check if this is an attendance request and get original data
    $originalStatus = null;
    $requestedStatus = null;
    if ($type === 'attendance' || $approvalType === 'attendance_edit') {
        if ($approvalType === 'attendance_edit' && $newData) {
            // Get current attendance record
            $stmt = $pdo->prepare("
                SELECT attendance_status FROM attendance_records 
                WHERE attendance_id = ? AND club_id = ?
            ");
            $stmt->execute([$targetId, $clubId]);
            $currentRecord = $stmt->fetch();
            
            if ($currentRecord) {
                $originalStatus = $currentRecord['attendance_status'];
                $requestedStatus = $newData['attendance_status'] ?? $originalStatus;
            }
        }
        
        // Convert type to standard approval request type
        $type = 'attendance';
    }

    // Insert the approval request
    $stmt = $pdo->prepare("
        INSERT INTO approval_requests 
        (type, approval_type, target_id, club_id, requested_by, reason, original_status, requested_status, attendance_record_id, new_data)
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
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}
?> 