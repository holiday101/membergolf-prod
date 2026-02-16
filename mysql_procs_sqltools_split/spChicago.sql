CREATE PROCEDURE spChicago(IN p_subeventid INT)
BEGIN
  DECLARE v_rosterid INT;
  DECLARE v_eventid INT;
  DECLARE v_courseid INT;
  DECLARE v_decimalhandicapyn INT;
  DECLARE v_flightid INT;
  DECLARE v_hdcp1 DECIMAL(10,2);
  DECLARE v_hdcp2 DECIMAL(10,2);
  DECLARE v_done INT DEFAULT 0;

  DECLARE v_hole1 INT;
  DECLARE v_hole2 INT;
  DECLARE v_hole3 INT;
  DECLARE v_hole4 INT;
  DECLARE v_hole5 INT;
  DECLARE v_hole6 INT;
  DECLARE v_hole7 INT;
  DECLARE v_hole8 INT;
  DECLARE v_hole9 INT;
  DECLARE v_hole1par INT;
  DECLARE v_hole2par INT;
  DECLARE v_hole3par INT;
  DECLARE v_hole4par INT;
  DECLARE v_hole5par INT;
  DECLARE v_hole6par INT;
  DECLARE v_hole7par INT;
  DECLARE v_hole8par INT;
  DECLARE v_hole9par INT;
  DECLARE v_score INT;
  DECLARE v_handicap INT;
  DECLARE v_nine_id INT;
  DECLARE v_memberid INT;
  DECLARE v_cardid INT;

  DECLARE v_countflight INT;
  DECLARE v_purse DECIMAL(12,2);
  DECLARE v_placespaid INT;
  DECLARE v_amountperplayer DECIMAL(12,2);

  DECLARE v_chicagoid INT;
  DECLARE v_newscore INT;
  DECLARE v_oldscore INT DEFAULT 100;
  DECLARE v_place INT DEFAULT 0;
  DECLARE v_ties INT DEFAULT 0;
  DECLARE v_currentplace INT DEFAULT 1;
  DECLARE v_placeamount DECIMAL(12,2) DEFAULT 0;
  DECLARE flight_cur CURSOR FOR
    SELECT flight_id, hdcp1, hdcp2
      FROM rosterFlight
     WHERE roster_id = v_rosterid;
  DECLARE card_cur CURSOR FOR
    SELECT eh.handicap,
           ec.hole1, ec.hole2, ec.hole3, ec.hole4, ec.hole5, ec.hole6, ec.hole7, ec.hole8, ec.hole9,
           ec.nine_id, ec.member_id, ec.card_id
      FROM eventCard ec
      JOIN eventHandicap eh
        ON ec.member_id = eh.member_id AND eh.event_id = v_eventid
     WHERE ec.event_id = v_eventid
       AND ec.member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid)
       AND ((v_decimalhandicapyn = 0 AND eh.handicap BETWEEN v_hdcp1 AND v_hdcp2)
         OR (v_decimalhandicapyn <> 0 AND eh.rhandicap BETWEEN v_hdcp1 AND v_hdcp2));
  DECLARE payout_cur CURSOR FOR
    SELECT chicago_id, score
      FROM subEventPayChicago
     WHERE subevent_id = p_subeventid
       AND flight_id = v_flightid
     ORDER BY score DESC;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

  SELECT roster_id, event_id, course_id
    INTO v_rosterid, v_eventid, v_courseid
    FROM subEventMain
   WHERE subevent_id = p_subeventid;

  SELECT decimalhandicap_yn
    INTO v_decimalhandicapyn
    FROM courseMain
   WHERE course_id = v_courseid;

  DELETE FROM subEventPayOut WHERE subevent_id = p_subeventid;
  DELETE FROM subEventPayChicago WHERE subevent_id = p_subeventid;

  OPEN flight_cur;
  flight_loop: LOOP
    FETCH flight_cur INTO v_flightid, v_hdcp1, v_hdcp2;
    IF v_done = 1 THEN
      LEAVE flight_loop;
    END IF;

    -- build Chicago scores into subEventPayChicago
    SET v_done = 0;
    OPEN card_cur;
    card_loop: LOOP
      FETCH card_cur INTO v_handicap, v_hole1, v_hole2, v_hole3, v_hole4, v_hole5, v_hole6, v_hole7, v_hole8, v_hole9,
                         v_nine_id, v_memberid, v_cardid;
      IF v_done = 1 THEN
        LEAVE card_loop;
      END IF;

        SET v_score = v_handicap - 18;
        SELECT hole1, hole2, hole3, hole4, hole5, hole6, hole7, hole8, hole9
          INTO v_hole1par, v_hole2par, v_hole3par, v_hole4par, v_hole5par, v_hole6par, v_hole7par, v_hole8par, v_hole9par
          FROM courseNine WHERE nine_id = v_nine_id;

        -- hole 1
        IF v_hole1par + 1 = v_hole1 THEN SET v_score = v_score + 1; END IF;
        IF v_hole1par = v_hole1 THEN SET v_score = v_score + 2; END IF;
        IF v_hole1par - 1 = v_hole1 THEN SET v_score = v_score + 4; END IF;
        IF v_hole1par - 2 = v_hole1 THEN SET v_score = v_score + 8; END IF;
        IF v_hole1par - 3 = v_hole1 THEN SET v_score = v_score + 16; END IF;
        -- hole 2
        IF v_hole2par + 1 = v_hole2 THEN SET v_score = v_score + 1; END IF;
        IF v_hole2par = v_hole2 THEN SET v_score = v_score + 2; END IF;
        IF v_hole2par - 1 = v_hole2 THEN SET v_score = v_score + 4; END IF;
        IF v_hole2par - 2 = v_hole2 THEN SET v_score = v_score + 8; END IF;
        IF v_hole2par - 3 = v_hole2 THEN SET v_score = v_score + 16; END IF;
        -- hole 3
        IF v_hole3par + 1 = v_hole3 THEN SET v_score = v_score + 1; END IF;
        IF v_hole3par = v_hole3 THEN SET v_score = v_score + 2; END IF;
        IF v_hole3par - 1 = v_hole3 THEN SET v_score = v_score + 4; END IF;
        IF v_hole3par - 2 = v_hole3 THEN SET v_score = v_score + 8; END IF;
        IF v_hole3par - 3 = v_hole3 THEN SET v_score = v_score + 16; END IF;
        -- hole 4
        IF v_hole4par + 1 = v_hole4 THEN SET v_score = v_score + 1; END IF;
        IF v_hole4par = v_hole4 THEN SET v_score = v_score + 2; END IF;
        IF v_hole4par - 1 = v_hole4 THEN SET v_score = v_score + 4; END IF;
        IF v_hole4par - 2 = v_hole4 THEN SET v_score = v_score + 8; END IF;
        IF v_hole4par - 3 = v_hole4 THEN SET v_score = v_score + 16; END IF;
        -- hole 5
        IF v_hole5par + 1 = v_hole5 THEN SET v_score = v_score + 1; END IF;
        IF v_hole5par = v_hole5 THEN SET v_score = v_score + 2; END IF;
        IF v_hole5par - 1 = v_hole5 THEN SET v_score = v_score + 4; END IF;
        IF v_hole5par - 2 = v_hole5 THEN SET v_score = v_score + 8; END IF;
        IF v_hole5par - 3 = v_hole5 THEN SET v_score = v_score + 16; END IF;
        -- hole 6
        IF v_hole6par + 1 = v_hole6 THEN SET v_score = v_score + 1; END IF;
        IF v_hole6par = v_hole6 THEN SET v_score = v_score + 2; END IF;
        IF v_hole6par - 1 = v_hole6 THEN SET v_score = v_score + 4; END IF;
        IF v_hole6par - 2 = v_hole6 THEN SET v_score = v_score + 8; END IF;
        IF v_hole6par - 3 = v_hole6 THEN SET v_score = v_score + 16; END IF;
        -- hole 7
        IF v_hole7par + 1 = v_hole7 THEN SET v_score = v_score + 1; END IF;
        IF v_hole7par = v_hole7 THEN SET v_score = v_score + 2; END IF;
        IF v_hole7par - 1 = v_hole7 THEN SET v_score = v_score + 4; END IF;
        IF v_hole7par - 2 = v_hole7 THEN SET v_score = v_score + 8; END IF;
        IF v_hole7par - 3 = v_hole7 THEN SET v_score = v_score + 16; END IF;
        -- hole 8
        IF v_hole8par + 1 = v_hole8 THEN SET v_score = v_score + 1; END IF;
        IF v_hole8par = v_hole8 THEN SET v_score = v_score + 2; END IF;
        IF v_hole8par - 1 = v_hole8 THEN SET v_score = v_score + 4; END IF;
        IF v_hole8par - 2 = v_hole8 THEN SET v_score = v_score + 8; END IF;
        IF v_hole8par - 3 = v_hole8 THEN SET v_score = v_score + 16; END IF;
        -- hole 9
        IF v_hole9par + 1 = v_hole9 THEN SET v_score = v_score + 1; END IF;
        IF v_hole9par = v_hole9 THEN SET v_score = v_score + 2; END IF;
        IF v_hole9par - 1 = v_hole9 THEN SET v_score = v_score + 4; END IF;
        IF v_hole9par - 2 = v_hole9 THEN SET v_score = v_score + 8; END IF;
        IF v_hole9par - 3 = v_hole9 THEN SET v_score = v_score + 16; END IF;

        INSERT INTO subEventPayChicago
          (subevent_id,flight_id,card_id,member_id,amount,place,used_yn,score)
        VALUES
          (p_subeventid, v_flightid, v_cardid, v_memberid, 0, 0, 0, v_score);
    END LOOP;
    CLOSE card_cur;

    SELECT COUNT(*) INTO v_countflight
      FROM subEventPayChicago
     WHERE subevent_id = p_subeventid AND flight_id = v_flightid;

    SELECT amount INTO v_amountperplayer
      FROM subEventMain WHERE subevent_id = p_subeventid;

    SET v_placespaid = v_countflight * 0.3;
    IF v_placespaid < 1 AND v_countflight >= 1 THEN SET v_placespaid = 1; END IF;
    SET v_purse = v_countflight * v_amountperplayer;

    INSERT INTO subEventPayOut (place,amount,flight_id,subevent_id)
      SELECT place, payout * v_purse, v_flightid, p_subeventid
        FROM eventPayOut
       WHERE placespaid = v_placespaid;

    SET v_currentplace = 1;
    SET v_place = 0;
    SET v_ties = 0;
    SET v_oldscore = 100;

    SET v_done = 0;
    OPEN payout_cur;
    payout_loop: LOOP
      FETCH payout_cur INTO v_chicagoid, v_newscore;
      IF v_done = 1 THEN
        LEAVE payout_loop;
      END IF;

        SET v_place = v_place + 1;
        IF v_oldscore = v_newscore THEN
          UPDATE subEventPayChicago SET place = v_place WHERE chicago_id = v_chicagoid;
          SET v_ties = v_ties + 1;
        ELSE
          UPDATE subEventPayChicago SET place = v_place WHERE chicago_id = v_chicagoid;
          SET v_placeamount = 0;
          IF v_ties = 0 THEN
            SELECT amount INTO v_placeamount
              FROM subEventPayOut
             WHERE place = v_place - 1
               AND subevent_id = p_subeventid AND flight_id = v_flightid;
            UPDATE subEventPayChicago
               SET amount = v_placeamount, place = v_place - 1
             WHERE place = v_place - 1 AND subevent_id = p_subeventid AND flight_id = v_flightid;
          ELSE
            SELECT SUM(amount)/(v_ties+1) INTO v_placeamount
              FROM subEventPayOut
             WHERE place >= v_currentplace AND place <= (v_place - 1)
               AND subevent_id = p_subeventid AND flight_id = v_flightid;
            UPDATE subEventPayChicago
               SET amount = v_placeamount, place = v_currentplace
             WHERE place >= v_currentplace AND place <= (v_place - 1)
               AND subevent_id = p_subeventid AND flight_id = v_flightid;
          END IF;
          SET v_oldscore = v_newscore;
          SET v_ties = 0;
          SET v_currentplace = v_place;
        END IF;
    END LOOP;
    CLOSE payout_cur;

    IF v_ties > 0 THEN
      SELECT SUM(amount)/(v_ties+1) INTO v_placeamount
        FROM subEventPayOut
       WHERE place = v_currentplace AND subevent_id = p_subeventid AND flight_id = v_flightid;
      UPDATE subEventPayChicago
         SET amount = v_placeamount, place = v_currentplace
       WHERE place >= v_currentplace AND subevent_id = p_subeventid AND flight_id = v_flightid;
    ELSE
      UPDATE subEventPayChicago
         SET amount = 0
       WHERE place >= v_place - 1 AND subevent_id = p_subeventid AND flight_id = v_flightid;
    END IF;
  END LOOP;

  CLOSE flight_cur;

  UPDATE subEventPayChicago SET amount = 0 WHERE amount IS NULL OR amount = 0;
END


-- Batch 3
