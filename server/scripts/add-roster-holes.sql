-- Add holes column to rosterMain (9 or 18 hole rosters)
ALTER TABLE rosterMain ADD COLUMN holes TINYINT NOT NULL DEFAULT 9 AFTER active_yn;
UPDATE rosterMain SET holes = 9;
