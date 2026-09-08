<?php
declare(strict_types=1);

date_default_timezone_set(getenv('IMSCCA_TIMEZONE') ?: 'Asia/Manila');

if (session_status() !== PHP_SESSION_ACTIVE) {
    $remote = (string)($_SERVER['REMOTE_ADDR'] ?? '');
    $trustedProxy = in_array($remote, ['127.0.0.1', '::1'], true);
    $forwardedProto = $trustedProxy ? strtolower((string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ($_SERVER['HTTP_X_IMSCCA_ORIGIN_PROTO'] ?? ''))) : '';
    $forwardedHost = $trustedProxy ? strtolower((string)($_SERVER['HTTP_X_FORWARDED_HOST'] ?? ($_SERVER['HTTP_X_IMSCCA_ORIGIN_HOST'] ?? ''))) : '';
    $forwardedHttps = $forwardedHost !== '' && preg_match('/(^|\.)devtunnels\.ms(?::\d+)?$/', $forwardedHost);
    $sessionPath = getenv('IMSCCA_SESSION_PATH');
    if (!$sessionPath && !is_writable(session_save_path())) {
        $sessionPath = rtrim(sys_get_temp_dir(), '\\/') . DIRECTORY_SEPARATOR . 'imscca-php-sessions';
    }
    if ($sessionPath) {
        if (!is_dir($sessionPath)) @mkdir($sessionPath, 0700, true);
        if (is_dir($sessionPath) && is_writable($sessionPath)) session_save_path($sessionPath);
    }
    session_set_cookie_params([
        'httponly' => true,
        'secure' => $forwardedProto === 'https' || $forwardedHttps || (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
        'samesite' => $forwardedHttps ? 'None' : 'Lax',
        'path' => '/',
    ]);
    session_start();
}

require_once __DIR__ . '/cors.php';
header('Content-Type: application/json; charset=utf-8');

$requestMethod = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
if (in_array($requestMethod, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
    $remote = (string)($_SERVER['REMOTE_ADDR'] ?? '');
    $trustedProxy = in_array($remote, ['127.0.0.1', '::1'], true);
    $origin = trim((string)(($trustedProxy ? ($_SERVER['HTTP_X_IMSCCA_ORIGINAL_ORIGIN'] ?? null) : null) ?? ($_SERVER['HTTP_ORIGIN'] ?? '')));
    if ($origin !== '') {
        $host = strtolower((string)parse_url($origin, PHP_URL_HOST));
        $forwarded = $trustedProxy
            ? (string)($_SERVER['HTTP_X_FORWARDED_HOST'] ?? ($_SERVER['HTTP_X_IMSCCA_ORIGIN_HOST'] ?? ''))
            : '';
        $server = strtolower((string)preg_replace('/:\d+$/', '', $forwarded ?: ($_SERVER['HTTP_HOST'] ?? '')));
        $localHosts = ['localhost', '127.0.0.1', '::1'];
        $allowed = $host !== '' && ($host === $server
            || (in_array($host, $localHosts, true) && in_array($server, $localHosts, true)));
        if (!$allowed) api_error(403, 'Request origin is not allowed.', 'ORIGIN_FORBIDDEN');
    }
}

$GLOBALS['imscca_audit_written'] = false;
$GLOBALS['imscca_audit_registered'] = false;

function api_error(int $status, string $message, string $code): never
{
    http_response_code($status);
    echo json_encode(['success' => false, 'error' => $message, 'code' => $code]);
    exit;
}

function require_method(string ...$methods): void
{
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    if ($method === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
    if (!in_array($method, $methods, true)) {
        header('Allow: ' . implode(', ', $methods));
        api_error(405, 'Method not allowed.', 'METHOD_NOT_ALLOWED');
    }
}

function current_actor(): array
{
    if (empty($_SESSION['user_id']) || empty($_SESSION['club_id']) || empty($_SESSION['role'])) {
        api_error(401, 'Authentication required.', 'AUTH_REQUIRED');
    }
    $actor = [
        'user_id' => (int)$_SESSION['user_id'],
        'club_id' => (int)$_SESSION['club_id'],
        'role' => strtolower((string)$_SESSION['role']),
    ];
    register_request_audit($actor);
    return $actor;
}

function require_roles(string ...$roles): array
{
    $actor = current_actor();
    if (!in_array($actor['role'], $roles, true)) {
        api_error(403, 'You are not allowed to perform this action.', 'FORBIDDEN');
    }
    return $actor;
}

function require_operator(): array
{
    return require_roles('adviser', 'president', 'officer');
}

function db(): PDO
{
    static $pdo;
    if ($pdo instanceof PDO) return $pdo;
    $host = getenv('IMSCCA_DB_HOST') ?: '127.0.0.1';
    $name = getenv('IMSCCA_DB_NAME') ?: 'db_imscca';
    $user = getenv('IMSCCA_DB_USER') ?: 'root';
    $pass = getenv('IMSCCA_DB_PASSWORD') ?: '';
    $pdo = new PDO("mysql:host={$host};dbname={$name};charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}

function json_body(): array
{
    $body = json_decode((string)file_get_contents('php://input'), true);
    if (!is_array($body)) api_error(400, 'Invalid JSON body.', 'INVALID_JSON');
    return $body;
}

function validate_payment_state(float $amountPaid, string $status, float $amountDue): void
{
    if ($amountPaid < 0) api_error(400, 'Amount paid cannot be negative.', 'INVALID_AMOUNT_PAID');
    if ($amountPaid > $amountDue) api_error(400, 'Amount paid cannot exceed amount due.', 'AMOUNT_EXCEEDS_DUE');
    $expected = $amountPaid <= 0 ? 'unpaid' : ($amountPaid < $amountDue ? 'partial' : 'paid');
    if ($status !== $expected) {
        api_error(400, "Payment status must be {$expected} for the supplied amount.", 'PAYMENT_STATUS_MISMATCH');
    }
}

function socket_secret(): string
{
    $configured = getenv('IMSCCA_SOCKET_SECRET');
    if (is_string($configured) && strlen($configured) >= 32) return $configured;
    $path = rtrim(sys_get_temp_dir(), '\\/') . DIRECTORY_SEPARATOR . 'imscca-socket-secret';
    $secret = is_file($path) ? trim((string)file_get_contents($path)) : '';
    if (strlen($secret) < 32) {
        $secret = bin2hex(random_bytes(32));
        file_put_contents($path, $secret, LOCK_EX);
    }
    return $secret;
}

function socket_service_headers(): array
{
    return ['Content-Type: application/json', 'X-IMSCCA-Socket-Secret: ' . socket_secret()];
}

function audit_event(PDO $pdo, array $actor, string $action, string $entityType, ?int $entityId = null, ?int $subjectUserId = null, array $metadata = []): void
{
    $blocked = ['password', 'token', 'session', 'qr_code_data'];
    foreach ($blocked as $key) unset($metadata[$key]);
    $stmt = $pdo->prepare('INSERT INTO audit_log (club_id, actor_user_id, subject_user_id, action, entity_type, entity_id, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([$actor['club_id'], $actor['user_id'], $subjectUserId, $action, $entityType, $entityId, $metadata ? json_encode($metadata) : null]);
    $GLOBALS['imscca_audit_written'] = true;
}

function register_request_audit(array $actor): void
{
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    if (!in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true) || $GLOBALS['imscca_audit_registered']) return;
    $GLOBALS['imscca_audit_registered'] = true;
    register_shutdown_function(function () use ($actor, $method): void {
        $status = http_response_code();
        if ($GLOBALS['imscca_audit_written'] || $status < 200 || $status >= 300) return;
        $entity = pathinfo($_SERVER['SCRIPT_NAME'] ?? 'request', PATHINFO_FILENAME);
        $raw = json_decode((string)file_get_contents('php://input'), true);
        $raw = is_array($raw) ? $raw : [];
        $id = null;
        foreach (['user_id','requirement_id','transaction_id','attendance_id','request_id','slot_id','event_id'] as $key) {
            $value = $raw[$key] ?? $_GET[$key] ?? null;
            if ($value !== null && (int)$value > 0) { $id = (int)$value; break; }
        }
        $subject = isset($raw['user_id']) ? (int)$raw['user_id'] : null;
        try { audit_event(db(), $actor, $entity, $entity, $id, $subject, ['method' => $method]); }
        catch (Throwable $e) { error_log('IMSCCA audit failure: ' . $e->getMessage()); }
    });
}
