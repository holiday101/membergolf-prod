-- Add email to memberMain for user mapping
ALTER TABLE memberMain ADD COLUMN email VARCHAR(255) NULL AFTER lastname;
CREATE INDEX idx_memberMain_course_email ON memberMain (course_id, email);
