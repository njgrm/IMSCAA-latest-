<?php
declare(strict_types=1);
require_once __DIR__ . '/bootstrap.php';
require_method('POST');
$actor = require_operator();
if (empty($_FILES['file']) || !is_uploaded_file($_FILES['file']['tmp_name'])) api_error(400, 'A CSV file is required.', 'CSV_REQUIRED');
$mode = $_POST['mode'] ?? 'preview';
if (!in_array($mode, ['preview','commit'], true)) api_error(400, 'Invalid import mode.', 'INVALID_MODE');
$raw = file_get_contents($_FILES['file']['tmp_name']);
if ($raw === false || strlen($raw) > 2 * 1024 * 1024) api_error(400, 'CSV must be 2 MB or smaller.', 'CSV_TOO_LARGE');
$raw = preg_replace('/^\xEF\xBB\xBF/', '', $raw);
$stream = fopen('php://temp', 'r+'); fwrite($stream, $raw); rewind($stream);
$expected = ['school_id','email','first_name','middle_name','last_name','course','year','section'];
$header = array_map(fn($v)=>strtolower(trim((string)$v)), fgetcsv($stream) ?: []);
if ($header !== $expected) api_error(400, 'CSV headers do not match the template.', 'INVALID_CSV_HEADERS');
$pdo = db(); $rows=[]; $seenSchool=[]; $seenEmail=[]; $line=1;
while (($values=fgetcsv($stream)) !== false) {
    $line++; if (count($values)===1 && trim((string)$values[0])==='') continue;
    $row=array_combine($expected,array_pad(array_slice($values,0,count($expected)),count($expected),''));
    $row=array_map(fn($v)=>trim((string)$v),$row); $errors=[];
    foreach (['school_id','email','first_name','last_name','course','year','section'] as $key) if ($row[$key]==='') $errors[]="$key is required";
    if ($row['email']!=='' && !filter_var($row['email'],FILTER_VALIDATE_EMAIL)) $errors[]='email is invalid';
    $schoolKey=strtolower($row['school_id']); $emailKey=strtolower($row['email']);
    if (isset($seenSchool[$schoolKey])) $errors[]='duplicate school_id in file'; else $seenSchool[$schoolKey]=true;
    if (isset($seenEmail[$emailKey])) $errors[]='duplicate email in file'; else $seenEmail[$emailKey]=true;
    if (!$errors) {
        $check=$pdo->prepare('SELECT user_id FROM users WHERE (club_id=? AND school_id=?) OR email=? LIMIT 1');
        $check->execute([$actor['club_id'],$row['school_id'],$row['email']]);
        if ($check->fetch()) $errors[]='school_id already exists in this club or email is already registered';
    }
    $rows[]=['line'=>$line,'data'=>$row,'valid'=>!$errors,'errors'=>$errors];
}
if (!$rows) api_error(400,'CSV contains no member rows.','CSV_EMPTY');
$hash=hash('sha256',$raw); $valid=count(array_filter($rows,fn($r)=>$r['valid']));
if ($mode==='preview') { echo json_encode(['success'=>true,'content_hash'=>$hash,'rows'=>$rows,'valid_rows'=>$valid,'invalid_rows'=>count($rows)-$valid]); exit; }
if (!hash_equals((string)($_POST['content_hash']??''),$hash)) api_error(409,'CSV changed after preview.','CSV_CHANGED');
$pdo->beginTransaction();
try {
    $existing=$pdo->prepare('SELECT batch_id FROM member_import_batches WHERE club_id=? AND content_hash=?');
    $existing->execute([$actor['club_id'],$hash]);
    if ($id=$existing->fetchColumn()) { $pdo->rollBack(); echo json_encode(['success'=>true,'batch_id'=>(int)$id,'idempotent'=>true]); exit; }
    $stmt=$pdo->prepare('INSERT INTO member_import_batches(club_id,created_by,filename,content_hash,total_rows,valid_rows,invalid_rows) VALUES(?,?,?,?,?,?,?)');
    $stmt->execute([$actor['club_id'],$actor['user_id'],basename($_FILES['file']['name']),$hash,count($rows),$valid,count($rows)-$valid]);
    $batchId=(int)$pdo->lastInsertId(); $result=[];
    foreach ($rows as $entry) {
        $row=$entry['data']; $status=$entry['valid']?'pending':'invalid'; $error=$entry['errors']?implode('; ',$entry['errors']):null;
        $insert=$pdo->prepare('INSERT INTO member_import_rows(batch_id,line_number,school_id,email,profile_data,status,error_message) VALUES(?,?,?,?,?,?,?)');
        $insert->execute([$batchId,$entry['line'],$row['school_id'],$row['email'],json_encode($row),$status,$error]); $rowId=(int)$pdo->lastInsertId(); $link=null;
        if ($entry['valid']) {
            $token=bin2hex(random_bytes(24)); $expiry=(new DateTimeImmutable('+7 days'))->format('Y-m-d H:i:s');
            $invite=$pdo->prepare("INSERT INTO invite_links(token,role,allowed_signups,expiry,club_id,created_by,target_school_id,target_email,import_row_id) VALUES(?,'member',1,?,?,?,?,?,?)");
            $invite->execute([$token,$expiry,$actor['club_id'],$actor['user_id'],$row['school_id'],$row['email'],$rowId]); $inviteId=(int)$pdo->lastInsertId();
            $pdo->prepare('UPDATE member_import_rows SET invite_id=? WHERE row_id=?')->execute([$inviteId,$rowId]); $link='/register?invite='.rawurlencode($token);
        }
        $result[]=['line'=>$entry['line'],'school_id'=>$row['school_id'],'email'=>$row['email'],'status'=>$status,'activation_link'=>$link,'error'=>$error];
    }
    audit_event($pdo,$actor,'member_imported','member_import_batch',$batchId,null,['filename'=>basename($_FILES['file']['name']),'valid_rows'=>$valid,'invalid_rows'=>count($rows)-$valid]);
    $pdo->commit(); echo json_encode(['success'=>true,'batch_id'=>$batchId,'rows'=>$result]);
} catch(Throwable $e) { if($pdo->inTransaction())$pdo->rollBack(); error_log('IMSCCA import failure: '.$e->getMessage()); api_error(500,'Import could not be completed.','IMPORT_FAILED'); }
