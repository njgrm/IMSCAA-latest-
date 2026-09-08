<?php
declare(strict_types=1);
require_once __DIR__ . '/bootstrap.php';
require_method('GET');
$actor = current_actor();
$page = max(1, (int)($_GET['page'] ?? 1));
$limit = min(100, max(10, (int)($_GET['limit'] ?? 25)));
$offset = ($page - 1) * $limit;
$where = ['a.club_id = :club'];
$params = [':club' => $actor['club_id']];
if ($actor['role'] === 'member') {
    $where[] = '(a.actor_user_id = :actor_self OR a.subject_user_id = :subject_self)';
    $params[':actor_self'] = $actor['user_id'];
    $params[':subject_self'] = $actor['user_id'];
}
foreach (['action', 'entity_type'] as $field) {
    if (!empty($_GET[$field])) {
        $where[] = "a.$field = :$field";
        $params[":$field"] = trim((string)$_GET[$field]);
    }
}
if (!empty($_GET['actor_id']) && $actor['role'] !== 'member') {
    $where[] = 'a.actor_user_id = :actor';
    $params[':actor'] = (int)$_GET['actor_id'];
}
if (!empty($_GET['from'])) { $where[] = 'a.created_at >= :from'; $params[':from'] = $_GET['from'] . ' 00:00:00'; }
if (!empty($_GET['to'])) { $where[] = 'a.created_at <= :to'; $params[':to'] = $_GET['to'] . ' 23:59:59'; }
$clause = implode(' AND ', $where);
$pdo = db();
$count = $pdo->prepare("SELECT COUNT(*) FROM audit_log a WHERE $clause");
$count->execute($params);
$sql = "SELECT a.audit_id,a.action,a.entity_type,a.entity_id,a.metadata,a.created_at,
               a.actor_user_id,a.subject_user_id,
               CONCAT_WS(' ',actor.user_fname,actor.user_lname) actor_name,
               CONCAT_WS(' ',subject.user_fname,subject.user_lname) subject_name
        FROM audit_log a LEFT JOIN users actor ON actor.user_id=a.actor_user_id
        LEFT JOIN users subject ON subject.user_id=a.subject_user_id
        WHERE $clause ORDER BY a.created_at DESC,a.audit_id DESC LIMIT $limit OFFSET $offset";
$stmt = $pdo->prepare($sql); $stmt->execute($params);
$items = $stmt->fetchAll();
foreach ($items as &$item) $item['metadata'] = $item['metadata'] ? json_decode($item['metadata'], true) : null;
echo json_encode(['success'=>true,'items'=>$items,'page'=>$page,'limit'=>$limit,'total'=>(int)$count->fetchColumn()]);
