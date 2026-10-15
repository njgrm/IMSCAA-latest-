ALTER TABLE `transactions`
  ADD COLUMN IF NOT EXISTS `is_voided` tinyint(1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `voided_at` datetime(6) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `voided_by` int(11) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `void_reason` varchar(500) DEFAULT NULL;

CREATE TABLE IF NOT EXISTS `transaction_payments` (
  `payment_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `transaction_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` varchar(50) NOT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `note` varchar(500) DEFAULT NULL,
  `payment_date` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `recorded_by` int(11) DEFAULT NULL,
  `idempotency_key` varchar(64) NOT NULL,
  `is_voided` tinyint(1) NOT NULL DEFAULT 0,
  `voided_at` datetime(6) DEFAULT NULL,
  `voided_by` int(11) DEFAULT NULL,
  `void_reason` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`payment_id`),
  UNIQUE KEY `uk_transaction_payment_idempotency` (`transaction_id`,`idempotency_key`),
  KEY `idx_transaction_payments_transaction` (`transaction_id`,`payment_date`),
  KEY `idx_transaction_payments_recorded_by` (`recorded_by`),
  KEY `idx_transaction_payments_voided_by` (`voided_by`),
  CONSTRAINT `fk_transaction_payments_transaction` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`transaction_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_transaction_payments_recorded_by` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_transaction_payments_voided_by` FOREIGN KEY (`voided_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `chk_transaction_payments_amount` CHECK (`amount` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TEMPORARY TABLE IF EXISTS `transaction_duplicate_map`;
CREATE TEMPORARY TABLE `transaction_duplicate_map` AS
SELECT older.transaction_id AS old_id, latest.transaction_id AS keep_id
FROM transactions older
JOIN (
  SELECT user_id, requirement_id,
         SUBSTRING_INDEX(GROUP_CONCAT(transaction_id ORDER BY date_added DESC, transaction_id DESC), ',', 1) AS transaction_id
  FROM transactions
  GROUP BY user_id, requirement_id
  HAVING COUNT(*) > 1
) latest ON latest.user_id = older.user_id AND latest.requirement_id = older.requirement_id
WHERE older.transaction_id <> latest.transaction_id;

UPDATE approval_requests ar
JOIN transaction_duplicate_map m ON ar.type = 'transaction' AND ar.target_id = m.old_id
SET ar.target_id = m.keep_id
WHERE ar.status = 'pending';

INSERT INTO audit_log (club_id, actor_user_id, subject_user_id, action, entity_type, entity_id, metadata)
SELECT r.club_id, NULL, t.user_id, 'transaction_duplicate_reconciled', 'transaction', m.keep_id,
       JSON_OBJECT('discarded_transaction_id', t.transaction_id, 'amount_due', t.amount_due,
                   'amount_paid', t.amount_paid, 'payment_status', t.payment_status)
FROM transaction_duplicate_map m
JOIN transactions t ON t.transaction_id = m.old_id
JOIN requirements r ON r.requirement_id = t.requirement_id;

DELETE t FROM transactions t JOIN transaction_duplicate_map m ON m.old_id = t.transaction_id;

INSERT INTO transaction_payments
  (transaction_id, amount, payment_method, note, payment_date, recorded_by, idempotency_key)
SELECT t.transaction_id, t.amount_paid,
       COALESCE(NULLIF(TRIM(t.payment_method), ''), 'Legacy payment'),
       'Opening payment migrated from the legacy cumulative transaction record.',
       COALESCE(t.payment_date, t.date_added, NOW(6)), t.verified_by,
       CONCAT('legacy-', t.transaction_id)
FROM transactions t
WHERE t.amount_paid > 0
ON DUPLICATE KEY UPDATE payment_id = payment_id;

UPDATE transactions t
LEFT JOIN (
  SELECT transaction_id, COALESCE(SUM(amount), 0) AS paid
  FROM transaction_payments WHERE is_voided = 0 GROUP BY transaction_id
) p ON p.transaction_id = t.transaction_id
SET t.amount_paid = COALESCE(p.paid, 0),
    t.payment_status = CASE
      WHEN COALESCE(p.paid, 0) <= 0 THEN 'unpaid'
      WHEN COALESCE(p.paid, 0) < t.amount_due THEN 'partial'
      ELSE 'paid'
    END,
    t.payment_method = NULL,
    t.payment_date = NULL;

SET @obligation_unique_exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transactions'
    AND INDEX_NAME = 'uk_transactions_user_requirement'
);
SET @obligation_unique_sql = IF(
  @obligation_unique_exists = 0,
  'ALTER TABLE `transactions` ADD UNIQUE KEY `uk_transactions_user_requirement` (`user_id`,`requirement_id`)',
  'SELECT 1'
);
PREPARE obligation_unique_statement FROM @obligation_unique_sql;
EXECUTE obligation_unique_statement;
DEALLOCATE PREPARE obligation_unique_statement;

SET @transaction_void_fk_exists = (
  SELECT COUNT(*) FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'transactions'
    AND CONSTRAINT_NAME = 'fk_transactions_voided_by'
);
SET @transaction_void_fk_sql = IF(
  @transaction_void_fk_exists = 0,
  'ALTER TABLE `transactions` ADD KEY `idx_transactions_voided_by` (`voided_by`), ADD CONSTRAINT `fk_transactions_voided_by` FOREIGN KEY (`voided_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE transaction_void_fk_statement FROM @transaction_void_fk_sql;
EXECUTE transaction_void_fk_statement;
DEALLOCATE PREPARE transaction_void_fk_statement;
