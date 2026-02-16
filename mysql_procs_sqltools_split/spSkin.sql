CREATE PROCEDURE spSkin(IN p_subeventid INT)
BEGIN
  DECLARE v_rosterid INT;
  DECLARE v_eventid INT;
  DECLARE v_courseid INT;
  DECLARE v_flightid INT;
  DECLARE v_hdcp1 INT;
  DECLARE v_hdcp2 INT;
  DECLARE v_minhole INT;
  DECLARE v_memberid INT;
  DECLARE v_cardid INT;
  DECLARE v_totalskin DECIMAL(12,2);
  DECLARE v_countwinners INT;
  DECLARE v_countflight INT;
  DECLARE v_skinamount DECIMAL(12,2);
  DECLARE v_done INT DEFAULT 0;
  DECLARE flight_cur CURSOR FOR
    SELECT flight_id, hdcp1, hdcp2 FROM rosterFlight WHERE roster_id = v_rosterid;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

  SELECT roster_id, event_id, course_id
    INTO v_rosterid, v_eventid, v_courseid
    FROM subEventMain
   WHERE subevent_id = p_subeventid;

  CALL spHandicap(v_eventid);

  SELECT amount, roster_id
    INTO v_skinamount, v_rosterid
    FROM subEventMain
   WHERE subevent_id = p_subeventid;

  DELETE FROM eventSkin WHERE subevent_id = p_subeventid;

  OPEN flight_cur;
  flight_loop: LOOP
    FETCH flight_cur INTO v_flightid, v_hdcp1, v_hdcp2;
    IF v_done = 1 THEN
      LEAVE flight_loop;
    END IF;

    SET v_countwinners = 0;

    -- hole 1..9 (gross)
    SELECT MIN(hole1) INTO v_minhole FROM eventCard
     WHERE event_id = v_eventid AND handicap BETWEEN v_hdcp1 AND v_hdcp2
       AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);
    SELECT COUNT(DISTINCT member_id) INTO v_countflight FROM eventCard
     WHERE event_id = v_eventid AND hole1 = v_minhole
       AND handicap BETWEEN v_hdcp1 AND v_hdcp2
       AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);
    IF v_countflight = 1 THEN
      SELECT member_id, card_id INTO v_memberid, v_cardid
        FROM eventCard
       WHERE hole1 = v_minhole AND event_id = v_eventid
         AND handicap BETWEEN v_hdcp1 AND v_hdcp2
         AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid)
       LIMIT 1;
      INSERT INTO eventSkin (event_id,member_id,subevent_id,flight_id,hole,score,amount,card_id)
        VALUES (v_eventid,v_memberid,p_subeventid,v_flightid,1,v_minhole,0,v_cardid);
      SET v_countwinners = v_countwinners + 1;
    END IF;

    -- Repeat for holes 2..9
    -- hole 2
    SELECT MIN(hole2) INTO v_minhole FROM eventCard
     WHERE event_id = v_eventid AND handicap BETWEEN v_hdcp1 AND v_hdcp2
       AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);
    SELECT COUNT(DISTINCT member_id) INTO v_countflight FROM eventCard
     WHERE event_id = v_eventid AND hole2 = v_minhole
       AND handicap BETWEEN v_hdcp1 AND v_hdcp2
       AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);
    IF v_countflight = 1 THEN
      SELECT member_id, card_id INTO v_memberid, v_cardid
        FROM eventCard
       WHERE hole2 = v_minhole AND event_id = v_eventid
         AND handicap BETWEEN v_hdcp1 AND v_hdcp2
         AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid)
       LIMIT 1;
      INSERT INTO eventSkin (event_id,member_id,subevent_id,flight_id,hole,score,amount,card_id)
        VALUES (v_eventid,v_memberid,p_subeventid,v_flightid,2,v_minhole,0,v_cardid);
      SET v_countwinners = v_countwinners + 1;
    END IF;

    -- hole 3
    SELECT MIN(hole3) INTO v_minhole FROM eventCard
     WHERE event_id = v_eventid AND handicap BETWEEN v_hdcp1 AND v_hdcp2
       AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);
    SELECT COUNT(DISTINCT member_id) INTO v_countflight FROM eventCard
     WHERE event_id = v_eventid AND hole3 = v_minhole
       AND handicap BETWEEN v_hdcp1 AND v_hdcp2
       AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);
    IF v_countflight = 1 THEN
      SELECT member_id, card_id INTO v_memberid, v_cardid
        FROM eventCard
       WHERE hole3 = v_minhole AND event_id = v_eventid
         AND handicap BETWEEN v_hdcp1 AND v_hdcp2
         AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid)
       LIMIT 1;
      INSERT INTO eventSkin (event_id,member_id,subevent_id,flight_id,hole,score,amount,card_id)
        VALUES (v_eventid,v_memberid,p_subeventid,v_flightid,3,v_minhole,0,v_cardid);
      SET v_countwinners = v_countwinners + 1;
    END IF;

    -- hole 4
    SELECT MIN(hole4) INTO v_minhole FROM eventCard
     WHERE event_id = v_eventid AND handicap BETWEEN v_hdcp1 AND v_hdcp2
       AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);
    SELECT COUNT(DISTINCT member_id) INTO v_countflight FROM eventCard
     WHERE event_id = v_eventid AND hole4 = v_minhole
       AND handicap BETWEEN v_hdcp1 AND v_hdcp2
       AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);
    IF v_countflight = 1 THEN
      SELECT member_id, card_id INTO v_memberid, v_cardid
        FROM eventCard
       WHERE hole4 = v_minhole AND event_id = v_eventid
         AND handicap BETWEEN v_hdcp1 AND v_hdcp2
         AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid)
       LIMIT 1;
      INSERT INTO eventSkin (event_id,member_id,subevent_id,flight_id,hole,score,amount,card_id)
        VALUES (v_eventid,v_memberid,p_subeventid,v_flightid,4,v_minhole,0,v_cardid);
      SET v_countwinners = v_countwinners + 1;
    END IF;

    -- hole 5
    SELECT MIN(hole5) INTO v_minhole FROM eventCard
     WHERE event_id = v_eventid AND handicap BETWEEN v_hdcp1 AND v_hdcp2
       AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);
    SELECT COUNT(DISTINCT member_id) INTO v_countflight FROM eventCard
     WHERE event_id = v_eventid AND hole5 = v_minhole
       AND handicap BETWEEN v_hdcp1 AND v_hdcp2
       AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);
    IF v_countflight = 1 THEN
      SELECT member_id, card_id INTO v_memberid, v_cardid
        FROM eventCard
       WHERE hole5 = v_minhole AND event_id = v_eventid
         AND handicap BETWEEN v_hdcp1 AND v_hdcp2
         AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid)
       LIMIT 1;
      INSERT INTO eventSkin (event_id,member_id,subevent_id,flight_id,hole,score,amount,card_id)
        VALUES (v_eventid,v_memberid,p_subeventid,v_flightid,5,v_minhole,0,v_cardid);
      SET v_countwinners = v_countwinners + 1;
    END IF;

    -- hole 6
    SELECT MIN(hole6) INTO v_minhole FROM eventCard
     WHERE event_id = v_eventid AND handicap BETWEEN v_hdcp1 AND v_hdcp2
       AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);
    SELECT COUNT(DISTINCT member_id) INTO v_countflight FROM eventCard
     WHERE event_id = v_eventid AND hole6 = v_minhole
       AND handicap BETWEEN v_hdcp1 AND v_hdcp2
       AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);
    IF v_countflight = 1 THEN
      SELECT member_id, card_id INTO v_memberid, v_cardid
        FROM eventCard
       WHERE hole6 = v_minhole AND event_id = v_eventid
         AND handicap BETWEEN v_hdcp1 AND v_hdcp2
         AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid)
       LIMIT 1;
      INSERT INTO eventSkin (event_id,member_id,subevent_id,flight_id,hole,score,amount,card_id)
        VALUES (v_eventid,v_memberid,p_subeventid,v_flightid,6,v_minhole,0,v_cardid);
      SET v_countwinners = v_countwinners + 1;
    END IF;

    -- hole 7
    SELECT MIN(hole7) INTO v_minhole FROM eventCard
     WHERE event_id = v_eventid AND handicap BETWEEN v_hdcp1 AND v_hdcp2
       AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);
    SELECT COUNT(DISTINCT member_id) INTO v_countflight FROM eventCard
     WHERE event_id = v_eventid AND hole7 = v_minhole
       AND handicap BETWEEN v_hdcp1 AND v_hdcp2
       AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);
    IF v_countflight = 1 THEN
      SELECT member_id, card_id INTO v_memberid, v_cardid
        FROM eventCard
       WHERE hole7 = v_minhole AND event_id = v_eventid
         AND handicap BETWEEN v_hdcp1 AND v_hdcp2
         AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid)
       LIMIT 1;
      INSERT INTO eventSkin (event_id,member_id,subevent_id,flight_id,hole,score,amount,card_id)
        VALUES (v_eventid,v_memberid,p_subeventid,v_flightid,7,v_minhole,0,v_cardid);
      SET v_countwinners = v_countwinners + 1;
    END IF;

    -- hole 8
    SELECT MIN(hole8) INTO v_minhole FROM eventCard
     WHERE event_id = v_eventid AND handicap BETWEEN v_hdcp1 AND v_hdcp2
       AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);
    SELECT COUNT(DISTINCT member_id) INTO v_countflight FROM eventCard
     WHERE event_id = v_eventid AND hole8 = v_minhole
       AND handicap BETWEEN v_hdcp1 AND v_hdcp2
       AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);
    IF v_countflight = 1 THEN
      SELECT member_id, card_id INTO v_memberid, v_cardid
        FROM eventCard
       WHERE hole8 = v_minhole AND event_id = v_eventid
         AND handicap BETWEEN v_hdcp1 AND v_hdcp2
         AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid)
       LIMIT 1;
      INSERT INTO eventSkin (event_id,member_id,subevent_id,flight_id,hole,score,amount,card_id)
        VALUES (v_eventid,v_memberid,p_subeventid,v_flightid,8,v_minhole,0,v_cardid);
      SET v_countwinners = v_countwinners + 1;
    END IF;

    -- hole 9
    SELECT MIN(hole9) INTO v_minhole FROM eventCard
     WHERE event_id = v_eventid AND handicap BETWEEN v_hdcp1 AND v_hdcp2
       AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);
    SELECT COUNT(DISTINCT member_id) INTO v_countflight FROM eventCard
     WHERE event_id = v_eventid AND hole9 = v_minhole
       AND handicap BETWEEN v_hdcp1 AND v_hdcp2
       AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);
    IF v_countflight = 1 THEN
      SELECT member_id, card_id INTO v_memberid, v_cardid
        FROM eventCard
       WHERE hole9 = v_minhole AND event_id = v_eventid
         AND handicap BETWEEN v_hdcp1 AND v_hdcp2
         AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid)
       LIMIT 1;
      INSERT INTO eventSkin (event_id,member_id,subevent_id,flight_id,hole,score,amount,card_id)
        VALUES (v_eventid,v_memberid,p_subeventid,v_flightid,9,v_minhole,0,v_cardid);
      SET v_countwinners = v_countwinners + 1;
    END IF;

    SELECT COUNT(*) INTO v_countflight
      FROM eventCard
     WHERE event_id = v_eventid AND handicap BETWEEN v_hdcp1 AND v_hdcp2
       AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);

    IF v_countwinners <> 0 AND v_countflight <> 0 THEN
      SET v_totalskin = (v_skinamount * v_countflight) / v_countwinners;
      UPDATE eventSkin
         SET amount = v_totalskin
       WHERE event_id = v_eventid AND subevent_id = p_subeventid AND flight_id = v_flightid;
    END IF;
  END LOOP;

  CLOSE flight_cur;
END

-- NOTE: BBCalculate is very large and contains debug-only selects.
-- This MySQL version is a direct translation. Please review before running in production.
