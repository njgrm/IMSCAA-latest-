<?php
require_once __DIR__ . '/bootstrap.php';
require_method('GET');
require_once __DIR__ . '/cors.php';
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  http_response_code(405);
  echo json_encode(['error' => 'Only GET allowed']);
  exit;
}

$token = $_GET['token'] ?? '';
if (!$token) {
  echo json_encode(['valid' => false, 'error' => 'No token']);
  exit;
}

try {
  $pdo = db();
  $stmt = $pdo->prepare("
    SELECT i.role, i.club_id, c.club_name, i.expiry, i.allowed_signups, i.used_count,
           i.target_school_id, i.target_email
    FROM invite_links i
    JOIN club c ON i.club_id = c.club_id
    WHERE i.token = ?
    LIMIT 1
  ");
  $stmt->execute([$token]);
  $invite = $stmt->fetch(PDO::FETCH_ASSOC);

  if (!$invite) {
    echo json_encode(['valid' => false, 'error' => 'Invalid token']);
    exit;
  }
  if (strtotime($invite['expiry']) < time()) {
    echo json_encode(['valid' => false, 'error' => 'Invite expired']);
    exit;
  }
  if ($invite['used_count'] >= $invite['allowed_signups']) {
    echo json_encode(['valid' => false, 'error' => 'Invite already used']);
    exit;
  }
  echo json_encode([
    'valid' => true,
    'role' => $invite['role'],
    'club_id' => $invite['club_id'],
    'club_name' => $invite['club_name'],
    'target_school_id' => $invite['target_school_id'],
    'target_email' => $invite['target_email']
  ]);
} catch (PDOException $e) {
  echo json_encode(['valid' => false, 'error' => 'Server error']);
}
