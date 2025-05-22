<?php
ini_set('display_errors', 0);
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Only GET allowed']);
    exit;
}

session_start();
if (empty($_SESSION['user_id']) || empty($_SESSION['club_id']) || empty($_SESSION['role'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated']);
    exit;
}

$club_id = $_SESSION['club_id'];
$user_id = $_SESSION['user_id'];
$role = strtolower($_SESSION['role']);

try {
    $pdo = new PDO("mysql:host=127.0.0.1;dbname=db_imscca;charset=utf8mb4", "root", "", [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    if ($role === 'adviser') {
        $stmt = $pdo->prepare("SELECT dr.*, u.user_fname AS requested_by_fname, u.user_lname AS requested_by_lname FROM deletion_requests dr JOIN users u ON dr.requested_by = u.user_id WHERE dr.club_id = ? AND dr.status = 'pending' ORDER BY dr.requested_at DESC");
        $stmt->execute([$club_id]);
    } else {
        $stmt = $pdo->prepare("SELECT dr.*, u.user_fname AS requested_by_fname, u.user_lname AS requested_by_lname FROM deletion_requests dr JOIN users u ON dr.requested_by = u.user_id WHERE dr.club_id = ? AND dr.requested_by = ? ORDER BY dr.requested_at DESC");
        $stmt->execute([$club_id, $user_id]);
    }
    $requests = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($requests);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
} 