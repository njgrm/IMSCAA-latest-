<?php
// test_auto_absence_setup.php
header("Content-Type: application/json");

try {
    $pdo = new PDO("mysql:host=127.0.0.1;dbname=db_imscca;charset=utf8mb4", "root", "", [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);

    echo "Testing Automatic Absence Processing Setup\n";
    echo "==========================================\n\n";

    // Check if automatic_absence_processing table exists
    $stmt = $pdo->prepare("SHOW TABLES LIKE 'automatic_absence_processing'");
    $stmt->execute();
    $tableExists = $stmt->fetch();

    if ($tableExists) {
        echo "✓ automatic_absence_processing table exists\n";
        
        // Show table structure
        $stmt = $pdo->prepare("DESCRIBE automatic_absence_processing");
        $stmt->execute();
        $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo "\nTable structure:\n";
        foreach ($columns as $col) {
            echo "  - {$col['Field']}: {$col['Type']}\n";
        }
    } else {
        echo "✗ automatic_absence_processing table does not exist\n";
        echo "Creating the table...\n";
        
        // Create the table
        $sql = "
        CREATE TABLE IF NOT EXISTS automatic_absence_processing (
            processing_id INT AUTO_INCREMENT PRIMARY KEY,
            event_id INT NOT NULL,
            processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            absences_created INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            FOREIGN KEY (event_id) REFERENCES requirements(requirement_id) ON DELETE CASCADE,
            UNIQUE KEY unique_event_processing (event_id),
            INDEX idx_event_id (event_id),
            INDEX idx_processed_at (processed_at)
        );
        ";
        $pdo->exec($sql);
        echo "✓ Table created successfully\n";
    }

    // Check for events that could be processed
    echo "\nChecking for events that need processing:\n";
    
    $stmt = $pdo->prepare("
        SELECT 
            r.requirement_id, 
            r.title, 
            r.club_id, 
            r.end_datetime,
            r.status,
            r.requirement_type,
            CASE 
                WHEN r.end_datetime < DATE_SUB(NOW(), INTERVAL 1 DAY) THEN 'Eligible for processing'
                ELSE 'Not yet eligible' 
            END as processing_status
        FROM requirements r
        WHERE r.requirement_type = 'event' 
        AND r.status IN ('scheduled', 'ongoing', 'completed')
        ORDER BY r.end_datetime DESC
        LIMIT 10
    ");
    $stmt->execute();
    $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($events)) {
        echo "  No events found\n";
    } else {
        foreach ($events as $event) {
            echo "  - {$event['title']} (ID: {$event['requirement_id']})\n";
            echo "    Status: {$event['status']}, End: {$event['end_datetime']}\n";
            echo "    Processing: {$event['processing_status']}\n\n";
        }
    }

    // Check event_registrations table structure
    echo "\nChecking event_registrations table:\n";
    $stmt = $pdo->prepare("SHOW TABLES LIKE 'event_registrations'");
    $stmt->execute();
    $regTableExists = $stmt->fetch();

    if ($regTableExists) {
        echo "✓ event_registrations table exists\n";
        
        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM event_registrations");
        $stmt->execute();
        $count = $stmt->fetch();
        echo "  Total registrations: {$count['count']}\n";
    } else {
        echo "✗ event_registrations table does not exist\n";
    }

    // Check attendance_records table structure
    echo "\nChecking attendance_records table:\n";
    $stmt = $pdo->prepare("SHOW COLUMNS FROM attendance_records LIKE 'attendance_status'");
    $stmt->execute();
    $statusColumn = $stmt->fetch();

    if ($statusColumn) {
        echo "✓ attendance_status column: {$statusColumn['Type']}\n";
    } else {
        echo "✗ attendance_status column not found\n";
    }

    echo "\n✓ Setup check complete\n";
    echo json_encode(['success' => true, 'message' => 'Setup check completed']);

} catch (PDOException $e) {
    echo "Database error: " . $e->getMessage() . "\n";
    echo json_encode(['error' => $e->getMessage()]);
}
?> 