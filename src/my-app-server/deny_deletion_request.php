<?php
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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Only POST allowed']);
    exit;
}

session_start();
if (empty($_SESSION['user_id']) || empty($_SESSION['club_id']) || strtolower($_SESSION['role']) !== 'adviser') {
    http_response_code(403);
    echo json_encode(['error' => 'Only adviser can deny']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$request_ids = $input['request_ids'] ?? null;
$request_id = isset($input['request_id']) ? (int)$input['request_id'] : 0;

if ($request_ids && is_array($request_ids)) {
    $results = [];
    foreach ($request_ids as $rid) {
        $rid = (int)$rid;
        if (!$rid) continue;
        try {
            $pdo = new PDO("mysql:host=127.0.0.1;dbname=db_imscca;charset=utf8mb4", "root", "", [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
            $stmt = $pdo->prepare("UPDATE deletion_requests SET status = 'denied', approved_by = ?, approved_at = NOW() WHERE request_id = ? AND status = 'pending'");
            $stmt->execute([$_SESSION['user_id'], $rid]);
            $results[] = ['request_id' => $rid, 'success' => true];
            // fetch info for notification
            $stmt2 = $pdo->prepare("SELECT * FROM deletion_requests WHERE request_id = ?");
            $stmt2->execute([$rid]);
            $req = $stmt2->fetch(PDO::FETCH_ASSOC);
            if ($req) {
                notify_deletion_status($req['club_id'], $rid, 'denied', $req['type'], $req['target_id'], $req['requested_by'], $_SESSION['user_id'], date('Y-m-d H:i:s'));
            }
        } catch (PDOException $e) {
            $results[] = ['request_id' => $rid, 'error' => $e->getMessage()];
        }
    }
    echo json_encode(['results' => $results]);
    exit;
}

if (!$request_id) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing request_id']);
    exit;
}

try {
    $pdo = new PDO("mysql:host=127.0.0.1;dbname=db_imscca;charset=utf8mb4", "root", "", [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $stmt = $pdo->prepare("UPDATE deletion_requests SET status = 'denied', approved_by = ?, approved_at = NOW() WHERE request_id = ? AND status = 'pending'");
    $stmt->execute([$_SESSION['user_id'], $request_id]);
    echo json_encode(['success' => true]);
    // fetch info for notification
    $stmt2 = $pdo->prepare("SELECT * FROM deletion_requests WHERE request_id = ?");
    $stmt2->execute([$request_id]);
    $req = $stmt2->fetch(PDO::FETCH_ASSOC);
    if ($req) {
        notify_deletion_status($req['club_id'], $request_id, 'denied', $req['type'], $req['target_id'], $req['requested_by'], $_SESSION['user_id'], date('Y-m-d H:i:s'));
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

// After updating the request to denied, notify via node server
function notify_deletion_status($clubId, $requestId, $status, $type, $targetId, $requestedBy, $approvedBy, $approvedAt) {
    $data = [
        'clubId' => $clubId,
        'requestId' => $requestId,
        'status' => $status,
        'type' => $type,
        'targetId' => $targetId,
        'requestedBy' => $requestedBy,
        'approvedBy' => $approvedBy,
        'approvedAt' => $approvedAt
    ];
    $ch = curl_init('http://localhost:3001/notify-deletion-request-status');
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_exec($ch);
    curl_close($ch);
} 