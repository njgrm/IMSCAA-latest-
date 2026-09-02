-- Rename deletion_requests to approval_requests
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
CREATE INDEX idx_approval_requests_type ON approval_requests(approval_type, status); 