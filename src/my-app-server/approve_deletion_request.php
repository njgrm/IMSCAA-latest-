<?php
require_once __DIR__ . '/bootstrap.php'; require_method('POST'); $actor=require_roles('adviser');
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

if (session_status() !== PHP_SESSION_ACTIVE) session_start();
if (empty($_SESSION['user_id']) || empty($_SESSION['club_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated']);
    exit;
}

$club_id = $_SESSION['club_id'];
$input = json_decode(file_get_contents('php://input'), true);
$request_id = isset($input['request_id']) ? (int)$input['request_id'] : 0;
$request_ids = isset($input['request_ids']) ? $input['request_ids'] : null;

// Mass approval logic
if ($request_ids && is_array($request_ids)) {
    $results = [];
    foreach ($request_ids as $rid) {
        $rid = (int)$rid;
        if (!$rid) continue;
        try {
            $pdo = db();
            $pdo->beginTransaction();
            $stmt = $pdo->prepare("SELECT * FROM approval_requests WHERE request_id = ? AND club_id = ? FOR UPDATE");
            $stmt->execute([$rid, $actor['club_id']]);
            $req = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$req || $req['status'] !== 'pending') {
                $pdo->rollBack();
                $results[] = ['request_id' => $rid, 'error' => 'Request not found or already processed'];
                continue;
            }
            $type = $req['type'];
            $target_id = (int)$req['target_id'];
            $club_id = (int)$actor['club_id'];
            $approval_type = $req['approval_type'] ?? 'delete'; // Use approval_type instead of request_type

            // Handle different request types
            if ($approval_type === 'delete') {
                // Handle deletion requests
                if ($type === 'user') {
                    // Cascade delete all transactions for this user in the club
                    $delTx = $pdo->prepare("
                        DELETE t
                          FROM transactions t
                          JOIN requirements r ON t.requirement_id = r.requirement_id
                         WHERE t.user_id = ?
                           AND r.club_id = ?
                    ");
                    $delTx->execute([$target_id, $club_id]);
                    // Now delete the user
                    $del = $pdo->prepare("DELETE FROM users WHERE user_id = ? AND club_id = ?");
                    $del->execute([$target_id, $club_id]);
                } else if ($type === 'requirement') {
                    // Cascade delete all transactions for this requirement in the club
                    $delTx = $pdo->prepare("
                        DELETE t
                          FROM transactions t
                          JOIN requirements r ON t.requirement_id = r.requirement_id
                         WHERE t.requirement_id = ?
                           AND r.club_id = ?
                    ");
                    $delTx->execute([$target_id, $club_id]);
                    // Now delete the requirement
                    $del = $pdo->prepare("DELETE FROM requirements WHERE requirement_id = ? AND club_id = ?");
                    $del->execute([$target_id, $club_id]);
                } else if ($type === 'club') {
                    $del = $pdo->prepare("DELETE FROM club WHERE club_id = ?");
                    $del->execute([$club_id]);
                } else if ($type === 'transaction') {
                    // Only delete if the transaction belongs to a requirement in this club
                    $del = $pdo->prepare("
                        DELETE t
                          FROM transactions t
                          JOIN requirements r ON t.requirement_id = r.requirement_id
                         WHERE t.transaction_id = ?
                           AND r.club_id = ?
                    ");
                    $del->execute([$target_id, $club_id]);
                } else if ($type === 'attendance') {
                    // Delete attendance record
                    $del = $pdo->prepare("
                        DELETE ar
                          FROM attendance_records ar
                          JOIN requirements r ON ar.requirement_id = r.requirement_id
                         WHERE ar.attendance_id = ?
                           AND r.club_id = ?
                    ");
                    $del->execute([$target_id, $club_id]);
                }
            } else if ($approval_type === 'attendance_edit' && $type === 'attendance') {
                // Handle attendance edit requests
                $newData = null;
                if (!empty($req['edit_data'])) {
                    if (is_string($req['edit_data'])) {
                        $newData = json_decode($req['edit_data'], true);
                    } else {
                        $newData = $req['edit_data'];
                    }
                }

                if ($newData) {
                    $updateFields = [];
                    $updateValues = [];

                    if (isset($newData['attendance_status'])) {
                        $updateFields[] = "attendance_status = ?";
                        $updateValues[] = $newData['attendance_status'];
                    }
                    if (isset($newData['notes'])) {
                        $updateFields[] = "notes = ?";
                        $updateValues[] = $newData['notes'];
                    }
                    if (isset($newData['scan_datetime'])) {
                        $updateFields[] = "scan_datetime = ?";
                        $updateValues[] = $newData['scan_datetime'];
                    }

                    if (!empty($updateFields)) {
                        $updateValues[] = $target_id;
                        $updateValues[] = $club_id;

                        $updateSql = "
                            UPDATE attendance_records ar
                            JOIN requirements r ON ar.requirement_id = r.requirement_id
                            SET " . implode(", ", $updateFields) . "
                            WHERE ar.attendance_id = ? AND r.club_id = ?
                        ";
                        $updateStmt = $pdo->prepare($updateSql);
                        $updateStmt->execute($updateValues);
                    }
                }
            }

            $stmt = $pdo->prepare("UPDATE approval_requests SET status = 'approved', approved_by = ?, approved_at = NOW() WHERE request_id = ? AND club_id = ?");
            $stmt->execute([$_SESSION['user_id'], $rid, $actor['club_id']]);
            $pdo->commit();
            $results[] = ['request_id' => $rid, 'success' => true];
            notify_deletion_status($club_id, $rid, 'approved', $type, $target_id, $req['requested_by'], $_SESSION['user_id'], date('Y-m-d H:i:s'));
        } catch (PDOException $e) {
            if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
            error_log('Approval request failure: ' . $e->getMessage());
            $results[] = ['request_id' => $rid, 'error' => 'Request could not be completed.'];
        }
    }
    echo json_encode(['results' => $results]);
    exit;
}

if (!$request_id) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing request_id']);
    exit;
}

try {
    $pdo = db();
    $pdo->beginTransaction();
    $stmt = $pdo->prepare("SELECT * FROM approval_requests WHERE request_id = ? AND club_id = ? FOR UPDATE");
    $stmt->execute([$request_id, $actor['club_id']]);
    $req = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$req || $req['status'] !== 'pending') {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode(['error' => 'Request not found or already processed']);
        exit;
    }
    $type = $req['type'];
    $target_id = (int)$req['target_id'];
    $club_id = (int)$actor['club_id'];
    $approval_type = $req['approval_type'] ?? 'delete'; // Use approval_type instead of request_type

    // Handle different request types
    if ($approval_type === 'delete') {
        // Handle deletion requests
        if ($type === 'user') {
            // Cascade delete all transactions for this user in the club
            $delTx = $pdo->prepare("
                DELETE t
                  FROM transactions t
                  JOIN requirements r ON t.requirement_id = r.requirement_id
                 WHERE t.user_id = ?
                   AND r.club_id = ?
            ");
            $delTx->execute([$target_id, $club_id]);
            // Now delete the user
            $del = $pdo->prepare("DELETE FROM users WHERE user_id = ? AND club_id = ?");
            $del->execute([$target_id, $club_id]);
        } else if ($type === 'requirement') {
            // Cascade delete all transactions for this requirement in the club
            $delTx = $pdo->prepare("
                DELETE t
                  FROM transactions t
                  JOIN requirements r ON t.requirement_id = r.requirement_id
                 WHERE t.requirement_id = ?
                   AND r.club_id = ?
            ");
            $delTx->execute([$target_id, $club_id]);
            // Now delete the requirement
            $del = $pdo->prepare("DELETE FROM requirements WHERE requirement_id = ? AND club_id = ?");
            $del->execute([$target_id, $club_id]);
        } else if ($type === 'club') {
            $del = $pdo->prepare("DELETE FROM club WHERE club_id = ?");
            $del->execute([$club_id]);
        } else if ($type === 'transaction') {
            // Only delete if the transaction belongs to a requirement in this club
            $del = $pdo->prepare("
                DELETE t
                  FROM transactions t
                  JOIN requirements r ON t.requirement_id = r.requirement_id
                 WHERE t.transaction_id = ?
                   AND r.club_id = ?
            ");
            $del->execute([$target_id, $club_id]);
        } else if ($type === 'attendance') {
            // Delete attendance record
            $del = $pdo->prepare("
                DELETE ar
                  FROM attendance_records ar
                  JOIN requirements r ON ar.requirement_id = r.requirement_id
                 WHERE ar.attendance_id = ?
                   AND r.club_id = ?
            ");
            $del->execute([$target_id, $club_id]);
        }
    } else if ($approval_type === 'attendance_edit' && $type === 'attendance') {
        // Handle attendance edit requests
        $newData = null;
        if (!empty($req['edit_data'])) {
            if (is_string($req['edit_data'])) {
                $newData = json_decode($req['edit_data'], true);
            } else {
                $newData = $req['edit_data'];
            }
        }

        if ($newData) {
            $updateFields = [];
            $updateValues = [];

            if (isset($newData['attendance_status'])) {
                $updateFields[] = "attendance_status = ?";
                $updateValues[] = $newData['attendance_status'];
            }
            if (isset($newData['notes'])) {
                $updateFields[] = "notes = ?";
                $updateValues[] = $newData['notes'];
            }
            if (isset($newData['scan_datetime'])) {
                $updateFields[] = "scan_datetime = ?";
                $updateValues[] = $newData['scan_datetime'];
            }

            if (!empty($updateFields)) {
                $updateValues[] = $target_id;
                $updateValues[] = $club_id;

                $updateSql = "
                    UPDATE attendance_records ar
                    JOIN requirements r ON ar.requirement_id = r.requirement_id
                    SET " . implode(", ", $updateFields) . "
                    WHERE ar.attendance_id = ? AND r.club_id = ?
                ";
                $updateStmt = $pdo->prepare($updateSql);
                $updateStmt->execute($updateValues);
            }
        }
    }

    $stmt = $pdo->prepare("UPDATE approval_requests SET status = 'approved', approved_by = ?, approved_at = NOW() WHERE request_id = ? AND club_id = ?");
    $stmt->execute([$_SESSION['user_id'], $request_id, $actor['club_id']]);
    $pdo->commit();
    echo json_encode(['success' => true]);
    notify_deletion_status($club_id, $request_id, 'approved', $type, $target_id, $req['requested_by'], $_SESSION['user_id'], date('Y-m-d H:i:s'));
} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    error_log('IMSCCA request failure: ' . $e->getMessage());
    api_error(500, 'The request could not be completed.', 'SERVER_ERROR');
}

// After updating the request to approved, notify via node server
function notify_deletion_status($clubId, $requestId, $status, $type, $targetId, $requestedBy, $approvedBy, $approvedAt) {
    $data = [
        'clubId' => $clubId,
        'requestId' => $requestId,
        'status' => $status,
        'type' => $type,
        'targetId' => $targetId,
        'requestedBy' => $requestedBy,
        'approvedBy' => $approvedBy,
        'approvedAt' => $approvedAt
    ];
    $ch = curl_init('http://localhost:3001/notify-deletion-request-status');
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, socket_service_headers());
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_exec($ch);
    curl_close($ch);
}
