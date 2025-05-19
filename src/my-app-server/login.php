<?php
session_start();
ini_set('display_errors', 0);
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);

// 1) CORS
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=utf-8");

// 2) Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit;
}

// 3) Must be POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['error'=>'Only POST allowed']);
  exit;
}

// 4) Parse JSON body
$body = json_decode(file_get_contents('php://input'), true);
if (
  !is_array($body) ||
  !isset($body['school_id'], $body['password'])
) {
  http_response_code(400);
  echo json_encode(['error'=>'Invalid payload']);
  exit;
}

$school_id = $body['school_id'];
$password = $body['password'];

try {
  // 5) DB lookup
  $pdo = new PDO("mysql:host=127.0.0.1;dbname=db_imscca;charset=utf8mb4","root","",[
    PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION
  ]);
  $stmt = $pdo->prepare("
  SELECT user_id, password, role, club_id
    FROM `users`
   WHERE school_id = ?
   LIMIT 1
");
  $stmt->execute([$school_id]);
  $user = $stmt->fetch(PDO::FETCH_ASSOC);

  if ($user && password_verify($password, $user['password'])) {
    // 6) Regenerate session id & store
    session_regenerate_id(true);
    $_SESSION['user_id'] = $user['user_id'];
    $_SESSION['role']    = $user['role'];
    $_SESSION['club_id'] = $user['club_id'];

    echo json_encode([
      'user_id' => $user['user_id'],
      'role'    => $user['role'],
      'club_id' => $user['club_id'],
    ]);
  } else {
    http_response_code(401);
    echo json_encode(['error'=>'Wrong School ID or Password']);
  }
}
catch (PDOException $e) {
  http_response_code(500);
  echo json_encode(['error'=>'Server error']);
}