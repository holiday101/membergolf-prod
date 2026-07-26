SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subEventMain' AND COLUMN_NAME = 'gross_flights'
);
SET @add_col_sql := IF(@col_exists = 0,
  'ALTER TABLE subEventMain ADD COLUMN gross_flights INT NULL AFTER drawn_hole',
  'SELECT 1'
);
PREPARE stmt FROM @add_col_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

INSERT INTO subEventType (eventtypename)
  SELECT 'Gross/Net Split'
   WHERE NOT EXISTS (SELECT 1 FROM subEventType WHERE eventtypename = 'Gross/Net Split');
