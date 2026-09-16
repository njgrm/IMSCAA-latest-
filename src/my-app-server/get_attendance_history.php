<?php
require_once __DIR__ . '/bootstrap.php';
require_method('GET');
$actor = require_operator();

$attendanceId = (int)($_GET['attendance_id'] ?? 0);
if ($attendanceId <= 0) api_error(400, 'An attendance record is required.', 'INVALID_ATTENDANCE');

try {
    $pdo = db();

    // Club scope is checked before any history is returned.
    $scope = $pdo->prepare("SELECT attendance_id FROM attendance_records WHERE attendance_id = ? AND club_id = ?");
    $scope->execute([$attendanceId, $actor['club_id']]);
    if (!$scope->fetchColumn()) api_error(404, 'Attendance record was not found in this club.', 'ATTENDANCE_NOT_FOUND');

    $stmt = $pdo->prepare("
        SELECT h.history_id, h.old_status, h.new_status, h.change_reason, h.changed_at,
               u.user_fname, u.user_lname, u.school_id
        FROM attendance_status_history h
        LEFT JOIN users u ON u.user_id = h.changed_by
        WHERE h.record_id = ?
        ORDER BY h.changed_at ASC, h.history_id ASC
    ");
    $stmt->execute([$attendanceId]);

    echo json_encode(['history' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
} catch (PDOException $e) {
    http_response_code(500);
    error_log('IMSCCA request failure: ' . $e->getMessage());
    api_error(500, 'The request could not be completed.', 'SERVER_ERROR');
}
