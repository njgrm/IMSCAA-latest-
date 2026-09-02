<?php
// debug_requirement_registration.php
error_reporting(E_ALL);
ini_set('display_errors', 1);
require_once __DIR__ . '/cors.php';
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json");

// Log to file
function debug_log($message) {
    file_put_contents('debug.log', date('Y-m-d H:i:s') . " - " . $message . "\n", FILE_APPEND);
}

debug_log("Script started");
debug_log("REQUEST_METHOD: " . $_SERVER['REQUEST_METHOD']);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    debug_log("OPTIONS request - sending 200");
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    debug_log("Not a POST request - sending 405");
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed. Only POST requests are accepted.']);
    exit;
}

session_start();
debug_log("Session started");
debug_log("Session data: " . print_r($_SESSION, true));

// Check authentication
if (empty($_SESSION['user_id']) || empty($_SESSION['club_id'])) {
    debug_log("Authentication failed");
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated']);
    exit;
}

$userId = (int)$_SESSION['user_id'];
$clubId = (int)$_SESSION['club_id'];
$userRole = strtolower($_SESSION['role'] ?? '');

debug_log("User ID: $userId, Club ID: $clubId, Role: $userRole");

// Check if user has permission
if (!in_array($userRole, ['adviser', 'president', 'officer'])) {
    debug_log("Permission denied for role: $userRole");
    http_response_code(403);
    echo json_encode(['error' => 'You do not have permission to create requirements']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
debug_log("Raw input: " . file_get_contents('php://input'));
debug_log("Parsed input: " . print_r($input, true));

if ($input === null) {
    debug_log("JSON parsing failed");
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON input']);
    exit;
}

// Extract fields
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

debug_log("Processed fields - Title: $title, Type: $requirementType, Selected users: " . implode(',', $selectedUsers));

// Basic validation
if (!$title) {
    debug_log("Title missing");
    http_response_code(400);
    echo json_encode(['error' => 'Title is required']);
    exit;
}

if (!in_array($requirementType, ['event', 'activity', 'fee'])) {
    debug_log("Invalid requirement type: $requirementType");
    http_response_code(400);
    echo json_encode(['error' => 'Invalid requirement type']);
    exit;
}

try {
    debug_log("Attempting database connection");
    $pdo = new PDO("mysql:host=127.0.0.1;dbname=db_imscca;charset=utf8mb4", "root", "", [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    debug_log("Database connected successfully");

    // Start transaction
    $pdo->beginTransaction();
    debug_log("Transaction started");

    // Insert the requirement
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
    debug_log("Requirement inserted with ID: $requirementId");

    $registeredCount = 0;

    // Handle registrations for events/activities
    if (in_array($requirementType, ['event', 'activity']) && !empty($selectedUsers)) {
        debug_log("Processing registrations for " . count($selectedUsers) . " users");
        
        // Filter out advisers
        $stmt = $pdo->prepare("
            SELECT user_id, role FROM users 
            WHERE user_id IN (" . implode(',', array_fill(0, count($selectedUsers), '?')) . ") 
            AND club_id = ?
        ");
        $params = array_merge($selectedUsers, [$clubId]);
        $stmt->execute($params);
        $validUsers = $stmt->fetchAll();

        debug_log("Found " . count($validUsers) . " valid users in database");

        $eligibleUsers = array_filter($validUsers, function($user) {
            return strtolower($user['role']) !== 'adviser';
        });

        debug_log("Found " . count($eligibleUsers) . " eligible users (excluding advisers)");

        if (!empty($eligibleUsers)) {
            $insertStmt = $pdo->prepare("
                INSERT INTO event_registrations (user_id, requirement_id, registered_by, registered_at) 
                VALUES (?, ?, ?, NOW())
            ");

            foreach ($eligibleUsers as $user) {
                try {
                    $insertStmt->execute([$user['user_id'], $requirementId, $userId]);
                    $registeredCount++;
                    debug_log("Registered user ID: " . $user['user_id']);
                } catch (PDOException $e) {
                    debug_log("Registration error for user " . $user['user_id'] . ": " . $e->getMessage());
                    if ($e->getCode() !== '23000') {
                        throw $e;
                    }
                }
            }
        }
    }

    // Commit transaction
    $pdo->commit();
    debug_log("Transaction committed successfully");

    $message = 'Requirement created successfully';
    if (in_array($requirementType, ['event', 'activity'])) {
        $message .= " with {$registeredCount} user registrations";
        if ($registeredCount < count($selectedUsers)) {
            $message .= " (advisers excluded from registration)";
        }
    }

    debug_log("Success: $message");

    echo json_encode([
        'success' => true,
        'requirement_id' => $requirementId,
        'message' => $message,
        'registered_users' => $registeredCount,
        'selected_users' => count($selectedUsers)
    ]);

} catch (PDOException $e) {
    debug_log("Database error: " . $e->getMessage());
    if (isset($pdo)) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
} catch (Exception $e) {
    debug_log("General error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'An error occurred: ' . $e->getMessage()]);
}
?> 