<?php
// generate_qr_code.php
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

$currentUserId = (int)$_SESSION['user_id'];
$clubId = (int)$_SESSION['club_id'];

try {
    $pdo = new PDO(
        "mysql:host=localhost;dbname=db_imscca;charset=utf8mb4",
        "root",
        "",
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // GET request - fetch existing QR code or generate new one if none exists
        $targetUserId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : $currentUserId;
        
        // Check permissions - only admins can generate for other users
        $role = strtolower($_SESSION['role'] ?? '');
        if ($targetUserId !== $currentUserId && !in_array($role, ['adviser', 'president', 'officer'])) {
            http_response_code(403);
            echo json_encode(['error' => 'Insufficient permissions']);
            exit;
        }

        // Verify target user exists and belongs to same club
        $stmt = $pdo->prepare("SELECT user_id, user_fname, user_lname FROM users WHERE user_id = ? AND club_id = ?");
        $stmt->execute([$targetUserId, $clubId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            http_response_code(404);
            echo json_encode(['error' => 'User not found']);
            exit;
        }

        // Try to get existing active QR code
        $stmt = $pdo->prepare("
            SELECT qr_id, qr_code_data, generated_at, is_active 
            FROM user_qr_codes 
            WHERE user_id = ? AND club_id = ? AND is_active = 1
            ORDER BY generated_at DESC
            LIMIT 1
        ");
        $stmt->execute([$targetUserId, $clubId]);
        $qrData = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$qrData) {
            // No existing QR code, generate one
            $qrCodeData = generateUniqueQRCode($pdo, $targetUserId, $clubId);
            
            // Insert new QR code record
            $stmt = $pdo->prepare("
                INSERT INTO user_qr_codes (user_id, qr_code_data, club_id, is_active) 
                VALUES (?, ?, ?, 1)
            ");
            $stmt->execute([$targetUserId, $qrCodeData, $clubId]);
            
            $qrId = $pdo->lastInsertId();
            $generatedAt = date('Y-m-d H:i:s');
        } else {
            $qrId = $qrData['qr_id'];
            $qrCodeData = $qrData['qr_code_data'];
            $generatedAt = $qrData['generated_at'];
        }
        
        echo json_encode([
            'qr_id' => (int)$qrId,
            'qr_code_data' => $qrCodeData,
            'generated_at' => $generatedAt,
            'is_active' => true,
            'user' => $user
        ]);

    } else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // POST request - generate new or regenerate QR code
        $input = json_decode(file_get_contents('php://input'), true);
        $targetUserId = isset($input['user_id']) ? (int)$input['user_id'] : $currentUserId;
        $regenerate = isset($input['regenerate']) ? (bool)$input['regenerate'] : false;
        
        // Check permissions - only admins can generate for other users
        $role = strtolower($_SESSION['role'] ?? '');
        if ($targetUserId !== $currentUserId && !in_array($role, ['adviser', 'president', 'officer'])) {
            http_response_code(403);
            echo json_encode(['error' => 'Insufficient permissions']);
            exit;
        }

        // Verify target user exists and belongs to same club
        $stmt = $pdo->prepare("SELECT user_id, user_fname, user_lname FROM users WHERE user_id = ? AND club_id = ?");
        $stmt->execute([$targetUserId, $clubId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            http_response_code(404);
            echo json_encode(['error' => 'User not found']);
            exit;
        }

        $pdo->beginTransaction();
        
        try {
            if ($regenerate) {
                // Deactivate existing QR codes
                $stmt = $pdo->prepare("
                    UPDATE user_qr_codes 
                    SET is_active = 0 
                    WHERE user_id = ? AND club_id = ?
                ");
                $stmt->execute([$targetUserId, $clubId]);
            }
            
            // Generate unique QR code data
            $qrCodeData = generateUniqueQRCode($pdo, $targetUserId, $clubId);
            
            // Insert new QR code record
            $stmt = $pdo->prepare("
                INSERT INTO user_qr_codes (user_id, qr_code_data, club_id, is_active) 
                VALUES (?, ?, ?, 1)
            ");
            $stmt->execute([$targetUserId, $qrCodeData, $clubId]);
            
            $qrId = $pdo->lastInsertId();
            $generatedAt = date('Y-m-d H:i:s');
            
            $pdo->commit();
            
            echo json_encode([
                'qr_id' => (int)$qrId,
                'qr_code_data' => $qrCodeData,
                'generated_at' => $generatedAt,
                'is_active' => true,
                'user' => $user,
                'action' => $regenerate ? 'regenerated' : 'generated'
            ]);
            
        } catch (Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
    } else {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

/**
 * Generate a unique QR code string for a user
 */
function generateUniqueQRCode($pdo, $userId, $clubId) {
    $maxAttempts = 10;
    $attempt = 0;
    
    while ($attempt < $maxAttempts) {
        // Create a unique string combining multiple factors
        $timestamp = time();
        $random = bin2hex(random_bytes(8));
        
        // Create a shorter, more manageable QR code data
        $qrCodeData = "CLUB{$clubId}_USER{$userId}_{$random}";
        
        // Check if this QR code already exists
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM user_qr_codes WHERE qr_code_data = ?");
        $stmt->execute([$qrCodeData]);
        
        if ($stmt->fetchColumn() == 0) {
            return $qrCodeData;
        }
        
        $attempt++;
        usleep(100000); // Wait 100ms before retrying
    }
    
    throw new Exception('Unable to generate unique QR code after multiple attempts');
}
?> 