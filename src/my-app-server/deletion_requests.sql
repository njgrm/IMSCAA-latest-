CREATE TABLE `deletion_requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `type` ENUM('user', 'requirement', 'club', 'transaction') NOT NULL COMMENT 'Type of entity to delete',
  `target_id` INT NOT NULL COMMENT 'ID of the entity to delete (user_id, requirement_id, club_id, or transaction_id)',
  `club_id` INT NOT NULL COMMENT 'Club context for the request',
  `requested_by` INT NOT NULL COMMENT 'User who requested the deletion',
  `status` ENUM('pending', 'approved', 'denied') DEFAULT 'pending' COMMENT 'Approval status',
  `reason` VARCHAR(255) DEFAULT NULL COMMENT 'Optional reason for deletion',
  `requested_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `approved_by` INT DEFAULT NULL COMMENT 'Adviser who approved/denied',
  `approved_at` DATETIME DEFAULT NULL,
  -- Foreign keys for referential integrity
  CONSTRAINT `fk_deletion_requests_requested_by` FOREIGN KEY (`requested_by`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_deletion_requests_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users`(`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_deletion_requests_club` FOREIGN KEY (`club_id`) REFERENCES `club`(`club_id`) ON DELETE CASCADE
  -- Note: No FK for target_id because it is polymorphic (see below)
);

-- Indexes for performance (optional but recommended)
CREATE INDEX idx_deletion_requests_status ON deletion_requests(status);
CREATE INDEX idx_deletion_requests_type_target ON deletion_requests(type, target_id);

-- Notes:
-- 1. The `target_id` field is a "polymorphic" reference. It points to the primary key of the table specified by `type`.
--    You enforce the correct target in your application logic (PHP/JS), not via a strict SQL foreign key.
-- 2. The `requested_by` and `approved_by` fields are linked to the `users` table.
-- 3. The `club_id` field is linked to the `club` table.
-- 4. You can expand the `type` ENUM in the future if you add more deletable entities.
