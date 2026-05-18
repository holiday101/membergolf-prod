CREATE PROCEDURE spSkin(IN p_subeventid INT)
BEGIN
  DECLARE v_rosterid INT;
  DECLARE v_eventid INT;
  DECLARE v_courseid INT;
  DECLARE v_numholes INT DEFAULT 9;
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
  DECLARE v_hole INT;
  DECLARE v_done INT DEFAULT 0;
  DECLARE flight_cur CURSOR FOR
    SELECT flight_id, hdcp1, hdcp2 FROM rosterFlight WHERE roster_id = v_rosterid;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

  SELECT roster_id, event_id, course_id
    INTO v_rosterid, v_eventid, v_courseid
    FROM subEventMain
   WHERE subevent_id = p_subeventid;

  CALL spHandicap(v_eventid, NULL);

  SELECT amount, roster_id
    INTO v_skinamount, v_rosterid
    FROM subEventMain
   WHERE subevent_id = p_subeventid;

  /* Determine hole count from courseNine (9 or 18). */
  SELECT cn.numholes
    INTO v_numholes
    FROM eventMain em
    JOIN courseNine cn ON em.nine_id = cn.nine_id
   WHERE em.event_id = v_eventid;

  IF v_numholes IS NULL THEN
    SET v_numholes = 9;
  END IF;

  DELETE FROM eventSkin WHERE subevent_id = p_subeventid;

  OPEN flight_cur;
  flight_loop: LOOP
    FETCH flight_cur INTO v_flightid, v_hdcp1, v_hdcp2;
    IF v_done = 1 THEN
      LEAVE flight_loop;
    END IF;

    SET v_countwinners = 0;
    SET v_hole = 1;

    hole_loop: LOOP
      IF v_hole > v_numholes THEN
        LEAVE hole_loop;
      END IF;

      SELECT MIN(
        CASE v_hole
          WHEN 1 THEN hole1 WHEN 2 THEN hole2 WHEN 3 THEN hole3
          WHEN 4 THEN hole4 WHEN 5 THEN hole5 WHEN 6 THEN hole6
          WHEN 7 THEN hole7 WHEN 8 THEN hole8 WHEN 9 THEN hole9
          WHEN 10 THEN hole10 WHEN 11 THEN hole11 WHEN 12 THEN hole12
          WHEN 13 THEN hole13 WHEN 14 THEN hole14 WHEN 15 THEN hole15
          WHEN 16 THEN hole16 WHEN 17 THEN hole17 WHEN 18 THEN hole18
        END
      ) INTO v_minhole FROM eventCard
       WHERE event_id = v_eventid
         AND EXISTS (SELECT 1 FROM eventHandicap eh WHERE eh.event_id = v_eventid AND eh.member_id = eventCard.member_id AND eh.handicap BETWEEN v_hdcp1 AND v_hdcp2)
         AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);

      IF v_minhole IS NOT NULL THEN
        SELECT COUNT(DISTINCT member_id) INTO v_countflight FROM eventCard
         WHERE event_id = v_eventid
           AND (
             CASE v_hole
               WHEN 1 THEN hole1 WHEN 2 THEN hole2 WHEN 3 THEN hole3
               WHEN 4 THEN hole4 WHEN 5 THEN hole5 WHEN 6 THEN hole6
               WHEN 7 THEN hole7 WHEN 8 THEN hole8 WHEN 9 THEN hole9
               WHEN 10 THEN hole10 WHEN 11 THEN hole11 WHEN 12 THEN hole12
               WHEN 13 THEN hole13 WHEN 14 THEN hole14 WHEN 15 THEN hole15
               WHEN 16 THEN hole16 WHEN 17 THEN hole17 WHEN 18 THEN hole18
             END
           ) = v_minhole
           AND EXISTS (SELECT 1 FROM eventHandicap eh WHERE eh.event_id = v_eventid AND eh.member_id = eventCard.member_id AND eh.handicap BETWEEN v_hdcp1 AND v_hdcp2)
           AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);

        IF v_countflight = 1 THEN
          SELECT member_id, card_id INTO v_memberid, v_cardid
            FROM eventCard
           WHERE event_id = v_eventid
             AND (
               CASE v_hole
                 WHEN 1 THEN hole1 WHEN 2 THEN hole2 WHEN 3 THEN hole3
                 WHEN 4 THEN hole4 WHEN 5 THEN hole5 WHEN 6 THEN hole6
                 WHEN 7 THEN hole7 WHEN 8 THEN hole8 WHEN 9 THEN hole9
                 WHEN 10 THEN hole10 WHEN 11 THEN hole11 WHEN 12 THEN hole12
                 WHEN 13 THEN hole13 WHEN 14 THEN hole14 WHEN 15 THEN hole15
                 WHEN 16 THEN hole16 WHEN 17 THEN hole17 WHEN 18 THEN hole18
               END
             ) = v_minhole
             AND EXISTS (SELECT 1 FROM eventHandicap eh WHERE eh.event_id = v_eventid AND eh.member_id = eventCard.member_id AND eh.handicap BETWEEN v_hdcp1 AND v_hdcp2)
             AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid)
           LIMIT 1;
          INSERT INTO eventSkin (event_id,member_id,subevent_id,flight_id,hole,score,amount,card_id)
            VALUES (v_eventid,v_memberid,p_subeventid,v_flightid,v_hole,v_minhole,0,v_cardid);
          SET v_countwinners = v_countwinners + 1;
        END IF;
      END IF;

      SET v_hole = v_hole + 1;
    END LOOP;

    SELECT COUNT(*) INTO v_countflight
      FROM eventCard
     WHERE event_id = v_eventid AND EXISTS (SELECT 1 FROM eventHandicap eh WHERE eh.event_id = v_eventid AND eh.member_id = eventCard.member_id AND eh.handicap BETWEEN v_hdcp1 AND v_hdcp2)
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
