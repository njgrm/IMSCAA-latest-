<?php
require_once __DIR__ . '/bootstrap.php';
require_method('POST');
$actor = require_roles('adviser');
$input = json_decode((string)file_get_contents('php://input'), true) ?: [];
$paymentId = (int)($input['payment_id'] ?? 0);
$reason = trim((string)($input['reason'] ?? ''));
if ($paymentId <= 0 || $reason === '' || strlen($reason) > 500) api_error(400, 'Payment and a void reason are required.', 'INVALID_PAYMENT_VOID');
try {
    $pdo=db(); $pdo->beginTransaction();
    $stmt=$pdo->prepare('SELECT p.transaction_id,t.user_id,p.is_voided FROM transaction_payments p JOIN transactions t ON t.transaction_id=p.transaction_id JOIN requirements r ON r.requirement_id=t.requirement_id WHERE p.payment_id=? AND r.club_id=? FOR UPDATE');
    $stmt->execute([$paymentId,$actor['club_id']]); $payment=$stmt->fetch(PDO::FETCH_ASSOC);
    if(!$payment){$pdo->rollBack();api_error(404,'Payment was not found in this club.','PAYMENT_NOT_FOUND');}
    if((int)$payment['is_voided']===1){$pdo->rollBack();api_error(409,'Payment is already voided.','PAYMENT_ALREADY_VOIDED');}
    $pdo->prepare('UPDATE transaction_payments SET is_voided=1,voided_at=NOW(6),voided_by=?,void_reason=? WHERE payment_id=?')->execute([$actor['user_id'],$reason,$paymentId]);
    $totals=refresh_transaction_totals($pdo,(int)$payment['transaction_id']);
    audit_event($pdo,$actor,'payment_voided','transaction_payment',$paymentId,(int)$payment['user_id'],['transaction_id'=>(int)$payment['transaction_id'],'reason'=>$reason]);
    $pdo->commit(); echo json_encode(['success'=>true]+$totals);
}catch(Throwable $e){if(isset($pdo)&&$pdo->inTransaction())$pdo->rollBack();error_log('IMSCCA payment void failure: '.$e->getMessage());api_error(500,'The payment could not be voided.','SERVER_ERROR');}
