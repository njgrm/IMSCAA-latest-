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
require_once __DIR__ . '/requirement_status.php';
header('Content-Type: application/json; charset=utf-8');

$requestMethod = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
if (in_array($requestMethod, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
    $remote = (string)($_SERVER['REMOTE_ADDR'] ?? '');
    $trustedProxy = in_array($remote, ['127.0.0.1', '::1'], true);
    // The browser's own Origin is the claim under test; it is matched against
    // the addresses this app is actually served from. Only local hops are
    // trusted to describe those addresses, never the caller.
    $origin = strtolower(trim((string)($_SERVER['HTTP_ORIGIN'] ?? '')));
    if ($origin !== '') {
        $host = strtolower((string)parse_url($origin, PHP_URL_HOST));
        $forwarded = $trustedProxy
            ? (string)($_SERVER['HTTP_X_FORWARDED_HOST'] ?? ($_SERVER['HTTP_X_IMSCCA_ORIGIN_HOST'] ?? ''))
            : '';
        $server = strtolower((string)preg_replace('/:\d+$/', '', $forwarded ?: ($_SERVER['HTTP_HOST'] ?? '')));

        // Through a dev tunnel the app is addressed twice: the relay reports the
        // public tunnel host as the forward target, while the browser's
        // same-origin Origin header and the dev server's own connection both
        // read as the local dev-server origin. Both are this app, so both are
        // accepted; a foreign page's Origin matches neither.
        $https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
        $scheme = $https ? 'https' : 'http';
        $allowedOrigins = [];
        if ($trustedProxy) {
            $forwardedHost = strtolower(trim($forwarded));
            if ($forwardedHost !== '') {
                $forwardedProto = strtolower((string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ($_SERVER['HTTP_X_IMSCCA_ORIGIN_PROTO'] ?? '')));
                $allowedOrigins[] = ($forwardedProto === 'http' ? 'http' : 'https') . '://' . $forwardedHost;
                $allowedOrigins[] = $scheme . '://' . $forwardedHost;
            }
            $proxyOrigin = strtolower(trim((string)($_SERVER['HTTP_X_IMSCCA_ORIGINAL_ORIGIN'] ?? '')));
            if ($proxyOrigin !== '') $allowedOrigins[] = $proxyOrigin;
        }
        $httpHost = strtolower(trim((string)($_SERVER['HTTP_HOST'] ?? '')));
        if ($httpHost !== '') $allowedOrigins[] = $scheme . '://' . $httpHost;

        $localHosts = ['localhost', '127.0.0.1', '::1'];
        $allowed = $host !== '' && (in_array($origin, array_unique($allowedOrigins), true)
            || $host === $server
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

// Trusts a forwarded client address only from the local reverse proxy, which
// overwrites the header. Direct callers always use their real peer address.
function client_ip(): string
{
    $remote = (string)($_SERVER['REMOTE_ADDR'] ?? '');
    if (in_array($remote, ['127.0.0.1', '::1'], true)) {
        $forwarded = trim((string)($_SERVER['HTTP_X_FORWARDED_FOR'] ?? ''));
        if ($forwarded !== '') {
            $first = trim(explode(',', $forwarded)[0]);
            if (filter_var($first, FILTER_VALIDATE_IP)) return $first;
        }
    }
    return $remote !== '' ? $remote : 'unknown';
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

// Appends to the attendance audit trail. No-ops when nothing actually changes,
// so callers can invoke it unconditionally after a write.
function record_attendance_status_change(PDO $pdo, int $attendanceId, ?string $oldStatus, string $newStatus, ?int $changedBy, string $reason): void
{
    if ($oldStatus === $newStatus) return;
    if (!in_array($reason, ['manual', 'auto_absent', 'correction'], true)) $reason = 'manual';
    $stmt = $pdo->prepare(
        'INSERT INTO attendance_status_history (record_id, old_status, new_status, change_reason, changed_by)
         VALUES (?, ?, ?, ?, ?)'
    );
    $stmt->execute([$attendanceId, $oldStatus, $newStatus, $reason, $changedBy]);
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

function payment_status(float $amountPaid, float $amountDue): string
{
    if ($amountPaid <= 0) return 'unpaid';
    return $amountPaid < $amountDue ? 'partial' : 'paid';
}

function refresh_transaction_totals(PDO $pdo, int $transactionId): array
{
    $stmt = $pdo->prepare(
        'SELECT t.amount_due, COALESCE(SUM(CASE WHEN p.is_voided = 0 THEN p.amount ELSE 0 END), 0) AS amount_paid
         FROM transactions t
         LEFT JOIN transaction_payments p ON p.transaction_id = t.transaction_id
         WHERE t.transaction_id = ? GROUP BY t.transaction_id, t.amount_due'
    );
    $stmt->execute([$transactionId]);
    $totals = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$totals) api_error(404, 'Transaction was not found.', 'TRANSACTION_NOT_FOUND');
    $due = (float)$totals['amount_due'];
    $paid = (float)$totals['amount_paid'];
    $status = payment_status($paid, $due);
    $update = $pdo->prepare('UPDATE transactions SET amount_paid=?, payment_status=? WHERE transaction_id=?');
    $update->execute([$paid, $status, $transactionId]);
    return ['amount_due' => $due, 'amount_paid' => $paid, 'balance' => max($due - $paid, 0), 'payment_status' => $status];
}

// The web server runs as LocalSystem while the Node socket service runs as the
// interactive user, so their temp directories differ. The shared secret must live
// somewhere both accounts can reach; XAMPP's own temp dir is used by both.
const IMSCCA_SOCKET_SHARED_DIR = 'D:/XAMPP/tmp';

function socket_secret_path(): string
{
    $explicit = getenv('IMSCCA_SOCKET_SECRET_FILE');
    if (is_string($explicit) && $explicit !== '') return $explicit;

    $sharedDir = getenv('IMSCCA_SHARED_DIR');
    if (!is_string($sharedDir) || $sharedDir === '') $sharedDir = IMSCCA_SOCKET_SHARED_DIR;
    if (!is_dir($sharedDir)) @mkdir($sharedDir, 0777, true);
    if (is_dir($sharedDir) && is_writable($sharedDir)) {
        return rtrim($sharedDir, '\\/') . DIRECTORY_SEPARATOR . 'imscca-socket-secret';
    }

    error_log('IMSCCA socket secret: shared directory unavailable, falling back to the process temp directory.');
    return rtrim(sys_get_temp_dir(), '\\/') . DIRECTORY_SEPARATOR . 'imscca-socket-secret';
}

function socket_secret(): string
{
    static $cached = null;
    if (is_string($cached) && strlen($cached) >= 32) return $cached;

    $configured = getenv('IMSCCA_SOCKET_SECRET');
    if (is_string($configured) && strlen($configured) >= 32) return $cached = $configured;

    $path = socket_secret_path();
    $secret = is_file($path) ? trim((string)file_get_contents($path)) : '';
    if (strlen($secret) >= 32) return $cached = $secret;

    $generated = bin2hex(random_bytes(32));
    $handle = @fopen($path, 'x');
    if ($handle === false) {
        // Another process may have created it first; reuse whatever is on disk.
        $existing = is_file($path) ? trim((string)file_get_contents($path)) : '';
        if (strlen($existing) >= 32) return $cached = $existing;
        error_log('IMSCCA socket secret: unable to persist the shared secret at ' . $path);
        return $cached = $generated;
    }
    fwrite($handle, $generated);
    fclose($handle);
    return $cached = $generated;
}

function socket_service_headers(): array
{
    return ['Content-Type: application/json', 'X-IMSCCA-Socket-Secret: ' . socket_secret()];
}

// Broadcasts to the Node socket service and reports failure instead of dropping it.
function socket_notify(string $path, array $payload): bool
{
    $ch = curl_init('http://127.0.0.1:3001' . $path);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, socket_service_headers());
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 3);
    $response = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = (string)curl_error($ch);
    curl_close($ch);

    if ($response === false || $status < 200 || $status >= 300) {
        error_log(sprintf(
            'IMSCCA socket notification failed for %s (status=%d, curl=%s); live updates were not delivered.',
            $path,
            $status,
            $curlError !== '' ? $curlError : 'none'
        ));
        return false;
    }
    return true;
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
