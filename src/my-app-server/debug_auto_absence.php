<?php
// debug_auto_absence.php - Debug script to check auto absence processing data
ini_set('display_errors', 0);
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);
require_once __DIR__ . '/cors.php';
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated']);
    exit;
}

try {
    $pdo = new PDO(
        "mysql:host=127.0.0.1;dbname=db_imscca;charset=utf8mb4",
        "root",
        "",
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    $debug = [];
    
    // 1. Check all events
    $stmt = $pdo->prepare("
        SELECT 
            requirement_id,
            title,
            requirement_type,
            status,
            start_datetime,
            end_datetime,
            club_id,
            CASE
                WHEN requirement_type = 'event' 
                     AND status IN ('scheduled', 'ongoing') 
                     AND end_datetime < NOW() 
                THEN 'should_be_completed'
                WHEN requirement_type = 'event' 
                     AND status = 'scheduled' 
                     AND start_datetime <= NOW() 
                     AND end_datetime > NOW() 
                THEN 'should_be_ongoing'
                ELSE 'no_change'
            END as suggested_status
        FROM requirements 
        WHERE requirement_type = 'event'
        ORDER BY end_datetime DESC
        LIMIT 10
    ");
    $stmt->execute();
    $allEvents = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $debug['all_events'] = $allEvents;

    // 2. Check events that should be processed for auto absence
    $stmt = $pdo->prepare("
        SELECT 
            r.requirement_id,
            r.title,
            r.status,
            r.end_datetime,
            COUNT(er.user_id) as registered_users,
            COUNT(ar.attendance_id) as attendance_records,
            (COUNT(er.user_id) - COUNT(ar.attendance_id)) as missing_attendance
        FROM requirements r
        LEFT JOIN event_registrations er ON r.requirement_id = er.requirement_id AND er.status = 'registered'
        LEFT JOIN attendance_records ar ON r.requirement_id = ar.requirement_id AND er.user_id = ar.user_id
        WHERE r.requirement_type = 'event'
            AND r.status = 'completed'
            AND r.end_datetime < DATE_SUB(NOW(), INTERVAL 1 DAY)
        GROUP BY r.requirement_id
        ORDER BY r.end_datetime DESC
    ");
    $stmt->execute();
    $completedEvents = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $debug['completed_events'] = $completedEvents;

    // 3. Check already processed events
    $stmt = $pdo->prepare("
        SELECT 
            aap.requirement_id,
            r.title,
            aap.processed_at,
            aap.absences_created
        FROM automatic_absence_processing aap
        JOIN requirements r ON aap.requirement_id = r.requirement_id
        ORDER BY aap.processed_at DESC
        LIMIT 5
    ");
    $stmt->execute();
    $processedEvents = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $debug['already_processed'] = $processedEvents;

    // 4. Check event registrations
    $stmt = $pdo->prepare("
        SELECT 
            er.requirement_id,
            r.title,
            COUNT(er.user_id) as registered_count,
            er.status
        FROM event_registrations er
        JOIN requirements r ON er.requirement_id = r.requirement_id
        WHERE r.requirement_type = 'event'
        GROUP BY er.requirement_id, er.status
        ORDER BY er.requirement_id DESC
        LIMIT 10
    ");
    $stmt->execute();
    $registrations = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $debug['registrations'] = $registrations;

    // 5. Check current time and cutoff
    $debug['current_time'] = date('Y-m-d H:i:s');
    $debug['cutoff_time'] = date('Y-m-d H:i:s', strtotime('-1 day'));

    echo json_encode([
        'success' => true,
        'debug' => $debug
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Debug failed: ' . $e->getMessage()]);
}
?> 