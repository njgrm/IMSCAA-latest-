<?php
require_once __DIR__ . '/bootstrap.php'; require_method('DELETE'); $actor=require_roles('adviser');
require_once __DIR__ . '/cors.php';
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if (session_status() !== PHP_SESSION_ACTIVE) session_start();

if (empty($_SESSION['user_id']) || empty($_SESSION['club_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated']);
    exit;
}

$currentUserId = (int)$_SESSION['user_id'];
$currentClubId = (int)$_SESSION['club_id'];

try {
    $pdo = db();

    // Get attendance_id from query parameter
    if (!isset($_GET['attendance_id']) || empty($_GET['attendance_id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'attendance_id is required']);
        exit;
    }

    $attendanceId = (int)$_GET['attendance_id'];

    if ($attendanceId <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid attendance_id']);
        exit;
    }

    // Get current user's role
    $roleStmt = $pdo->prepare("SELECT role FROM users WHERE user_id = :user_id");
    $roleStmt->execute([':user_id' => $currentUserId]);
    $userRole = $roleStmt->fetchColumn();

    if (!$userRole) {
        http_response_code(403);
        echo json_encode(['error' => 'User role not found']);
        exit;
    }

    // Only advisers can delete attendance records directly
    if (strtolower($userRole) !== 'adviser') {
        http_response_code(403);
        echo json_encode(['error' => 'Only advisers can delete attendance records']);
        exit;
    }

    // Check if the attendance record exists and belongs to the same club
    $checkStmt = $pdo->prepare("
        SELECT ar.attendance_id, ar.user_id, r.title as event_title, r.club_id
        FROM attendance_records ar
        INNER JOIN requirements r ON ar.requirement_id = r.requirement_id
        WHERE ar.attendance_id = :attendance_id AND r.club_id = :club_id
    ");
    $checkStmt->execute([
        ':attendance_id' => $attendanceId,
        ':club_id' => $currentClubId
    ]);

    $attendance = $checkStmt->fetch(PDO::FETCH_ASSOC);

    if (!$attendance) {
        http_response_code(404);
        echo json_encode(['error' => 'Attendance record not found or does not belong to your club']);
        exit;
    }

    // Delete the attendance record
    $deleteStmt = $pdo->prepare("DELETE FROM attendance_records WHERE attendance_id = :attendance_id");
    $deleteStmt->execute([':attendance_id' => $attendanceId]);

    if ($deleteStmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Attendance record not found']);
        exit;
    }

    // Log the deletion
    error_log("Attendance record deleted - ID: {$attendanceId}, Event: {$attendance['event_title']}, Deleted by: {$currentUserId}");

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Attendance record deleted successfully',
        'attendance_id' => $attendanceId
    ]);

} catch (PDOException $e) {
    error_log("Database error in delete_attendance_record.php: " . $e->getMessage());
    http_response_code(500);
    error_log('IMSCCA request failure: ' . $e->getMessage());
    api_error(500, 'The request could not be completed.', 'SERVER_ERROR');
} catch (Exception $e) {
    error_log("Error in delete_attendance_record.php: " . $e->getMessage());
    http_response_code(500);
    error_log('IMSCCA request failure: ' . $e->getMessage());
    api_error(500, 'The request could not be completed.', 'SERVER_ERROR');
}
?>
