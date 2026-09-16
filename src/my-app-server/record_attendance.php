<?php
require_once __DIR__ . '/bootstrap.php'; require_method('POST'); $actor=require_operator();
// record_attendance.php
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
$userIdToRecord = isset($input['user_id']) ? (int)$input['user_id'] : null;
$requirementId = isset($input['requirement_id']) ? (int)$input['requirement_id'] : null;
$slotId = null;

if (isset($input['slot_id'])) {
    if ($input['slot_id'] !== null && $input['slot_id'] !== '' && $input['slot_id'] !== 0) {
        $slotId = (int)$input['slot_id'];
    }
} elseif (isset($input['time_slot_id'])) {
    if ($input['time_slot_id'] !== null && $input['time_slot_id'] !== '' && $input['time_slot_id'] !== 0) {
        $slotId = (int)$input['time_slot_id'];
    }
}

$attendanceStatus = isset($input['attendance_status']) ? $input['attendance_status'] : 'present';
$notes = isset($input['notes']) ? trim($input['notes']) : '';


// Validate inputs
if (!$userIdToRecord) {
    http_response_code(400);
    echo json_encode(['error' => 'User ID is required']);
    exit;
}

if (!$requirementId) {
    http_response_code(400);
    echo json_encode(['error' => 'Requirement ID is required']);
    exit;
}

// Validate attendance status
$validStatuses = ['present', 'late', 'excused', 'absent'];
if (!in_array($attendanceStatus, $validStatuses)) {
    $attendanceStatus = 'present';
}

