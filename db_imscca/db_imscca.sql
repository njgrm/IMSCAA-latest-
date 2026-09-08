-- Reconstructed IMSCCA database schema
-- Source of truth: D:\XAMPP\htdocs\my-app-server PHP endpoints and SQL fragments
-- Target: MariaDB 10.4.x / XAMPP

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

DROP DATABASE IF EXISTS `db_imscca`;
CREATE DATABASE `db_imscca`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;
USE `db_imscca`;

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE `club` (
  `club_id` int(11) NOT NULL AUTO_INCREMENT,
  `club_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `president_id` int(11) DEFAULT NULL,
  `category` enum('academic','sports','cultural') NOT NULL DEFAULT 'academic',
  `club_adviser_id` int(11) DEFAULT NULL,
  `date_added` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`club_id`),
  UNIQUE KEY `uk_club_name` (`club_name`),
  KEY `idx_club_president` (`president_id`),
  KEY `idx_club_adviser` (`club_adviser_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `email` varchar(100) NOT NULL,
  `role` enum('adviser','president','officer','member','Adviser','President','Officer','Member') NOT NULL,
  `club_id` int(11) NOT NULL,
  `school_id` varchar(20) NOT NULL,
  `user_fname` varchar(50) NOT NULL,
  `user_lname` varchar(50) NOT NULL,
  `user_mname` char(1) DEFAULT NULL,
  `user_course` varchar(100) NOT NULL,
  `user_year` varchar(11) NOT NULL,
  `user_section` varchar(50) NOT NULL,
  `avatar` longtext DEFAULT NULL,
  `contact_info` varchar(20) DEFAULT NULL,
  `date_added` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uk_users_username` (`username`),
  UNIQUE KEY `uk_users_email` (`email`),
  UNIQUE KEY `uk_users_club_school_id` (`club_id`,`school_id`),
  KEY `idx_users_club_id` (`club_id`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_club_active` (`club_id`),
  CONSTRAINT `fk_users_club` FOREIGN KEY (`club_id`) REFERENCES `club` (`club_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE `club`
  ADD CONSTRAINT `fk_club_president` FOREIGN KEY (`president_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_club_adviser` FOREIGN KEY (`club_adviser_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

CREATE TABLE `requirements` (
  `requirement_id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `start_datetime` datetime(6) NOT NULL,
  `end_datetime` datetime(6) NOT NULL,
  `location` varchar(255) NOT NULL DEFAULT '',
  `requirement_type` enum('event','activity','fee') NOT NULL,
  `status` enum('scheduled','ongoing','canceled','completed') NOT NULL DEFAULT 'scheduled',
  `club_id` int(11) NOT NULL,
  `amount_due` decimal(10,2) DEFAULT 0.00,
  `req_picture` longtext DEFAULT NULL,
  `date_added` datetime(6) DEFAULT current_timestamp(6),
  PRIMARY KEY (`requirement_id`),
  KEY `idx_requirements_club` (`club_id`),
  KEY `idx_requirements_type_status` (`requirement_type`,`status`),
  KEY `idx_requirements_event_type` (`requirement_type`,`club_id`),
  KEY `idx_requirements_start` (`start_datetime`),
  KEY `idx_requirements_end` (`end_datetime`),
  CONSTRAINT `fk_requirements_club` FOREIGN KEY (`club_id`) REFERENCES `club` (`club_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `transactions` (
  `transaction_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `requirement_id` int(11) NOT NULL,
  `amount_due` decimal(10,2) NOT NULL DEFAULT 0.00,
  `amount_paid` decimal(10,2) DEFAULT 0.00,
  `payment_status` enum('unpaid','partial','paid') DEFAULT 'unpaid',
  `payment_method` varchar(50) DEFAULT NULL,
  `payment_date` datetime(6) DEFAULT NULL,
  `due_date` datetime(6) DEFAULT NULL,
  `verified_by` int(11) DEFAULT NULL,
  `date_added` datetime(6) DEFAULT current_timestamp(6),
  `fee_description` text NOT NULL,
  PRIMARY KEY (`transaction_id`),
  KEY `idx_transactions_user` (`user_id`),
  KEY `idx_transactions_requirement` (`requirement_id`),
  KEY `idx_transactions_verified_by` (`verified_by`),
  KEY `idx_transactions_status` (`payment_status`),
  KEY `idx_transactions_due` (`due_date`),
  CONSTRAINT `fk_transactions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_transactions_requirement` FOREIGN KEY (`requirement_id`) REFERENCES `requirements` (`requirement_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_transactions_verified_by` FOREIGN KEY (`verified_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `invite_links` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `token` varchar(64) NOT NULL,
  `role` enum('adviser','president','officer','member') NOT NULL,
  `allowed_signups` int(11) NOT NULL DEFAULT 1,
  `used_count` int(11) NOT NULL DEFAULT 0,
  `expiry` datetime NOT NULL,
  `club_id` int(11) NOT NULL,
  `created_by` int(11) NOT NULL,
  `target_school_id` varchar(64) DEFAULT NULL,
  `target_email` varchar(255) DEFAULT NULL,
  `import_row_id` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_invite_links_token` (`token`),
  KEY `idx_invite_links_club` (`club_id`),
  KEY `idx_invite_links_created_by` (`created_by`),
  KEY `idx_invite_links_expiry` (`expiry`),
  CONSTRAINT `fk_invite_links_club` FOREIGN KEY (`club_id`) REFERENCES `club` (`club_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_invite_links_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `approval_requests` (
  `request_id` int(11) NOT NULL AUTO_INCREMENT,
  `type` enum('user','requirement','club','transaction','attendance') NOT NULL,
  `approval_type` enum('delete','attendance_edit') DEFAULT 'delete',
  `target_id` int(11) NOT NULL,
  `club_id` int(11) NOT NULL,
  `requested_by` int(11) NOT NULL,
  `status` enum('pending','approved','denied') DEFAULT 'pending',
  `reason` varchar(255) DEFAULT NULL,
  `original_status` varchar(20) DEFAULT NULL,
  `requested_status` varchar(20) DEFAULT NULL,
  `attendance_record_id` int(11) DEFAULT NULL,
  `request_type` enum('deletion','attendance_edit') DEFAULT 'deletion',
  `edit_data` longtext DEFAULT NULL,
  `original_data` longtext DEFAULT NULL,
  `requested_at` datetime DEFAULT current_timestamp(),
  `approved_by` int(11) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  PRIMARY KEY (`request_id`),
  KEY `idx_approval_requests_type_target` (`type`,`target_id`),
  KEY `idx_approval_requests_club` (`club_id`),
  KEY `idx_approval_requests_requested_by` (`requested_by`),
  KEY `idx_approval_requests_approved_by` (`approved_by`),
  KEY `idx_approval_requests_status` (`status`),
  KEY `idx_approval_requests_type` (`approval_type`,`status`),
  CONSTRAINT `fk_approval_requests_club` FOREIGN KEY (`club_id`) REFERENCES `club` (`club_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_approval_requests_requested_by` FOREIGN KEY (`requested_by`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_approval_requests_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `deletion_requests` (
  `request_id` int(11) NOT NULL AUTO_INCREMENT,
  `type` enum('user','requirement','club','transaction','attendance') NOT NULL,
  `target_id` int(11) NOT NULL,
  `club_id` int(11) DEFAULT NULL,
  `requested_by` int(11) NOT NULL,
  `status` enum('pending','approved','denied') DEFAULT 'pending',
  `reason` varchar(255) DEFAULT NULL,
  `requested_at` datetime DEFAULT current_timestamp(),
  `approved_by` int(11) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `request_type` enum('deletion','attendance_edit') DEFAULT 'deletion',
  `edit_data` longtext DEFAULT NULL,
  `original_data` longtext DEFAULT NULL,
  PRIMARY KEY (`request_id`),
  KEY `idx_deletion_requests_type_target` (`type`,`target_id`),
  KEY `idx_deletion_requests_club` (`club_id`),
  KEY `idx_deletion_requests_requested_by` (`requested_by`),
  KEY `idx_deletion_requests_approved_by` (`approved_by`),
  KEY `idx_deletion_requests_status` (`status`),
  KEY `idx_deletion_requests_request_type` (`request_type`,`status`),
  CONSTRAINT `fk_deletion_requests_club` FOREIGN KEY (`club_id`) REFERENCES `club` (`club_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_deletion_requests_requested_by` FOREIGN KEY (`requested_by`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_deletion_requests_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `user_qr_codes` (
  `qr_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `qr_code_data` varchar(255) NOT NULL,
  `generated_at` datetime DEFAULT current_timestamp(),
  `is_active` tinyint(1) DEFAULT 1,
  `club_id` int(11) NOT NULL,
  PRIMARY KEY (`qr_id`),
  UNIQUE KEY `uk_user_qr_codes_data` (`qr_code_data`),
  KEY `idx_user_qr_active` (`user_id`,`is_active`),
  KEY `idx_qr_code_lookup` (`qr_code_data`),
  KEY `idx_user_qr_club` (`club_id`),
  CONSTRAINT `fk_user_qr_codes_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_qr_codes_club` FOREIGN KEY (`club_id`) REFERENCES `club` (`club_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `attendance_time_slots` (
  `slot_id` int(11) NOT NULL AUTO_INCREMENT,
  `requirement_id` int(11) NOT NULL,
  `slot_name` varchar(100) NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `date` date NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `created_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`slot_id`),
  KEY `idx_time_slots_event` (`requirement_id`,`date`),
  KEY `idx_time_slots_active` (`is_active`),
  KEY `idx_time_slots_creator` (`created_by`),
  CONSTRAINT `fk_time_slots_requirement` FOREIGN KEY (`requirement_id`) REFERENCES `requirements` (`requirement_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_time_slots_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `attendance_records` (
  `attendance_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `requirement_id` int(11) NOT NULL,
  `slot_id` int(11) DEFAULT NULL,
  `verified_by` int(11) NOT NULL DEFAULT 0,
  `club_id` int(11) NOT NULL,
  `scan_datetime` datetime DEFAULT current_timestamp(),
  `attendance_status` enum('present','late','excused','absent') DEFAULT 'present',
  `notes` text DEFAULT NULL,
  PRIMARY KEY (`attendance_id`),
  KEY `idx_attendance_user_event` (`user_id`,`requirement_id`),
  KEY `idx_attendance_event_date` (`requirement_id`,`scan_datetime`),
  KEY `idx_attendance_club` (`club_id`),
  KEY `idx_attendance_verifier` (`verified_by`),
  KEY `idx_attendance_slot` (`slot_id`),
  KEY `idx_attendance_records_status` (`attendance_status`),
  KEY `idx_attendance_status_absent` (`attendance_status`,`requirement_id`),
  UNIQUE KEY `unique_attendance` (`user_id`,`requirement_id`,`slot_id`),
  CONSTRAINT `fk_attendance_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_attendance_requirement` FOREIGN KEY (`requirement_id`) REFERENCES `requirements` (`requirement_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_attendance_time_slot` FOREIGN KEY (`slot_id`) REFERENCES `attendance_time_slots` (`slot_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_attendance_club` FOREIGN KEY (`club_id`) REFERENCES `club` (`club_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Tracks attendance records including automatic absent marking';

CREATE TABLE `event_registrations` (
  `registration_id` int(11) NOT NULL AUTO_INCREMENT,
  `requirement_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `status` enum('registered','unregistered','cancelled') DEFAULT 'registered',
  `registered_by` int(11) NOT NULL,
  `registered_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`registration_id`),
  UNIQUE KEY `unique_user_requirement` (`user_id`,`requirement_id`),
  KEY `idx_event_registrations_requirement` (`requirement_id`),
  KEY `idx_event_registrations_user` (`user_id`),
  KEY `idx_event_registrations_status` (`status`),
  KEY `idx_event_registrations_registered_by` (`registered_by`),
  CONSTRAINT `fk_event_registrations_requirement` FOREIGN KEY (`requirement_id`) REFERENCES `requirements` (`requirement_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_event_registrations_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_event_registrations_registered_by` FOREIGN KEY (`registered_by`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Tracks user registrations for events';

CREATE TABLE `automatic_absence_processing` (
  `processing_id` int(11) NOT NULL AUTO_INCREMENT,
  `requirement_id` int(11) NOT NULL,
  `event_id` int(11) GENERATED ALWAYS AS (`requirement_id`) VIRTUAL,
  `processed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `absences_created` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`processing_id`),
  UNIQUE KEY `unique_event_processing` (`requirement_id`),
  KEY `idx_auto_absence_requirement` (`requirement_id`),
  KEY `idx_auto_absence_processed_at` (`processed_at`),
  CONSTRAINT `fk_auto_absence_requirement` FOREIGN KEY (`requirement_id`) REFERENCES `requirements` (`requirement_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Tracks which events have been processed for automatic absence marking';

CREATE TABLE `attendance_status_history` (
  `history_id` int(11) NOT NULL AUTO_INCREMENT,
  `record_id` int(11) NOT NULL,
  `old_status` varchar(20) DEFAULT NULL,
  `new_status` varchar(20) NOT NULL,
  `change_reason` enum('manual','auto_absent','correction') DEFAULT 'manual',
  `changed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `changed_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`history_id`),
  KEY `idx_attendance_history_record` (`record_id`),
  KEY `idx_attendance_history_changed_by` (`changed_by`),
  CONSTRAINT `fk_attendance_history_record` FOREIGN KEY (`record_id`) REFERENCES `attendance_records` (`attendance_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_attendance_history_changed_by` FOREIGN KEY (`changed_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `requirement_registrations` (
  `registration_id` int(11) NOT NULL AUTO_INCREMENT,
  `requirement_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `registration_status` enum('registered','cancelled') DEFAULT 'registered',
  `registered_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `registered_by` int(11) NOT NULL,
  PRIMARY KEY (`registration_id`),
  UNIQUE KEY `unique_registration` (`requirement_id`,`user_id`),
  KEY `idx_requirement_registrations_requirement` (`requirement_id`),
  KEY `idx_requirement_registrations_user` (`user_id`),
  KEY `idx_requirement_registrations_registered_by` (`registered_by`),
  CONSTRAINT `fk_requirement_registrations_requirement` FOREIGN KEY (`requirement_id`) REFERENCES `requirements` (`requirement_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_requirement_registrations_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_requirement_registrations_registered_by` FOREIGN KEY (`registered_by`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `attendance` (
  `attendance_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `event_id` int(11) DEFAULT NULL,
  `requirement_id` int(11) DEFAULT NULL,
  `status` enum('present','late','excused','absent') DEFAULT 'absent',
  `scan_time` datetime(6) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `date_added` datetime(6) DEFAULT current_timestamp(6),
  PRIMARY KEY (`attendance_id`),
  UNIQUE KEY `unique_attendance_legacy` (`requirement_id`,`user_id`),
  KEY `idx_attendance_legacy_user` (`user_id`),
  KEY `idx_attendance_legacy_event` (`event_id`),
  KEY `idx_attendance_legacy_requirement` (`requirement_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `member_import_batches` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `member_import_rows` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `audit_log` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE `invite_links`
  ADD CONSTRAINT `fk_invite_import_row` FOREIGN KEY (`import_row_id`) REFERENCES `member_import_rows` (`row_id`) ON DELETE SET NULL;

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;
