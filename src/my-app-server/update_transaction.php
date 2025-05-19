<?php
// update_transaction.php
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

session_start();
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
    $ids = array_map('intval', $input['transaction_ids']);
} else {
    $ids = [ (int)$input['transaction_id'] ];
}

// fields
$feeDesc    = isset($input['fee_description'])   ? trim($input['fee_description']) : null;
$amountPaid = isset($input['amount_paid'])       ? (float)$input['amount_paid']    : null;
$status     = isset($input['payment_status']) &&
              in_array($input['payment_status'], ['unpaid','partial','paid'])
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
    $pdo = new PDO(
        "mysql:host=127.0.0.1;dbname=db_imscca;charset=utf8mb4",
        "root",
        "",
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    $pdo->beginTransaction();

    // build SET
    $set = [];
    $params = [];
    if ($feeDesc !== null) {
        $set[] = "fee_description = :feeDesc";
        $params[':feeDesc'] = $feeDesc;
    }
    if ($amountPaid !== null) {
        $set[] = "amount_paid     = :amountPaid";
        $params[':amountPaid'] = $amountPaid;
    }
    if ($status !== null) {
        $set[] = "payment_status  = :status";
        $params[':status'] = $status;
    }
    if ($method !== null) {
        $set[] = "payment_method  = :method";
        $params[':method'] = $method;
    }
    // always update verifier
    $set[] = "verified_by     = :verifiedBy";
    $params[':verifiedBy'] = $verifiedBy;

    $setSql = implode(", ", $set);

    $updateSql = "
        UPDATE transactions
           SET {$setSql}
         WHERE transaction_id = :txid
    ";
    $stmt = $pdo->prepare($updateSql);

    // run for each
    foreach ($ids as $txid) {
        $stmt->execute(array_merge($params, [':txid' => $txid]));
    }

    $pdo->commit();

    $fetch = $pdo->prepare("
        SELECT
          transaction_id,
          user_id,
          requirement_id,
          amount_due,
          amount_paid,
          payment_status,
          payment_method,
          due_date,
          verified_by,
          date_added,
          fee_description
        FROM transactions
        ORDER BY date_added DESC
    ");
    $fetch->execute();
    $txns = $fetch->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['transactions' => $txns]);

} catch (Exception $e) {
    if ($pdo && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['error' => 'Server error: '.$e->getMessage()]);
}