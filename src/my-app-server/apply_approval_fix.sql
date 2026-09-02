-- Check if approval_requests table exists, if not rename deletion_requests
-- Run this in phpMyAdmin:

-- First, check if we need to rename the table
-- If deletion_requests exists and approval_requests doesn't, run these commands:

RENAME TABLE deletion_requests TO approval_requests;

-- Add the new columns for expanded approval system
ALTER TABLE approval_requests 
ADD COLUMN IF NOT EXISTS approval_type ENUM('delete', 'attendance_edit') DEFAULT 'delete' AFTER type;

-- Update existing records
UPDATE approval_requests SET approval_type = 'delete' WHERE approval_type IS NULL;

-- Add attendance edit columns
ALTER TABLE approval_requests 
ADD COLUMN IF NOT EXISTS original_status VARCHAR(20) AFTER reason,
ADD COLUMN IF NOT EXISTS requested_status VARCHAR(20) AFTER original_status,
ADD COLUMN IF NOT EXISTS attendance_record_id INT AFTER requested_status;

-- Add performance index
CREATE INDEX IF NOT EXISTS idx_approval_requests_type ON approval_requests(approval_type, status); 