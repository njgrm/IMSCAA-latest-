<?php
declare(strict_types=1);
require_once __DIR__ . '/bootstrap.php'; require_method('POST'); $actor=require_operator(); $body=json_body();
$school=trim((string)($body['school_id']??''));$email=strtolower(trim((string)($body['email']??'')));
if($school===''||!filter_var($email,FILTER_VALIDATE_EMAIL))api_error(400,'Valid School ID and email are required.','INVALID_MEMBER_IDENTITY');
$pdo=db();$check=$pdo->prepare('SELECT user_id FROM users WHERE (club_id=? AND school_id=?) OR email=? LIMIT 1');$check->execute([$actor['club_id'],$school,$email]);
if($check->fetch())api_error(409,'School ID exists in this club or email is already registered.','MEMBER_ALREADY_EXISTS');
$token=bin2hex(random_bytes(24));$expiry=(new DateTimeImmutable('+7 days'))->format('Y-m-d H:i:s');
$stmt=$pdo->prepare("INSERT INTO invite_links(token,role,allowed_signups,expiry,club_id,created_by,target_school_id,target_email) VALUES(?,'member',1,?,?,?,?,?)");
$stmt->execute([$token,$expiry,$actor['club_id'],$actor['user_id'],$school,$email]);$id=(int)$pdo->lastInsertId();audit_event($pdo,$actor,'member_invited','invite',$id,null,['school_id'=>$school,'email'=>$email]);
echo json_encode(['success'=>true,'invite_id'=>$id,'link'=>'/register?invite='.rawurlencode($token),'expiry'=>$expiry]);
