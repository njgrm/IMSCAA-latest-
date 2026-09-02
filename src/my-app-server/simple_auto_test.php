<?php
// simple_auto_test.php
header("Content-Type: text/plain");

try {
    $pdo = new PDO("mysql:host=127.0.0.1;dbname=db_imscca;charset=utf8mb4", "root", "", [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);

    echo "Database connection: OK\n";

    // Check if automatic_absence_processing table exists
    $result = $pdo->query("SHOW TABLES LIKE 'automatic_absence_processing'");
    if ($result->rowCount() > 0) {
        echo "automatic_absence_processing table: EXISTS\n";
    } else {
        echo "automatic_absence_processing table: NOT FOUND\n";
        exit;
    }

    // Check if event_registrations table exists
    $result = $pdo->query("SHOW TABLES LIKE 'event_registrations'");
    if ($result->rowCount() > 0) {
        echo "event_registrations table: EXISTS\n";
    } else {
        echo "event_registrations table: NOT FOUND\n";
    }

    // Check if attendance_records table exists
    $result = $pdo->query("SHOW TABLES LIKE 'attendance_records'");
    if ($result->rowCount() > 0) {
        echo "attendance_records table: EXISTS\n";
    } else {
        echo "attendance_records table: NOT FOUND\n";
    }

    // Check requirements table for events
    $stmt = $pdo->query("SELECT COUNT(*) FROM requirements WHERE requirement_type = 'event'");
    $eventCount = $stmt->fetchColumn();
    echo "Total events in system: $eventCount\n";

    // Check completed events
    $stmt = $pdo->query("SELECT COUNT(*) FROM requirements WHERE requirement_type = 'event' AND status = 'completed'");
    $completedCount = $stmt->fetchColumn();
    echo "Completed events: $completedCount\n";

    // Check event registrations
    $stmt = $pdo->query("SELECT COUNT(*) FROM event_registrations WHERE status = 'registered'");
    $regCount = $stmt->fetchColumn();
    echo "Total active registrations: $regCount\n";

    // Check attendance records
    $stmt = $pdo->query("SELECT COUNT(*) FROM attendance_records");
    $attendanceCount = $stmt->fetchColumn();
    echo "Total attendance records: $attendanceCount\n";

    echo "\nSYSTEM READY FOR AUTO ABSENCE PROCESSING\n";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
?> 