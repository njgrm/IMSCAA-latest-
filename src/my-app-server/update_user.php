<?php
require_once __DIR__ . '/bootstrap.php';
require_method('POST');
$actor = require_operator();
// update_user.php
ini_set('display_errors', 0);
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);

// CORS headers
require_once __DIR__ . '/cors.php';
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Handle POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Only POST allowed']);
    exit;
}

// Parse incoming JSON
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}


$user_id = (int)($input['user_id'] ?? 0);
$school_id = trim($input['school_id'] ?? '');
$fname = trim($input['fname'] ?? '');
$mname = trim($input['mname'] ?? '');
$lname = trim($input['lname'] ?? '');
$email   = trim($input['email'] ?? '');
$role = trim($input['role'] ?? '');
if (strtolower($role) !== 'member' && $actor['role'] !== 'adviser') api_error(403, 'Only advisers can assign privileged roles.', 'ROLE_CHANGE_FORBIDDEN');
$course  = trim($input['course'] ?? '');
$year    = trim($input['year'] ?? '');
$section = trim($input['section'] ?? '');
$avatar  = $input['avatar'] ?? '';

if (!$fname || !$lname || !$school_id || !$email || !$role) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields']);
    exit;
}

try {
    $pdo = db();

    $stmt = $pdo->prepare("SELECT club_id, role FROM `users` WHERE user_id = ? AND club_id = ?");
    $stmt->execute([$user_id, $actor['club_id']]);
    $existingUser  = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$existingUser ) {
        http_response_code(404);
        echo json_encode(['error' => 'User  not found']);
        exit;
    }

    if ($actor['role'] !== 'adviser' && strtolower((string)$existingUser['role']) !== 'member') {
        api_error(403, 'Only advisers can modify privileged accounts.', 'PRIVILEGED_ACCOUNT_FORBIDDEN');
    }

    $club_id = (int)$existingUser ['club_id'];
    if (strtolower((string)$existingUser['role']) === 'adviser' && $user_id !== $actor['user_id']) api_error(403, 'Adviser accounts cannot be edited here.', 'ADVISER_EDIT_FORBIDDEN');

    $stmt = $pdo->prepare("
    UPDATE `users`
      SET user_fname = ?,
          user_mname = ?,
          user_lname = ?,
          school_id = ?,
          email = ?,
          role = ?,
          user_course = ?,
          user_year = ?,
          user_section = ?,
          avatar = ?
    WHERE user_id = ? AND club_id = ?
  ");

  $stmt->execute([
    $fname,
    $mname,
    $lname,
    $school_id,
    $email,
    $role,
    $course,
    $year,
    $section,
    $avatar,
    $user_id,
    $club_id
  ]);

    $stmt2 = $pdo->prepare("SELECT * FROM `users` WHERE club_id = ?");
    $stmt2->execute([$club_id]);
    $users = $stmt2->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['users' => $users]);
} catch (PDOException $e) {
    http_response_code(500);
    error_log('IMSCCA request failure: ' . $e->getMessage());
    api_error(500, 'The request could not be completed.', 'SERVER_ERROR');
}
