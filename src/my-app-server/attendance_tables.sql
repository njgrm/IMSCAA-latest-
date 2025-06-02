-- Attendance System Database Schema

-- Table to store unique QR codes for each user
CREATE TABLE `user_qr_codes` (
  `qr_id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `qr_code_data` VARCHAR(255) NOT NULL UNIQUE COMMENT 'Unique QR code string',
  `generated_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `is_active` BOOLEAN DEFAULT TRUE COMMENT 'Whether QR code is active',
  `club_id` INT NOT NULL,
  
  -- Foreign keys
  CONSTRAINT `fk_user_qr_codes_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_qr_codes_club` FOREIGN KEY (`club_id`) REFERENCES `club`(`club_id`) ON DELETE CASCADE,
  
  -- Indexes
  INDEX `idx_user_qr_active` (`user_id`, `is_active`),
  INDEX `idx_qr_code_lookup` (`qr_code_data`)
);

-- Table to configure time slots for events
CREATE TABLE `attendance_time_slots` (
  `slot_id` INT AUTO_INCREMENT PRIMARY KEY,
  `requirement_id` INT NOT NULL COMMENT 'Links to requirements table (events only)',
  `slot_name` VARCHAR(100) NOT NULL COMMENT 'e.g., "Morning Session", "8:00-12:00 AM"',
  `start_time` TIME NOT NULL,
  `end_time` TIME NOT NULL,
  `date` DATE NOT NULL,
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `created_by` INT NULL COMMENT 'User who created this time slot (NULL if user deleted)',
  
  -- Foreign keys
  CONSTRAINT `fk_time_slots_requirement` FOREIGN KEY (`requirement_id`) REFERENCES `requirements`(`requirement_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_time_slots_creator` FOREIGN KEY (`created_by`) REFERENCES `users`(`user_id`) ON DELETE SET NULL,
  
  -- Indexes
  INDEX `idx_time_slots_event` (`requirement_id`, `date`),
  INDEX `idx_time_slots_active` (`is_active`)
);

-- Table to store attendance records
CREATE TABLE `attendance_records` (
  `attendance_id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL COMMENT 'Student who attended',
  `requirement_id` INT NOT NULL COMMENT 'Event that was attended',
  `time_slot_id` INT NULL COMMENT 'Specific time slot if applicable',
  `verified_by` INT NOT NULL COMMENT 'Admin who verified attendance',
  `club_id` INT NOT NULL COMMENT 'Club context for security',
  `scan_datetime` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'When QR was scanned',
  `attendance_status` ENUM('present', 'late', 'excused') DEFAULT 'present',
  `notes` TEXT NULL COMMENT 'Optional notes from admin',
  
  -- Foreign keys
  CONSTRAINT `fk_attendance_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_attendance_requirement` FOREIGN KEY (`requirement_id`) REFERENCES `requirements`(`requirement_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_attendance_time_slot` FOREIGN KEY (`time_slot_id`) REFERENCES `attendance_time_slots`(`slot_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_attendance_verifier` FOREIGN KEY (`verified_by`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_attendance_club` FOREIGN KEY (`club_id`) REFERENCES `club`(`club_id`) ON DELETE CASCADE,
  
  -- Indexes
  INDEX `idx_attendance_user_event` (`user_id`, `requirement_id`),
  INDEX `idx_attendance_event_date` (`requirement_id`, `scan_datetime`),
  INDEX `idx_attendance_club` (`club_id`),
  INDEX `idx_attendance_verifier` (`verified_by`),
  
  -- Prevent duplicate attendance for same user/event/timeslot
  UNIQUE KEY `unique_attendance` (`user_id`, `requirement_id`, `time_slot_id`)
);

-- Add QR code column to existing users table (if not exists)
-- ALTER TABLE `users` ADD COLUMN `qr_code_data` VARCHAR(255) NULL UNIQUE AFTER `avatar`;

-- Insert sample time slots for existing events (optional)
-- You can run this after creating the tables to add some sample data

-- Create indexes for better performance
CREATE INDEX `idx_requirements_event_type` ON `requirements`(`requirement_type`, `club_id`);

-- Note: This schema assumes:
-- 1. Events are stored in the `requirements` table with `requirement_type` = 'event'
-- 2. Only events need attendance tracking
-- 3. Some events may not have specific time slots (full-day events)
-- 4. Users can attend multiple time slots of the same event
-- 5. QR codes are unique across the entire system 

-- Add indexes to existing tables for better performance
-- Index on requirements table for event-type filtering
CREATE INDEX `idx_requirements_event_type` ON `requirements`(`requirement_type`, `club_id`);

-- Index on users table for QR code generation
CREATE INDEX `idx_users_club_active` ON `users`(`club_id`);

-- Add sample data comments
-- Note: After creating tables, you can insert sample time slots:
-- INSERT INTO `attendance_time_slots` (`requirement_id`, `slot_name`, `start_time`, `end_time`, `date`, `created_by`) 
-- VALUES (1, 'Morning Session', '08:00:00', '12:00:00', '2024-01-15', 1); 