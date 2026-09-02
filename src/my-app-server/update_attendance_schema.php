<?php
// update_attendance_schema.php
// Run this once to add 'absent' status to attendance_records table

header("Content-Type: application/json");

try {
    $pdo = new PDO("mysql:host=127.0.0.1;dbname=db_imscca;charset=utf8mb4", "root", "", [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);

    // Check current enum values
    $stmt = $pdo->prepare("SHOW COLUMNS FROM attendance_records LIKE 'attendance_status'");
    $stmt->execute();
    $current = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo "Current attendance_status enum: " . $current['Type'] . "\n";
    
    // Add 'absent' status to attendance_status enum
    $stmt = $pdo->prepare("
        ALTER TABLE attendance_records 
        MODIFY COLUMN attendance_status ENUM('present', 'late', 'excused', 'absent') DEFAULT 'present'
    ");
    $stmt->execute();
    
    echo "✓ Updated attendance_status enum to include 'absent'\n";
    
    // Add index for absent status queries (if it doesn't exist)
    try {
        $stmt = $pdo->prepare("
            CREATE INDEX idx_attendance_status_absent ON attendance_records(attendance_status, requirement_id)
        ");
        $stmt->execute();
        echo "✓ Added index for absent status queries\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate key name') !== false) {
            echo "→ Index already exists, skipping\n";
        } else {
            throw $e;
        }
    }
    
    // Add comment
    $stmt = $pdo->prepare("
        ALTER TABLE attendance_records COMMENT = 'Tracks attendance records including automatic absent marking'
    ");
    $stmt->execute();
    
    echo "✓ Updated table comment\n";
    
    // Verify the change
    $stmt = $pdo->prepare("SHOW COLUMNS FROM attendance_records LIKE 'attendance_status'");
    $stmt->execute();
    $updated = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo "Updated attendance_status enum: " . $updated['Type'] . "\n";
    echo "✓ Schema update completed successfully!\n";
    
    echo json_encode(['success' => true, 'message' => 'Attendance schema updated successfully']);

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo json_encode(['error' => $e->getMessage()]);
}
?> 