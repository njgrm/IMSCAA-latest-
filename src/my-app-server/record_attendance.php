<?php
// record_attendance.php
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

$verifierUserId = (int)$_SESSION['user_id'];
$clubId = (int)$_SESSION['club_id'];

// Check permissions - only admins can record attendance
$role = strtolower($_SESSION['role'] ?? '');
if (!in_array($role, ['adviser', 'president', 'officer'])) {
    http_response_code(403);
    echo json_encode(['error' => 'Insufficient permissions. Only admins can record attendance.']);
    exit;
}

// Parse input
$input = json_decode(file_get_contents('php://input'), true);
$userId = (int)($input['user_id'] ?? 0);
$requirementId = (int)($input['requirement_id'] ?? 0);
$timeSlotId = isset($input['time_slot_id']) ? (int)$input['time_slot_id'] : null;
$attendanceStatus = $input['attendance_status'] ?? 'present';
$notes = trim($input['notes'] ?? '');

// Validate required fields
if (!$userId || !$requirementId) {
    http_response_code(400);
    echo json_encode(['error' => 'User ID and Requirement ID are required']);
    exit;
}

// Validate attendance status
$validStatuses = ['present', 'late', 'excused'];
if (!in_array($attendanceStatus, $validStatuses)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid attendance status']);
    exit;
}

try {
    $pdo = new PDO(
        "mysql:host=127.0.0.1;dbname=db_imscca;charset=utf8mb4",
        "root",
        "",
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    $pdo->beginTransaction();

    // Verify that the user exists and belongs to the same club
    $stmt = $pdo->prepare("
        SELECT user_id, user_fname, user_lname, school_id 
        FROM users 
        WHERE user_id = ? AND club_id = ?
    ");
    $stmt->execute([$userId, $clubId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode(['error' => 'User not found or does not belong to your club']);
        exit;
    }

    // Verify that the requirement exists, is an event, and belongs to the same club
    $stmt = $pdo->prepare("
        SELECT requirement_id, title, requirement_type 
        FROM requirements 
        WHERE requirement_id = ? AND club_id = ? AND requirement_type = 'event'
    ");
    $stmt->execute([$requirementId, $clubId]);
    $requirement = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$requirement) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode(['error' => 'Event not found or does not belong to your club']);
        exit;
    }

    // If time slot ID is provided, verify it exists and belongs to the requirement
    $timeSlot = null;
    if ($timeSlotId) {
        $stmt = $pdo->prepare("
            SELECT slot_id, slot_name, start_time, end_time, date 
            FROM attendance_time_slots 
            WHERE slot_id = ? AND requirement_id = ? AND is_active = 1
        ");
        $stmt->execute([$timeSlotId, $requirementId]);
        $timeSlot = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$timeSlot) {
            $pdo->rollBack();
            http_response_code(404);
            echo json_encode(['error' => 'Time slot not found or inactive']);
            exit;
        }
    }

    // Check if attendance record already exists for this user, event, and time slot
    $stmt = $pdo->prepare("
        SELECT attendance_id, scan_datetime, attendance_status 
        FROM attendance_records 
        WHERE user_id = ? AND requirement_id = ? AND time_slot_id " . 
        ($timeSlotId ? "= ?" : "IS NULL")
    );
    $params = [$userId, $requirementId];
    if ($timeSlotId) {
        $params[] = $timeSlotId;
    }
    $stmt->execute($params);
    $existingAttendance = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($existingAttendance) {
        $pdo->rollBack();
        http_response_code(409);
        echo json_encode([
            'error' => 'Attendance already recorded for this user and event' . 
                      ($timeSlot ? ' time slot' : ''),
            'existing_record' => [
                'attendance_id' => $existingAttendance['attendance_id'],
                'scan_datetime' => $existingAttendance['scan_datetime'],
                'attendance_status' => $existingAttendance['attendance_status']
            ]
        ]);
        exit;
    }

    // Insert new attendance record
    $stmt = $pdo->prepare("
        INSERT INTO attendance_records 
        (user_id, requirement_id, time_slot_id, verified_by, club_id, attendance_status, notes) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $userId,
        $requirementId,
        $timeSlotId,
        $verifierUserId,
        $clubId,
        $attendanceStatus,
        $notes
    ]);

    $attendanceId = $pdo->lastInsertId();

    $pdo->commit();

    // Fetch the complete attendance record for response
    $stmt = $pdo->prepare("
        SELECT 
            ar.attendance_id,
            ar.scan_datetime,
            ar.attendance_status,
            ar.notes,
            u.user_fname,
            u.user_lname,
            u.school_id,
            r.title as event_title,
            ats.slot_name,
            ats.start_time,
            ats.end_time,
            verifier.user_fname as verifier_fname,
            verifier.user_lname as verifier_lname
        FROM attendance_records ar
        JOIN users u ON ar.user_id = u.user_id
        JOIN requirements r ON ar.requirement_id = r.requirement_id
        LEFT JOIN attendance_time_slots ats ON ar.time_slot_id = ats.slot_id
        JOIN users verifier ON ar.verified_by = verifier.user_id
        WHERE ar.attendance_id = ?
    ");
    $stmt->execute([$attendanceId]);
    $attendanceRecord = $stmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'message' => 'Attendance recorded successfully',
        'attendance_record' => $attendanceRecord
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?> 