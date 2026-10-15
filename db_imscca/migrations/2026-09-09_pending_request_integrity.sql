DROP TEMPORARY TABLE IF EXISTS duplicate_pending_requests;
CREATE TEMPORARY TABLE duplicate_pending_requests AS
SELECT ar.request_id, keepers.keep_id
FROM approval_requests ar
JOIN (
  SELECT club_id, type, target_id, MIN(request_id) AS keep_id
  FROM approval_requests
  WHERE status = 'pending'
  GROUP BY club_id, type, target_id
  HAVING COUNT(*) > 1
) keepers ON keepers.club_id = ar.club_id
         AND keepers.type = ar.type
         AND keepers.target_id = ar.target_id
WHERE ar.status = 'pending' AND ar.request_id <> keepers.keep_id;

INSERT INTO audit_log (club_id, actor_user_id, action, entity_type, entity_id, metadata)
SELECT ar.club_id, NULL, 'duplicate_pending_request_reconciled', 'approval_request', d.keep_id,
       JSON_OBJECT('discarded_request_id', ar.request_id, 'type', ar.type, 'target_id', ar.target_id)
FROM duplicate_pending_requests d
JOIN approval_requests ar ON ar.request_id = d.request_id;

DELETE ar FROM approval_requests ar
JOIN duplicate_pending_requests d ON d.request_id = ar.request_id;

ALTER TABLE approval_requests
  ADD COLUMN IF NOT EXISTS pending_target_key varchar(80)
    GENERATED ALWAYS AS (CASE WHEN status = 'pending' THEN CONCAT(type, ':', target_id) ELSE NULL END) STORED;

SET @pending_unique_exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'approval_requests'
    AND INDEX_NAME = 'uk_approval_requests_pending_target'
);
SET @pending_unique_sql = IF(
  @pending_unique_exists = 0,
  'ALTER TABLE approval_requests ADD UNIQUE KEY uk_approval_requests_pending_target (club_id, pending_target_key)',
  'SELECT 1'
);
PREPARE pending_unique_statement FROM @pending_unique_sql;
EXECUTE pending_unique_statement;
DEALLOCATE PREPARE pending_unique_statement;
