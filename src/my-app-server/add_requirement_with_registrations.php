<?php
// add_requirement_with_registrations.php
ini_set('display_errors', 1);
error_reporting(E_ALL);
require_once __DIR__ . '/cors.php';
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

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed. Only POST requests are accepted.']);
    exit;
}

$userId = (int)$_SESSION['user_id'];
$clubId = (int)$_SESSION['club_id'];

// Check if user has permission 
$userRole = strtolower($_SESSION['role'] ?? '');
if (!in_array($userRole, ['adviser', 'president', 'officer'])) {
    http_response_code(403);
    echo json_encode(['error' => 'You do not have permission to create requirements']);
    exit;
}

try {
    $pdo = new PDO("mysql:host=127.0.0.1;dbname=db_imscca;charset=utf8mb4", "root", "", [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    $input = json_decode(file_get_contents('php://input'), true);
    
    if ($input === null) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON input']);
        exit;
    }

    $title = trim($input['title'] ?? '');
    $description = trim($input['description'] ?? '');
    $startDatetime = $input['start_datetime'] ?? '';
    $endDatetime = $input['end_datetime'] ?? '';
    $location = trim($input['location'] ?? '');
    $requirementType = $input['requirement_type'] ?? '';
    $status = $input['status'] ?? 'scheduled';
    $reqPicture = $input['req_picture'] ?? '';
    $amountDue = (float)($input['amount_due'] ?? 0);
    $selectedUsers = $input['selected_users'] ?? [];

    if (!$title) {
        http_response_code(400);
        echo json_encode(['error' => 'Title is required']);
        exit;
    }

    if (!$description) {
        http_response_code(400);
        echo json_encode(['error' => 'Description is required']);
        exit;
    }

    if (!$startDatetime) {
        http_response_code(400);
        echo json_encode(['error' => 'Start date is required']);
        exit;
    }

    if (!$endDatetime) {
        http_response_code(400);
        echo json_encode(['error' => 'End date is required']);
        exit;
    }

    if (!in_array($requirementType, ['event', 'activity', 'fee'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid requirement type']);
        exit;
    }

    if (!in_array($status, ['scheduled', 'ongoing', 'canceled', 'completed'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid status']);
        exit;
    }

    if (in_array($requirementType, ['event', 'activity']) && empty($selectedUsers)) {
        http_response_code(400);
        echo json_encode(['error' => 'Please select at least one user for this event/activity']);
        exit;
    }

    $pdo->beginTransaction();

    try {
        $stmt = $pdo->prepare("
            INSERT INTO requirements (
                title, description, start_datetime, end_datetime, location, 
                requirement_type, status, club_id, amount_due, req_picture
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $title, $description, $startDatetime, $endDatetime, $location,
            $requirementType, $status, $clubId, $amountDue, $reqPicture
        ]);

        $requirementId = $pdo->lastInsertId();
        $registeredCount = 0;

        // If this is an event or activity with selected users, register
        if (in_array($requirementType, ['event', 'activity']) && !empty($selectedUsers)) {
            $stmt = $pdo->prepare("
                SELECT user_id, role FROM users 
                WHERE user_id IN (" . implode(',', array_fill(0, count($selectedUsers), '?')) . ") 
                AND club_id = ?
            ");
            $params = array_merge($selectedUsers, [$clubId]);
            $stmt->execute($params);
            $validUsers = $stmt->fetchAll();

            // Filter out advisers
            $eligibleUsers = array_filter($validUsers, function($user) {
                return strtolower($user['role']) !== 'adviser';
            });

            if (!empty($eligibleUsers)) {
                $insertStmt = $pdo->prepare("
                    INSERT INTO event_registrations (user_id, requirement_id, registered_by, registered_at) 
                    VALUES (?, ?, ?, NOW())
                ");

                foreach ($eligibleUsers as $user) {
                    try {
                        $insertStmt->execute([$user['user_id'], $requirementId, $userId]);
                        $registeredCount++;
                    } catch (PDOException $e) {
                        // Skip if already registered (duplicate key error)
                        if ($e->getCode() !== '23000') {
                            throw $e;
                        }
                    }
                }
            }
        }

        // Commit transaction
        $pdo->commit();

        $message = 'Requirement created successfully';
        if (in_array($requirementType, ['event', 'activity'])) {
            $message .= " with {$registeredCount} user registrations";
            if ($registeredCount < count($selectedUsers)) {
                $message .= " (advisers excluded from registration)";
            }
        }

        echo json_encode([
            'success' => true,
            'requirement_id' => $requirementId,
            'message' => $message,
            'registered_users' => $registeredCount,
            'selected_users' => count($selectedUsers)
        ]);

    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }

} catch (PDOException $e) {
    error_log("Database error in add_requirement_with_registrations.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
} catch (Exception $e) {
    error_log("Error in add_requirement_with_registrations.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'An error occurred: ' . $e->getMessage()]);
}
?> 