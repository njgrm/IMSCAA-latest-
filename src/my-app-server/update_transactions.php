<?php
// update_transactions.php
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
$feeDesc    = isset($input['fee_description'])   ? trim($input['fee_description']) : '';
$amountPaid = isset($input['amount_paid'])       ? (float)$input['amount_paid']    : 0;
$status     = isset($input['payment_status']) &&
              in_array($input['payment_status'], ['unpaid','partial','paid'])
              ? $input['payment_status']
              : 'unpaid';
$method     = isset($input['payment_method'])   ? trim($input['payment_method'])   : '';

$verifiedBy = (int)($_SESSION['user_id'] ?? 0);

try {
    $pdo = new PDO(
        "mysql:host=127.0.0.1;dbname=db_imscca;charset=utf8mb4",
        "root",
        "",
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    $pdo->beginTransaction();

    $fetchSql = "
        SELECT
            user_id,
            requirement_id,
            amount_due,
            due_date
        FROM transactions
        WHERE transaction_id = ?
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
        $fetchStmt->execute([$txId]);
        $originalTx = $fetchStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$originalTx) {
            continue; // Skip if original transaction not found
        }

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

    echo json_encode([
        'transactions' => $txns,
        'created_ids' => $insertedIds
    ]);

} catch (Exception $e) {
    if ($pdo && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['error' => 'Server error: '.$e->getMessage()]);
} 