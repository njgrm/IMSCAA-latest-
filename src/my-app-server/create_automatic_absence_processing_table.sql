-- Create automatic_absence_processing table
CREATE TABLE IF NOT EXISTS automatic_absence_processing (
    processing_id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    absences_created INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    FOREIGN KEY (event_id) REFERENCES requirements(requirement_id) ON DELETE CASCADE,
    
    -- Ensure each event is only processed once
    UNIQUE KEY unique_event_processing (event_id),
    
    -- Index for better performance
    INDEX idx_event_id (event_id),
    INDEX idx_processed_at (processed_at)
);

-- Add comment to table
ALTER TABLE automatic_absence_processing COMMENT = 'Tracks which events have been processed for automatic absence marking'; 