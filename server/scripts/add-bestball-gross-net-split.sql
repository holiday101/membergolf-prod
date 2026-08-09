-- Adds a "Best Ball Gross/Net Split" sub event type.
--
-- Setup works exactly like the existing "2 Man Best Ball" type (pairings of two
-- players entered against eventBestBall). Payout works like the existing
-- "Gross/Net Split" stroke play type: the roster's flights (ordered by handicap)
-- are split into a gross group and a net group via the gross_flights count on
-- subEventMain, and teams are allocated evenly (NTILE) across all flights by
-- combined team handicap rather than by fixed handicap ranges. Flights in the
-- gross group pay out on team gross score; the rest pay out on team net score.

INSERT INTO subEventType (eventtypename)
  SELECT 'Best Ball Gross/Net Split'
   WHERE NOT EXISTS (SELECT 1 FROM subEventType WHERE eventtypename = 'Best Ball Gross/Net Split');

DROP PROCEDURE IF EXISTS spBBPickGrossNetSplit;

DELIMITER $$
CREATE PROCEDURE spBBPickGrossNetSplit(IN p_subeventid INT)
BEGIN
  DECLARE v_rosterid INT;
  DECLARE v_eventid INT;
  DECLARE v_courseid INT;
  DECLARE v_payout DECIMAL(10,4);
  DECLARE v_grossflights INT;
  DECLARE v_totalflights INT;
  DECLARE v_rn INT DEFAULT 0;
  DECLARE v_flightid INT;
  DECLARE v_countgross INT;
  DECLARE v_countnet INT;
  DECLARE v_purse DECIMAL(12,2);
  DECLARE v_placespaid INT;
  DECLARE v_amountperteam DECIMAL(12,2);

  SELECT roster_id, event_id, course_id, COALESCE(gross_flights, 0)
    INTO v_rosterid, v_eventid, v_courseid, v_grossflights
    FROM subEventMain
   WHERE subevent_id = p_subeventid;

  SELECT cm.payout
    INTO v_payout
    FROM eventMain em
    JOIN courseMain cm ON em.course_id = cm.course_id
   WHERE em.event_id = v_eventid;

  SELECT COUNT(*) INTO v_totalflights FROM rosterFlight WHERE roster_id = v_rosterid;

  DELETE FROM subEventPayOut WHERE subevent_id = p_subeventid;
  DELETE FROM subEventBBPayGross WHERE subevent_id = p_subeventid;
  DELETE FROM subEventBBPayNet WHERE subevent_id = p_subeventid;

  IF v_totalflights > 0 THEN

    DROP TEMPORARY TABLE IF EXISTS tmp_bbgns_flights;
    CREATE TEMPORARY TABLE tmp_bbgns_flights AS
      SELECT flight_id, ROW_NUMBER() OVER (ORDER BY hdcp1 ASC) AS rn
        FROM rosterFlight
       WHERE roster_id = v_rosterid;

    DROP TEMPORARY TABLE IF EXISTS tmp_bbgns_teams;
    CREATE TEMPORARY TABLE tmp_bbgns_teams AS
      SELECT bestball_id, member1_id, member2_id, gross, net, handicap,
             NTILE(v_totalflights) OVER (ORDER BY handicap ASC, bestball_id ASC) AS bucket
        FROM eventBestBall
       WHERE event_id = v_eventid;

    WHILE v_rn < v_totalflights DO
      SET v_rn = v_rn + 1;

      SELECT flight_id INTO v_flightid FROM tmp_bbgns_flights WHERE rn = v_rn LIMIT 1;

      IF v_rn <= v_grossflights THEN

        INSERT INTO subEventBBPayGross (subevent_id,event_id,flight_id,bestball_id,member1_id,member2_id,amount,place,used_yn,score)
          SELECT p_subeventid, v_eventid, v_flightid, bestball_id, member1_id, member2_id, 0, 0, 0, gross
            FROM tmp_bbgns_teams
           WHERE bucket = v_rn;

        SELECT COUNT(*) INTO v_countgross
          FROM subEventBBPayGross
         WHERE used_yn = 0 AND subevent_id = p_subeventid AND flight_id = v_flightid;

        SELECT amount INTO v_amountperteam
          FROM subEventMain WHERE subevent_id = p_subeventid;

        IF v_countgross <= 2 THEN
          UPDATE subEventBBPayGross
             SET amount = v_amountperteam, place = 1, used_yn = 1
           WHERE subevent_id = p_subeventid AND flight_id = v_flightid;
        ELSE
          SET v_placespaid = ROUND(v_countgross * v_payout, 0);
          IF v_placespaid < 1 THEN
            SET v_placespaid = 1;
          END IF;

          SET v_purse = v_countgross * v_amountperteam;

          INSERT INTO subEventPayOut (place,amount,flight_id,subevent_id)
            SELECT place, payout * v_purse, v_flightid, p_subeventid
              FROM eventPayOut
             WHERE placespaid = v_placespaid;

          CALL spBBPayGross(p_subeventid, v_flightid);
        END IF;
      ELSE

        INSERT INTO subEventBBPayNet (subevent_id,event_id,flight_id,bestball_id,member1_id,member2_id,amount,place,used_yn,score)
          SELECT p_subeventid, v_eventid, v_flightid, bestball_id, member1_id, member2_id, 0, 0, 0, net
            FROM tmp_bbgns_teams
           WHERE bucket = v_rn;

        SELECT COUNT(*) INTO v_countnet
          FROM subEventBBPayNet
         WHERE used_yn = 0 AND subevent_id = p_subeventid AND flight_id = v_flightid;

        SELECT amount INTO v_amountperteam
          FROM subEventMain WHERE subevent_id = p_subeventid;

        IF v_countnet <= 2 THEN
          UPDATE subEventBBPayNet
             SET amount = v_amountperteam, place = 1, used_yn = 1
           WHERE subevent_id = p_subeventid AND flight_id = v_flightid;
        ELSE
          SET v_placespaid = ROUND(v_countnet * v_payout, 0);
          IF v_placespaid < 1 THEN
            SET v_placespaid = 1;
          END IF;

          SET v_purse = v_countnet * v_amountperteam;

          INSERT INTO subEventPayOut (place,amount,flight_id,subevent_id)
            SELECT place, payout * v_purse, v_flightid, p_subeventid
              FROM eventPayOut
             WHERE placespaid = v_placespaid;

          CALL spBBPayNet(p_subeventid, v_flightid);
        END IF;
      END IF;
    END WHILE;

    DROP TEMPORARY TABLE IF EXISTS tmp_bbgns_flights;
    DROP TEMPORARY TABLE IF EXISTS tmp_bbgns_teams;
  END IF;

  UPDATE subEventBBPayGross SET amount = NULL WHERE amount IS NULL OR amount = 0;
  UPDATE subEventBBPayNet SET amount = NULL WHERE amount IS NULL OR amount = 0;
END$$
DELIMITER ;
