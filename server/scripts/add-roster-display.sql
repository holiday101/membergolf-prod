-- Add display_yn column to rosterMain (whether the roster appears in the
-- public Money List / Season Points List menus). Defaults to No (0).
ALTER TABLE rosterMain ADD COLUMN display_yn INT NOT NULL DEFAULT 0 AFTER active_yn;
