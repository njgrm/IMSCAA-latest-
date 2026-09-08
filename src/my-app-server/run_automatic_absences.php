<?php
// run_automatic_absences.php - Cron job script to process automatic absences
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Allow this script to be run from command line or via web request from localhost
if (php_sapi_name() !== 'cli' && $_SERVER['REMOTE_ADDR'] !== '127.0.0.1') {
    http_response_code(403);
    echo json_encode(['error' => 'Access denied']);
    exit;
}

try {
    $pdo = db();

    // Find events that have ended more than 24 hours ago and haven't been processed
    $stmt = $pdo->prepare("
        SELECT r.requirement_id, r.title, r.club_id, r.end_datetime
        FROM requirements r
        WHERE r.requirement_type = 'event' 
        AND r.status IN ('scheduled', 'ongoing', 'completed')
        AND r.end_datetime < DATE_SUB(NOW(), INTERVAL 1 DAY)
        AND NOT EXISTS (
            SELECT 1 FROM automatic_absence_processing 
            WHERE requirement_id = r.requirement_id
        )
    ");
    $stmt->execute();
    $eventsToProcess = $stmt->fetchAll();

    $processedEvents = 0;
    $totalAbsences = 0;

    foreach ($eventsToProcess as $event) {
        echo "Processing event: {$event['title']} (ID: {$event['requirement_id']})\n";
        
        // Find registered users who were not scanned for this event
        $stmt = $pdo->prepare("
            SELECT er.user_id, er.requirement_id
            FROM event_registrations er
            WHERE er.requirement_id = ?
            AND er.status = 'registered'
            AND NOT EXISTS (
                SELECT 1 FROM attendance_records ar
                WHERE ar.user_id = er.user_id
                AND ar.requirement_id = er.requirement_id
            )
        ");
        $stmt->execute([$event['requirement_id']]);
        $absentUsers = $stmt->fetchAll();

        $eventAbsences = 0;
        
        // Create absence records for users who didn't scan
        foreach ($absentUsers as $user) {
            $stmt = $pdo->prepare("
                INSERT INTO attendance_records (
                    user_id, 
                    requirement_id, 
                    club_id, 
                    scan_datetime, 
                    attendance_status, 
                    verified_by, 
                    notes
                ) VALUES (?, ?, ?, ?, 'absent', 1, ?)
            ");
            
            $notes = "Automatically marked absent - registered but did not scan for event";
            $stmt->execute([
                $user['user_id'],
                $event['requirement_id'],
                $event['club_id'],
                $event['end_datetime'],
                $notes
            ]);
            
            $eventAbsences++;
            $totalAbsences++;
        }

        // Mark this event as processed
        $stmt = $pdo->prepare("
            INSERT INTO automatic_absence_processing (requirement_id, processed_at, absences_created)
            VALUES (?, NOW(), ?)
        ");
        $stmt->execute([$event['requirement_id'], $eventAbsences]);

        echo "Created {$eventAbsences} absence records for event {$event['title']}\n";
        $processedEvents++;
    }

    echo "Processing complete. Processed {$processedEvents} events and created {$totalAbsences} absence records.\n";

    // If running via web request, return JSON
    if (php_sapi_name() !== 'cli') {
        header('Content-Type: application/json');
        echo json_encode([
            'success' => true,
            'processed_events' => $processedEvents,
            'total_absences' => $totalAbsences,
            'message' => "Processed {$processedEvents} events and created {$totalAbsences} absence records"
        ]);
    }

} catch (PDOException $e) {
    $error = "Database error: " . $e->getMessage();
    error_log($error);
    
    if (php_sapi_name() !== 'cli') {
        http_response_code(500);
        echo json_encode(['error' => $error]);
    } else {
        echo $error . "\n";
    }
} catch (Exception $e) {
    $error = "Error: " . $e->getMessage();
    error_log($error);
    
    if (php_sapi_name() !== 'cli') {
        http_response_code(500);
        echo json_encode(['error' => $error]);
    } else {
        echo $error . "\n";
    }
}
?> 