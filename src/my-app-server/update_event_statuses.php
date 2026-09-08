<?php
require_once __DIR__ . '/bootstrap.php'; require_method('POST'); $actor=require_operator();
// Prevent any output before JSON
ini_set('display_errors', 0);
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);
require_once __DIR__ . '/cors.php';
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if (session_status() !== PHP_SESSION_ACTIVE) session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated']);
    exit;
}

try {
    $pdo = db();

    $pdo->beginTransaction();

    // Update event statuses based on current time
    $updateStatusStmt = $pdo->prepare("
        UPDATE requirements
        SET status = CASE
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
        END
        WHERE club_id = :club_id
        AND requirement_type = 'event'
        AND status IN ('scheduled', 'ongoing')
    ");

    $updateStatusStmt->execute([':club_id' => $actor['club_id']]);
    $updatedEvents = $updateStatusStmt->rowCount();

    // Get details of updated events
    $detailsStmt = $pdo->prepare("
        SELECT
            requirement_id,
            title,
            status,
            start_datetime,
            end_datetime
        FROM requirements
        WHERE club_id = :club_id
        AND requirement_type = 'event'
        ORDER BY end_datetime DESC
        LIMIT 10
    ");
    $detailsStmt->execute([':club_id' => $actor['club_id']]);
    $eventDetails = $detailsStmt->fetchAll(PDO::FETCH_ASSOC);

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'updated_events' => $updatedEvents,
        'message' => "Updated status for {$updatedEvents} events based on current time",
        'recent_events' => $eventDetails
    ]);

} catch (Exception $e) {
    if ($pdo && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    error_log('IMSCCA request failure: ' . $e->getMessage());
    api_error(500, 'The request could not be completed.', 'SERVER_ERROR');
}
?>
