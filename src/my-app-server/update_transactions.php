<?php
require_once __DIR__ . '/bootstrap.php'; require_method('POST'); $actor=require_operator();
// update_transactions.php
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
$feeDesc    = isset($input['fee_description'])   ? trim($input['fee_description']) : '';
$amountPaid = isset($input['amount_paid'])       ? (float)$input['amount_paid']    : 0;
$status     = isset($input['payment_status']) &&
              in_array($input['payment_status'], ['unpaid','partial','paid'], true)
              ? $input['payment_status']
              : 'unpaid';
$method     = isset($input['payment_method'])   ? trim($input['payment_method'])   : '';

$verifiedBy = (int)($_SESSION['user_id'] ?? 0);

try {
    $pdo = db();
    $pdo->beginTransaction();

    $fetchSql = "
        SELECT
            t.user_id,
            t.requirement_id,
            t.amount_due,
            t.due_date
        FROM transactions t
        JOIN requirements r ON r.requirement_id = t.requirement_id
        JOIN users u ON u.user_id = t.user_id
        WHERE t.transaction_id = ? AND r.club_id = ? AND u.club_id = ?
    ";
    $fetchStmt = $pdo->prepare($fetchSql);


    $insertSql = "
        INSERT INTO transactions (
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
        ) VALUES (
            :userId,
            :requirementId,
            :amountDue,
            :amountPaid,
            :paymentStatus,
            :paymentMethod,
            :dueDate,
            :verifiedBy,
            NOW(),
            :feeDesc
        )
    ";
    $insertStmt = $pdo->prepare($insertSql);

    $insertedIds = [];

    // Process each transaction
    foreach ($ids as $txId) {
        // Get original transaction data
        $fetchStmt->execute([$txId, $actor['club_id'], $actor['club_id']]);
        $originalTx = $fetchStmt->fetch(PDO::FETCH_ASSOC);

        if (!$originalTx) {
            $pdo->rollBack();
            api_error(404, 'One or more transactions were not found in this club.', 'TRANSACTION_NOT_FOUND');
        }

        validate_payment_state($amountPaid, $status, (float)$originalTx['amount_due']);

        // Insert new transaction record
        $insertStmt->execute([
            ':userId' => $originalTx['user_id'],
            ':requirementId' => $originalTx['requirement_id'],
            ':amountDue' => $originalTx['amount_due'],
            ':amountPaid' => $amountPaid,
            ':paymentStatus' => $status,
            ':paymentMethod' => $method,
            ':dueDate' => $originalTx['due_date'],
            ':verifiedBy' => $verifiedBy,
            ':feeDesc' => $feeDesc
        ]);

        $insertedIds[] = $pdo->lastInsertId();
    }

    $pdo->commit();

    // Fetch all transactions to return to the client
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

    echo json_encode([
        'transactions' => $txns,
        'created_ids' => $insertedIds
    ]);

} catch (Exception $e) {
    if ($pdo && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    error_log('IMSCCA request failure: ' . $e->getMessage());
    api_error(500, 'The request could not be completed.', 'SERVER_ERROR');
}
