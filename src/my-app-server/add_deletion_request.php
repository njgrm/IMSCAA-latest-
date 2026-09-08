<?php
require_once __DIR__ . '/bootstrap.php'; require_method('POST'); $actor=require_operator();
require_once __DIR__ . '/cors.php';
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Only POST allowed']);
    exit;
}

if (session_status() !== PHP_SESSION_ACTIVE) session_start();
if (empty($_SESSION['user_id']) || empty($_SESSION['club_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$type = $input['type'] ?? '';
$target_id = (int)($input['target_id'] ?? 0);
$reason = trim($input['reason'] ?? '');

$valid_types = ['user', 'requirement', 'club', 'transaction'];
if (!in_array($type, $valid_types) || !$target_id) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid type or target_id']);
    exit;
}
if ($reason === '') api_error(400, 'A reason is required.', 'REASON_REQUIRED');

try {
    $pdo = db();
    $checks = [
        'user' => 'SELECT user_id FROM users WHERE user_id = ? AND club_id = ?',
        'requirement' => 'SELECT requirement_id FROM requirements WHERE requirement_id = ? AND club_id = ?',
        'transaction' => 'SELECT t.transaction_id FROM transactions t JOIN requirements r ON r.requirement_id=t.requirement_id WHERE t.transaction_id = ? AND r.club_id = ?',
        'club' => 'SELECT club_id FROM club WHERE club_id = ? AND club_id = ?',
    ];
    $target = $pdo->prepare($checks[$type]);
    $target->execute([$target_id, $actor['club_id']]);
    if (!$target->fetchColumn()) api_error(404, 'Target not found in this club.', 'TARGET_NOT_FOUND');
    $stmt = $pdo->prepare("INSERT INTO approval_requests (type, target_id, club_id, requested_by, reason) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$type, $target_id, $_SESSION['club_id'], $_SESSION['user_id'], $reason]);
    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    http_response_code(500);
    error_log('IMSCCA request failure: ' . $e->getMessage());
    api_error(500, 'The request could not be completed.', 'SERVER_ERROR');
}
