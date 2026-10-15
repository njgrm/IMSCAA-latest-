<?php
require_once __DIR__ . '/bootstrap.php';
require_method('POST');
$actor = require_operator();
$input = json_decode((string)file_get_contents('php://input'), true) ?: [];
$transactionId = (int)($input['transaction_id'] ?? 0);
$amount = round((float)($input['amount'] ?? 0), 2);
$method = trim((string)($input['payment_method'] ?? ''));
$reference = trim((string)($input['reference'] ?? ''));
$note = trim((string)($input['note'] ?? ''));
$idempotencyKey = trim((string)($input['idempotency_key'] ?? ''));
if ($transactionId <= 0 || $amount <= 0 || $method === '' || !preg_match('/^[A-Za-z0-9_-]{16,64}$/', $idempotencyKey)) {
    api_error(400, 'Transaction, positive amount, payment method, and a valid idempotency key are required.', 'INVALID_PAYMENT');
}
if (strlen($method) > 50 || strlen($reference) > 100 || strlen($note) > 500) {
    api_error(400, 'Payment details exceed the allowed length.', 'INVALID_PAYMENT_DETAILS');
}
try {
    $pdo = db();
    $pdo->beginTransaction();
    $stmt = $pdo->prepare(
        'SELECT t.transaction_id,t.user_id,t.amount_due,t.is_voided
         FROM transactions t JOIN requirements r ON r.requirement_id=t.requirement_id
         JOIN users u ON u.user_id=t.user_id
         WHERE t.transaction_id=? AND r.club_id=? AND u.club_id=? FOR UPDATE'
    );
    $stmt->execute([$transactionId, $actor['club_id'], $actor['club_id']]);
    $transaction = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$transaction) { $pdo->rollBack(); api_error(404, 'Transaction was not found in this club.', 'TRANSACTION_NOT_FOUND'); }
    if ((int)$transaction['is_voided'] === 1) { $pdo->rollBack(); api_error(409, 'A voided obligation cannot receive payments.', 'TRANSACTION_VOIDED'); }

    $existing = $pdo->prepare('SELECT payment_id FROM transaction_payments WHERE transaction_id=? AND idempotency_key=?');
    $existing->execute([$transactionId, $idempotencyKey]);
    $existingId = $existing->fetchColumn();
    if ($existingId) {
        $totals = refresh_transaction_totals($pdo, $transactionId);
        $pdo->commit();
        echo json_encode(['success'=>true,'duplicate'=>true,'payment_id'=>(int)$existingId] + $totals);
        exit;
    }

    $paidStmt = $pdo->prepare('SELECT COALESCE(SUM(amount),0) FROM transaction_payments WHERE transaction_id=? AND is_voided=0');
    $paidStmt->execute([$transactionId]);
    $paid = (float)$paidStmt->fetchColumn();
    $balance = (float)$transaction['amount_due'] - $paid;
    if ($amount > $balance + 0.0001) { $pdo->rollBack(); api_error(409, 'Payment exceeds the remaining balance.', 'PAYMENT_EXCEEDS_BALANCE'); }

    $insert = $pdo->prepare('INSERT INTO transaction_payments (transaction_id,amount,payment_method,reference_number,note,recorded_by,idempotency_key) VALUES (?,?,?,?,?,?,?)');
    $insert->execute([$transactionId,$amount,$method,$reference ?: null,$note ?: null,$actor['user_id'],$idempotencyKey]);
    $paymentId = (int)$pdo->lastInsertId();
    $totals = refresh_transaction_totals($pdo, $transactionId);
    audit_event($pdo,$actor,'payment_recorded','transaction_payment',$paymentId,(int)$transaction['user_id'],[
        'transaction_id'=>$transactionId,'amount'=>$amount,'payment_method'=>$method,'reference'=>$reference ?: null
    ]);
    $pdo->commit();
    echo json_encode(['success'=>true,'duplicate'=>false,'payment_id'=>$paymentId] + $totals);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    error_log('IMSCCA payment recording failure: '.$e->getMessage());
    api_error(500, 'The payment could not be recorded.', 'SERVER_ERROR');
}
