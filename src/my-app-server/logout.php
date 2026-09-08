<?php
require_once __DIR__ . '/bootstrap.php';
require_method('POST');
$actor = current_actor();
ini_set('display_errors', 0);
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);

try {
  // 4) Unset all session variables
  $_SESSION = [];

  // 5) Destroy session cookie on client
  if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(
      session_name(),
      '',
      time() - 42000,
      $params["path"],
      $params["domain"],
      $params["secure"],
      $params["httponly"]
    );
  }

  // 6) Destroy the session
  session_destroy();

  // 7) Return success
  echo json_encode(['success' => true, 'message' => 'Logged out successfully']);
} catch (Exception $e) {
  error_log('logout.php error: ' . $e->getMessage());
  api_error(500, 'Unable to log out.', 'LOGOUT_FAILED');
}
