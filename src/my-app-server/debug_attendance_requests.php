<?php
// debug_attendance_requests.php
require_once __DIR__ . '/cors.php';
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

session_start();
if (empty($_SESSION['user_id']) || empty($_SESSION['club_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated']);
    exit;
}

try {
    $pdo = new PDO("mysql:host=127.0.0.1;dbname=db_imscca;charset=utf8mb4", "root", "", [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
    
    // Check if approval_requests table exists and what columns it has
    $stmt = $pdo->prepare("DESCRIBE approval_requests");
    $stmt->execute();
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get all approval requests to see what we have
    $stmt = $pdo->prepare("SELECT * FROM approval_requests WHERE club_id = ? ORDER BY request_id DESC LIMIT 10");
    $stmt->execute([$_SESSION['club_id']]);
    $requests = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Check what attendance records exist
    $stmt = $pdo->prepare("SELECT attendance_id, user_id, requirement_id, attendance_status FROM attendance_records WHERE club_id = ? LIMIT 5");
    $stmt->execute([$_SESSION['club_id']]);
    $attendanceRecords = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'table_columns' => $columns,
        'recent_requests' => $requests,
        'sample_attendance_records' => $attendanceRecords,
        'club_id' => $_SESSION['club_id'],
        'user_id' => $_SESSION['user_id']
    ]);
    
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?> 