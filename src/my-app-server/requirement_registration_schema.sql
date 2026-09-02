-- Schema for requirement registration and expanded approval system

-- Create requirement_registrations table to track who needs to attend each event/activity
CREATE TABLE IF NOT EXISTS requirement_registrations (
    registration_id INT AUTO_INCREMENT PRIMARY KEY,
    requirement_id INT NOT NULL,
    user_id INT NOT NULL,
    registration_status ENUM('registered', 'cancelled') DEFAULT 'registered',
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    registered_by INT NOT NULL, -- Who registered this user
    FOREIGN KEY (requirement_id) REFERENCES requirements(requirement_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (registered_by) REFERENCES users(user_id),
    UNIQUE KEY unique_registration (requirement_id, user_id)
);

-- Rename deletion_requests to approval_requests for unified approval system
RENAME TABLE deletion_requests TO approval_requests;

-- Add approval_type column to handle different types of approvals
ALTER TABLE approval_requests 
ADD COLUMN approval_type ENUM('delete', 'attendance_edit') DEFAULT 'delete' AFTER type;

-- Update existing records to have the correct approval_type
UPDATE approval_requests SET approval_type = 'delete' WHERE approval_type IS NULL;

-- Add columns for attendance edit requests
ALTER TABLE approval_requests 
ADD COLUMN original_status VARCHAR(20) AFTER reason,
ADD COLUMN requested_status VARCHAR(20) AFTER original_status,
ADD COLUMN attendance_record_id INT AFTER requested_status;

-- Add index for better performance
CREATE INDEX idx_requirement_registrations_requirement ON requirement_registrations(requirement_id);
CREATE INDEX idx_requirement_registrations_user ON requirement_registrations(user_id);
CREATE INDEX idx_approval_requests_type ON approval_requests(approval_type, status);

-- Add automatic absent status tracking
CREATE TABLE IF NOT EXISTS attendance_status_history (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    record_id INT NOT NULL,
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    change_reason ENUM('manual', 'auto_absent', 'correction') DEFAULT 'manual',
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changed_by INT
); 