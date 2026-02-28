-- Clone seed data from source course to a target course.
-- Includes: memberMain, courseNine, rosterMain, rosterFlight, rosterMemberLink, eventCard.
--
-- Usage:
-- 1) Set @target_course_id below.
-- 2) Optionally keep @reset_target_data = 1 for clean re-runs on test courses.
-- 3) Run in MySQL client: mysql -u <user> -p <db> < clone_course_27_seed.sql

START TRANSACTION;

SET @source_course_id = 27;
SET @target_course_id = 0;   -- TODO: set this to your new test course_id
SET @reset_target_data = 1;  -- 1 = clear target course data first (recommended for test seeding)

-- Basic guard rails / visibility
SELECT @source_course_id AS source_course_id, @target_course_id AS target_course_id, @reset_target_data AS reset_target_data;
SELECT COUNT(*) AS source_course_exists FROM courseMain WHERE course_id = @source_course_id;
SELECT COUNT(*) AS target_course_exists FROM courseMain WHERE course_id = @target_course_id;

-- Optional reset so this script can be rerun consistently.
-- Order matters due table dependencies.
SET @do_reset := (@reset_target_data = 1);

DELETE ec
FROM eventCard ec
WHERE @do_reset AND ec.course_id = @target_course_id;

DELETE rml
FROM rosterMemberLink rml
JOIN rosterMain rm ON rm.roster_id = rml.roster_id
WHERE @do_reset AND rm.course_id = @target_course_id;

DELETE rf
FROM rosterFlight rf
JOIN rosterMain rm ON rm.roster_id = rf.roster_id
WHERE @do_reset AND rm.course_id = @target_course_id;

DELETE rm
FROM rosterMain rm
WHERE @do_reset AND rm.course_id = @target_course_id;

DELETE cn
FROM courseNine cn
WHERE @do_reset AND cn.course_id = @target_course_id;

DELETE mm
FROM memberMain mm
WHERE @do_reset AND mm.course_id = @target_course_id;

-- Mapping tables
DROP TEMPORARY TABLE IF EXISTS tmp_member_map;
CREATE TEMPORARY TABLE tmp_member_map (
  old_member_id INT PRIMARY KEY,
  new_member_id INT NOT NULL
);

DROP TEMPORARY TABLE IF EXISTS tmp_nine_map;
CREATE TEMPORARY TABLE tmp_nine_map (
  old_nine_id INT PRIMARY KEY,
  new_nine_id INT NOT NULL
);

DROP TEMPORARY TABLE IF EXISTS tmp_roster_map;
CREATE TEMPORARY TABLE tmp_roster_map (
  old_roster_id INT PRIMARY KEY,
  new_roster_id INT NOT NULL
);

DROP TEMPORARY TABLE IF EXISTS tmp_flight_map;
CREATE TEMPORARY TABLE tmp_flight_map (
  old_flight_id INT PRIMARY KEY,
  new_flight_id INT NOT NULL
);

-- 1) Members
-- oldmember_id is intentionally set to source member_id so we can map reliably.
INSERT INTO memberMain (
  course_id,
  firstname,
  lastname,
  handicap,
  handicap18,
  oldmember_id,
  handicapold,
  rhandicap,
  maxhandicap,
  maxhandicap18,
  membernameold
)
SELECT
  @target_course_id,
  m.firstname,
  m.lastname,
  m.handicap,
  m.handicap18,
  m.member_id,
  m.handicapold,
  m.rhandicap,
  m.maxhandicap,
  m.maxhandicap18,
  m.membernameold
FROM memberMain m
WHERE m.course_id = @source_course_id
ORDER BY m.member_id;

INSERT INTO tmp_member_map (old_member_id, new_member_id)
SELECT m.oldmember_id, m.member_id
FROM memberMain m
WHERE m.course_id = @target_course_id
  AND m.oldmember_id IS NOT NULL;

-- 2) Nines
INSERT INTO courseNine (
  course_id,
  ninename,
  sloperating,
  courserating,
  startinghole,
  numholes,
  hole1, hole2, hole3, hole4, hole5, hole6, hole7, hole8, hole9,
  handicaphole1, handicaphole2, handicaphole3, handicaphole4, handicaphole5,
  handicaphole6, handicaphole7, handicaphole8, handicaphole9,
  hole10, hole11, hole12, hole13, hole14, hole15, hole16, hole17, hole18,
  handicaphole10, handicaphole11, handicaphole12, handicaphole13, handicaphole14,
  handicaphole15, handicaphole16, handicaphole17, handicaphole18
)
SELECT
  @target_course_id,
  n.ninename,
  n.sloperating,
  n.courserating,
  n.startinghole,
  n.numholes,
  n.hole1, n.hole2, n.hole3, n.hole4, n.hole5, n.hole6, n.hole7, n.hole8, n.hole9,
  n.handicaphole1, n.handicaphole2, n.handicaphole3, n.handicaphole4, n.handicaphole5,
  n.handicaphole6, n.handicaphole7, n.handicaphole8, n.handicaphole9,
  n.hole10, n.hole11, n.hole12, n.hole13, n.hole14, n.hole15, n.hole16, n.hole17, n.hole18,
  n.handicaphole10, n.handicaphole11, n.handicaphole12, n.handicaphole13, n.handicaphole14,
  n.handicaphole15, n.handicaphole16, n.handicaphole17, n.handicaphole18
FROM courseNine n
WHERE n.course_id = @source_course_id
ORDER BY n.nine_id;

