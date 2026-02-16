CREATE PROCEDURE spBBFlightPick(IN p_subeventid INT)
BEGIN
  DECLARE v_rosterid INT;
  DECLARE v_eventid INT;
  DECLARE v_flightid INT;
  DECLARE v_hdcp1 DECIMAL(10,2);
  DECLARE v_hdcp2 DECIMAL(10,2);
  DECLARE v_grosshigh DECIMAL(12,2);
  DECLARE v_nethigh DECIMAL(12,2);
  DECLARE v_countgross INT;
  DECLARE v_countnet INT;
  DECLARE v_grossscore INT;
  DECLARE v_netscore INT;
  DECLARE v_purse DECIMAL(12,2);
  DECLARE v_placespaid INT;
  DECLARE v_amountperplayer DECIMAL(12,2);
  DECLARE v_done INT DEFAULT 0;
  DECLARE flight_cur CURSOR FOR
    SELECT flight_id, hdcp1, hdcp2 FROM rosterFlight WHERE roster_id = v_rosterid;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

  SELECT roster_id, event_id
    INTO v_rosterid, v_eventid
    FROM subEventMain
   WHERE subevent_id = p_subeventid;

  DELETE FROM subEventPayOut WHERE subevent_id = p_subeventid;
  DELETE FROM subEventBBPayGross WHERE subevent_id = p_subeventid;
  DELETE FROM subEventBBPayNet WHERE subevent_id = p_subeventid;

  OPEN flight_cur;
  flight_loop: LOOP
    FETCH flight_cur INTO v_flightid, v_hdcp1, v_hdcp2;
    IF v_done = 1 THEN
      LEAVE flight_loop;
    END IF;

    INSERT INTO subEventBBPayGross (subevent_id,event_id,flight_id,bestball_id,member1_id,member2_id,amount,place,used_yn,score)
      SELECT p_subeventid, v_eventid, v_flightid, bestball_id, member1_id, member2_id, 0, 0, 0, gross
        FROM eventBestBall
       WHERE event_id = v_eventid AND handicap BETWEEN v_hdcp1 AND v_hdcp2;

    INSERT INTO subEventBBPayNet (subevent_id,event_id,flight_id,bestball_id,member1_id,member2_id,amount,place,used_yn,score)
      SELECT p_subeventid, v_eventid, v_flightid, bestball_id, member1_id, member2_id, 0, 0, 0, net
        FROM eventBestBall
       WHERE event_id = v_eventid AND handicap BETWEEN v_hdcp1 AND v_hdcp2;

    SELECT COUNT(*) INTO v_countgross
      FROM subEventBBPayGross
     WHERE used_yn = 0 AND subevent_id = p_subeventid AND flight_id = v_flightid;

    SELECT COUNT(*) INTO v_countnet
      FROM subEventBBPayNet
     WHERE used_yn = 0 AND subevent_id = p_subeventid AND flight_id = v_flightid;

    SELECT amount * 0.5 INTO v_amountperplayer
      FROM subEventMain WHERE subevent_id = p_subeventid;

    SET v_placespaid = v_countgross * 0.3 * 0.5;
    IF v_placespaid < 1 AND v_countgross >= 1 THEN
      SET v_placespaid = 1;
    END IF;

    SET v_purse = v_countgross * v_amountperplayer;

    INSERT INTO subEventPayOut (place,amount,flight_id,subevent_id)
      SELECT place, payout * v_purse, v_flightid, p_subeventid
        FROM eventPayOut
       WHERE placespaid = v_placespaid;

    CALL spBBPayGross(p_subeventid, v_flightid);
    CALL spBBPayNet(p_subeventid, v_flightid);

    WHILE v_countgross > 0 OR v_countnet > 0 DO
      IF v_countgross > 0 THEN
        SELECT amount, score
          INTO v_grosshigh, v_grossscore
          FROM subEventBBPayGross
         WHERE used_yn = 0 AND subevent_id = p_subeventid AND flight_id = v_flightid
         ORDER BY amount DESC
         LIMIT 1;
      ELSE
        SET v_grosshigh = 0;
      END IF;

      IF v_countnet > 0 THEN
        SELECT amount, score
          INTO v_nethigh, v_netscore
          FROM subEventBBPayNet
         WHERE used_yn = 0 AND subevent_id = p_subeventid AND flight_id = v_flightid
         ORDER BY amount DESC
         LIMIT 1;
      ELSE
        SET v_nethigh = 0;
      END IF;

      IF v_grosshigh = 0 AND v_nethigh = 0 THEN
        UPDATE subEventBBPayGross
           SET used_yn = 1
         WHERE used_yn = 0 AND subevent_id = p_subeventid AND flight_id = v_flightid;

        UPDATE subEventBBPayNet
           SET used_yn = 1, place = 0, amount = 0
         WHERE used_yn = 0 AND subevent_id = p_subeventid AND flight_id = v_flightid;
      ELSE
        IF v_grosshigh >= v_nethigh THEN
          UPDATE subEventBBPayGross
             SET used_yn = 1
           WHERE used_yn = 0 AND subevent_id = p_subeventid AND flight_id = v_flightid
             AND bestball_id IN (
               SELECT bestball_id
                 FROM subEventBBPayGross
                WHERE score = v_grossscore
                  AND subevent_id = p_subeventid AND used_yn = 0 AND flight_id = v_flightid
             );

          UPDATE subEventBBPayNet
             SET used_yn = 1, place = 0, amount = 0
           WHERE used_yn = 0 AND subevent_id = p_subeventid AND flight_id = v_flightid
             AND bestball_id IN (
               SELECT bestball_id
                 FROM subEventBBPayGross
                WHERE score = v_grossscore
                  AND subevent_id = p_subeventid AND used_yn = 1 AND flight_id = v_flightid
             );

          UPDATE subEventBBPayNet
             SET place = 0, amount = 0
           WHERE used_yn = 0 AND subevent_id = p_subeventid AND flight_id = v_flightid;

          CALL spBBPayNet(p_subeventid, v_flightid);
        ELSE
          UPDATE subEventBBPayNet
             SET used_yn = 1
           WHERE used_yn = 0 AND subevent_id = p_subeventid AND flight_id = v_flightid
             AND bestball_id IN (
               SELECT bestball_id
                 FROM subEventBBPayNet
                WHERE score = v_netscore
                  AND subevent_id = p_subeventid AND used_yn = 0 AND flight_id = v_flightid
             );

          UPDATE subEventBBPayGross
             SET used_yn = 1, place = 0, amount = 0
           WHERE used_yn = 0 AND subevent_id = p_subeventid AND flight_id = v_flightid
             AND bestball_id IN (
               SELECT bestball_id
                 FROM subEventBBPayNet
                WHERE score = v_netscore
                  AND subevent_id = p_subeventid AND used_yn = 1 AND flight_id = v_flightid
             );

          UPDATE subEventBBPayGross
             SET place = 0, amount = 0
           WHERE used_yn = 0 AND subevent_id = p_subeventid AND flight_id = v_flightid;

          CALL spBBPayGross(p_subeventid, v_flightid);
        END IF;
      END IF;

      SELECT COUNT(*) INTO v_countgross
        FROM subEventBBPayGross
       WHERE used_yn = 0 AND subevent_id = p_subeventid AND flight_id = v_flightid;

      SELECT COUNT(*) INTO v_countnet
        FROM subEventBBPayNet
       WHERE used_yn = 0 AND subevent_id = p_subeventid AND flight_id = v_flightid;
    END WHILE;
  END LOOP;

  CLOSE flight_cur;

  UPDATE subEventBBPayGross SET amount = NULL WHERE amount IS NULL OR amount = 0;
  UPDATE subEventBBPayNet SET amount = NULL WHERE amount IS NULL OR amount = 0;
END

