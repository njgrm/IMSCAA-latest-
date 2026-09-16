<?php
require_once __DIR__ . '/bootstrap.php';
require_method('POST');
ini_set('display_errors', 0);
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);
require_once __DIR__ . '/cors.php';
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['error'=>'Only POST allowed']);
  exit;
}

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
  $pdo = db();

  // Brute-force throttling. Only failures are recorded, so a legitimate sign-in
  // never consumes the allowance. If the login_attempts table is unavailable the
  // limiter fails open (logged) rather than locking every operator out.
  $remoteIp = client_ip();
  // Both limits are scoped to a source address on purpose. An account-wide cap would
  // let anyone deliberately lock a real user out from anywhere, which is a worse
  // problem for this app than slow distributed guessing.
  $pairFailureLimit = 8;
  $ipFailureLimit = 40;
  $throttled = false;
  try {
    $pdo->prepare('DELETE FROM login_attempts WHERE attempted_at < (NOW() - INTERVAL 1 DAY)')->execute();

    $pairFailures = $pdo->prepare('SELECT COUNT(*) FROM login_attempts WHERE school_id = ? AND ip_address = ? AND attempted_at > (NOW() - INTERVAL 15 MINUTE)');
    $pairFailures->execute([$school_id, $remoteIp]);
    if ((int)$pairFailures->fetchColumn() >= $pairFailureLimit) $throttled = true;

    $ipFailures = $pdo->prepare('SELECT COUNT(*) FROM login_attempts WHERE ip_address = ? AND attempted_at > (NOW() - INTERVAL 15 MINUTE)');
    $ipFailures->execute([$remoteIp]);
    if ((int)$ipFailures->fetchColumn() >= $ipFailureLimit) $throttled = true;
  } catch (PDOException $e) {
    error_log('IMSCCA login throttle unavailable: ' . $e->getMessage());
  }

  if ($throttled) {
    header('Retry-After: 900');
    http_response_code(429);
    echo json_encode(['error' => 'Too many failed sign-in attempts. Please wait 15 minutes and try again.']);
    exit;
  }

  $stmt = $pdo->prepare("
  SELECT user_id, password, role, club_id
    FROM `users`
   WHERE school_id = ?
   LIMIT 1
");
  $stmt->execute([$school_id]);
  $user = $stmt->fetch(PDO::FETCH_ASSOC);

  if ($user && password_verify($password, $user['password'])) {
    session_regenerate_id(true);
    $_SESSION['user_id'] = $user['user_id'];
    $_SESSION['role']    = $user['role'];
    $_SESSION['club_id'] = $user['club_id'];

    audit_event($pdo, ['user_id'=>(int)$user['user_id'],'club_id'=>(int)$user['club_id'],'role'=>strtolower($user['role'])], 'login', 'session', null, (int)$user['user_id']);

    try {
      $pdo->prepare('DELETE FROM login_attempts WHERE school_id = ?')->execute([$school_id]);
    } catch (PDOException $e) {
      error_log('IMSCCA login throttle reset failed: ' . $e->getMessage());
    }

    echo json_encode([
      'user_id' => $user['user_id'],
      'role'    => $user['role'],
      'club_id' => $user['club_id'],
    ]);
  } else {
    try {
      $pdo->prepare('INSERT INTO login_attempts (ip_address, school_id) VALUES (?, ?)')->execute([$remoteIp, $school_id]);
    } catch (PDOException $e) {
      error_log('IMSCCA login attempt record failed: ' . $e->getMessage());
    }
    http_response_code(401);
    echo json_encode(['error'=>'Wrong School ID or Password']);
  }
}
catch (PDOException $e) {
  http_response_code(500);
  echo json_encode(['error'=>'Server error']);
}
