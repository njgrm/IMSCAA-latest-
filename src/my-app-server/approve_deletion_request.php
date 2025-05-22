<?php
ini_set('display_errors', 0);
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Only POST allowed']);
    exit;
}

session_start();
if (empty($_SESSION['user_id']) || empty($_SESSION['club_id']) || strtolower($_SESSION['role']) !== 'adviser') {
    http_response_code(403);
    echo json_encode(['error' => 'Only adviser can approve']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$request_id = (int)($input['request_id'] ?? 0);

if (!$request_id) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing request_id']);
    exit;
}

try {
    $pdo = new PDO("mysql:host=127.0.0.1;dbname=db_imscca;charset=utf8mb4", "root", "", [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $pdo->beginTransaction();
    $stmt = $pdo->prepare("SELECT * FROM deletion_requests WHERE id = ? FOR UPDATE");
    $stmt->execute([$request_id]);
    $req = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$req || $req['status'] !== 'pending') {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode(['error' => 'Request not found or already processed']);
        exit;
    }
    $type = $req['type'];
    $target_id = (int)$req['target_id'];
    $club_id = (int)$req['club_id'];
    if ($type === 'user') {
        $del = $pdo->prepare("DELETE FROM users WHERE user_id = ? AND club_id = ?");
        $del->execute([$target_id, $club_id]);
    } else if ($type === 'requirement') {
        $del = $pdo->prepare("DELETE FROM requirements WHERE requirement_id = ? AND club_id = ?");
        $del->execute([$target_id, $club_id]);
    } else if ($type === 'club') {
        $del = $pdo->prepare("DELETE FROM club WHERE club_id = ?");
        $del->execute([$club_id]);
    } else if ($type === 'transaction') {
        $del = $pdo->prepare("DELETE FROM transactions WHERE transaction_id = ?");
        $del->execute([$target_id]);
    }
    $stmt = $pdo->prepare("UPDATE deletion_requests SET status = 'approved', approved_by = ?, approved_at = NOW() WHERE id = ?");
    $stmt->execute([$_SESSION['user_id'], $request_id]);
    $pdo->commit();
    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
} 