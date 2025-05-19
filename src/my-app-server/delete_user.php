<?php
// delete_user.php
session_start();
ini_set('display_errors', 0);
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit;
}

// Get club_id from session
$club_id = $_SESSION['club_id'] ?? 0;

// Get user_id from query params
parse_str($_SERVER['QUERY_STRING'], $qs);
$user_id = (int)($qs['user_id'] ?? 0);

if (!$user_id || !$club_id) {
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

$delTx = $pdo->prepare("
DELETE t
  FROM transactions t
  JOIN requirements r ON t.requirement_id = r.requirement_id
 WHERE t.user_id = :uid
   AND r.club_id = :club
");
$delTx->execute([
':uid'  => $user_id,
':club' => $club_id
]);

// 2) Now delete the user
$stmt = $pdo->prepare("DELETE FROM users WHERE user_id = ? AND club_id = ?");
$stmt->execute([$user_id, $club_id]);

  // Delete operation remains the same
  $stmt = $pdo->prepare("DELETE FROM `users` WHERE user_id = ? AND club_id = ?");
  $stmt->execute([$user_id, $club_id]);

  // Updated select with explicit fields
  $stmt2 = $pdo->prepare("
    SELECT 
        user_id, school_id, user_fname, user_mname, user_lname,
        email, role, user_course, user_year, user_section, avatar
    FROM `users` 
    WHERE club_id = ?
  ");
  $stmt2->execute([$club_id]);
  $users = $stmt2->fetchAll(PDO::FETCH_ASSOC);

  echo json_encode(['users' => $users]);
}
catch (PDOException $e) {
  http_response_code(500);
  echo json_encode(['error' => $e->getMessage()]);
}