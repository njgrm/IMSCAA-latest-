<?php
require_once __DIR__ . '/bootstrap.php';
require_method('POST');
$actor=require_roles('adviser');
$input=json_decode((string)file_get_contents('php://input'),true)?:[];
$transactionId=(int)($input['transaction_id']??0);$reason=trim((string)($input['reason']??''));
if($transactionId<=0||$reason===''||strlen($reason)>500)api_error(400,'Transaction and a void reason are required.','INVALID_TRANSACTION_VOID');
try{$pdo=db();$pdo->beginTransaction();$stmt=$pdo->prepare('SELECT t.user_id,t.is_voided FROM transactions t JOIN requirements r ON r.requirement_id=t.requirement_id WHERE t.transaction_id=? AND r.club_id=? FOR UPDATE');$stmt->execute([$transactionId,$actor['club_id']]);$tx=$stmt->fetch(PDO::FETCH_ASSOC);if(!$tx){$pdo->rollBack();api_error(404,'Transaction was not found in this club.','TRANSACTION_NOT_FOUND');}if((int)$tx['is_voided']===1){$pdo->rollBack();api_error(409,'Transaction is already voided.','TRANSACTION_ALREADY_VOIDED');}$pdo->prepare('UPDATE transactions SET is_voided=1,voided_at=NOW(6),voided_by=?,void_reason=? WHERE transaction_id=?')->execute([$actor['user_id'],$reason,$transactionId]);audit_event($pdo,$actor,'transaction_voided','transaction',$transactionId,(int)$tx['user_id'],['reason'=>$reason]);$pdo->commit();echo json_encode(['success'=>true]);}catch(Throwable $e){if(isset($pdo)&&$pdo->inTransaction())$pdo->rollBack();error_log('IMSCCA transaction void failure: '.$e->getMessage());api_error(500,'The transaction could not be voided.','SERVER_ERROR');}
