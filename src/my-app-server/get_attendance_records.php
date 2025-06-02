<?php
// get_attendance_records.php
ini_set('display_errors', 0);
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);

header("Access-Control-Allow-Origin: http://localhost:5173");
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

try {
    $pdo = new PDO("mysql:host=localhost;dbname=imscca", "root", "");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Get attendance records with joined user, event, and time slot information
    $sql = "
        SELECT 
            ar.attendance_id,
            ar.user_id,
            ar.requirement_id,
            ar.time_slot_id,
            ar.verified_by,
            ar.club_id,
            ar.scan_datetime,
            ar.attendance_status,
            ar.notes,
            
            -- User information
            u.user_fname,
            u.user_lname,
            u.school_id,
            u.user_course as course,
            u.user_year as year,
            u.user_section as section,
            u.avatar,
            
            -- Event information
            r.title as event_title,
            
            -- Time slot information (optional)
            ts.slot_name,
            ts.start_time,
            ts.end_time,
            
            -- Verifier information
            v.user_fname as verifier_fname,
            v.user_lname as verifier_lname
            
        FROM attendance_records ar
        
        -- Join with users table for student info
        INNER JOIN users u ON ar.user_id = u.user_id
        
        -- Join with requirements table for event info
        INNER JOIN requirements r ON ar.requirement_id = r.requirement_id
        
        -- Left join with time slots (optional)
        LEFT JOIN attendance_time_slots ts ON ar.time_slot_id = ts.slot_id
        
        -- Join with users table for verifier info
        INNER JOIN users v ON ar.verified_by = v.user_id
        
        WHERE ar.club_id = :club_id
        ORDER BY ar.scan_datetime DESC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':club_id', $clubId, PDO::PARAM_INT);
    $stmt->execute();
    
    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Convert numeric fields to proper types
    foreach ($records as &$record) {
        $record['attendance_id'] = (int)$record['attendance_id'];
        $record['user_id'] = (int)$record['user_id'];
        $record['requirement_id'] = (int)$record['requirement_id'];
        $record['time_slot_id'] = $record['time_slot_id'] ? (int)$record['time_slot_id'] : null;
        $record['verified_by'] = (int)$record['verified_by'];
        $record['club_id'] = (int)$record['club_id'];
        $record['year'] = (int)$record['year'];
    }
    
    echo json_encode($records);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}
?> 