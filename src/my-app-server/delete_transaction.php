<?php
require_once __DIR__ . '/bootstrap.php'; require_method('DELETE'); $actor=require_roles('adviser');
// delete_transaction.php
if (session_status() !== PHP_SESSION_ACTIVE) session_start();
ini_set('display_errors', 0);
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);
require_once __DIR__ . '/cors.php';
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json");

// OPTIONS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$user_id = $_SESSION['user_id'] ?? null;
$club_id = $_SESSION['club_id'] ?? null;
$role = strtolower($_SESSION['role'] ?? '');

if (!$user_id || !$club_id) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated']);
    exit;
}

if ($role !== 'adviser') {
    http_response_code(403);
    echo json_encode(['error' => 'Only adviser can delete directly. Please submit a deletion request.']);
    exit;
}

parse_str($_SERVER['QUERY_STRING'], $qs);
$transaction_id = (int)($qs['transaction_id'] ?? 0);
if (!$transaction_id) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing transaction_id']);
    exit;
}

try {
    $pdo = db();

    $del = $pdo->prepare("
        DELETE t
          FROM transactions t
          JOIN requirements r ON t.requirement_id = r.requirement_id
        WHERE t.transaction_id = :tx
          AND r.club_id = :club
    ");
    $del->execute([
        ':tx'   => $transaction_id,
        ':club' => $club_id
    ]);

    $fetch = $pdo->prepare("
        SELECT 
          t.transaction_id,
          t.user_id,
          t.requirement_id,
          CAST(t.amount_due   AS DECIMAL(10,2)) AS amount_due,
          CAST(t.amount_paid  AS DECIMAL(10,2)) AS amount_paid,
          t.payment_status,
          t.payment_method,
          t.fee_description,
          t.due_date,
          t.verified_by,
          t.date_added
        FROM transactions t
        JOIN requirements r ON t.requirement_id = r.requirement_id
        WHERE r.club_id = ?
        ORDER BY t.date_added DESC
    ");
    $fetch->execute([$club_id]);
    $txns = $fetch->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['transactions' => $txns]);

} catch (PDOException $e) {
    http_response_code(500);
    error_log('IMSCCA request failure: ' . $e->getMessage());
    api_error(500, 'The request could not be completed.', 'SERVER_ERROR');
}
