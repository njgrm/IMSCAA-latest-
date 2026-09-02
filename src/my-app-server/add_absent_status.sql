-- Add 'absent' status to attendance_status enum
ALTER TABLE attendance_records 
MODIFY COLUMN attendance_status ENUM('present', 'late', 'excused', 'absent') DEFAULT 'present';

-- Add index for absent status queries
CREATE INDEX idx_attendance_status_absent ON attendance_records(attendance_status, requirement_id);

-- Add comment
ALTER TABLE attendance_records COMMENT = 'Tracks attendance records including automatic absent marking'; 