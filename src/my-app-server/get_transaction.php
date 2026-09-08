<?php
require_once __DIR__ . '/bootstrap.php';
require_method('GET');
$actor = current_actor();
// get_transaction.php
ini_set('display_errors', 0);
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);

// 1) Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
require_once __DIR__ . '/cors.php';
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Allow-Methods: GET, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header("Access-Control-Max-Age: 86400");
    http_response_code(204);
    exit;
}

// 2) Standard headers
require_once __DIR__ . '/cors.php';
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

if (session_status() !== PHP_SESSION_ACTIVE) session_start();

// 3) Auth check
if (empty($_SESSION['user_id']) || empty($_SESSION['club_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated']);
    exit;
}
$clubId = (int) $_SESSION['club_id'];

// 4) Get filters
$userId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : null;
$userId = $actor['role'] === 'member' ? $actor['user_id'] : $userId;
$type = isset($_GET['type']) ? $_GET['type'] : null;

try {
    $pdo = db();

    $sql = "
        SELECT
            t.transaction_id,
            t.user_id,
            t.requirement_id,
            CAST(t.amount_due   AS DECIMAL(10,2)) AS amount_due,
            CAST(t.amount_paid  AS DECIMAL(10,2)) AS amount_paid,
            t.payment_status,
            t.payment_method,
            t.fee_description AS description,
            DATE_FORMAT(t.due_date,    '%Y-%m-%d %H:%i:%s') AS due_date,
            t.verified_by,
            DATE_FORMAT(t.date_added,  '%Y-%m-%d %H:%i:%s') AS date,
            r.requirement_type AS type
        FROM transactions t
        JOIN requirements r 
          ON t.requirement_id = r.requirement_id
         AND r.club_id = :clubId
        WHERE 1=1
    ";
    $params = [':clubId' => $clubId];

    if ($userId) {
        $sql .= " AND t.user_id = :userId";
        $params[':userId'] = $userId;
    }
    if ($type) {
        $sql .= " AND r.requirement_type = :type";
        $params[':type'] = $type;
    }

    $sql .= " ORDER BY t.date_added DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $txs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    http_response_code(200);
    echo json_encode($txs ?: []);

} catch (PDOException $e) {
    http_response_code(500);
    error_log('IMSCCA request failure: ' . $e->getMessage());
    api_error(500, 'The request could not be completed.', 'SERVER_ERROR');
}
