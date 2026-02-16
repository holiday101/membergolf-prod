CREATE PROCEDURE spPickGross(IN p_subeventid INT)
BEGIN
  DECLARE v_rosterid INT;
  DECLARE v_eventid INT;
  DECLARE v_courseid INT;
  DECLARE v_payout DECIMAL(10,4);
  DECLARE v_decimalhandicapyn INT;
  DECLARE v_flightid INT;
  DECLARE v_hdcp1 DECIMAL(10,2);
  DECLARE v_hdcp2 DECIMAL(10,2);
  DECLARE v_countgross INT;
  DECLARE v_purse DECIMAL(12,2);
  DECLARE v_placespaid INT;
  DECLARE v_amountperplayer DECIMAL(12,2);
  DECLARE v_done INT DEFAULT 0;
  DECLARE flight_cur CURSOR FOR
    SELECT flight_id, hdcp1, hdcp2 FROM rosterFlight WHERE roster_id = v_rosterid;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

  SELECT roster_id, event_id, course_id
    INTO v_rosterid, v_eventid, v_courseid
    FROM subEventMain
   WHERE subevent_id = p_subeventid;

  SELECT cm.payout
    INTO v_payout
    FROM eventMain em
    JOIN courseMain cm ON em.course_id = cm.course_id
   WHERE em.event_id = v_eventid;

  CALL spHandicap(v_eventid);

  SELECT decimalhandicap_yn INTO v_decimalhandicapyn
    FROM courseMain WHERE course_id = v_courseid;

  DELETE FROM subEventPayOut WHERE subevent_id = p_subeventid;
  DELETE FROM subEventPayGross WHERE subevent_id = p_subeventid;

  OPEN flight_cur;
  flight_loop: LOOP
    FETCH flight_cur INTO v_flightid, v_hdcp1, v_hdcp2;
    IF v_done = 1 THEN
      LEAVE flight_loop;
    END IF;

    IF v_decimalhandicapyn = 0 THEN
      INSERT INTO subEventPayGross (subevent_id,event_id,flight_id,card_id,member_id,amount,place,used_yn,score)
        SELECT p_subeventid, v_eventid, v_flightid, card_id, member_id, 0, 0, 0, net
          FROM eventCard
         WHERE event_id = v_eventid
           AND handicap BETWEEN v_hdcp1 AND v_hdcp2
           AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);
    ELSE
      INSERT INTO subEventPayGross (subevent_id,event_id,flight_id,card_id,member_id,amount,place,used_yn,score)
        SELECT p_subeventid, v_eventid, v_flightid, card_id, ec.member_id, 0, 0, 0, net
          FROM eventCard ec
          JOIN (SELECT member_id, rhandicap, handicap FROM eventHandicap WHERE event_id = v_eventid) eh
            ON ec.member_id = eh.member_id
         WHERE ec.event_id = v_eventid
           AND eh.rhandicap BETWEEN v_hdcp1 AND v_hdcp2
           AND ec.member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);
    END IF;

    SELECT COUNT(*) INTO v_countgross
      FROM subEventPayGross
     WHERE used_yn = 0 AND subevent_id = p_subeventid AND flight_id = v_flightid;

    SELECT amount INTO v_amountperplayer
      FROM subEventMain WHERE subevent_id = p_subeventid;

    SET v_placespaid = ROUND(v_countgross * v_payout, 0);
    IF v_placespaid < 1 AND v_countgross >= 1 THEN
      SET v_placespaid = 1;
    END IF;

    SET v_purse = v_countgross * v_amountperplayer;

    INSERT INTO subEventPayOut (place,amount,flight_id,subevent_id)
      SELECT place, payout * v_purse, v_flightid, p_subeventid
        FROM eventPayOut
       WHERE placespaid = v_placespaid;

    CALL spPayGross(p_subeventid, v_flightid);
  END LOOP;

  CLOSE flight_cur;

  UPDATE subEventPayGross SET amount = NULL WHERE amount IS NULL OR amount = 0;
END
