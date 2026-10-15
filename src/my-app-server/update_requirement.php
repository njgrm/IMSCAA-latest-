<?php
require_once __DIR__ . '/bootstrap.php';
require_method('POST');
$actor = require_operator();
// update_requirement.php
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

$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

// Validate session
if (empty($_SESSION['club_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated']);
    exit;
}

// Extract fields
$requirement_id = (int)($input['requirement_id'] ?? 0);
$title = trim($input['title'] ?? '');
$description = trim($input['description'] ?? '');
$start_datetime = trim($input['start_datetime'] ?? '');
$end_datetime = trim($input['end_datetime'] ?? '');
$location = trim($input['location'] ?? '');
$requirement_type = trim($input['requirement_type'] ?? 'event');
$status = trim($input['status'] ?? 'scheduled');
$amount_due = (float)($input['amount_due'] ?? 0.00);
$req_picture = $input['req_picture'] ?? '';
$club_id = (int)$_SESSION['club_id'];

// Validate required fields
if (!$requirement_id || !$title || !$description || !$start_datetime || !$end_datetime) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields']);
    exit;
}

// The form only offers date inputs, so a one-day requirement legitimately has
// the same start and end date. Only a strictly earlier end is rejected.
if (strtotime($end_datetime) < strtotime($start_datetime)) {
    api_error(400, 'End date cannot be before start date.', 'INVALID_DATE_RANGE');
}
if ($requirement_type === 'fee' && $amount_due <= 0) {
    api_error(400, 'Amount due must be positive for fee requirements.', 'INVALID_AMOUNT_DUE');
}

try {
    $pdo = db();

    // A requirement belonging to another club must never be touched. This also guards
    // the assignee reconciliation below, which is scoped by requirement_id alone.
    $owned = $pdo->prepare("SELECT requirement_id FROM requirements WHERE requirement_id = ? AND club_id = ?");
    $owned->execute([$requirement_id, $club_id]);
    if (!$owned->fetchColumn()) {
        api_error(404, 'Requirement was not found in this club.', 'REQUIREMENT_NOT_FOUND');
    }

    $pdo->beginTransaction();

    // Update requirement
    $stmt = $pdo->prepare("
        UPDATE requirements SET
            title = ?,
            description = ?,
            start_datetime = ?,
            end_datetime = ?,
            location = ?,
            requirement_type = ?,
            status = ?,
            amount_due = ?,
            req_picture = ?
        WHERE requirement_id = ? AND club_id = ?
    ");

    $stmt->execute([
        $title,
        $description,
        $start_datetime,
        $end_datetime,
        $location,
        $requirement_type,
        $status,
        $requirement_type === 'fee' ? $amount_due : 0.00,
        $req_picture,
        $requirement_id,
        $club_id
    ]);

    // Reconcile the assigned users (event/activity attendees, or a fee's payers).
    // Only touched when the caller sends a non-empty list: an empty selection is
    // how an unseeded edit form reaches this endpoint, and treating it as "remove
    // everyone" silently wiped every attendee/payer on save.
    if (array_key_exists('selected_users', $input) && $input['selected_users'] !== []) {
        $requested = array_values(array_unique(array_filter(
            array_map('intval', (array)$input['selected_users']),
            fn($id) => $id > 0
        )));

        $eligible = [];
        if (!empty($requested)) {
            $placeholders = implode(',', array_fill(0, count($requested), '?'));
            $userStmt = $pdo->prepare("
                SELECT user_id FROM users
                WHERE club_id = ? AND LOWER(role) <> 'adviser' AND user_id IN ($placeholders)
            ");
            $userStmt->execute(array_merge([$club_id], $requested));
            $eligible = array_map('intval', $userStmt->fetchAll(PDO::FETCH_COLUMN));
        }

        $existingStmt = $pdo->prepare("
            SELECT user_id FROM event_registrations
            WHERE requirement_id = ? AND status = 'registered'
        ");
        $existingStmt->execute([$requirement_id]);
        $existing = array_map('intval', $existingStmt->fetchAll(PDO::FETCH_COLUMN));

        $toRemove = array_values(array_diff($existing, $eligible));
        if (!empty($toRemove)) {
            $placeholders = implode(',', array_fill(0, count($toRemove), '?'));
            $pdo->prepare("DELETE FROM event_registrations WHERE requirement_id = ? AND user_id IN ($placeholders)")
                ->execute(array_merge([$requirement_id], $toRemove));
        }

        foreach (array_diff($eligible, $existing) as $userId) {
            $pdo->prepare("
                INSERT INTO event_registrations (user_id, requirement_id, registered_by, registered_at)
                VALUES (?, ?, ?, NOW())
            ")->execute([$userId, $requirement_id, $actor['user_id']]);
        }
    }

    $pdo->commit();

    // Return updated requirements
    $stmt = $pdo->prepare("
        SELECT 
            requirement_id, title, description, 
            start_datetime, end_datetime, location,
            requirement_type, status, amount_due, req_picture
        FROM requirements
        WHERE club_id = ?
        ORDER BY start_datetime DESC
    ");
    $stmt->execute([$club_id]);
    $requirements = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['requirements' => $requirements]);

} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    error_log('IMSCCA request failure: ' . $e->getMessage());
    api_error(500, 'The request could not be completed.', 'SERVER_ERROR');
}
