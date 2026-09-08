<?php
require_once __DIR__ . '/bootstrap.php'; require_method('GET'); $actor=require_operator();
// Dashboard metrics for adviser, president, and officer accounts.
ini_set('display_errors', 0);
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);

require_once __DIR__ . '/cors.php';
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if (session_status() !== PHP_SESSION_ACTIVE) session_start();

$userId = (int)($_SESSION['user_id'] ?? 0);
$clubId = (int)($_SESSION['club_id'] ?? 0);
$role = strtolower((string)($_SESSION['role'] ?? ''));

if ($userId === 0 || $clubId === 0) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated']);
    exit;
}

if (!in_array($role, ['adviser', 'president', 'officer'], true)) {
    http_response_code(403);
    echo json_encode(['error' => 'Insufficient permissions']);
    exit;
}

try {
    $pdo = db();

    $membersStmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE club_id = ? AND LOWER(role) <> 'adviser'");
    $membersStmt->execute([$clubId]);
    $totalMembers = (int)$membersStmt->fetchColumn();

    $transactionsStmt = $pdo->prepare(
        'SELECT COUNT(*)
         FROM transactions t
         INNER JOIN requirements r ON r.requirement_id = t.requirement_id
         WHERE r.club_id = ?'
    );
    $transactionsStmt->execute([$clubId]);
    $totalTransactions = (int)$transactionsStmt->fetchColumn();

    $pendingStmt = $pdo->prepare(
        "SELECT COUNT(*)
         FROM transactions t
         INNER JOIN requirements r ON r.requirement_id = t.requirement_id
         WHERE r.club_id = ? AND t.payment_status IN ('unpaid', 'partial')"
    );
    $pendingStmt->execute([$clubId]);
    $pendingPayments = (int)$pendingStmt->fetchColumn();

    $recentStmt = $pdo->prepare(
        'SELECT
            t.transaction_id,
            t.user_id,
            t.requirement_id,
            CAST(t.amount_due AS DECIMAL(10,2)) AS amount_due,
            CAST(COALESCE(t.amount_paid, 0) AS DECIMAL(10,2)) AS amount_paid,
            t.payment_status,
            t.payment_method,
            t.due_date,
            t.verified_by,
            t.date_added,
            t.fee_description,
            u.user_fname,
            u.user_lname,
            r.title AS requirement_title
         FROM transactions t
         INNER JOIN requirements r ON r.requirement_id = t.requirement_id
         INNER JOIN users u ON u.user_id = t.user_id
         WHERE r.club_id = ?
         ORDER BY t.date_added DESC
         LIMIT 5'
    );
    $recentStmt->execute([$clubId]);
    $recentTransactions = $recentStmt->fetchAll(PDO::FETCH_ASSOC);

    $attendanceStmt = $pdo->prepare(
        "SELECT
            COUNT(*) AS total,
            COALESCE(SUM(CASE WHEN attendance_status IN ('present', 'late') THEN 1 ELSE 0 END), 0) AS attended
         FROM attendance_records
         WHERE club_id = ?"
    );
    $attendanceStmt->execute([$clubId]);
    $attendance = $attendanceStmt->fetch(PDO::FETCH_ASSOC) ?: ['total' => 0, 'attended' => 0];
    $attendanceTotal = (int)$attendance['total'];
    $attendanceRate = $attendanceTotal > 0
        ? round(((int)$attendance['attended'] / $attendanceTotal) * 100, 1)
        : 0;

    echo json_encode([
        'total_members' => $totalMembers,
        'total_transactions' => $totalTransactions,
        'pending_payments' => $pendingPayments,
        'recent_transactions' => $recentTransactions,
        'attendance_rate' => $attendanceRate,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error']);
}
?>
