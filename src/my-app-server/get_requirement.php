<?php
require_once __DIR__ . '/bootstrap.php'; require_method('GET'); $actor=current_actor();
ini_set('display_errors', 0);
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
require_once __DIR__ . '/cors.php';
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Allow-Methods: POST, GET, OPTIONS, PUT, DELETE");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header("Access-Control-Max-Age: 86400");
    http_response_code(204);
    exit;
}
require_once __DIR__ . '/cors.php';
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

if (session_status() !== PHP_SESSION_ACTIVE) session_start();

if (empty($_SESSION['user_id']) || empty($_SESSION['club_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated']);
    exit;
}

$clubId = (int) $_SESSION['club_id'];
$type = isset($_GET['type']) ? $_GET['type'] : null;

try {
    $pdo = db();

    // Materialize statuses first so every reader sees the current lifecycle state.
    refresh_requirement_statuses($pdo, $clubId);

    $sql = "
        SELECT 
            requirements.requirement_id,
            requirements.title,
            requirements.description,
            requirements.start_datetime,
            requirements.end_datetime,
            requirements.location,
            requirements.requirement_type,
            requirements.status,
            requirements.club_id,
            CAST(requirements.amount_due AS DECIMAL(10,2)) AS amount_due,
            requirements.date_added,
            requirements.req_picture,
            pending.request_id AS pending_request_id,
            pending.status AS approval_status,
            (SELECT GROUP_CONCAT(er.user_id ORDER BY er.user_id)
               FROM event_registrations er
              WHERE er.requirement_id = requirements.requirement_id
                AND er.status = 'registered') AS assigned_user_ids
        FROM `requirements`
        LEFT JOIN approval_requests pending
          ON pending.club_id=requirements.club_id AND pending.type='requirement'
         AND pending.target_id=requirements.requirement_id AND pending.status='pending'
        WHERE requirements.club_id = :clubId
    ";
    $params = [':clubId' => $clubId];

    if ($type) {
        $sql .= " AND requirements.requirement_type = :type";
        $params[':type'] = $type;
    }

    $sql .= " ORDER BY requirements.start_datetime ASC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $requirements = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Format datetime fields
    foreach ($requirements as &$req) {
        $req['assigned_user_ids'] = ($req['assigned_user_ids'] ?? '') === ''
            ? []
            : array_map('intval', explode(',', (string)$req['assigned_user_ids']));
        if (isset($req['start_datetime']) && $req['start_datetime']) {
            $req['start_datetime'] = date('Y-m-d H:i:s', strtotime($req['start_datetime']));
        }
        if (isset($req['end_datetime']) && $req['end_datetime']) {
            $req['end_datetime'] = date('Y-m-d H:i:s', strtotime($req['end_datetime']));
        }
        if (isset($req['date_added']) && $req['date_added']) {
            $req['date_added'] = date('Y-m-d H:i:s', strtotime($req['date_added']));
        }
    }

    http_response_code(200);
    echo json_encode($requirements ?: []);

} catch (PDOException $e) {
    http_response_code(500);
    error_log('IMSCCA request failure: ' . $e->getMessage());
    api_error(500, 'The request could not be completed.', 'SERVER_ERROR');
}
