    <?php
    require_once __DIR__ . '/bootstrap.php'; require_method('POST'); $actor=require_operator();
    // verify_qr_code.php
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

    $scannerUserId = (int)$_SESSION['user_id'];
    $clubId = (int)$_SESSION['club_id'];

    // Check permissions - only admins can scan QR codes
    $role = strtolower($_SESSION['role'] ?? '');
    if (!in_array($role, ['adviser', 'president', 'officer'])) {
        http_response_code(403);
        echo json_encode(['error' => 'Insufficient permissions. Only admins can scan QR codes.']);
        exit;
    }

    // Parse input
    $input = json_decode(file_get_contents('php://input'), true);
    $qrCodeData = trim($input['qr_code_data'] ?? '');

    if (empty($qrCodeData)) {
        http_response_code(400);
        echo json_encode(['error' => 'QR code data is required']);
        exit;
    }

    try {
        $pdo = db();

        // Verify QR code and get user information
        $stmt = $pdo->prepare("
            SELECT
                uqr.user_id,
                uqr.qr_code_data,
                uqr.generated_at,
                u.user_fname,
                u.user_lname,
                u.school_id,
                u.user_course,
                u.user_year,
                u.user_section,
                u.email,
                u.role,
                u.avatar,
                u.club_id
            FROM user_qr_codes uqr
            JOIN users u ON uqr.user_id = u.user_id
            WHERE uqr.qr_code_data = ?
            AND uqr.is_active = 1
            AND uqr.club_id = ?
            AND u.club_id = ?
        ");
        $stmt->execute([$qrCodeData, $clubId, $clubId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$result) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Invalid or inactive QR code'
            ]);
            exit;
        }

        // Get current active events for attendance options
        $stmt = $pdo->prepare("
            SELECT
                requirement_id,
                title,
                description,
                start_datetime,
                end_datetime,
                location,
                status
            FROM requirements
            WHERE club_id = ?
            AND requirement_type = 'event'
            AND status IN ('scheduled', 'ongoing')
            AND DATE(start_datetime) <= CURDATE()
            AND DATE(end_datetime) >= CURDATE()
            ORDER BY start_datetime ASC
        ");
        $stmt->execute([$clubId]);
        $activeEvents = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // For each event, get available time slots
        $eventsWithSlots = [];
        foreach ($activeEvents as $event) {
            $stmt = $pdo->prepare("
                SELECT
                    slot_id,
                    slot_name,
                    start_time,
                    end_time,
                    date
                FROM attendance_time_slots
                WHERE requirement_id = ?
                AND is_active = 1
                AND date = CURDATE()
                ORDER BY start_time ASC
            ");
            $stmt->execute([$event['requirement_id']]);
            $timeSlots = $stmt->fetchAll(PDO::FETCH_ASSOC);

            error_log("Event ID " . $event['requirement_id'] . " has " . count($timeSlots) . " time slots for today");
            if (!empty($timeSlots)) {
                error_log("Time slots: " . json_encode($timeSlots));
            }

            $event['time_slots'] = $timeSlots;
            $eventsWithSlots[] = $event;
        }

        // Check if user already has attendance records for today's events
        $attendanceRecords = [];
        if (!empty($activeEvents)) {
            $eventIds = array_column($activeEvents, 'requirement_id');
            $placeholders = str_repeat('?,', count($eventIds) - 1) . '?';

            $stmt = $pdo->prepare("
                SELECT
                    ar.attendance_id,
                    ar.user_id,
                    ar.requirement_id,
                    ar.slot_id,
                    ar.verified_by,
                    ar.club_id,
                    ar.scan_datetime,
                    ar.attendance_status,
                    ar.notes,
                    u.user_fname,
                    u.user_lname,
                    u.school_id,
                    r.title as event_title,
                    ts.slot_name,
                    ts.start_time,
                    ts.end_time,
                    ts.date as slot_date,
                    v.user_fname as verifier_fname,
                    v.user_lname as verifier_lname
                FROM attendance_records ar
                INNER JOIN users u ON ar.user_id = u.user_id
                INNER JOIN requirements r ON ar.requirement_id = r.requirement_id
                LEFT JOIN attendance_time_slots ts ON ar.slot_id = ts.slot_id
                INNER JOIN users v ON ar.verified_by = v.user_id
                WHERE ar.user_id = ?
                AND ar.requirement_id IN ($placeholders)
                AND DATE(ar.scan_datetime) = CURDATE()
            ");
            $stmt->execute(array_merge([$result['user_id']], $eventIds));
            $attendanceRecords = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        echo json_encode([
            'success' => true,
            'user' => [
                'user_id' => $result['user_id'],
                'user_fname' => $result['user_fname'],
                'user_lname' => $result['user_lname'],
                'school_id' => $result['school_id'],
                'course' => $result['user_course'],
                'year' => $result['user_year'],
                'section' => $result['user_section'],
                'email' => $result['email'],
                'role' => $result['role'],
                'avatar' => $result['avatar']
            ],
            'qr_info' => [
                'qr_code_data' => $result['qr_code_data'],
                'generated_at' => $result['generated_at']
            ],
            'active_events' => $eventsWithSlots,
            'existing_attendance' => $attendanceRecords,
            'scanner_info' => [
                'scanner_user_id' => $scannerUserId,
                'scan_time' => date('Y-m-d H:i:s')
            ]
        ]);

    } catch (PDOException $e) {
        http_response_code(500);
        error_log('IMSCCA request failure: ' . $e->getMessage());
        api_error(500, 'The request could not be completed.', 'SERVER_ERROR');
    } catch (Exception $e) {
        http_response_code(500);
        error_log('IMSCCA request failure: ' . $e->getMessage());
        api_error(500, 'The request could not be completed.', 'SERVER_ERROR');
    }
    ?>
