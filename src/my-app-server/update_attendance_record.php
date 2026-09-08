<?php
require_once __DIR__ . '/bootstrap.php'; require_method('POST','PUT'); $actor=require_operator();
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

    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON input']);
        exit;
    }

    // Validate required fields
    $required_fields = ['attendance_id', 'attendance_status'];
    foreach ($required_fields as $field) {
        if (!isset($input[$field]) || empty($input[$field])) {
            http_response_code(400);
            echo json_encode(['error' => "$field is required"]);
            exit;
        }
    }

    $attendanceId = (int)$input['attendance_id'];
    $attendanceStatus = $input['attendance_status'];
    $notes = $input['notes'] ?? '';

    // Validate attendance status
    $validStatuses = ['present', 'late', 'excused', 'absent'];
    if (!in_array($attendanceStatus, $validStatuses)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid attendance status. Must be one of: ' . implode(', ', $validStatuses)]);
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

    // Only advisers can update attendance records directly
    if (strtolower($userRole) !== 'adviser') {
        http_response_code(403);
        echo json_encode(['error' => 'Only advisers can update attendance records']);
        exit;
    }

    // Check if the attendance record exists and belongs to the same club
    $checkStmt = $pdo->prepare("
        SELECT ar.attendance_id, ar.user_id, ar.attendance_status as old_status,
               ar.notes as old_notes, r.title as event_title, r.club_id,
               u.user_fname, u.user_lname
        FROM attendance_records ar
        INNER JOIN requirements r ON ar.requirement_id = r.requirement_id
        INNER JOIN users u ON ar.user_id = u.user_id
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

    // Update the attendance record
    $updateStmt = $pdo->prepare("
        UPDATE attendance_records
        SET attendance_status = :attendance_status,
            notes = :notes,
            verified_by = :verified_by
        WHERE attendance_id = :attendance_id
    ");

    $updateStmt->execute([
        ':attendance_status' => $attendanceStatus,
        ':notes' => $notes,
        ':verified_by' => $currentUserId,
        ':attendance_id' => $attendanceId
    ]);

    if ($updateStmt->rowCount() === 0) {
        // Check if record still exists
        $existsStmt = $pdo->prepare("SELECT attendance_id FROM attendance_records WHERE attendance_id = :attendance_id");
        $existsStmt->execute([':attendance_id' => $attendanceId]);

        if (!$existsStmt->fetch()) {
            http_response_code(404);
            echo json_encode(['error' => 'Attendance record not found']);
            exit;
        }

        // Record exists but wasn't updated (no changes)
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'No changes made to attendance record',
            'attendance_id' => $attendanceId
        ]);
        exit;
    }

    // Log the update
    error_log("Attendance record updated - ID: {$attendanceId}, User: {$attendance['user_fname']} {$attendance['user_lname']}, Event: {$attendance['event_title']}, Status: {$attendance['old_status']} -> {$attendanceStatus}, Updated by: {$currentUserId}");

    // Return updated record
    $returnStmt = $pdo->prepare("
        SELECT ar.attendance_id, ar.user_id, ar.requirement_id, ar.slot_id,
               ar.verified_by, ar.club_id, ar.scan_datetime, ar.attendance_status, ar.notes,
               u.user_fname, u.user_lname, u.school_id,
               u.user_course AS course, u.user_year AS year, u.user_section AS section, u.avatar,
               r.title as event_title,
               ts.slot_name, ts.start_time, ts.end_time,
               v.user_fname as verifier_fname, v.user_lname as verifier_lname
        FROM attendance_records ar
        INNER JOIN users u ON ar.user_id = u.user_id
        INNER JOIN requirements r ON ar.requirement_id = r.requirement_id
        LEFT JOIN attendance_time_slots ts ON ar.slot_id = ts.slot_id
        LEFT JOIN users v ON ar.verified_by = v.user_id
        WHERE ar.attendance_id = :attendance_id
    ");

    $returnStmt->execute([':attendance_id' => $attendanceId]);
    $updatedRecord = $returnStmt->fetch(PDO::FETCH_ASSOC);

    // Convert numeric fields
    if ($updatedRecord) {
        $updatedRecord['attendance_id'] = (int)$updatedRecord['attendance_id'];
        $updatedRecord['user_id'] = (int)$updatedRecord['user_id'];
        $updatedRecord['requirement_id'] = (int)$updatedRecord['requirement_id'];
        $updatedRecord['slot_id'] = $updatedRecord['slot_id'] ? (int)$updatedRecord['slot_id'] : null;
        $updatedRecord['verified_by'] = (int)$updatedRecord['verified_by'];
        $updatedRecord['club_id'] = (int)$updatedRecord['club_id'];
        $updatedRecord['year'] = (int)$updatedRecord['year'];
    }

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Attendance record updated successfully',
        'attendance_record' => $updatedRecord
    ]);

} catch (PDOException $e) {
    error_log("Database error in update_attendance_record.php: " . $e->getMessage());
    http_response_code(500);
    error_log('IMSCCA request failure: ' . $e->getMessage());
    api_error(500, 'The request could not be completed.', 'SERVER_ERROR');
} catch (Exception $e) {
    error_log("Error in update_attendance_record.php: " . $e->getMessage());
    http_response_code(500);
    error_log('IMSCCA request failure: ' . $e->getMessage());
    api_error(500, 'The request could not be completed.', 'SERVER_ERROR');
}
?>
