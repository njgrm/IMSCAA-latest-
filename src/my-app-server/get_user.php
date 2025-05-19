<?php
// get_user.php
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

// Authentication check
if (empty($_SESSION['user_id']) || empty($_SESSION['club_id'])) {
  http_response_code(401);
  echo json_encode(['error' => 'Not authenticated']);
  exit;
}

$clubId = (int) $_SESSION['club_id'];

try {
  $pdo = new PDO(
    "mysql:host=127.0.0.1;dbname=db_imscca;charset=utf8mb4",
    "root",
    "",
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
  );

  // Updated query with new fields
  $stmt = $pdo->prepare("
    SELECT 
      user_id,
      school_id,
      user_fname,
      user_mname,
      user_lname,
      email,
      role,
      user_course AS course,
      user_year AS year,
      user_section AS section,
      avatar,
      club_id
    FROM `users`
    WHERE club_id = ?
    ORDER BY user_lname, user_fname
  ");
  $stmt->execute([$clubId]);
  $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

  http_response_code(200);
  echo json_encode($users);
}
catch (PDOException $e) {
  http_response_code(500);
  echo json_encode(['error' => 'Database error: '.$e->getMessage()]);
}