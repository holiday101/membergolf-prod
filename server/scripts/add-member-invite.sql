CREATE TABLE IF NOT EXISTS memberInvite (
  invite_id INT NOT NULL AUTO_INCREMENT,
  course_id INT NOT NULL,
  member_id INT NOT NULL,
  email VARCHAR(255) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (invite_id),
  UNIQUE KEY uniq_memberInvite_token (token_hash),
  KEY idx_memberInvite_email (email),
  KEY idx_memberInvite_course (course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
