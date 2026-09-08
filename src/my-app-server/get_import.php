<?php
declare(strict_types=1);
require_once __DIR__ . '/bootstrap.php';
require_method('GET');
$actor=require_operator(); $id=(int)($_GET['batch_id']??0);
$stmt=db()->prepare('SELECT batch_id,filename,total_rows,valid_rows,invalid_rows,created_at FROM member_import_batches WHERE batch_id=? AND club_id=?');
$stmt->execute([$id,$actor['club_id']]); $batch=$stmt->fetch();
if(!$batch) api_error(404,'Import batch not found.','IMPORT_NOT_FOUND');
$rows=db()->prepare('SELECT row_id,line_number,school_id,email,status,error_message,created_at FROM member_import_rows WHERE batch_id=? ORDER BY line_number');
$rows->execute([$id]); echo json_encode(['success'=>true,'batch'=>$batch,'rows'=>$rows->fetchAll()]);
