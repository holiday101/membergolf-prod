-- Removes the "Best Ball Gross/Net Split" sub event type and replaces it
-- with "2 Man Best Ball Auto Flight": same setup as regular Best Ball
-- (players paired the normal way) and the same payout semantics (every
-- team competes for both gross and net, paid via whichever is worth more,
-- never both), but flights are auto-computed - the admin picks a flight
-- COUNT on the sub event instead of needing pre-existing rosterFlight
-- ranges configured on the roster. Teams are allocated evenly (NTILE) by
-- combined handicap across that many of the roster's flight slots.

SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subEventMain' AND COLUMN_NAME = 'auto_flights'
);
SET @add_col_sql := IF(@col_exists = 0,
  'ALTER TABLE subEventMain ADD COLUMN auto_flights INT NULL AFTER gross_flights',
  'SELECT 1'
);
PREPARE stmt FROM @add_col_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

DELETE FROM subEventType WHERE eventtypename = 'Best Ball Gross/Net Split';
DROP PROCEDURE IF EXISTS spBBPickGrossNetSplit;

INSERT INTO subEventType (eventtypename)
  SELECT '2 Man Best Ball Auto Flight'
   WHERE NOT EXISTS (SELECT 1 FROM subEventType WHERE eventtypename = '2 Man Best Ball Auto Flight');

DROP PROCEDURE IF EXISTS spBBAutoFlightPick;

