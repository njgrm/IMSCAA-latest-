-- Create event_registrations table
CREATE TABLE IF NOT EXISTS event_registrations (
    registration_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    event_id INT NOT NULL,
    club_id INT NOT NULL,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES requirements(requirement_id) ON DELETE CASCADE,
    FOREIGN KEY (club_id) REFERENCES clubs(club_id) ON DELETE CASCADE,
    
    -- Ensure unique registration per user per event
    UNIQUE KEY unique_user_event (user_id, event_id),
    
    -- Indexes for better performance
    INDEX idx_user_id (user_id),
    INDEX idx_event_id (event_id),
    INDEX idx_club_id (club_id),
    INDEX idx_registered_at (registered_at)
);

-- Add comment to table
ALTER TABLE event_registrations COMMENT = 'Tracks user registrations for events'; 