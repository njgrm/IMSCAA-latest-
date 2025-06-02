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
    echo json_encode(['error' => 'Only adviser can approve']);
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
            $pdo->beginTransaction();
            $stmt = $pdo->prepare("SELECT * FROM deletion_requests WHERE request_id = ? FOR UPDATE");
            $stmt->execute([$rid]);
            $req = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$req || $req['status'] !== 'pending') {
                $pdo->rollBack();
                $results[] = ['request_id' => $rid, 'error' => 'Request not found or already processed'];
                continue;
            }
            $type = $req['type'];
            $target_id = (int)$req['target_id'];
            $club_id = (int)$req['club_id'];
            if ($type === 'user') {
                // Cascade delete all transactions for this user in the club
                $delTx = $pdo->prepare("
                    DELETE t
                      FROM transactions t
                      JOIN requirements r ON t.requirement_id = r.requirement_id
                     WHERE t.user_id = ?
                       AND r.club_id = ?
                ");
                $delTx->execute([$target_id, $club_id]);
                // Now delete the user
                $del = $pdo->prepare("DELETE FROM users WHERE user_id = ? AND club_id = ?");
                $del->execute([$target_id, $club_id]);
            } else if ($type === 'requirement') {
                // Cascade delete all transactions for this requirement in the club
                $delTx = $pdo->prepare("
                    DELETE t
                      FROM transactions t
                      JOIN requirements r ON t.requirement_id = r.requirement_id
                     WHERE t.requirement_id = ?
                       AND r.club_id = ?
                ");
                $delTx->execute([$target_id, $club_id]);
                // Now delete the requirement
                $del = $pdo->prepare("DELETE FROM requirements WHERE requirement_id = ? AND club_id = ?");
                $del->execute([$target_id, $club_id]);
            } else if ($type === 'club') {
                $del = $pdo->prepare("DELETE FROM club WHERE club_id = ?");
                $del->execute([$club_id]);
            } else if ($type === 'transaction') {
                // Only delete if the transaction belongs to a requirement in this club
                $del = $pdo->prepare("
                    DELETE t
                      FROM transactions t
                      JOIN requirements r ON t.requirement_id = r.requirement_id
                     WHERE t.transaction_id = ?
                       AND r.club_id = ?
                ");
                $del->execute([$target_id, $club_id]);
            }
            $stmt = $pdo->prepare("UPDATE deletion_requests SET status = 'approved', approved_by = ?, approved_at = NOW() WHERE request_id = ?");
            $stmt->execute([$_SESSION['user_id'], $rid]);
            $pdo->commit();
            $results[] = ['request_id' => $rid, 'success' => true];
            notify_deletion_status($club_id, $rid, 'approved', $type, $target_id, $req['requested_by'], $_SESSION['user_id'], date('Y-m-d H:i:s'));
        } catch (PDOException $e) {
            if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
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
    $pdo->beginTransaction();
    $stmt = $pdo->prepare("SELECT * FROM deletion_requests WHERE request_id = ? FOR UPDATE");
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
        // Cascade delete all transactions for this user in the club
        $delTx = $pdo->prepare("
            DELETE t
              FROM transactions t
              JOIN requirements r ON t.requirement_id = r.requirement_id
             WHERE t.user_id = ?
               AND r.club_id = ?
        ");
        $delTx->execute([$target_id, $club_id]);
        // Now delete the user
        $del = $pdo->prepare("DELETE FROM users WHERE user_id = ? AND club_id = ?");
        $del->execute([$target_id, $club_id]);
    } else if ($type === 'requirement') {
        // Cascade delete all transactions for this requirement in the club
        $delTx = $pdo->prepare("
            DELETE t
              FROM transactions t
              JOIN requirements r ON t.requirement_id = r.requirement_id
             WHERE t.requirement_id = ?
               AND r.club_id = ?
        ");
        $delTx->execute([$target_id, $club_id]);
        // Now delete the requirement
        $del = $pdo->prepare("DELETE FROM requirements WHERE requirement_id = ? AND club_id = ?");
        $del->execute([$target_id, $club_id]);
    } else if ($type === 'club') {
        $del = $pdo->prepare("DELETE FROM club WHERE club_id = ?");
        $del->execute([$club_id]);
    } else if ($type === 'transaction') {
        // Only delete if the transaction belongs to a requirement in this club
        $del = $pdo->prepare("
            DELETE t
              FROM transactions t
              JOIN requirements r ON t.requirement_id = r.requirement_id
             WHERE t.transaction_id = ?
               AND r.club_id = ?
        ");
        $del->execute([$target_id, $club_id]);
    }
    $stmt = $pdo->prepare("UPDATE deletion_requests SET status = 'approved', approved_by = ?, approved_at = NOW() WHERE request_id = ?");
    $stmt->execute([$_SESSION['user_id'], $request_id]);
    $pdo->commit();
    echo json_encode(['success' => true]);
    notify_deletion_status($club_id, $request_id, 'approved', $type, $target_id, $req['requested_by'], $_SESSION['user_id'], date('Y-m-d H:i:s'));
} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

// After updating the request to approved, notify via node server
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