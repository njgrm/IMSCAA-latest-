<?php
require_once __DIR__ . '/bootstrap.php';
// process_automatic_absences.php
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

// Allow scheduled CLI runs and authenticated requests from any host.
$isCliRequest = (php_sapi_name() === 'cli');
$isAuthenticatedRequest = false;

if (!$isCliRequest) {
    require_method('POST');
    if (session_status() !== PHP_SESSION_ACTIVE) session_start();
    $isAuthenticatedRequest = (!empty($_SESSION['user_id']) && !empty($_SESSION['club_id']));

    if (!$isAuthenticatedRequest) {
        http_response_code(401);
        echo json_encode(['error' => 'Not authenticated']);
        exit;
    }

    $requestRole = strtolower((string)($_SESSION['role'] ?? ''));
    if (!in_array($requestRole, ['adviser', 'president', 'officer'], true)) {
        http_response_code(403);
        echo json_encode(['error' => 'Insufficient permissions']);
        exit;
    }
}

// Set default values for processing
$clubId = null;
$currentUserId = 1; // Default system user

if ($isAuthenticatedRequest) {
    $clubId = (int)$_SESSION['club_id'];
    $currentUserId = (int)$_SESSION['user_id'];
}

try {
    $pdo = db();

    $pdo->beginTransaction();

    // update event statuses based on current time
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
        WHERE requirement_type = 'event'
        " . ($clubId ? "AND club_id = :status_club_id" : "") . "
        AND status IN ('scheduled', 'ongoing')
    ");
    $updateStatusStmt->execute($clubId ? [':status_club_id' => $clubId] : []);
    $updatedEvents = $updateStatusStmt->rowCount();
    
    if ($updatedEvents > 0 && !$isCliRequest) {
        error_log("Updated status for {$updatedEvents} events based on current time");
    }

    // Find events that ended yesterday and are completed
    $whereClause = $clubId ? "AND r.club_id = :club_id" : "";
    
    $stmt = $pdo->prepare("
        SELECT 
            r.requirement_id,
            r.title,
            r.club_id,
            r.end_datetime,
            r.status
        FROM requirements r
        WHERE r.requirement_type = 'event'
            AND r.status = 'completed'
            AND r.end_datetime < DATE_SUB(NOW(), INTERVAL 1 DAY)
            AND NOT EXISTS (
                SELECT 1 FROM automatic_absence_processing 
                WHERE requirement_id = r.requirement_id
            )
            $whereClause
    ");
    
    if ($clubId) {
        $stmt->execute([':club_id' => $clubId]);
    } else {
        $stmt->execute();
    }
    
    $completedEvents = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $processedCount = 0;
    $absentCount = 0;

    foreach ($completedEvents as $event) {
        $requirementId = $event['requirement_id'];
        
        // Get all users registered for this event who don't have attendance records
        $stmt = $pdo->prepare("
            SELECT 
                er.user_id,
                er.requirement_id,
                u.user_fname,
                u.user_lname
            FROM event_registrations er
            INNER JOIN users u ON er.user_id = u.user_id
            LEFT JOIN attendance_records ar ON er.user_id = ar.user_id 
                AND er.requirement_id = ar.requirement_id
            WHERE er.requirement_id = :requirement_id
                AND er.status = 'registered'
                AND ar.attendance_id IS NULL
        ");
        $stmt->execute([':requirement_id' => $requirementId]);
        $unscannedUsers = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Mark each unscanned user as absent
        foreach ($unscannedUsers as $user) {
            $insertStmt = $pdo->prepare("
                INSERT INTO attendance_records 
                (user_id, requirement_id, slot_id, verified_by, club_id, 
                 scan_datetime, attendance_status, notes)
                VALUES 
                (:user_id, :requirement_id, NULL, :verified_by, :club_id,
                 :scan_datetime, 'absent', :notes)
            ");
            
            $insertStmt->execute([
                ':user_id' => $user['user_id'],
                ':requirement_id' => $requirementId,
                ':verified_by' => $currentUserId,
                ':club_id' => $event['club_id'],
                ':scan_datetime' => $event['end_datetime'],
                ':notes' => 'Automatically marked absent - registered but did not scan during event'
            ]);
            
            $absentCount++;
        }

        // Mark this event as processed
        $insertStmt = $pdo->prepare("
            INSERT INTO automatic_absence_processing 
            (requirement_id, processed_at, absences_created)
            VALUES (:requirement_id, NOW(), :absences_created)
        ");
        
        $insertStmt->execute([
            ':requirement_id' => $requirementId,
            ':absences_created' => count($unscannedUsers)
        ]);
        
        $processedCount++;
    }

    $pdo->commit();

    $message = "Processed $processedCount events and marked $absentCount users as absent";
    
    if (!$isCliRequest) {
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => $message,
            'events_processed' => $processedCount,
            'total_absences_created' => $absentCount,
            'users_marked_absent' => $absentCount,
            'processed_events' => array_column($completedEvents, 'title')
        ]);
    } else {
        echo $message . "\n";
    }

} catch (PDOException $e) {
    if ($pdo && $pdo->inTransaction()) {
        $pdo->rollback();
    }
    
    error_log('Automatic absence database failure: ' . $e->getMessage());
    $error = 'Automatic absence processing failed.';
    
    if (!$isCliRequest) {
        http_response_code(500);
        echo json_encode(['error' => $error]);
    } else {
        echo $error . "\n";
    }
} catch (Exception $e) {
    if ($pdo && $pdo->inTransaction()) {
        $pdo->rollback();
    }
    
    error_log('Automatic absence processing failure: ' . $e->getMessage());
    $error = 'Automatic absence processing failed.';
    
    if (!$isCliRequest) {
        http_response_code(500);
        echo json_encode(['error' => $error]);
    } else {
        echo $error . "\n";
    }
}
?> 
