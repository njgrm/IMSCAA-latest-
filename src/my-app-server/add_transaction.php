<?php
// add_transaction.php
ini_set('display_errors', 0);
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: http://localhost:5173");
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Allow-Methods: POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header("Access-Control-Max-Age: 86400");
    http_response_code(204);
    exit;
}

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");
session_start();

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
$paymentStatus  = in_array($input['payment_status'], ['unpaid','partial','paid'])
                  ? $input['payment_status'] : 'unpaid';
$paymentMethod  = trim($input['payment_method'] ?? '');

if (!is_array($userIds) || !count($userIds)
 || !is_array($reqIds)  || !count($reqIds)) 
{
    http_response_code(400);
    echo json_encode(['error'=>'Must supply user_ids & requirement_ids']);
    exit;
}

try {
    $pdo = new PDO(
      "mysql:host=127.0.0.1;dbname=db_imscca;charset=utf8mb4",
      "root","",[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]
    );

    // 1) Pull the club’s fee records
    $inReq = implode(',', array_fill(0, count($reqIds), '?'));
    $stmt = $pdo->prepare("
      SELECT requirement_id,
             CAST(amount_due AS DECIMAL(10,2)) AS amount_due,
             end_datetime
      FROM requirements
      WHERE club_id = ? AND requirement_id IN ($inReq)
    ");
    $stmt->execute(array_merge([ $clubId ], $reqIds));
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $reqMap = [];
    foreach($rows as $r) {
      $reqMap[$r['requirement_id']] = [
        'amount_due'   => $r['amount_due'],
        'end_datetime'=> $r['end_datetime']
      ];
    }
    foreach($reqIds as $rid) {
      if (!isset($reqMap[$rid])) {
        throw new Exception("Requirement $rid not found");
      }
    }

    // 2) Insert all combinations, using the passed-in values
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

    foreach ($userIds as $uid) {
      $u = (int)$uid;
      foreach ($reqIds as $rid) {
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
    echo json_encode(['error'=>'Server error: '.$e->getMessage()]);
}