DELIMITER $$
CREATE PROCEDURE spBBAutoFlightPick(IN p_subeventid INT)
BEGIN
  DECLARE v_rosterid INT;
  DECLARE v_eventid INT;
  DECLARE v_courseid INT;
  DECLARE v_payout DECIMAL(10,4);
  DECLARE v_requestedflights INT;
  DECLARE v_availableflights INT;
  DECLARE v_totalflights INT;
  DECLARE v_rn INT DEFAULT 0;
  DECLARE v_flightid INT;
  DECLARE v_count INT;
  DECLARE v_purse DECIMAL(12,2);
  DECLARE v_placespaid INT;
  DECLARE v_amountperteam DECIMAL(12,2);

  SELECT roster_id, event_id, course_id, COALESCE(auto_flights, 1)
    INTO v_rosterid, v_eventid, v_courseid, v_requestedflights
    FROM subEventMain
   WHERE subevent_id = p_subeventid;

  SELECT cm.payout
    INTO v_payout
    FROM eventMain em
    JOIN courseMain cm ON em.course_id = cm.course_id
   WHERE em.event_id = v_eventid;

  SELECT COUNT(*) INTO v_availableflights FROM rosterFlight WHERE roster_id = v_rosterid;
  SET v_totalflights = LEAST(GREATEST(v_requestedflights, 1), v_availableflights);

  DELETE FROM subEventPayOut WHERE subevent_id = p_subeventid;
  DELETE FROM subEventBBPayGross WHERE subevent_id = p_subeventid;
  DELETE FROM subEventBBPayNet WHERE subevent_id = p_subeventid;

  IF v_totalflights > 0 THEN

    DROP TEMPORARY TABLE IF EXISTS tmp_bbaf_flights;
    CREATE TEMPORARY TABLE tmp_bbaf_flights AS
      SELECT flight_id, rn FROM (
        SELECT flight_id, ROW_NUMBER() OVER (ORDER BY hdcp1 ASC) AS rn
          FROM rosterFlight
         WHERE roster_id = v_rosterid
      ) ranked
      WHERE rn <= v_totalflights;

    DROP TEMPORARY TABLE IF EXISTS tmp_bbaf_teams;
    CREATE TEMPORARY TABLE tmp_bbaf_teams AS
      SELECT bestball_id, member1_id, member2_id, gross, net, handicap,
             NTILE(v_totalflights) OVER (ORDER BY handicap ASC, bestball_id ASC) AS bucket
        FROM eventBestBall
       WHERE event_id = v_eventid;

    WHILE v_rn < v_totalflights DO
      SET v_rn = v_rn + 1;

      SELECT flight_id INTO v_flightid FROM tmp_bbaf_flights WHERE rn = v_rn LIMIT 1;

      INSERT INTO subEventBBPayGross (subevent_id,event_id,flight_id,bestball_id,member1_id,member2_id,amount,place,used_yn,score)
        SELECT p_subeventid, v_eventid, v_flightid, bestball_id, member1_id, member2_id, 0, 0, 0, gross
          FROM tmp_bbaf_teams
         WHERE bucket = v_rn;

      INSERT INTO subEventBBPayNet (subevent_id,event_id,flight_id,bestball_id,member1_id,member2_id,amount,place,used_yn,score)
        SELECT p_subeventid, v_eventid, v_flightid, bestball_id, member1_id, member2_id, 0, 0, 0, net
          FROM tmp_bbaf_teams
         WHERE bucket = v_rn;

      SELECT COUNT(*) INTO v_count FROM tmp_bbaf_teams WHERE bucket = v_rn;

      SELECT amount INTO v_amountperteam FROM subEventMain WHERE subevent_id = p_subeventid;
      SET v_amountperteam = v_amountperteam * 0.5;

      IF v_count <= 2 THEN
        UPDATE subEventBBPayGross
           SET amount = v_amountperteam, place = 1, used_yn = 1
         WHERE subevent_id = p_subeventid AND flight_id = v_flightid;
        UPDATE subEventBBPayNet
           SET amount = v_amountperteam, place = 1, used_yn = 1
         WHERE subevent_id = p_subeventid AND flight_id = v_flightid;
      ELSE
        SET v_placespaid = ROUND(v_count * v_payout, 0);
        IF v_placespaid < 1 THEN
          SET v_placespaid = 1;
        END IF;

        SET v_purse = v_count * v_amountperteam;

        INSERT INTO subEventPayOut (place,amount,flight_id,subevent_id)
          SELECT place, payout * v_purse, v_flightid, p_subeventid
            FROM eventPayOut
           WHERE placespaid = v_placespaid;

        -- Rank + pay gross and net independently within the flight (competition
        -- ranking with pooled/split tie amounts - same approach used for
        -- Best Ball Gross/Net Split, deliberately not the legacy
        -- spBBPayGross/spBBPayNet cursor procs, which only rank correctly
        -- when called after used_yn=1 rows already exist).
        UPDATE subEventBBPayGross g
        JOIN (
          SELECT gross_id, RANK() OVER (ORDER BY score ASC) AS rnk, COUNT(*) OVER (PARTITION BY score) AS grp_size
          FROM subEventBBPayGross WHERE subevent_id = p_subeventid AND flight_id = v_flightid
        ) r ON r.gross_id = g.gross_id
        JOIN (
          SELECT x.rnk, SUM(po.amount) AS grp_amount
          FROM (
            SELECT RANK() OVER (ORDER BY score ASC) AS rnk, ROW_NUMBER() OVER (ORDER BY score ASC, gross_id ASC) AS rn
            FROM subEventBBPayGross WHERE subevent_id = p_subeventid AND flight_id = v_flightid
          ) x
          LEFT JOIN subEventPayOut po ON po.subevent_id = p_subeventid AND po.flight_id = v_flightid AND po.place = x.rn
          GROUP BY x.rnk
        ) paid ON paid.rnk = r.rnk
        SET g.place = r.rnk, g.amount = ROUND(COALESCE(paid.grp_amount, 0) / r.grp_size, 2)
        WHERE g.subevent_id = p_subeventid AND g.flight_id = v_flightid;

        UPDATE subEventBBPayNet n
        JOIN (
          SELECT net_id, RANK() OVER (ORDER BY score ASC) AS rnk, COUNT(*) OVER (PARTITION BY score) AS grp_size
          FROM subEventBBPayNet WHERE subevent_id = p_subeventid AND flight_id = v_flightid
        ) r ON r.net_id = n.net_id
        JOIN (
          SELECT x.rnk, SUM(po.amount) AS grp_amount
          FROM (
            SELECT RANK() OVER (ORDER BY score ASC) AS rnk, ROW_NUMBER() OVER (ORDER BY score ASC, net_id ASC) AS rn
            FROM subEventBBPayNet WHERE subevent_id = p_subeventid AND flight_id = v_flightid
          ) x
          LEFT JOIN subEventPayOut po ON po.subevent_id = p_subeventid AND po.flight_id = v_flightid AND po.place = x.rn
          GROUP BY x.rnk
        ) paid ON paid.rnk = r.rnk
        SET n.place = r.rnk, n.amount = ROUND(COALESCE(paid.grp_amount, 0) / r.grp_size, 2)
        WHERE n.subevent_id = p_subeventid AND n.flight_id = v_flightid;

        -- Arbitrate: a team is paid via whichever side is worth more, never
        -- both. Order-safe: whichever statement runs second always reads
        -- the other side's true original amount unless the first statement
        -- kept its own value (in which case the second correctly loses).
        UPDATE subEventBBPayGross g
        JOIN subEventBBPayNet n
          ON n.bestball_id = g.bestball_id AND n.subevent_id = g.subevent_id AND n.flight_id = g.flight_id
        SET g.amount = CASE WHEN COALESCE(g.amount, 0) >= COALESCE(n.amount, 0) THEN g.amount ELSE NULL END,
            g.place  = CASE WHEN COALESCE(g.amount, 0) >= COALESCE(n.amount, 0) THEN g.place ELSE 0 END,
            g.used_yn = 1
        WHERE g.subevent_id = p_subeventid AND g.flight_id = v_flightid;

        UPDATE subEventBBPayNet n
        JOIN subEventBBPayGross g
          ON g.bestball_id = n.bestball_id AND g.subevent_id = n.subevent_id AND g.flight_id = n.flight_id
        SET n.amount = CASE WHEN COALESCE(n.amount, 0) > COALESCE(g.amount, 0) THEN n.amount ELSE NULL END,
            n.place  = CASE WHEN COALESCE(n.amount, 0) > COALESCE(g.amount, 0) THEN n.place ELSE 0 END,
            n.used_yn = 1
        WHERE n.subevent_id = p_subeventid AND n.flight_id = v_flightid;
      END IF;
    END WHILE;

    DROP TEMPORARY TABLE IF EXISTS tmp_bbaf_flights;
    DROP TEMPORARY TABLE IF EXISTS tmp_bbaf_teams;
  END IF;

  UPDATE subEventBBPayGross SET amount = NULL WHERE amount IS NULL OR amount = 0;
  UPDATE subEventBBPayNet SET amount = NULL WHERE amount IS NULL OR amount = 0;
END$$
DELIMITER ;
