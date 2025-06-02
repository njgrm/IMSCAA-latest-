<?php
header("Access-Control-Allow-Origin: http://localhost:5173");
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

session_start();
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

try {
    $pdo = new PDO("mysql:host=127.0.0.1;dbname=db_imscca;charset=utf8mb4", "root", "", [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $stmt = $pdo->prepare("INSERT INTO deletion_requests (type, target_id, club_id, requested_by, reason) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$type, $target_id, $_SESSION['club_id'], $_SESSION['user_id'], $reason]);
    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
