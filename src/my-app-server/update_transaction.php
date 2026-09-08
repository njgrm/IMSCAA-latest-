<?php
require_once __DIR__ . '/bootstrap.php'; require_method('POST'); $actor=require_operator();
// update_transaction.php
ini_set('display_errors', 0);
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);
require_once __DIR__ . '/cors.php';
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if (session_status() !== PHP_SESSION_ACTIVE) session_start();
if (empty($_SESSION['club_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated']);
    exit;
}

// parse body
$input = json_decode(file_get_contents('php://input'), true);
if (!$input || (!isset($input['transaction_id']) && !isset($input['transaction_ids']))) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON or missing transaction_id(s)']);
    exit;
}

// collect IDs
if (!empty($input['transaction_ids']) && is_array($input['transaction_ids'])) {
    $rawIds = $input['transaction_ids'];
} else {
    $rawIds = [$input['transaction_id']];
}
$ids = array_values(array_unique(array_filter(array_map('intval', $rawIds), static fn(int $id): bool => $id > 0)));
if (!$ids || count($ids) !== count(array_unique(array_map('intval', $rawIds)))) {
    api_error(400, 'Every transaction ID must be valid.', 'INVALID_TRANSACTION_SELECTION');
}

// fields
$feeDesc    = isset($input['fee_description'])   ? trim($input['fee_description']) : null;
$amountPaid = isset($input['amount_paid'])       ? (float)$input['amount_paid']    : null;
$status     = isset($input['payment_status']) &&
              in_array($input['payment_status'], ['unpaid','partial','paid'], true)
              ? $input['payment_status']
              : null;
$method     = isset($input['payment_method'])   ? trim($input['payment_method'])   : null;

if ($feeDesc===null && $amountPaid===null && $status===null && $method===null) {
    http_response_code(400);
    echo json_encode(['error' => 'No fields to update']);
    exit;
}

$verifiedBy = (int)($_SESSION['user_id'] ?? 0);

try {
    $pdo = db();
    $pdo->beginTransaction();

    // build SET
    $set = [];
    $params = [];
    if ($feeDesc !== null) {
        $set[] = "t.fee_description = :feeDesc";
        $params[':feeDesc'] = $feeDesc;
    }
    if ($amountPaid !== null) {
        $set[] = "t.amount_paid = :amountPaid";
        $params[':amountPaid'] = $amountPaid;
    }
    if ($status !== null) {
        $set[] = "t.payment_status = :status";
        $params[':status'] = $status;
    }
    if ($method !== null) {
        $set[] = "t.payment_method = :method";
        $params[':method'] = $method;
    }
    // always update verifier
    $set[] = "t.verified_by = :verifiedBy";
    $params[':verifiedBy'] = $verifiedBy;

    $setSql = implode(", ", $set);

    $checkIds = implode(',', array_fill(0, count($ids), '?'));
    $check = $pdo->prepare("SELECT t.transaction_id,t.amount_due,t.amount_paid,t.payment_status FROM transactions t JOIN requirements r ON r.requirement_id=t.requirement_id WHERE r.club_id=? AND t.transaction_id IN ($checkIds)");
    $check->execute(array_merge([(int)$actor['club_id']], $ids));
    $owned = $check->fetchAll(PDO::FETCH_ASSOC);
    if (count($owned) !== count(array_unique($ids))) api_error(404, 'One or more transactions were not found in this club.', 'TRANSACTION_NOT_FOUND');
    foreach ($owned as $transaction) {
        validate_payment_state($amountPaid ?? (float)$transaction['amount_paid'], $status ?? (string)$transaction['payment_status'], (float)$transaction['amount_due']);
    }

    $updateSql = "
        UPDATE transactions t
        JOIN requirements r ON r.requirement_id = t.requirement_id
           SET {$setSql}
         WHERE t.transaction_id = :txid AND r.club_id = :clubId
    ";
    $stmt = $pdo->prepare($updateSql);

    // run for each
    foreach ($ids as $txid) {
        $stmt->execute(array_merge($params, [':txid' => $txid, ':clubId' => $actor['club_id']]));
    }

    $pdo->commit();

    $fetch = $pdo->prepare("
        SELECT
          t.transaction_id,
          t.user_id,
          t.requirement_id,
          t.amount_due,
          t.amount_paid,
          t.payment_status,
          t.payment_method,
          t.due_date,
          t.verified_by,
          t.date_added,
          t.fee_description
        FROM transactions t
        JOIN requirements r ON r.requirement_id = t.requirement_id
        WHERE r.club_id = :clubId
        ORDER BY t.date_added DESC
    ");
    $fetch->execute([':clubId' => $actor['club_id']]);
    $txns = $fetch->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['transactions' => $txns]);

} catch (Exception $e) {
    if ($pdo && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    error_log('IMSCCA request failure: ' . $e->getMessage());
    api_error(500, 'The request could not be completed.', 'SERVER_ERROR');
}
