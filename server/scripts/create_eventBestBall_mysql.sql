CREATE TABLE IF NOT EXISTS eventBestBall (
  bestball_id INT NOT NULL AUTO_INCREMENT,
  event_id INT NULL,
  member1_id INT NULL,
  member2_id INT NULL,
  card1_id INT NULL,
  card2_id INT NULL,
  handicap1 INT NULL,
  handicap2 INT NULL,
  score INT NULL,
  net INT NULL,
  gross INT NULL,
  handicap FLOAT NULL,
  PRIMARY KEY (bestball_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
