USE `db_imscca`;

ALTER TABLE `invite_links`
  ADD COLUMN IF NOT EXISTS `target_school_id` varchar(64) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `target_email` varchar(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `import_row_id` int(11) DEFAULT NULL;

CREATE TABLE IF NOT EXISTS `member_import_batches` (
  `batch_id` int(11) NOT NULL AUTO_INCREMENT,
  `club_id` int(11) NOT NULL,
  `created_by` int(11) NOT NULL,
  `filename` varchar(255) NOT NULL,
  `content_hash` char(64) NOT NULL,
  `total_rows` int(11) NOT NULL DEFAULT 0,
  `valid_rows` int(11) NOT NULL DEFAULT 0,
  `invalid_rows` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`batch_id`),
  UNIQUE KEY `uk_import_batch_hash` (`club_id`,`content_hash`),
  CONSTRAINT `fk_import_batch_club` FOREIGN KEY (`club_id`) REFERENCES `club` (`club_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_import_batch_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `member_import_rows` (
  `row_id` int(11) NOT NULL AUTO_INCREMENT,
  `batch_id` int(11) NOT NULL,
  `line_number` int(11) NOT NULL,
  `school_id` varchar(64) NOT NULL,
  `email` varchar(255) NOT NULL,
  `profile_data` longtext NOT NULL,
  `status` enum('pending','registered','expired','invalid') NOT NULL DEFAULT 'pending',
  `error_message` varchar(500) DEFAULT NULL,
  `invite_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`row_id`),
  UNIQUE KEY `uk_import_row_line` (`batch_id`,`line_number`),
  CONSTRAINT `fk_import_row_batch` FOREIGN KEY (`batch_id`) REFERENCES `member_import_batches` (`batch_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_import_row_invite` FOREIGN KEY (`invite_id`) REFERENCES `invite_links` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `audit_log` (
  `audit_id` bigint(20) NOT NULL AUTO_INCREMENT,
  `club_id` int(11) NOT NULL,
  `actor_user_id` int(11) DEFAULT NULL,
  `subject_user_id` int(11) DEFAULT NULL,
  `action` varchar(80) NOT NULL,
  `entity_type` varchar(50) NOT NULL,
  `entity_id` int(11) DEFAULT NULL,
  `metadata` longtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`audit_id`),
  KEY `idx_audit_club_created` (`club_id`,`created_at`),
  KEY `idx_audit_subject` (`subject_user_id`,`created_at`),
  CONSTRAINT `fk_audit_club` FOREIGN KEY (`club_id`) REFERENCES `club` (`club_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_audit_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_audit_subject` FOREIGN KEY (`subject_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET @invite_import_fk_exists = (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'invite_links'
    AND CONSTRAINT_NAME = 'fk_invite_import_row'
);
SET @invite_import_fk_sql = IF(
  @invite_import_fk_exists = 0,
  'ALTER TABLE `invite_links` ADD CONSTRAINT `fk_invite_import_row` FOREIGN KEY (`import_row_id`) REFERENCES `member_import_rows` (`row_id`) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE invite_import_fk_statement FROM @invite_import_fk_sql;
EXECUTE invite_import_fk_statement;
DEALLOCATE PREPARE invite_import_fk_statement;
