CREATE TABLE IF NOT EXISTS courseSponsor (
  sponsor_id INT NOT NULL AUTO_INCREMENT,
  course_id INT NOT NULL,
  name VARCHAR(255) NULL,
  website VARCHAR(512) NULL,
  logo VARCHAR(512) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (sponsor_id),
  KEY idx_courseSponsor_course (course_id),
  CONSTRAINT fk_courseSponsor_course FOREIGN KEY (course_id) REFERENCES courseMain(course_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
