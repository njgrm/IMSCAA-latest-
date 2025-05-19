<?php
// update_user.php
ini_set('display_errors', 0);
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);

// CORS headers
header("Access-Control-Allow-Origin: http://localhost:5173");
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

// Extract data from input
$user_id = (int)($input['user_id'] ?? 0);
$school_id = trim($input['school_id'] ?? '');
$fname = trim($input['fname'] ?? '');
$mname = trim($input['mname'] ?? '');
$lname = trim($input['lname'] ?? '');
$email   = trim($input['email'] ?? '');
$role = trim($input['role'] ?? '');
$course  = trim($input['course'] ?? '');
$year    = trim($input['year'] ?? '');
$section = trim($input['section'] ?? '');
$avatar  = $input['avatar'] ?? '';

// Validate required fields
if (!$fname || !$lname || !$school_id || !$email || !$role) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields']);
    exit;
}


try {
    $pdo = new PDO("mysql:host=127.0.0.1;dbname=db_imscca;charset=utf8mb4", "root", "", [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

    // Fetch the existing user's club_id
    $stmt = $pdo->prepare("SELECT club_id FROM `users` WHERE user_id = ?");
    $stmt->execute([$user_id]);
    $existingUser  = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$existingUser ) {
        http_response_code(404);
        echo json_encode(['error' => 'User  not found']);
        exit;
    }

    $club_id = (int)$existingUser ['club_id'];

    // Proceed with the update using the fetched club_id
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
    $fname,        // 1. user_fname
    $mname,        // 2. user_mname
    $lname,        // 3. user_lname
    $school_id,    // 4. school_id
    $email,        // 5. email
    $role,         // 6. role
    $course,       // 7. user_course
    $year,         // 8. user_year
    $section,      // 9. user_section
    $avatar,       // 10. avatar
    $user_id,      // 11. WHERE user_id
    $club_id       // 12. WHERE club_id
  ]);

    // Return fresh list
    $stmt2 = $pdo->prepare("SELECT * FROM `users` WHERE club_id = ?");
    $stmt2->execute([$club_id]);
    $users = $stmt2->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['users' => $users]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}   