try {
    $pdo = db();
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $reqStmt = $pdo->prepare("
        SELECT requirement_id, title, requirement_type, start_datetime, end_datetime,
               (NOW() > end_datetime) AS already_ended,
               (NOW() < start_datetime) AS not_started
        FROM requirements
        WHERE requirement_id = ? AND club_id = ?
    ");
    $reqStmt->execute([$requirementId, $clubId]);
    $requirement = $reqStmt->fetch(PDO::FETCH_ASSOC);
    if (!$requirement) {
        http_response_code(404);
        echo json_encode(['error' => 'Invalid requirement ID or not authorized']);
        exit;
    }

    // Only events carry attendance; fee and activity requirements do not.
    if ($requirement['requirement_type'] !== 'event') {
        http_response_code(400);
        echo json_encode(['error' => 'Attendance can only be recorded for events']);
        exit;
    }

    $userStmt = $pdo->prepare("SELECT user_id, user_fname, user_lname FROM users WHERE user_id = ? AND club_id = ?");
    $userStmt->execute([$userIdToRecord, $clubId]);
    if (!$userStmt->fetch()) {
        http_response_code(404);
        echo json_encode(['error' => 'Invalid user ID or not authorized']);
        exit;
    }

    if ($slotId) {
        $slotStmt = $pdo->prepare("
            SELECT slot_id, slot_name, date, (date = CURDATE()) AS is_today
            FROM attendance_time_slots
            WHERE slot_id = ? AND requirement_id = ? AND is_active = 1
        ");
        $slotStmt->execute([$slotId, $requirementId]);
        $slot = $slotStmt->fetch(PDO::FETCH_ASSOC);
        if (!$slot) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid time slot ID or not active']);
            exit;
        }
    }

    // Registration is advisory: walk-ins are still recorded, but flagged and audited.
    $registrationStmt = $pdo->prepare("
        SELECT 1 FROM event_registrations
        WHERE requirement_id = ? AND user_id = ? AND status = 'registered'
    ");
    $registrationStmt->execute([$requirementId, $userIdToRecord]);
    $isRegistered = (bool)$registrationStmt->fetchColumn();

    $pdo->beginTransaction();

    try {
        $checkStmt = $pdo->prepare("
            SELECT attendance_id, notes, attendance_status
            FROM attendance_records
            WHERE user_id = ? AND requirement_id = ? AND slot_id " . ($slotId ? "= ?" : "IS NULL")
        );
        $checkParams = [$userIdToRecord, $requirementId];
        if ($slotId) {
            $checkParams[] = $slotId;
        }
        $checkStmt->execute($checkParams);
        $existingRecord = $checkStmt->fetch();

        if ($existingRecord) {
            $updateStmt = $pdo->prepare("
                UPDATE attendance_records
                SET attendance_status = ?, notes = ?, scan_datetime = NOW(), verified_by = ?
                WHERE attendance_id = ?
            ");
            $updateStmt->execute([$attendanceStatus, $notes, $verifierUserId, $existingRecord['attendance_id']]);
            $attendanceId = $existingRecord['attendance_id'];
            // A scan that overwrites an earlier status is a correction worth retaining.
            record_attendance_status_change($pdo, (int)$attendanceId, (string)$existingRecord['attendance_status'], $attendanceStatus, $verifierUserId, 'correction');
        } else {
            $insertStmt = $pdo->prepare("
                INSERT INTO attendance_records
                (user_id, requirement_id, slot_id, verified_by, club_id, attendance_status, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            $insertStmt->execute([$userIdToRecord, $requirementId, $slotId, $verifierUserId, $clubId, $attendanceStatus, $notes]);
            $attendanceId = $pdo->lastInsertId();
        }

        $resultStmt = $pdo->prepare("
            SELECT
                ar.attendance_id,
                ar.user_id,
                ar.requirement_id,
                ar.slot_id,
                ar.verified_by,
                ar.club_id,
                ar.scan_datetime,
                ar.attendance_status,
                ar.notes,
                u.user_fname,
                u.user_lname,
                u.school_id,
                r.title as event_title,
                ts.slot_name,
                ts.start_time,
                ts.end_time,
                ts.date as slot_date,
                v.user_fname as verifier_fname,
                v.user_lname as verifier_lname
            FROM attendance_records ar
            INNER JOIN users u ON ar.user_id = u.user_id
            INNER JOIN requirements r ON ar.requirement_id = r.requirement_id
            LEFT JOIN attendance_time_slots ts ON ar.slot_id = ts.slot_id
            LEFT JOIN users v ON ar.verified_by = v.user_id
            WHERE ar.attendance_id = ?
        ");
        $resultStmt->execute([$attendanceId]);
        $record = $resultStmt->fetch(PDO::FETCH_ASSOC);

        // The record is always saved, but the operator is warned when it falls
        // outside the event window, is unregistered, or replaces an absence.
        $warnings = [];
        $windowAudit = null;

        if (!empty($requirement['not_started'])) {
            $startedAt = date('Y-m-d H:i', strtotime((string)$requirement['start_datetime']));
            $warnings[] = 'This event has not started yet (starts ' . $startedAt . '). The record is being saved ahead of the event window.';
            $windowAudit = ['window' => 'before_start', 'event_starts_at' => $startedAt];
        }
        if (!empty($requirement['already_ended'])) {
            $endedAt = date('Y-m-d H:i', strtotime((string)$requirement['end_datetime']));
            $warnings[] = 'This event ended on ' . $endedAt . '. The record is being saved after the event window.';
            $windowAudit = ['window' => 'after_end', 'event_ended_at' => $endedAt];
        }
        if (!$isRegistered) {
            $warnings[] = 'This student is not registered for this event.';
        }
        if ($existingRecord && strpos((string)($existingRecord['notes'] ?? ''), 'Automatically marked absent') === 0) {
            $warnings[] = 'This replaces an automatically generated absent record.';
        }
        if (isset($slot['is_today']) && empty($slot['is_today'])) {
            $warnings[] = 'The selected time slot is dated ' . $slot['date'] . ', which is not today.';
        }

        // Durable, tamper-evident proof of how the record was taken: the History
        // page reads audit_log, so these entries survive later edits to the record.
        $auditBase = ['event' => $requirement['title'], 'recorded_at' => date('Y-m-d H:i:s')];
        if ($windowAudit !== null) {
            audit_event($pdo, $actor, 'attendance_recorded_outside_window', 'attendance', (int)$attendanceId, $userIdToRecord, $windowAudit + $auditBase);
        }
        if (!$isRegistered) {
            audit_event($pdo, $actor, 'attendance_recorded_unregistered', 'attendance', (int)$attendanceId, $userIdToRecord, ['registered' => false] + $auditBase);
        }

        $pdo->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Attendance recorded successfully',
            'warnings' => $warnings,
            'attendance_record' => $record
        ]);

    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        http_response_code(500);
        error_log('IMSCCA request failure: ' . $e->getMessage());
        api_error(500, 'The request could not be completed.', 'SERVER_ERROR');
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        http_response_code(500);
        error_log('IMSCCA request failure: ' . $e->getMessage());
        api_error(500, 'The request could not be completed.', 'SERVER_ERROR');
    }

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    error_log('IMSCCA request failure: ' . $e->getMessage());
    api_error(500, 'The request could not be completed.', 'SERVER_ERROR');
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    error_log('IMSCCA request failure: ' . $e->getMessage());
    api_error(500, 'The request could not be completed.', 'SERVER_ERROR');
}
?>
