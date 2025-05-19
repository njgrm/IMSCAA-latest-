<?php
session_start();
ini_set('display_errors', 0);
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['error' => 'Only POST allowed']);
  exit;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

$invite_token = $data['invite_token'] ?? null;

$required = ['school_id', 'fname', 'lname', 'email', 'password', 'course', 'year', 'section'];
if (!$invite_token) {
  $required[] = 'club';
}
foreach ($required as $field) {
  if (!isset($data[$field]) || empty(trim($data[$field]))) {
    http_response_code(400);
    echo json_encode(['error' => "Missing required field: $field"]);
    exit;
  }
}

$school_id = trim($data['school_id']);
$fname = trim($data['fname']);
$mname = trim($data['mname'] ?? '');
$lname = trim($data['lname']);
$email = trim($data['email']);
$course = trim($data['course']);
$year = trim($data['year']);
$section = trim($data['section']);
$clubName = trim($data['club']);
$plainPw = $data['password'];

try {
  $pdo = new PDO(
    "mysql:host=127.0.0.1;dbname=db_imscca;charset=utf8mb4",
    "root",
    "",
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
  );

  $baseUsername = strtolower($fname . '.' . $lname);
  $username = $baseUsername . rand(10, 99);
  
  // Check username uniqueness
  $check = $pdo->prepare("SELECT COUNT(*) FROM users WHERE username = ?");
  while (true) {
    $check->execute([$username]);
    if ($check->fetchColumn() == 0) break;
    $username = $baseUsername . rand(10, 99);
  }

  $hashedPw = password_hash($plainPw, PASSWORD_BCRYPT);

  $pdo->beginTransaction();

  if ($invite_token) {
    // Validate invite
    $stmt = $pdo->prepare("SELECT * FROM invite_links WHERE token = ? FOR UPDATE");
    $stmt->execute([$invite_token]);
    $invite = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$invite) {
      $pdo->rollBack();
      http_response_code(400);
      echo json_encode(['error' => 'Invalid invite token']);
      exit;
    }
    if (strtotime($invite['expiry']) < time()) {
      $pdo->rollBack();
      http_response_code(400);
      echo json_encode(['error' => 'Invite expired']);
      exit;
    }
    if ($invite['used_count'] >= $invite['allowed_signups']) {
      $pdo->rollBack();
      http_response_code(400);
      echo json_encode(['error' => 'Invite already used']);
      exit;
    }
    $role = $invite['role'];
    $clubId = $invite['club_id'];
    // Insert user
    $stmtUser = $pdo->prepare("
      INSERT INTO users (
        username, password, email, role, club_id, school_id,
        user_fname, user_mname, user_lname,
        user_course, user_year, user_section
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?
      )
    ");
    $stmtUser->execute([
      $username,
      $hashedPw,
      $email,
      $role,
      $clubId,
      $school_id,
      $fname,
      $mname,
      $lname,
      $course,
      $year,
      $section
    ]);
    $userId = $pdo->lastInsertId();
    // Increment used_count
    $pdo->prepare("UPDATE invite_links SET used_count = used_count + 1 WHERE id = ?")
      ->execute([$invite['id']]);
    $pdo->commit();
    http_response_code(201);
    echo json_encode([
      'user_id' => $userId,
      'club_id' => $clubId,
      'username' => $username,
      'message' => 'Registration successful'
    ]);

    $data = [
      'role' => $role,
      'fullName' => $fname . ' ' . $lname,
      'clubId' => $clubId
    ];
    $ch = curl_init('http://localhost:3001/notify-registration');
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_exec($ch);
    curl_close($ch);

    exit;
  }

  $stmtClub = $pdo->prepare("
    INSERT INTO club 
      (club_name, description, president_id, category, date_added)
    VALUES 
      (?,       '',          NULL,         'academic', NOW())
  ");
  $stmtClub->execute([$clubName]);
  $clubId = $pdo->lastInsertId();

  // 3) create the user, pointing at that club
  $stmtUser = $pdo->prepare("
    INSERT INTO users (
      username, password, email, role, club_id, school_id,
      user_fname, user_mname, user_lname,
      user_course, user_year, user_section
    ) VALUES (
      ?, ?, ?, 'president', ?, ?,
      ?, ?, ?,
      ?, ?, ?
    )
  ");
  $stmtUser->execute([
    $username,
    $hashedPw,
    $email,
    $clubId,     
    $school_id,
    $fname,
    $mname,
    $lname,
    $course,
    $year,
    $section
  ]);
  $userId = $pdo->lastInsertId();


  $pdo->prepare("
    UPDATE club
       SET president_id = ?
     WHERE club_id = ?
  ")->execute([$userId, $clubId]);

  $pdo->commit();

  http_response_code(201);
  echo json_encode([
    'user_id' => $userId,
    'club_id' => $clubId,
    'username' => $username,
    'message' => 'Registration successful'
  ]);

  $data = [
    'role' => $role,
    'fullName' => $fname . ' ' . $lname,
    'clubId' => $clubId
  ];
  $ch = curl_init('http://localhost:3001/notify-registration');
  curl_setopt($ch, CURLOPT_POST, 1);
  curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
  curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_exec($ch);
  curl_close($ch);
} catch (PDOException $e) {
  if ($pdo->inTransaction()) $pdo->rollBack();
  http_response_code(500);
  echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}