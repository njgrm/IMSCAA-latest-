<?php
require_once __DIR__ . '/bootstrap.php'; require_method('GET'); $actor=require_operator();
ini_set('display_errors', 0);
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);
require_once __DIR__ . '/cors.php';
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Only GET allowed']);
    exit;
}

if (session_status() !== PHP_SESSION_ACTIVE) session_start();
if (empty($_SESSION['user_id']) || empty($_SESSION['club_id']) || empty($_SESSION['role'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated']);
    exit;
}

$club_id = $_SESSION['club_id'];
$user_id = $_SESSION['user_id'];
$role = strtolower($_SESSION['role']);

try {
    $pdo = db();
    $order = "FIELD(ar.status, 'pending', 'approved', 'denied'), ar.approved_at DESC, ar.requested_at DESC";

    if ($role === 'adviser') {
        // Advisers see all requests
        $stmt = $pdo->prepare("
            SELECT
                ar.*,
                u.user_fname AS requested_by_fname,
                u.user_lname AS requested_by_lname,
                approver.user_fname AS approved_by_fname,
                approver.user_lname AS approved_by_lname
            FROM approval_requests ar
            JOIN users u ON ar.requested_by = u.user_id
            LEFT JOIN users approver ON ar.approved_by = approver.user_id
            WHERE ar.club_id = ?
            ORDER BY $order
        ");
        $stmt->execute([$club_id]);
    } else {
        // Non-advisers only see their own requests
        $stmt = $pdo->prepare("
            SELECT
                ar.*,
                u.user_fname AS requested_by_fname,
                u.user_lname AS requested_by_lname,
                approver.user_fname AS approved_by_fname,
                approver.user_lname AS approved_by_lname
            FROM approval_requests ar
            JOIN users u ON ar.requested_by = u.user_id
            LEFT JOIN users approver ON ar.approved_by = approver.user_id
            WHERE ar.club_id = ? AND ar.requested_by = ?
            ORDER BY $order
        ");
        $stmt->execute([$club_id, $user_id]);
    }

    $requests = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($requests);
} catch (PDOException $e) {
    http_response_code(500);
    error_log('IMSCCA request failure: ' . $e->getMessage());
    api_error(500, 'The request could not be completed.', 'SERVER_ERROR');
}
