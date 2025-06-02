<?php
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=utf-8");

session_start();
ini_set('display_errors', 0);
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);

// Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit;
}

// Must be POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['error' => 'Only POST allowed']);
  exit;
}

// Must be logged in
if (empty($_SESSION['user_id']) || empty($_SESSION['role']) || empty($_SESSION['club_id'])) {
  http_response_code(401);
  echo json_encode(['error' => 'Not authenticated']);
  exit;
}

$user_id = (int)$_SESSION['user_id'];
$user_role = strtolower($_SESSION['role']);
$club_id = (int)$_SESSION['club_id'];

// Parse JSON body
$body = json_decode(file_get_contents('php://input'), true);
if (
  !is_array($body) ||
  !isset($body['role'], $body['allowed'], $body['expiry'])
) {
  http_response_code(400);
  echo json_encode(['error' => 'Invalid payload']);
  exit;
}

$invite_role = strtolower($body['role']);
$allowed = max(1, (int)$body['allowed']);
$expiry_hours = max(0.001, floatval($body['expiry']));


$expiry_seconds = (int)round($expiry_hours * 3600);
$expiry_dt = (new DateTime())->add(new DateInterval('PT' . $expiry_seconds . 'S'))->format('Y-m-d H:i:s');

// Permission check
if ($user_role === 'adviser') {
  if (!in_array($invite_role, ['adviser', 'president', 'officer', 'member'])) {
    http_response_code(403);
    echo json_encode(['error' => 'Invalid role for invite']);
    exit;
  }
} else if ($user_role === 'president') {
  if (!in_array($invite_role, ['officer', 'member'])) {
    http_response_code(403);
    echo json_encode(['error' => 'Invalid role for invite']);
    exit;
  }
} else if ($user_role === 'officer') {
  if ($invite_role !== 'member') {
    http_response_code(403);
    echo json_encode(['error' => 'Officers can only generate member invites']);
    exit;
  }
} else {
  http_response_code(403);
  echo json_encode(['error' => 'Only adviser, president, or officer can generate invites']);
  exit;
}

// Generate token
$token = bin2hex(random_bytes(24));

try {
  $pdo = new PDO(
    "mysql:host=127.0.0.1;dbname=db_imscca;charset=utf8mb4",
    "root",
    "",
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
  );

  $stmt = $pdo->prepare("
    INSERT INTO invite_links
      (token, role, allowed_signups, used_count, expiry, club_id, created_by)
    VALUES
      (?, ?, ?, 0, ?, ?, ?)
  ");

  $stmt->execute([
    $token,
    $invite_role,
    $allowed,
    $expiry_dt,
    $club_id,
    $user_id
  ]);

  $link = "http://localhost:5173/register?invite=$token";
  echo json_encode(['link' => $link]);
}  
  
catch (PDOException $e) {
  http_response_code(500);
  echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}
