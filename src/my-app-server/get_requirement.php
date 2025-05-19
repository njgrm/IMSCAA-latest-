<?php
ini_set('display_errors', 0);
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: http://localhost:5173");
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Allow-Methods: POST, GET, OPTIONS, PUT, DELETE");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header("Access-Control-Max-Age: 86400");
    http_response_code(204);
    exit;
}

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

session_start();

if (empty($_SESSION['user_id']) || empty($_SESSION['club_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated']);
    exit;
}

$clubId = (int) $_SESSION['club_id'];
$type = isset($_GET['type']) ? $_GET['type'] : null;

try {
    $pdo = new PDO(
        "mysql:host=127.0.0.1;dbname=db_imscca;charset=utf8mb4",
        "root",
        "",
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    $sql = "
        SELECT 
            requirement_id,
            title,
            description,
            start_datetime,
            end_datetime,
            location,
            requirement_type,
            status,
            club_id,
            CAST(amount_due AS DECIMAL(10,2)) AS amount_due,
            date_added,
            req_picture
        FROM `requirements`
        WHERE club_id = :clubId
    ";
    $params = [':clubId' => $clubId];

    if ($type) {
        $sql .= " AND requirement_type = :type";
        $params[':type'] = $type;
    }

    $sql .= " ORDER BY start_datetime ASC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $requirements = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Format datetime fields
    foreach ($requirements as &$req) {
        $req['due_date'] = date('Y-m-d H:i:s', strtotime($req['due_date']));
        $req['end_datetime'] = date('Y-m-d H:i:s', strtotime($req['end_datetime']));
    }

    http_response_code(200);
    echo json_encode($requirements ?: []);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: '.$e->getMessage()]);
}