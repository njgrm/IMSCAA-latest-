<?php
// delete_requirement.php
session_start();
ini_set('display_errors', 0);
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Get club_id from session
$club_id = $_SESSION['club_id'] ?? 0;

// Get requirement_id from query params
parse_str($_SERVER['QUERY_STRING'], $qs);
$requirement_id = (int)($qs['requirement_id'] ?? 0);

// Check role
$role = strtolower($_SESSION['role'] ?? '');
if ($role !== 'adviser') {
  http_response_code(403);
  echo json_encode(['error' => 'Only adviser can delete directly. Please submit a deletion request.']);
  exit;
}

if (!$requirement_id || !$club_id) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing parameters']);
    exit;
}

try {
    $pdo = new PDO(
        "mysql:host=127.0.0.1;dbname=db_imscca;charset=utf8mb4",
        "root",
        "",
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    $pdo->beginTransaction();

    $delTx = $pdo->prepare("
  DELETE t
    FROM transactions t
    JOIN requirements r ON t.requirement_id = r.requirement_id
   WHERE t.requirement_id = :rid
     AND r.club_id = :club
");
$delTx->execute([
  ':rid'  => $requirement_id,
  ':club' => $club_id,
]);

// 2) Now delete the requirement
$delReq = $pdo->prepare("
  DELETE FROM requirements
   WHERE requirement_id = ? 
     AND club_id = ?
");
$delReq->execute([$requirement_id, $club_id]);

$pdo->commit();

    // Delete the requirement
    $stmt = $pdo->prepare("DELETE FROM `requirements` WHERE requirement_id = ? AND club_id = ?");
    $stmt->execute([$requirement_id, $club_id]);

    // Return updated requirements list
    $stmt2 = $pdo->prepare("
        SELECT 
            requirement_id, title, description, 
            start_datetime, end_datetime, location,
            requirement_type, status, amount_due, req_picture
        FROM `requirements`
        WHERE club_id = ?
        ORDER BY start_datetime DESC
    ");
    $stmt2->execute([$club_id]);
    $requirements = $stmt2->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['requirements' => $requirements]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}