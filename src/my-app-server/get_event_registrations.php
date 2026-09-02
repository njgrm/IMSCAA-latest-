<?php
// get_event_registrations.php
ini_set('display_errors', 0);
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);
require_once __DIR__ . '/cors.php';
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

session_start();

// Check authentication
if (empty($_SESSION['user_id']) || empty($_SESSION['club_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated']);
    exit;
}

$clubId = (int)$_SESSION['club_id'];
$requirementId = isset($_GET['requirement_id']) ? (int)$_GET['requirement_id'] : 0;

try {
    $pdo = new PDO(
        "mysql:host=127.0.0.1;dbname=db_imscca;charset=utf8mb4",
        "root",
        "",
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    if ($requirementId) {
        // Get registrations for a specific event
        $stmt = $pdo->prepare("
            SELECT 
                er.registration_id,
                er.requirement_id,
                er.user_id,
                er.status as registration_status,
                er.registered_by,
                er.registered_at,
                u.user_fname,
                u.user_lname,
                u.school_id,
                u.user_course as course,
                u.user_year as year,
                u.user_section as section,
                u.avatar,
                r.title as event_title,
                r.requirement_type,
                r.start_datetime,
                r.end_datetime,
                r.status as event_status,
                rb.user_fname as registered_by_fname,
                rb.user_lname as registered_by_lname,
                -- Check if user has attendance record
                ar.attendance_id,
                ar.attendance_status,
                ar.scan_datetime
            FROM event_registrations er
            INNER JOIN users u ON er.user_id = u.user_id
            INNER JOIN requirements r ON er.requirement_id = r.requirement_id
            INNER JOIN users rb ON er.registered_by = rb.user_id
            LEFT JOIN attendance_records ar ON er.user_id = ar.user_id 
                AND er.requirement_id = ar.requirement_id
            WHERE er.requirement_id = :requirement_id 
                AND r.club_id = :club_id
                AND r.requirement_type = 'event'
                AND er.status = 'registered'
            ORDER BY u.user_lname, u.user_fname
        ");
        $stmt->execute([':requirement_id' => $requirementId, ':club_id' => $clubId]);
        
    } else {
        // Get all event registrations for the club
        $stmt = $pdo->prepare("
            SELECT 
                er.registration_id,
                er.requirement_id,
                er.user_id,
                er.status as registration_status,
                er.registered_by,
                er.registered_at,
                u.user_fname,
                u.user_lname,
                u.school_id,
                u.user_course as course,
                u.user_year as year,
                u.user_section as section,
                u.avatar,
                r.title as event_title,
                r.requirement_type,
                r.start_datetime,
                r.end_datetime,
                r.status as event_status,
                rb.user_fname as registered_by_fname,
                rb.user_lname as registered_by_lname,
                -- Check if user has attendance record
                ar.attendance_id,
                ar.attendance_status,
                ar.scan_datetime
            FROM event_registrations er
            INNER JOIN users u ON er.user_id = u.user_id
            INNER JOIN requirements r ON er.requirement_id = r.requirement_id
            INNER JOIN users rb ON er.registered_by = rb.user_id
            LEFT JOIN attendance_records ar ON er.user_id = ar.user_id 
                AND er.requirement_id = ar.requirement_id
            WHERE r.club_id = :club_id
                AND r.requirement_type = 'event'
                AND er.status = 'registered'
            ORDER BY r.start_datetime DESC, u.user_lname, u.user_fname
        ");
        $stmt->execute([':club_id' => $clubId]);
    }

    $registrations = $stmt->fetchAll(PDO::FETCH_ASSOC);

    http_response_code(200);
    echo json_encode($registrations ?: []);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?> 