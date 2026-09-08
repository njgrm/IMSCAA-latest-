<?php
require_once __DIR__ . '/bootstrap.php';
require_method('GET');
$actor = require_operator();
// get_user.php
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

// Authentication check
if (empty($_SESSION['user_id']) || empty($_SESSION['club_id'])) {
  http_response_code(401);
  echo json_encode(['error' => 'Not authenticated']);
  exit;
}

$clubId = (int) $_SESSION['club_id'];

try {
  $pdo = db();

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
      AND LOWER(role) <> 'adviser'
    ORDER BY user_lname, user_fname
  ");
  $stmt->execute([$clubId]);
  $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

  http_response_code(200);
  echo json_encode($users);
}
catch (PDOException $e) {
  http_response_code(500);
  error_log('IMSCCA request failure: ' . $e->getMessage());
  api_error(500, 'The request could not be completed.', 'SERVER_ERROR');
}
