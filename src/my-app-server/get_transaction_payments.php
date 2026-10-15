<?php
require_once __DIR__ . '/bootstrap.php';
require_method('GET');
$actor = current_actor();
$transactionId = (int)($_GET['transaction_id'] ?? 0);
if ($transactionId <= 0) api_error(400, 'Transaction ID is required.', 'INVALID_TRANSACTION');
$pdo = db();
$scope = $pdo->prepare('SELECT t.user_id FROM transactions t JOIN requirements r ON r.requirement_id=t.requirement_id WHERE t.transaction_id=? AND r.club_id=?');
$scope->execute([$transactionId,$actor['club_id']]);
$subjectId = $scope->fetchColumn();
if (!$subjectId || ($actor['role']==='member' && (int)$subjectId !== (int)$actor['user_id'])) api_error(404, 'Transaction was not found.', 'TRANSACTION_NOT_FOUND');
$stmt = $pdo->prepare(
    'SELECT p.payment_id,p.amount,p.payment_method,p.reference_number,p.note,p.payment_date,p.is_voided,p.voided_at,p.void_reason,
            CONCAT(COALESCE(u.user_fname,\'\'),\' \',COALESCE(u.user_lname,\'\')) AS recorded_by_name
     FROM transaction_payments p LEFT JOIN users u ON u.user_id=p.recorded_by
     WHERE p.transaction_id=? ORDER BY p.payment_date DESC,p.payment_id DESC'
);
$stmt->execute([$transactionId]);
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
