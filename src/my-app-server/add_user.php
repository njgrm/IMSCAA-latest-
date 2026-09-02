<?php
// add_user.php
ini_set('display_errors', 0);
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);
require_once __DIR__ . '/cors.php';
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

session_start();

// Parse JSON input
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

$fname = trim($input['fname'] ?? '');
$mname = trim($input['mname'] ?? '');
$lname = trim($input['lname'] ?? '');
$school_id = trim($input['school_id'] ?? '');
$email = trim($input['email'] ?? '');
$role = $input['role'] ?? 'Member';
$course = trim($input['course'] ?? '');
$year = trim($input['year'] ?? '');
$section = trim($input['section'] ?? '');
$avatar = $input['avatar'] ?? '';
$club_id = $_SESSION['club_id'] ?? 0;

if (!$fname || !$lname || !$school_id || !$email || !$club_id) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields']);
    exit;
}

// Generate username
$username = strtolower($fname . '.' . $lname . rand(10, 99));
$passwordHash = password_hash('ChangeMe123!', PASSWORD_BCRYPT);

try {
    $pdo = new PDO(
        "mysql:host=127.0.0.1;dbname=db_imscca;charset=utf8mb4",
        "root",
        "",
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    $stmt = $pdo->prepare("
        INSERT INTO `users` (
            username, password, email, role, club_id, school_id,
            user_fname, user_mname, user_lname,
            user_course, user_year, user_section, avatar
        ) VALUES (
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?
        )
    ");

    $stmt->execute([
        $username,
        $passwordHash,
        $email,
        $role,
        $club_id,
        $school_id,
        $fname,
        $mname,
        $lname,
        $course,
        $year,
        $section,
        $avatar
    ]);

    $stmt2 = $pdo->prepare("
        SELECT 
            user_id, school_id, user_fname, user_mname, user_lname,
            email, role, user_course, user_year, user_section, avatar
        FROM `users`
        WHERE club_id = ?
    ");
    $stmt2->execute([$club_id]);
    $users = $stmt2->fetchAll(PDO::FETCH_ASSOC);

    http_response_code(201);
    echo json_encode(['users' => $users]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}