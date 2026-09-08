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

if (strtotime($end_datetime) <= strtotime($start_datetime)) {
    api_error(400, 'End date must be after start date.', 'INVALID_DATE_RANGE');
}
if ($requirement_type === 'fee' && $amount_due <= 0) {
    api_error(400, 'Amount due must be positive for fee requirements.', 'INVALID_AMOUNT_DUE');
}

try {
    $pdo = db();

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
    http_response_code(500);
    error_log('IMSCCA request failure: ' . $e->getMessage());
    api_error(500, 'The request could not be completed.', 'SERVER_ERROR');
}
