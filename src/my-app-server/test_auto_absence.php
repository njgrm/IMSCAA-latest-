<?php
// test_auto_absence.php - Test script for automatic absence processing
// Prevent any output before JSON
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

    // First, show events that would be updated
    $eventStatusStmt = $pdo->prepare("
        SELECT 
            requirement_id,
            title,
            status,
            start_datetime,
            end_datetime,
            CASE
                WHEN requirement_type = 'event' 
                     AND status IN ('scheduled', 'ongoing') 
                     AND end_datetime < NOW() 
                THEN 'completed'
                WHEN requirement_type = 'event' 
                     AND status = 'scheduled' 
                     AND start_datetime <= NOW() 
                     AND end_datetime > NOW() 
                THEN 'ongoing'
                ELSE status
            END as new_status
        FROM requirements 
        WHERE requirement_type = 'event' 
        AND status IN ('scheduled', 'ongoing')
        ORDER BY end_datetime DESC
    ");
    $eventStatusStmt->execute();
    $eventsToUpdate = $eventStatusStmt->fetchAll(PDO::FETCH_ASSOC);

    // Show events that would be processed for auto absence
    $autoAbsenceStmt = $pdo->prepare("
        SELECT 
            r.requirement_id,
            r.title,
            r.club_id,
            r.end_datetime,
            r.status,
            COUNT(er.user_id) as registered_users
        FROM requirements r
        LEFT JOIN event_registrations er ON r.requirement_id = er.requirement_id
        WHERE r.requirement_type = 'event'
            AND r.status = 'completed'
            AND r.end_datetime < DATE_SUB(NOW(), INTERVAL 1 DAY)
            AND NOT EXISTS (
                SELECT 1 FROM automatic_absence_processing 
                WHERE requirement_id = r.requirement_id
            )
        GROUP BY r.requirement_id
        ORDER BY r.end_datetime DESC
    ");
    $autoAbsenceStmt->execute();
    $eventsForAbsence = $autoAbsenceStmt->fetchAll(PDO::FETCH_ASSOC);

    // Show current time for reference
    $currentTime = date('Y-m-d H:i:s');

    echo json_encode([
        'success' => true,
        'current_time' => $currentTime,
        'events_needing_status_update' => $eventsToUpdate,
        'events_ready_for_absence_processing' => $eventsForAbsence,
        'analysis' => [
            'events_to_update_count' => count($eventsToUpdate),
            'events_for_absence_count' => count($eventsForAbsence),
            'message' => count($eventsForAbsence) > 0 
                ? 'Events found that can be processed for automatic absences' 
                : 'No events found for automatic absence processing'
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Test failed: ' . $e->getMessage()]);
}
?> 