<?php
// get_current_user.php
ini_set('display_errors', 0);
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=utf-8");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit;
}

session_start();

// 1) Check authentication
if (empty($_SESSION['user_id'])) {
  http_response_code(401);
  echo json_encode(['error' => 'Not authenticated']);
  exit;
}

$userId = (int) $_SESSION['user_id'];
// Club ID might be null for admin users
$clubId = isset($_SESSION['club_id']) ? (int) $_SESSION['club_id'] : null;

try {
  // 2) Connect
  $pdo = new PDO(
    "mysql:host=127.0.0.1;dbname=db_imscca;charset=utf8mb4",
    "root",
    "",
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
  );

  // 3) Query just the one user
  // Modified to include avatar and handle null club_id
  if ($clubId !== null) {
    $stmt = $pdo->prepare("
      SELECT 
        user_id,
        school_id,
        user_fname,
        user_mname,
        user_lname,
        avatar,
        role,
        email
      FROM `users`
      WHERE user_id = ? AND club_id = ?
      LIMIT 1
    ");
    $stmt->execute([$userId, $clubId]);
  } else {
    $stmt = $pdo->prepare("
      SELECT 
        user_id,
        school_id,
        user_fname,
        user_mname,
        user_lname,
        avatar,
        role,
        email
      FROM `users`
      WHERE user_id = ?
      LIMIT 1
    ");
    $stmt->execute([$userId]);
  }

  $user = $stmt->fetch(PDO::FETCH_ASSOC);

  if (!$user) {
    http_response_code(404);
    echo json_encode(['error' => 'User not found']);
    exit;
  }

  // 4) Return JSON
  http_response_code(200);
  echo json_encode($user);
}
catch (PDOException $e) {
  http_response_code(500);
  echo json_encode(['error' => 'Database error: '.$e->getMessage()]);
} 