INSERT INTO tmp_nine_map (old_nine_id, new_nine_id)
SELECT src.nine_id, dst.nine_id
FROM (
  SELECT nine_id, ROW_NUMBER() OVER (ORDER BY nine_id) AS rn
  FROM courseNine
  WHERE course_id = @source_course_id
) src
JOIN (
  SELECT nine_id, ROW_NUMBER() OVER (ORDER BY nine_id) AS rn
  FROM courseNine
  WHERE course_id = @target_course_id
) dst ON dst.rn = src.rn;

-- 3) Rosters
INSERT INTO rosterMain (rostername, course_id)
SELECT r.rostername, @target_course_id
FROM rosterMain r
WHERE r.course_id = @source_course_id
ORDER BY r.roster_id;

INSERT INTO tmp_roster_map (old_roster_id, new_roster_id)
SELECT src.roster_id, dst.roster_id
FROM (
  SELECT roster_id, ROW_NUMBER() OVER (ORDER BY roster_id) AS rn
  FROM rosterMain
  WHERE course_id = @source_course_id
) src
JOIN (
  SELECT roster_id, ROW_NUMBER() OVER (ORDER BY roster_id) AS rn
  FROM rosterMain
  WHERE course_id = @target_course_id
) dst ON dst.rn = src.rn;

-- 4) Flights (by roster mapping)
INSERT INTO rosterFlight (roster_id, flightname, hdcp1, hdcp2)
SELECT rm.new_roster_id, rf.flightname, rf.hdcp1, rf.hdcp2
FROM rosterFlight rf
JOIN tmp_roster_map rm ON rm.old_roster_id = rf.roster_id
ORDER BY rf.flight_id;

-- MySQL temp-table limitation workaround: build source/destination row-number tables separately.
DROP TEMPORARY TABLE IF EXISTS tmp_src_flights;
CREATE TEMPORARY TABLE tmp_src_flights AS
SELECT rf.flight_id, ROW_NUMBER() OVER (ORDER BY rf.flight_id) AS rn
FROM rosterFlight rf
JOIN tmp_roster_map rm ON rm.old_roster_id = rf.roster_id;

DROP TEMPORARY TABLE IF EXISTS tmp_dst_flights;
CREATE TEMPORARY TABLE tmp_dst_flights AS
SELECT rf.flight_id, ROW_NUMBER() OVER (ORDER BY rf.flight_id) AS rn
FROM rosterFlight rf
JOIN tmp_roster_map rm ON rm.new_roster_id = rf.roster_id;

INSERT INTO tmp_flight_map (old_flight_id, new_flight_id)
SELECT src.flight_id, dst.flight_id
FROM tmp_src_flights src
JOIN tmp_dst_flights dst ON dst.rn = src.rn;

-- 5) Roster-member links (optional but useful)
INSERT INTO rosterMemberLink (roster_id, member_id, hdcp)
SELECT
  rm.new_roster_id,
  mm.new_member_id,
  rml.hdcp
FROM rosterMemberLink rml
JOIN tmp_roster_map rm ON rm.old_roster_id = rml.roster_id
JOIN tmp_member_map mm ON mm.old_member_id = rml.member_id;

-- 6) Cards
-- Note: event_id is set to NULL because this script does NOT copy events.
INSERT INTO eventCard (
  course_id,
  member_id,
  event_id,
  nine_id,
  hole1, hole2, hole3, hole4, hole5, hole6, hole7, hole8, hole9,
  gross,
  net,
  adjustedscore,
  handicap,
  hdiff,
  card_dt,
  newhandicap,
  oldhandicap,
  skins_yn,
  hole10, hole11, hole12, hole13, hole14, hole15, hole16, hole17, hole18,
  numholes
)
SELECT
  @target_course_id,
  mm.new_member_id,
  NULL,
  nm.new_nine_id,
  ec.hole1, ec.hole2, ec.hole3, ec.hole4, ec.hole5, ec.hole6, ec.hole7, ec.hole8, ec.hole9,
  ec.gross,
  ec.net,
  ec.adjustedscore,
  ec.handicap,
  ec.hdiff,
  ec.card_dt,
  ec.newhandicap,
  ec.oldhandicap,
  ec.skins_yn,
  ec.hole10, ec.hole11, ec.hole12, ec.hole13, ec.hole14, ec.hole15, ec.hole16, ec.hole17, ec.hole18,
  ec.numholes
FROM eventCard ec
JOIN tmp_member_map mm ON mm.old_member_id = ec.member_id
LEFT JOIN tmp_nine_map nm ON nm.old_nine_id = ec.nine_id
WHERE ec.course_id = @source_course_id
ORDER BY ec.card_id;

-- Summary
SELECT 'members' AS section, COUNT(*) AS rows_copied FROM tmp_member_map
UNION ALL
SELECT 'nines', COUNT(*) FROM tmp_nine_map
UNION ALL
SELECT 'rosters', COUNT(*) FROM tmp_roster_map
UNION ALL
SELECT 'flights', COUNT(*) FROM tmp_flight_map;

SELECT COUNT(*) AS target_member_count FROM memberMain WHERE course_id = @target_course_id;
SELECT COUNT(*) AS target_nine_count   FROM courseNine WHERE course_id = @target_course_id;
SELECT COUNT(*) AS target_roster_count FROM rosterMain WHERE course_id = @target_course_id;
SELECT COUNT(*) AS target_card_count   FROM eventCard WHERE course_id = @target_course_id;

COMMIT;
