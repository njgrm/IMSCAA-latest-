<?php
ini_set('display_errors', 0);
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, OPTIONS");
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
function get_pdo() {
    return new PDO(
        "mysql:host=127.0.0.1;dbname=db_imscca;charset=utf8mb4",
        "root",
        "",
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
}

$user_id = $_SESSION['user_id'] ?? null;
if (!$user_id) {
    http_response_code(401);
    echo json_encode(['error' => 'Not logged in']);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
$request_id = $data['request_id'] ?? null;

if (!$request_id) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing request_id']);
    exit;
}

try {
    $pdo = get_pdo();
    // Only allow cancel if user is the requester and status is pending
    $stmt = $pdo->prepare("DELETE FROM deletion_requests WHERE request_id=? AND requested_by=? AND status='pending'");
    $stmt->execute([$request_id, $user_id]);
    if ($stmt->rowCount() > 0) {
        echo json_encode(['success' => true]);
    } else {
        http_response_code(403);
        echo json_encode(['error' => 'Cannot cancel this request']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
} 