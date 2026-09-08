<?php
require_once __DIR__ . '/bootstrap.php'; require_method('POST'); $actor=require_operator();
// add_transaction.php
ini_set('display_errors', 0);
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
require_once __DIR__ . '/cors.php';
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Allow-Methods: POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header("Access-Control-Max-Age: 86400");
    http_response_code(204);
    exit;
}
require_once __DIR__ . '/cors.php';
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");
if (session_status() !== PHP_SESSION_ACTIVE) session_start();

if (empty($_SESSION['user_id']) || empty($_SESSION['club_id'])) {
    http_response_code(401);
    echo json_encode(['error'=>'Not authenticated']);
    exit;
}

$clubId      = (int) $_SESSION['club_id'];
$verifiedBy  = (int) $_SESSION['user_id'];

$input = json_decode(file_get_contents('php://input'), true);

$userIds        = $input['user_ids']        ?? [];
$reqIds         = $input['requirement_ids'] ?? [];
$feeDesc        = trim($input['fee_description'] ?? '');
$amountPaid     = isset($input['amount_paid']) 
                  ? (float)$input['amount_paid'] : 0.0;
$requestedStatus = $input['payment_status'] ?? 'unpaid';
$paymentStatus  = in_array($requestedStatus, ['unpaid','partial','paid'], true)
                  ? $requestedStatus : 'unpaid';
$paymentMethod  = trim($input['payment_method'] ?? '');

if (!is_array($userIds) || !count($userIds)
 || !is_array($reqIds)  || !count($reqIds)) 
{
    http_response_code(400);
    echo json_encode(['error'=>'Must supply user_ids & requirement_ids']);
    exit;
}

try {
    $pdo = db();

    $normalizedUserIds = array_values(array_unique(array_filter(array_map('intval', $userIds), static fn(int $id): bool => $id > 0)));
    $normalizedReqIds = array_values(array_unique(array_filter(array_map('intval', $reqIds), static fn(int $id): bool => $id > 0)));
    if (!$normalizedUserIds || count($normalizedUserIds) !== count(array_unique(array_map('intval', $userIds)))) {
        api_error(400, 'Every selected user must be valid.', 'INVALID_USER_SELECTION');
    }
    if (!$normalizedReqIds || count($normalizedReqIds) !== count(array_unique(array_map('intval', $reqIds)))) {
        api_error(400, 'Every selected requirement must be valid.', 'INVALID_REQUIREMENT_SELECTION');
    }
    $inUsers = implode(',', array_fill(0, count($normalizedUserIds), '?'));
    $userStmt = $pdo->prepare("SELECT user_id FROM users WHERE club_id = ? AND user_id IN ($inUsers)");
    $userStmt->execute(array_merge([$clubId], $normalizedUserIds));
    if (count($userStmt->fetchAll(PDO::FETCH_COLUMN)) !== count($normalizedUserIds)) {
        api_error(404, 'One or more selected users do not belong to this club.', 'USER_NOT_FOUND_IN_CLUB');
    }

    $inReq = implode(',', array_fill(0, count($normalizedReqIds), '?'));
    $stmt = $pdo->prepare("
      SELECT requirement_id,
             CAST(amount_due AS DECIMAL(10,2)) AS amount_due,
             end_datetime
      FROM requirements
      WHERE club_id = ? AND requirement_id IN ($inReq)
    ");
    $stmt->execute(array_merge([ $clubId ], $normalizedReqIds));
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $reqMap = [];
    foreach($rows as $r) {
      $reqMap[$r['requirement_id']] = [
        'amount_due'   => $r['amount_due'],
        'end_datetime'=> $r['end_datetime']
      ];
    }
    foreach($normalizedReqIds as $rid) {
      if (!isset($reqMap[$rid])) {
        api_error(404, 'One or more selected requirements do not belong to this club.', 'REQUIREMENT_NOT_FOUND_IN_CLUB');
      }
    }
    foreach ($reqMap as $requirement) {
        validate_payment_state($amountPaid, $paymentStatus, (float)$requirement['amount_due']);
    }

    $pdo->beginTransaction();
    $sql = "
      INSERT INTO transactions
        (user_id, requirement_id, amount_due,
         amount_paid, payment_status, payment_method,
         fee_description, due_date, verified_by, date_added)
      VALUES
        (:user_id, :req_id, :amt_due,
         :amt_paid, :status, :method,
         :fdesc,   :due_date, :verified_by, NOW())
    ";
    $ins = $pdo->prepare($sql);

    foreach ($normalizedUserIds as $uid) {
      $u = (int)$uid;
      foreach ($normalizedReqIds as $rid) {
        $r = (int)$rid;
        $ins->execute([
          ':user_id'     => $u,
          ':req_id'      => $r,
          ':amt_due'     => $reqMap[$r]['amount_due'],
          ':amt_paid'    => $amountPaid,
          ':status'      => $paymentStatus,
          ':method'      => $paymentMethod,
          ':fdesc'       => $feeDesc,
          ':due_date'    => $reqMap[$r]['end_datetime'],
          ':verified_by' => $verifiedBy,
        ]);
      }
    }

    $pdo->commit();
    echo json_encode(['success'=>true]);

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
      $pdo->rollBack();
    }
    http_response_code(500);
    error_log('IMSCCA request failure: ' . $e->getMessage());
    api_error(500, 'The request could not be completed.', 'SERVER_ERROR');
}
