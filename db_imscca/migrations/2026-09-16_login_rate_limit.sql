-- Throttles brute-force sign-in attempts on login.php.
-- Only failed attempts are recorded, so successful logins never consume the
-- allowance. Rows older than one day are pruned opportunistically by login.php.
CREATE TABLE IF NOT EXISTS login_attempts (
  attempt_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ip_address varchar(45) NOT NULL,
  school_id varchar(64) NOT NULL DEFAULT '',
  attempted_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (attempt_id),
  KEY idx_login_attempts_ip_time (ip_address, attempted_at),
  KEY idx_login_attempts_school_time (school_id, attempted_at),
  KEY idx_login_attempts_time (attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
