<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
date_default_timezone_set(getenv('IMSCCA_TIMEZONE') ?: 'Asia/Manila');
$host=getenv('IMSCCA_DB_HOST')?:'127.0.0.1'; $name=getenv('IMSCCA_DB_NAME')?:'db_imscca';
$pdo=new PDO("mysql:host=$host;dbname=$name;charset=utf8mb4",getenv('IMSCCA_DB_USER')?:'root',getenv('IMSCCA_DB_PASSWORD')?:'',[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$now=(new DateTimeImmutable())->format('Y-m-d H:i:s'); $summary=['clubs'=>0,'events_updated'=>0,'events_processed'=>0,'absences_created'=>0,'errors'=>[]];
$clubs=$pdo->query('SELECT club_id FROM club ORDER BY club_id')->fetchAll(PDO::FETCH_COLUMN);
foreach($clubs as $clubId){$summary['clubs']++;try{$pdo->beginTransaction();
  $update=$pdo->prepare("UPDATE requirements SET status=CASE WHEN start_datetime>? THEN 'scheduled' WHEN end_datetime<? THEN 'completed' ELSE 'ongoing' END WHERE club_id=? AND requirement_type='event'");
  $update->execute([$now,$now,$clubId]);$summary['events_updated']+=$update->rowCount();
  $verifier=$pdo->prepare("SELECT user_id FROM users WHERE club_id=? AND role IN ('adviser','president','officer') ORDER BY FIELD(role,'adviser','president','officer') LIMIT 1");$verifier->execute([$clubId]);$verifierId=(int)$verifier->fetchColumn();
  $events=$pdo->prepare("SELECT requirement_id,end_datetime FROM requirements r WHERE club_id=? AND requirement_type='event' AND end_datetime<? FOR UPDATE");
  $events->execute([$clubId,$now]);
  foreach($events->fetchAll(PDO::FETCH_ASSOC) as $event){$eventId=(int)$event['requirement_id'];
    $users=$pdo->prepare("SELECT er.user_id FROM event_registrations er JOIN users u ON u.user_id=er.user_id AND u.club_id=? WHERE er.requirement_id=? AND er.status='registered' AND NOT EXISTS(SELECT 1 FROM attendance_records ar WHERE ar.requirement_id=er.requirement_id AND ar.user_id=er.user_id)");
    $users->execute([$clubId,$eventId]);$missing=$users->fetchAll(PDO::FETCH_COLUMN);$created=0;
    if($missing && !$verifierId) throw new RuntimeException('No club operator is available to verify automatic absences.');
    $insert=$pdo->prepare("INSERT INTO attendance_records(user_id,requirement_id,verified_by,club_id,scan_datetime,attendance_status,notes) VALUES(?,?,?,?,?,'absent','Automatically marked absent after event completion')");
    foreach($missing as $userId){$insert->execute([$userId,$eventId,$verifierId,$clubId,$event['end_datetime']]);$created++;}
    $processed=$pdo->prepare("INSERT INTO automatic_absence_processing(requirement_id,processed_at,absences_created) VALUES(?,NOW(),?) ON DUPLICATE KEY UPDATE processed_at=IF(VALUES(absences_created)>0,VALUES(processed_at),processed_at),absences_created=absences_created+VALUES(absences_created)");
    $processed->execute([$eventId,$created]);if($processed->rowCount()>0||$created>0)$summary['events_processed']++;$summary['absences_created']+=$created;
  }$pdo->commit();
}catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();error_log('IMSCCA lifecycle failure for club '.(int)$clubId.': '.$e->getMessage());$summary['errors'][]=['club_id'=>(int)$clubId,'error'=>'Processing failed.'];}}
echo json_encode($summary,JSON_UNESCAPED_SLASHES).PHP_EOL;exit($summary['errors']?1:0);
