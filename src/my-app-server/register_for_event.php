<?php
require_once __DIR__ . '/bootstrap.php'; require_method('POST','DELETE'); $actor=require_roles('member');
// register_for_event.php
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

// Check authentication
if (empty($_SESSION['user_id']) || empty($_SESSION['club_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated']);
    exit;
}

$userId = (int)$_SESSION['user_id'];
$clubId = (int)$_SESSION['club_id'];

try {
    $pdo = db();

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $eventId = isset($input['event_id'])
            ? (int)$input['event_id']
            : (int)($input['requirement_id'] ?? 0);

        if (!$eventId) {
            http_response_code(400);
            echo json_encode(['error' => 'Event ID is required']);
            exit;
        }

        // Check if event exists and is an event type
        $stmt = $pdo->prepare("
            SELECT requirement_id, title, requirement_type, status, end_datetime
            FROM requirements
            WHERE requirement_id = ? AND club_id = ? AND requirement_type = 'event'
        ");
        $stmt->execute([$eventId, $clubId]);
        $event = $stmt->fetch();

        if (!$event) {
            http_response_code(404);
            echo json_encode(['error' => 'Event not found']);
            exit;
        }

        // Check if event is still open for registration
        if ($event['status'] === 'completed' || $event['status'] === 'canceled') {
            http_response_code(400);
            echo json_encode(['error' => 'Event is no longer open for registration']);
            exit;
        }

        // Check if already registered
        $stmt = $pdo->prepare("
            SELECT registration_id FROM event_registrations
            WHERE user_id = ? AND requirement_id = ?
        ");
        $stmt->execute([$userId, $eventId]);
        $existing = $stmt->fetch();

        if ($existing) {
            // Already registered - unregister
            $stmt = $pdo->prepare("
                DELETE FROM event_registrations
                WHERE user_id = ? AND requirement_id = ?
            ");
            $stmt->execute([$userId, $eventId]);

            echo json_encode([
                'success' => true,
                'message' => 'Successfully unregistered from event',
                'action' => 'unregistered'
            ]);
        } else {
            // Not registered - register
            $stmt = $pdo->prepare("
                INSERT INTO event_registrations (user_id, requirement_id, registered_by, registered_at)
                VALUES (?, ?, ?, NOW())
            ");
            $stmt->execute([$userId, $eventId, $userId]);

            echo json_encode([
                'success' => true,
                'message' => 'Successfully registered for event',
                'action' => 'registered'
            ]);
        }

    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $eventId = isset($_GET['event_id']) ? (int)$_GET['event_id'] : 0;

        if (!$eventId) {
            http_response_code(400);
            echo json_encode(['error' => 'Event ID is required']);
            exit;
        }

        // Unregister user from the event
        $stmt = $pdo->prepare("
            DELETE FROM event_registrations
            WHERE user_id = ? AND requirement_id = ?
        ");
        $stmt->execute([$userId, $eventId]);

        echo json_encode([
            'success' => true,
            'message' => 'Successfully unregistered from event'
        ]);

    } elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Get user's registrations
        $stmt = $pdo->prepare("
            SELECT
                er.registration_id,
                er.requirement_id,
                er.registered_at,
                r.title,
                r.description,
                r.start_datetime,
                r.end_datetime,
                r.location,
                r.status
            FROM event_registrations er
            INNER JOIN requirements r ON er.requirement_id = r.requirement_id
            WHERE er.user_id = ? AND r.club_id = ?
            ORDER BY r.start_datetime ASC
        ");
        $stmt->execute([$userId, $clubId]);
        $registrations = $stmt->fetchAll();

        echo json_encode($registrations);
    } else {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
    }

} catch (PDOException $e) {
    error_log("Database error in register_for_event.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Database error occurred']);
} catch (Exception $e) {
    error_log("Error in register_for_event.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'An error occurred while processing your request']);
}
?>
