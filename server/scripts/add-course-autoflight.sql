ALTER TABLE courseMain
  ADD COLUMN IF NOT EXISTS autoflight_yn INT NOT NULL DEFAULT 1 AFTER decimalhandicap_yn;

-- Optional: disable Auto Flight for a specific course.
-- UPDATE courseMain SET autoflight_yn = 0 WHERE course_id = 27;
