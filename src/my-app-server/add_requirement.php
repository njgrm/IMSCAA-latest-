<?php
require_once __DIR__ . '/bootstrap.php';
require_method('POST');
$actor = require_operator();
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

// Extract and validate fields
$title = trim($input['title'] ?? '');
$description = trim($input['description'] ?? '');
$start_datetime = trim($input['start_datetime'] ?? '');
$end_datetime = trim($input['end_datetime'] ?? '');
$location = trim($input['location'] ?? '');
$requirement_type = trim($input['requirement_type'] ?? 'event');
$status = trim($input['status'] ?? 'scheduled');
$club_id = $_SESSION['club_id'] ?? 0;
$amount_due = isset($input['amount_due']) ? (float)$input['amount_due'] : 0.00;
$req_picture = $input['req_picture'] ?? '';

// Validate required fields
$required = ['title', 'description', 'start_datetime', 'end_datetime', 'requirement_type', 'status'];
foreach ($required as $field) {
    if (empty($$field)) {
        http_response_code(400);
        echo json_encode(['error' => "Missing required field: $field"]);
        exit;
    }
}

// Validate enums
$valid_types = ['event', 'activity', 'fee'];
$valid_statuses = ['scheduled', 'ongoing', 'canceled', 'completed'];
if (!in_array($requirement_type, $valid_types)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid requirement type']);
    exit;
}

if (!in_array($status, $valid_statuses)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid status']);
    exit;
}

// Validate amount for fee type
if ($requirement_type === 'fee' && $amount_due <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Amount due must be positive for fee type']);
    exit;
}

if (strtotime($end_datetime) <= strtotime($start_datetime)) {
    api_error(400, 'End date must be after start date.', 'INVALID_DATE_RANGE');
}

try {
    $pdo = db();

    $stmt = $pdo->prepare("
        INSERT INTO `requirements` (
            title, description, start_datetime, end_datetime,
            location, requirement_type, status, club_id, amount_due, req_picture
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
    ");

    $stmt->execute([
        $title,
        $description,
        $start_datetime,
        $end_datetime,
        $location,
        $requirement_type,
        $status,
        $club_id,
        $requirement_type === 'fee' ? $amount_due : 0.00,
        $req_picture,
    ]);

    // Return updated list
    $stmt2 = $pdo->prepare("
        SELECT 
            requirement_id, title, description, 
            start_datetime, end_datetime, location,
            requirement_type, status, amount_due, req_picture
        FROM `requirements`
        WHERE club_id = ?
        ORDER BY start_datetime DESC
    ");
    $stmt2->execute([$club_id]);
    $requirements = $stmt2->fetchAll(PDO::FETCH_ASSOC);

    http_response_code(201);
    echo json_encode(['requirements' => $requirements]);
} catch (PDOException $e) {
    http_response_code(500);
    error_log('IMSCCA request failure: ' . $e->getMessage());
    api_error(500, 'The request could not be completed.', 'SERVER_ERROR');
}
