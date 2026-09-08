<?php
require_once __DIR__ . '/bootstrap.php'; require_method('GET'); $actor=require_operator();
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

// ensure user is logged in and has a club
if (empty($_SESSION['user_id']) || empty($_SESSION['club_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated']);
    exit;
}

$clubId = (int) $_SESSION['club_id'];

try {
    $pdo = db();

    $stmt = $pdo->prepare("
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
          AND requirement_type = 'fee'
        ORDER BY start_datetime DESC
    ");
    $stmt->bindParam(':clubId', $clubId, PDO::PARAM_INT);
    $stmt->execute();

    $fees = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // normalize datetime formats for frontend
    foreach ($fees as &$fee) {
        $fee['start_datetime'] = date('Y-m-d H:i:s', strtotime($fee['start_datetime']));
        $fee['end_datetime']   = date('Y-m-d H:i:s', strtotime($fee['end_datetime']));
    }

    http_response_code(200);
    echo json_encode($fees ?: []);

} catch (PDOException $e) {
    http_response_code(500);
    error_log('IMSCCA request failure: ' . $e->getMessage());
    api_error(500, 'The request could not be completed.', 'SERVER_ERROR');
}
