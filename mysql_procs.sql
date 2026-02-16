DELIMITER $$
CREATE PROCEDURE BBCalculate(IN p_eventid INT)
BEGIN
  DECLARE v_holehandicap1 INT;
  DECLARE v_holehandicap2 INT;
  DECLARE v_holehandicap3 INT;
  DECLARE v_holehandicap4 INT;
  DECLARE v_holehandicap5 INT;
  DECLARE v_holehandicap6 INT;
  DECLARE v_holehandicap7 INT;
  DECLARE v_holehandicap8 INT;
  DECLARE v_holehandicap9 INT;

  DECLARE v_1hole1 INT;
  DECLARE v_1hole2 INT;
  DECLARE v_1hole3 INT;
  DECLARE v_1hole4 INT;
  DECLARE v_1hole5 INT;
  DECLARE v_1hole6 INT;
  DECLARE v_1hole7 INT;
  DECLARE v_1hole8 INT;
  DECLARE v_1hole9 INT;

  DECLARE v_2hole1 INT;
  DECLARE v_2hole2 INT;
  DECLARE v_2hole3 INT;
  DECLARE v_2hole4 INT;
  DECLARE v_2hole5 INT;
  DECLARE v_2hole6 INT;
  DECLARE v_2hole7 INT;
  DECLARE v_2hole8 INT;
  DECLARE v_2hole9 INT;

  DECLARE v_1card INT;
  DECLARE v_1handicap INT;
  DECLARE v_2card INT;
  DECLARE v_2handicap INT;

  DECLARE v_nine INT;
  DECLARE v_bestball INT;
  DECLARE v_done INT DEFAULT 0;

  DECLARE card_cur CURSOR FOR
    SELECT card1_id, card2_id, handicap1, handicap2, bestball_id
      FROM eventBestBall
     WHERE event_id = p_eventid;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

  SELECT nine_id INTO v_nine FROM eventMain WHERE event_id = p_eventid;

  SELECT handicaphole1,handicaphole2,handicaphole3,handicaphole4,handicaphole5,handicaphole6,handicaphole7,handicaphole8,handicaphole9
    INTO v_holehandicap1,v_holehandicap2,v_holehandicap3,v_holehandicap4,v_holehandicap5,v_holehandicap6,v_holehandicap7,v_holehandicap8,v_holehandicap9
    FROM courseNine WHERE nine_id = v_nine;

  OPEN card_cur;
  card_loop: LOOP
    FETCH card_cur INTO v_1card, v_2card, v_1handicap, v_2handicap, v_bestball;
    IF v_done = 1 THEN
      LEAVE card_loop;
    END IF;

    -- card1
    SELECT hole1,hole2,hole3,hole4,hole5,hole6,hole7,hole8,hole9
      INTO v_1hole1,v_1hole2,v_1hole3,v_1hole4,v_1hole5,v_1hole6,v_1hole7,v_1hole8,v_1hole9
      FROM eventCard
     WHERE card_id = v_1card
     LIMIT 1;

      IF v_1handicap <= 9 THEN
        IF v_1handicap >= v_holehandicap1 THEN SET v_1hole1 = v_1hole1 - 1; END IF;
        IF v_1handicap >= v_holehandicap2 THEN SET v_1hole2 = v_1hole2 - 1; END IF;
        IF v_1handicap >= v_holehandicap3 THEN SET v_1hole3 = v_1hole3 - 1; END IF;
        IF v_1handicap >= v_holehandicap4 THEN SET v_1hole4 = v_1hole4 - 1; END IF;
        IF v_1handicap >= v_holehandicap5 THEN SET v_1hole5 = v_1hole5 - 1; END IF;
        IF v_1handicap >= v_holehandicap6 THEN SET v_1hole6 = v_1hole6 - 1; END IF;
        IF v_1handicap >= v_holehandicap7 THEN SET v_1hole7 = v_1hole7 - 1; END IF;
        IF v_1handicap >= v_holehandicap8 THEN SET v_1hole8 = v_1hole8 - 1; END IF;
        IF v_1handicap >= v_holehandicap9 THEN SET v_1hole9 = v_1hole9 - 1; END IF;
      ELSE
        IF v_1handicap-9 >= v_holehandicap1 THEN SET v_1hole1 = v_1hole1 - 2; ELSE SET v_1hole1 = v_1hole1 - 1; END IF;
        IF v_1handicap-9 >= v_holehandicap2 THEN SET v_1hole2 = v_1hole2 - 2; ELSE SET v_1hole2 = v_1hole2 - 1; END IF;
        IF v_1handicap-9 >= v_holehandicap3 THEN SET v_1hole3 = v_1hole3 - 2; ELSE SET v_1hole3 = v_1hole3 - 1; END IF;
        IF v_1handicap-9 >= v_holehandicap4 THEN SET v_1hole4 = v_1hole4 - 2; ELSE SET v_1hole4 = v_1hole4 - 1; END IF;
        IF v_1handicap-9 >= v_holehandicap5 THEN SET v_1hole5 = v_1hole5 - 2; ELSE SET v_1hole5 = v_1hole5 - 1; END IF;
        IF v_1handicap-9 >= v_holehandicap6 THEN SET v_1hole6 = v_1hole6 - 2; ELSE SET v_1hole6 = v_1hole6 - 1; END IF;
        IF v_1handicap-9 >= v_holehandicap7 THEN SET v_1hole7 = v_1hole7 - 2; ELSE SET v_1hole7 = v_1hole7 - 1; END IF;
        IF v_1handicap-9 >= v_holehandicap8 THEN SET v_1hole8 = v_1hole8 - 2; ELSE SET v_1hole8 = v_1hole8 - 1; END IF;
        IF v_1handicap-9 >= v_holehandicap9 THEN SET v_1hole9 = v_1hole9 - 2; ELSE SET v_1hole9 = v_1hole9 - 1; END IF;
      END IF;
    -- card2
    SELECT hole1,hole2,hole3,hole4,hole5,hole6,hole7,hole8,hole9
      INTO v_2hole1,v_2hole2,v_2hole3,v_2hole4,v_2hole5,v_2hole6,v_2hole7,v_2hole8,v_2hole9
      FROM eventCard
     WHERE card_id = v_2card
     LIMIT 1;

      IF v_2handicap <= 9 THEN
        IF v_2handicap >= v_holehandicap1 THEN SET v_2hole1 = v_2hole1 - 1; END IF;
        IF v_2handicap >= v_holehandicap2 THEN SET v_2hole2 = v_2hole2 - 1; END IF;
        IF v_2handicap >= v_holehandicap3 THEN SET v_2hole3 = v_2hole3 - 1; END IF;
        IF v_2handicap >= v_holehandicap4 THEN SET v_2hole4 = v_2hole4 - 1; END IF;
        IF v_2handicap >= v_holehandicap5 THEN SET v_2hole5 = v_2hole5 - 1; END IF;
        IF v_2handicap >= v_holehandicap6 THEN SET v_2hole6 = v_2hole6 - 1; END IF;
        IF v_2handicap >= v_holehandicap7 THEN SET v_2hole7 = v_2hole7 - 1; END IF;
        IF v_2handicap >= v_holehandicap8 THEN SET v_2hole8 = v_2hole8 - 1; END IF;
        IF v_2handicap >= v_holehandicap9 THEN SET v_2hole9 = v_2hole9 - 1; END IF;
      ELSE
        IF v_2handicap-9 >= v_holehandicap1 THEN SET v_2hole1 = v_2hole1 - 2; ELSE SET v_2hole1 = v_2hole1 - 1; END IF;
        IF v_2handicap-9 >= v_holehandicap2 THEN SET v_2hole2 = v_2hole2 - 2; ELSE SET v_2hole2 = v_2hole2 - 1; END IF;
        IF v_2handicap-9 >= v_holehandicap3 THEN SET v_2hole3 = v_2hole3 - 2; ELSE SET v_2hole3 = v_2hole3 - 1; END IF;
        IF v_2handicap-9 >= v_holehandicap4 THEN SET v_2hole4 = v_2hole4 - 2; ELSE SET v_2hole4 = v_2hole4 - 1; END IF;
        IF v_2handicap-9 >= v_holehandicap5 THEN SET v_2hole5 = v_2hole5 - 2; ELSE SET v_2hole5 = v_2hole5 - 1; END IF;
        IF v_2handicap-9 >= v_holehandicap6 THEN SET v_2hole6 = v_2hole6 - 2; ELSE SET v_2hole6 = v_2hole6 - 1; END IF;
        IF v_2handicap-9 >= v_holehandicap7 THEN SET v_2hole7 = v_2hole7 - 2; ELSE SET v_2hole7 = v_2hole7 - 1; END IF;
        IF v_2handicap-9 >= v_holehandicap8 THEN SET v_2hole8 = v_2hole8 - 2; ELSE SET v_2hole8 = v_2hole8 - 1; END IF;
        IF v_2handicap-9 >= v_holehandicap9 THEN SET v_2hole9 = v_2hole9 - 2; ELSE SET v_2hole9 = v_2hole9 - 1; END IF;
      END IF;

      IF v_2hole1 > v_1hole1 THEN SET v_2hole1 = v_1hole1; END IF;
      IF v_2hole2 > v_1hole2 THEN SET v_2hole2 = v_1hole2; END IF;
      IF v_2hole3 > v_1hole3 THEN SET v_2hole3 = v_1hole3; END IF;
      IF v_2hole4 > v_1hole4 THEN SET v_2hole4 = v_1hole4; END IF;
      IF v_2hole5 > v_1hole5 THEN SET v_2hole5 = v_1hole5; END IF;
      IF v_2hole6 > v_1hole6 THEN SET v_2hole6 = v_1hole6; END IF;
      IF v_2hole7 > v_1hole7 THEN SET v_2hole7 = v_1hole7; END IF;
      IF v_2hole8 > v_1hole8 THEN SET v_2hole8 = v_1hole8; END IF;
      IF v_2hole9 > v_1hole9 THEN SET v_2hole9 = v_1hole9; END IF;
    UPDATE eventBestBall
       SET net = v_2hole1+v_2hole2+v_2hole3+v_2hole4+v_2hole5+v_2hole6+v_2hole7+v_2hole8+v_2hole9
     WHERE bestball_id = v_bestball;
  END LOOP;

  CLOSE card_cur;
END


-- Batch 4


$$

DELIMITER $$
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


$$

DELIMITER $$
CREATE PROCEDURE spBBPayGross(
  IN p_subeventid INT,
  IN p_flightid INT
)
BEGIN
  DECLARE v_grossid INT;
  DECLARE v_score INT;
  DECLARE v_oldscore INT DEFAULT 0;
  DECLARE v_place INT DEFAULT 0;
  DECLARE v_ties INT DEFAULT 0;
  DECLARE v_currentplace INT DEFAULT 1;
  DECLARE v_placeamount DECIMAL(12,2) DEFAULT 0;
  DECLARE v_done INT DEFAULT 0;
  DECLARE cur CURSOR FOR
    SELECT gross_id, score
      FROM subEventBBPayGross
     WHERE used_yn = 0
       AND subevent_id = p_subeventid
       AND flight_id = p_flightid
     ORDER BY score;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

  SELECT IFNULL(place, 0)
    INTO v_place
    FROM subEventBBPayGross
   WHERE used_yn = 1
     AND subevent_id = p_subeventid
     AND flight_id = p_flightid
   ORDER BY place DESC
   LIMIT 1;

  SELECT v_place + COUNT(*) - 1
    INTO v_place
    FROM subEventBBPayGross
   WHERE used_yn = 1
     AND subevent_id = p_subeventid
     AND flight_id = p_flightid
     AND place = v_place
     AND place <> 0;

  IF v_place < 0 THEN
    SET v_place = 0;
  END IF;

  OPEN cur;
  read_loop: LOOP
    FETCH cur INTO v_grossid, v_score;
    IF v_done = 1 THEN
      LEAVE read_loop;
    END IF;

    SET v_place = v_place + 1;

    IF v_oldscore = v_score THEN
      UPDATE subEventBBPayGross SET place = v_place WHERE gross_id = v_grossid;
      SET v_ties = v_ties + 1;
    ELSE
      UPDATE subEventBBPayGross SET place = v_place WHERE gross_id = v_grossid;
      SET v_placeamount = 0;

      IF v_ties = 0 THEN
        SELECT amount
          INTO v_placeamount
          FROM subEventPayOut
         WHERE place = v_place - 1
           AND subevent_id = p_subeventid
           AND flight_id = p_flightid;

        UPDATE subEventBBPayGross
           SET amount = v_placeamount, place = v_place - 1
         WHERE used_yn = 0
           AND place = v_place - 1
           AND subevent_id = p_subeventid
           AND flight_id = p_flightid;
      ELSE
        SELECT SUM(amount) / (v_ties + 1)
          INTO v_placeamount
          FROM subEventPayOut
         WHERE place >= v_currentplace
           AND place <= (v_place - 1)
           AND subevent_id = p_subeventid
           AND flight_id = p_flightid;

        UPDATE subEventBBPayGross
           SET amount = v_placeamount, place = v_currentplace
         WHERE used_yn = 0
           AND place >= v_currentplace
           AND place <= (v_place - 1)
           AND subevent_id = p_subeventid
           AND flight_id = p_flightid;
      END IF;

      SET v_oldscore = v_score;
      SET v_ties = 0;
      SET v_currentplace = v_place;
    END IF;
  END LOOP;

  CLOSE cur;

  IF v_ties > 0 THEN
    SELECT SUM(amount) / (v_ties + 1)
      INTO v_placeamount
      FROM subEventPayOut
     WHERE place = v_currentplace
       AND subevent_id = p_subeventid
       AND flight_id = p_flightid;

    UPDATE subEventBBPayGross
       SET amount = v_placeamount, place = v_currentplace
     WHERE used_yn = 0
       AND place >= v_currentplace
       AND subevent_id = p_subeventid
       AND flight_id = p_flightid;
  ELSE
    UPDATE subEventBBPayGross
       SET amount = 0
     WHERE place >= v_place - 1
       AND used_yn = 0
       AND subevent_id = p_subeventid
       AND flight_id = p_flightid;
  END IF;
END

$$

DELIMITER $$
CREATE PROCEDURE spBBPayNet(
  IN p_subeventid INT,
  IN p_flightid INT
)
BEGIN
  DECLARE v_netid INT;
  DECLARE v_score INT;
  DECLARE v_oldscore INT DEFAULT 0;
  DECLARE v_place INT DEFAULT 0;
  DECLARE v_ties INT DEFAULT 0;
  DECLARE v_currentplace INT DEFAULT 1;
  DECLARE v_placeamount DECIMAL(12,2) DEFAULT 0;
  DECLARE v_done INT DEFAULT 0;
  DECLARE cur CURSOR FOR
    SELECT net_id, score
      FROM subEventBBPayNet
     WHERE used_yn = 0
       AND subevent_id = p_subeventid
       AND flight_id = p_flightid
     ORDER BY score;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

  SELECT IFNULL(place, 0)
    INTO v_place
    FROM subEventBBPayNet
   WHERE used_yn = 1
     AND subevent_id = p_subeventid
     AND flight_id = p_flightid
   ORDER BY place DESC
   LIMIT 1;

  SELECT v_place + COUNT(*) - 1
    INTO v_place
    FROM subEventBBPayNet
   WHERE used_yn = 1
     AND subevent_id = p_subeventid
     AND flight_id = p_flightid
     AND place = v_place
     AND place <> 0;

  IF v_place < 0 THEN
    SET v_place = 0;
  END IF;

  OPEN cur;
  read_loop: LOOP
    FETCH cur INTO v_netid, v_score;
    IF v_done = 1 THEN
      LEAVE read_loop;
    END IF;

    SET v_place = v_place + 1;

    IF v_oldscore = v_score THEN
      UPDATE subEventBBPayNet SET place = v_place WHERE net_id = v_netid;
      SET v_ties = v_ties + 1;
    ELSE
      UPDATE subEventBBPayNet SET place = v_place WHERE net_id = v_netid;
      SET v_placeamount = 0;

      IF v_ties = 0 THEN
        SELECT amount
          INTO v_placeamount
          FROM subEventPayOut
         WHERE place = v_place - 1
           AND subevent_id = p_subeventid
           AND flight_id = p_flightid;

        UPDATE subEventBBPayNet
           SET amount = v_placeamount, place = v_place - 1
         WHERE used_yn = 0
           AND place = v_place - 1
           AND subevent_id = p_subeventid
           AND flight_id = p_flightid;
      ELSE
        SELECT SUM(amount) / (v_ties + 1)
          INTO v_placeamount
          FROM subEventPayOut
         WHERE place >= v_currentplace
           AND place <= (v_place - 1)
           AND subevent_id = p_subeventid
           AND flight_id = p_flightid;

        UPDATE subEventBBPayNet
           SET amount = v_placeamount, place = v_currentplace
         WHERE used_yn = 0
           AND place >= v_currentplace
           AND place <= (v_place - 1)
           AND subevent_id = p_subeventid
           AND flight_id = p_flightid;
      END IF;

      SET v_oldscore = v_score;
      SET v_ties = 0;
      SET v_currentplace = v_place;
    END IF;
  END LOOP;

  CLOSE cur;

  IF v_ties > 0 THEN
    SELECT SUM(amount) / (v_ties + 1)
      INTO v_placeamount
      FROM subEventPayOut
     WHERE place = v_currentplace
       AND subevent_id = p_subeventid
       AND flight_id = p_flightid;

    UPDATE subEventBBPayNet
       SET amount = v_placeamount, place = v_currentplace
     WHERE used_yn = 0
       AND place >= v_currentplace
       AND subevent_id = p_subeventid
       AND flight_id = p_flightid;
  ELSE
    UPDATE subEventBBPayNet
       SET amount = 0
     WHERE place >= v_place - 1
       AND used_yn = 0
       AND subevent_id = p_subeventid
       AND flight_id = p_flightid;
  END IF;
END

$$

DELIMITER $$
CREATE PROCEDURE spBBPick(IN p_subeventid INT)
BEGIN
  DECLARE v_rosterid INT;
  DECLARE v_eventid INT;
  DECLARE v_payout DECIMAL(10,4);
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

  SELECT cm.payout
    INTO v_payout
    FROM eventMain em
    JOIN courseMain cm ON em.course_id = cm.course_id
   WHERE em.event_id = v_eventid;

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
       WHERE event_id = v_eventid
         AND handicap BETWEEN v_hdcp1 AND v_hdcp2;

    INSERT INTO subEventBBPayNet (subevent_id,event_id,flight_id,bestball_id,member1_id,member2_id,amount,place,used_yn,score)
      SELECT p_subeventid, v_eventid, v_flightid, bestball_id, member1_id, member2_id, 0, 0, 0, net
        FROM eventBestBall
       WHERE event_id = v_eventid
         AND handicap BETWEEN v_hdcp1 AND v_hdcp2;

    SELECT COUNT(*) INTO v_countgross
      FROM subEventBBPayGross
     WHERE used_yn = 0 AND subevent_id = p_subeventid AND flight_id = v_flightid;

    SELECT COUNT(*) INTO v_countnet
      FROM subEventBBPayNet
     WHERE used_yn = 0 AND subevent_id = p_subeventid AND flight_id = v_flightid;

    SELECT amount * 0.5 INTO v_amountperplayer
      FROM subEventMain WHERE subevent_id = p_subeventid;

    SET v_placespaid = CEILING(v_countgross * v_payout * 0.5);
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

$$

DELIMITER $$
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

$$

DELIMITER $$
CREATE PROCEDURE spHandicap(IN p_eventid INT)
BEGIN
  DECLARE v_courseid INT;
  DECLARE v_eventdt DATETIME;
  DECLARE v_cardsmax INT;
  DECLARE v_cardsused INT;
  DECLARE v_memberid INT;
  DECLARE v_maxhandicap INT;
  DECLARE v_totalscores INT;
  DECLARE v_ub INT;
  DECLARE v_limit INT;
  DECLARE v_sumdiffs DECIMAL(12,4);
  DECLARE v_hdcp DECIMAL(12,4);
  DECLARE v_done INT DEFAULT 0;
  DECLARE member_cur CURSOR FOR
    SELECT member_id, maxhandicap FROM memberMain WHERE course_id = v_courseid;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

  DELETE FROM eventHandicap WHERE event_id = p_eventid;

  SELECT start_dt, course_id
    INTO v_eventdt, v_courseid
    FROM eventMain
   WHERE event_id = p_eventid;

  SELECT cardsmax, cardsused
    INTO v_cardsmax, v_cardsused
    FROM courseMain
   WHERE course_id = v_courseid;

  DELETE FROM memberHandicap WHERE course_id = v_courseid;

  INSERT INTO memberHandicap (course_id,event_id,member_id,card_id,card_dt,hdiff)
    SELECT ec.course_id, ec.event_id, ec.member_id, ec.card_id, ec.card_dt, ec.hdiff
      FROM eventCard ec
      JOIN eventMain em ON ec.event_id = em.event_id
     WHERE ec.course_id = v_courseid
       AND em.handicap_yn = 1;

  OPEN member_cur;
  member_loop: LOOP
    FETCH member_cur INTO v_memberid, v_maxhandicap;
    IF v_done = 1 THEN
      LEAVE member_loop;
    END IF;

    SELECT COUNT(*)
      INTO v_totalscores
      FROM memberHandicap
     WHERE member_id = v_memberid
       AND card_dt < v_eventdt;

    IF v_totalscores >= v_cardsmax THEN
      SET v_ub = v_cardsused - 1;
    ELSE
      IF v_totalscores <= 3 THEN SET v_ub = 0;
      ELSEIF v_totalscores <= 5 THEN SET v_ub = 1;
      ELSEIF v_totalscores <= 7 THEN SET v_ub = 2;
      ELSEIF v_totalscores <= 9 THEN SET v_ub = 3;
      ELSEIF v_totalscores <= 11 THEN SET v_ub = 4;
      ELSEIF v_totalscores <= 13 THEN SET v_ub = 5;
      ELSEIF v_totalscores <= 15 THEN SET v_ub = 6;
      ELSEIF v_totalscores <= 17 THEN SET v_ub = 7;
      ELSEIF v_totalscores <= 19 THEN SET v_ub = 8;
      ELSE SET v_ub = 9;
      END IF;
    END IF;
    SET v_limit = v_ub + 1;

    SELECT IFNULL(SUM(t2.hdiff),0)
      INTO v_sumdiffs
      FROM (
        SELECT mh.hdiff
          FROM memberHandicap mh
          JOIN (
            SELECT card_id
              FROM memberHandicap
             WHERE member_id = v_memberid
               AND card_dt < v_eventdt
             ORDER BY card_dt DESC, card_id DESC
             LIMIT v_cardsmax
          ) last_cards ON mh.card_id = last_cards.card_id
         WHERE mh.member_id = v_memberid
           AND mh.card_dt < v_eventdt
         ORDER BY mh.hdiff
         LIMIT v_limit
      ) t2;

    SET v_hdcp = v_sumdiffs / (v_ub + 1);

    IF v_courseid IN (19,25) THEN
      IF v_courseid = 19 THEN SET v_maxhandicap = 36;
      ELSEIF v_courseid = 25 THEN SET v_maxhandicap = 54;
      END IF;
    ELSE
      IF v_hdcp > 18 THEN SET v_hdcp = 18; END IF;
    END IF;

    IF v_hdcp > v_maxhandicap THEN
      SET v_hdcp = v_maxhandicap;
    END IF;

    IF v_totalscores <> 0 THEN
      INSERT INTO eventHandicap
        (event_id,member_id,handicap,rhandicap,handicap18,totalcards,cardsused,totaldiffs)
      VALUES
        (p_eventid, v_memberid, ROUND(v_hdcp,0), ROUND(v_hdcp,2), ROUND(v_hdcp*2,0),
         v_totalscores, v_ub + 1, v_sumdiffs);

      UPDATE memberMain
         SET handicap = ROUND(v_hdcp,0),
             handicap18 = ROUND(v_hdcp*2,0),
             rhandicap = ROUND(v_hdcp,2)
       WHERE member_id = v_memberid;

      UPDATE eventCard
         SET net = gross - ROUND(v_hdcp,0),
             handicap = ROUND(v_hdcp,0)
       WHERE course_id = v_courseid
         AND numholes = 9
         AND event_id = p_eventid
         AND member_id = v_memberid;

      UPDATE eventCard
         SET net = gross - ROUND(v_hdcp*2,0),
             handicap = ROUND(v_hdcp*2,0)
       WHERE course_id = v_courseid
         AND numholes = 18
         AND event_id = p_eventid
         AND member_id = v_memberid;
    ELSE
      INSERT INTO eventHandicap
        (event_id,member_id,handicap,rhandicap,handicap18,totalcards,cardsused,totaldiffs)
        SELECT p_eventid, v_memberid, handicap, handicap, handicap18, 0, 0, 0
          FROM memberMain
         WHERE member_id = v_memberid;
    END IF;
  END LOOP;

  CLOSE member_cur;

  UPDATE eventCard ec
  JOIN eventHandicap eh ON ec.member_id = eh.member_id AND eh.event_id = p_eventid
     SET ec.handicap = eh.handicap
   WHERE ec.event_id = p_eventid AND ec.numholes = 9;

  UPDATE eventCard ec
  JOIN eventHandicap eh ON ec.member_id = eh.member_id AND eh.event_id = p_eventid
     SET ec.handicap = eh.handicap18
   WHERE ec.event_id = p_eventid AND ec.numholes = 18;
END

$$

DELIMITER $$
CREATE PROCEDURE spHandicap18(IN p_eventid INT)
BEGIN
  DECLARE v_courseid INT;
  DECLARE v_eventdt DATETIME;
  DECLARE v_cardsmax INT;
  DECLARE v_cardsused INT;
  DECLARE v_memberid INT;
  DECLARE v_totalscores INT;
  DECLARE v_ub INT;
  DECLARE v_limit INT;
  DECLARE v_sumdiffs DECIMAL(12,4);
  DECLARE v_hdcp DECIMAL(12,4);
  DECLARE v_done INT DEFAULT 0;
  DECLARE member_cur CURSOR FOR
    SELECT member_id FROM memberMain WHERE course_id = v_courseid;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

  DELETE FROM eventHandicap WHERE event_id = p_eventid;

  SELECT start_dt, course_id
    INTO v_eventdt, v_courseid
    FROM eventMain
   WHERE event_id = p_eventid;

  SELECT cardsmax, cardsused
    INTO v_cardsmax, v_cardsused
    FROM courseMain
   WHERE course_id = v_courseid;

  OPEN member_cur;
  member_loop: LOOP
    FETCH member_cur INTO v_memberid;
    IF v_done = 1 THEN
      LEAVE member_loop;
    END IF;

    SELECT COUNT(*)
      INTO v_totalscores
      FROM eventCard18d
     WHERE member_id = v_memberid
       AND card_dt < v_eventdt
       AND event_id IN (
         SELECT event_id FROM eventMain WHERE course_id = v_courseid AND handicap_yn = 1
       );

    IF v_totalscores >= v_cardsmax THEN
      SET v_ub = v_cardsused - 1;
    ELSE
      IF v_totalscores <= 3 THEN SET v_ub = 0;
      ELSEIF v_totalscores <= 5 THEN SET v_ub = 1;
      ELSEIF v_totalscores <= 7 THEN SET v_ub = 2;
      ELSEIF v_totalscores <= 9 THEN SET v_ub = 3;
      ELSEIF v_totalscores <= 11 THEN SET v_ub = 4;
      ELSEIF v_totalscores <= 13 THEN SET v_ub = 5;
      ELSEIF v_totalscores <= 15 THEN SET v_ub = 6;
      ELSEIF v_totalscores <= 17 THEN SET v_ub = 7;
      ELSEIF v_totalscores <= 19 THEN SET v_ub = 8;
      ELSE SET v_ub = 9;
      END IF;
    END IF;
    SET v_limit = v_ub + 1;

    SELECT IFNULL(SUM(t2.hdiff),0)
      INTO v_sumdiffs
      FROM (
        SELECT ec18.hdiff
          FROM eventCard18d ec18
          JOIN (
            SELECT card18_id
              FROM eventCard18d
             WHERE member_id = v_memberid
               AND card_dt < v_eventdt
               AND event_id IN (
                 SELECT event_id FROM eventMain WHERE course_id = v_courseid AND handicap_yn = 1
               )
             ORDER BY card_dt DESC
             LIMIT v_cardsmax
          ) last_cards ON ec18.card18_id = last_cards.card18_id
         WHERE ec18.member_id = v_memberid
           AND ec18.card_dt < v_eventdt
         ORDER BY ec18.hdiff
         LIMIT v_limit
      ) t2;

    SET v_hdcp = v_sumdiffs / (v_ub + 1);

    IF v_courseid = 19 THEN
      IF v_hdcp > 72 THEN SET v_hdcp = 72; END IF;
    ELSE
      IF v_hdcp > 36 THEN SET v_hdcp = 36; END IF;
    END IF;

    IF v_totalscores <> 0 THEN
      INSERT INTO eventHandicap
        (event_id,member_id,handicap18,totalcards18,cardsused18,totaldiffs18)
      VALUES
        (p_eventid, v_memberid, ROUND(v_hdcp,0), v_totalscores, v_ub + 1, v_sumdiffs);

      UPDATE memberMain SET handicap18 = ROUND(v_hdcp,0) WHERE member_id = v_memberid;

      UPDATE eventCard18d
         SET net = gross - ROUND(v_hdcp,0),
             handicap = ROUND(v_hdcp,0)
       WHERE event_id = p_eventid AND member_id = v_memberid;
    ELSE
      INSERT INTO eventHandicap
        (event_id,member_id,handicap18,totalcards18,cardsused18,totaldiffs18)
        SELECT p_eventid, v_memberid, handicap18, 0, 0, 0
          FROM memberMain
         WHERE member_id = v_memberid;
    END IF;
  END LOOP;

  CLOSE member_cur;

  UPDATE eventCard18d ec
  JOIN eventHandicap eh ON ec.member_id = eh.member_id AND eh.event_id = p_eventid
     SET ec.handicap = eh.handicap18
   WHERE ec.event_id = p_eventid;
END

$$

DELIMITER $$
CREATE PROCEDURE spHandicapRiver(IN p_eventid INT)
BEGIN
  DECLARE v_courseid INT;
  DECLARE v_eventdt DATETIME;
  DECLARE v_cardsmax INT;
  DECLARE v_cardsused INT;
  DECLARE v_memberid INT;
  DECLARE v_totalscores INT;
  DECLARE v_ub INT;
  DECLARE v_limit INT;
  DECLARE v_sumdiffs DECIMAL(12,4);
  DECLARE v_hdcp DECIMAL(12,4);
  DECLARE v_mincardid INT;
  DECLARE v_maxcardid INT;
  DECLARE v_done INT DEFAULT 0;
  DECLARE member_cur CURSOR FOR
    SELECT member_id FROM memberMain WHERE course_id = v_courseid;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

  DELETE FROM eventHandicap WHERE event_id = p_eventid;

  SELECT start_dt, course_id
    INTO v_eventdt, v_courseid
    FROM eventMain
   WHERE event_id = p_eventid;

  SELECT cardsmax, cardsused
    INTO v_cardsmax, v_cardsused
    FROM courseMain
   WHERE course_id = v_courseid;

  OPEN member_cur;
  member_loop: LOOP
    FETCH member_cur INTO v_memberid;
    IF v_done = 1 THEN
      LEAVE member_loop;
    END IF;

    SELECT COUNT(*)
      INTO v_totalscores
      FROM eventCard
     WHERE member_id = v_memberid
       AND card_dt < v_eventdt
       AND event_id IN (
         SELECT event_id FROM eventMain WHERE course_id = v_courseid AND handicap_yn = 1
       );

    IF v_totalscores >= v_cardsmax THEN
      SET v_ub = v_cardsused - 1;
    ELSE
      IF v_totalscores <= 2 THEN SET v_ub = 0;
      ELSEIF v_totalscores <= 3 THEN SET v_ub = 2;
      ELSEIF v_totalscores <= 4 THEN SET v_ub = 3;
      ELSEIF v_totalscores <= 6 THEN SET v_ub = 4;
      ELSE SET v_ub = 5;
      END IF;
    END IF;
    SET v_limit = v_ub + 1;

    IF v_totalscores >= 7 THEN
      SELECT card_id
        INTO v_mincardid
        FROM (
          SELECT card_id, hdiff
            FROM eventCard
           WHERE member_id = v_memberid
             AND card_dt < v_eventdt
             AND event_id IN (
               SELECT event_id FROM eventMain WHERE course_id = v_courseid AND handicap_yn = 1
             )
           ORDER BY card_dt DESC
           LIMIT 7
        ) last7
       ORDER BY hdiff
       LIMIT 1;

      SELECT card_id
        INTO v_maxcardid
        FROM (
          SELECT card_id, hdiff
            FROM eventCard
           WHERE member_id = v_memberid
             AND card_dt < v_eventdt
             AND event_id IN (
               SELECT event_id FROM eventMain WHERE course_id = v_courseid AND handicap_yn = 1
             )
           ORDER BY card_dt DESC
           LIMIT 7
        ) last7
       ORDER BY hdiff DESC
       LIMIT 1;

      SELECT IFNULL(SUM(last7.hdiff),0)
        INTO v_sumdiffs
        FROM (
          SELECT card_id, hdiff
            FROM eventCard
           WHERE member_id = v_memberid
             AND card_dt < v_eventdt
             AND event_id IN (
               SELECT event_id FROM eventMain WHERE course_id = v_courseid AND handicap_yn = 1
             )
           ORDER BY card_dt DESC
           LIMIT 7
        ) last7
       WHERE last7.card_id NOT IN (v_mincardid, v_maxcardid);
    ELSE
      SELECT IFNULL(SUM(t2.hdiff),0)
        INTO v_sumdiffs
        FROM (
          SELECT ec.hdiff
            FROM eventCard ec
            JOIN (
              SELECT card_id
                FROM eventCard
               WHERE member_id = v_memberid
                 AND card_dt < v_eventdt
                 AND event_id IN (
                   SELECT event_id FROM eventMain WHERE course_id = v_courseid AND handicap_yn = 1
                 )
               ORDER BY card_dt DESC
               LIMIT v_cardsmax
            ) last_cards ON ec.card_id = last_cards.card_id
           WHERE ec.member_id = v_memberid
             AND ec.card_dt < v_eventdt
           ORDER BY ec.hdiff
           LIMIT v_limit
        ) t2;
    END IF;

    SET v_hdcp = v_sumdiffs / (v_ub + 1);
    IF v_hdcp > 18 THEN SET v_hdcp = 18; END IF;

    IF v_totalscores <> 0 THEN
      INSERT INTO eventHandicap
        (event_id,member_id,handicap,handicap18,rhandicap,totalcards,cardsused,totaldiffs)
      VALUES
        (p_eventid, v_memberid, ROUND(v_hdcp,0), ROUND(v_hdcp*2,0), ROUND(v_hdcp,2),
         v_totalscores, v_ub + 1, v_sumdiffs);

      UPDATE memberMain
         SET handicap = ROUND(v_hdcp,0),
             rhandicap = ROUND(v_hdcp,2)
       WHERE member_id = v_memberid;

      UPDATE eventCard
         SET net = gross - ROUND(v_hdcp,0),
             handicap = ROUND(v_hdcp,0)
       WHERE event_id = p_eventid AND member_id = v_memberid;
    ELSE
      INSERT INTO eventHandicap
        (event_id,member_id,handicap,handicap18,rhandicap,totalcards,cardsused,totaldiffs)
        SELECT p_eventid, v_memberid, handicap, handicap18, handicap, 0, 0, 0
          FROM memberMain
         WHERE member_id = v_memberid;
    END IF;
  END LOOP;

  CLOSE member_cur;

  UPDATE eventCard ec
  JOIN eventHandicap eh ON ec.member_id = eh.member_id AND eh.event_id = p_eventid
     SET ec.handicap = eh.handicap
   WHERE ec.event_id = p_eventid AND ec.numholes = 9;

  UPDATE eventCard ec
  JOIN eventHandicap eh ON ec.member_id = eh.member_id AND eh.event_id = p_eventid
     SET ec.handicap = eh.handicap18
   WHERE ec.event_id = p_eventid AND ec.numholes = 18;
END

$$

DELIMITER $$
CREATE PROCEDURE spMemberHandicap(IN p_memberid INT, IN p_eventid INT)
BEGIN
  DECLARE v_courseid INT;
  DECLARE v_eventdt DATETIME;
  DECLARE v_cardsmax INT;
  DECLARE v_cardsused INT;
  DECLARE v_totalscores INT;
  DECLARE v_ub INT;
  DECLARE v_limit INT;
  DECLARE v_sumdiffs DECIMAL(12,4);
  DECLARE v_hdcp DECIMAL(12,4);

  DELETE FROM eventHandicap WHERE event_id = p_eventid AND member_id = p_memberid;

  SELECT start_dt, course_id
    INTO v_eventdt, v_courseid
    FROM eventMain
   WHERE event_id = p_eventid;

  SELECT cardsmax, cardsused
    INTO v_cardsmax, v_cardsused
    FROM courseMain
   WHERE course_id = v_courseid;

  SELECT COUNT(*)
    INTO v_totalscores
    FROM eventCard
   WHERE member_id = p_memberid
     AND card_dt < v_eventdt
     AND event_id IN (
       SELECT event_id FROM eventMain WHERE course_id = v_courseid AND handicap_yn = 1
     );

  IF v_totalscores >= v_cardsmax THEN
    SET v_ub = v_cardsused - 1;
    ELSE
      IF v_totalscores <= 3 THEN SET v_ub = 0;
      ELSEIF v_totalscores <= 5 THEN SET v_ub = 1;
    ELSEIF v_totalscores <= 7 THEN SET v_ub = 2;
    ELSEIF v_totalscores <= 9 THEN SET v_ub = 3;
    ELSEIF v_totalscores <= 11 THEN SET v_ub = 4;
    ELSEIF v_totalscores <= 13 THEN SET v_ub = 5;
    ELSEIF v_totalscores <= 15 THEN SET v_ub = 6;
    ELSEIF v_totalscores <= 17 THEN SET v_ub = 7;
    ELSEIF v_totalscores <= 19 THEN SET v_ub = 8;
      ELSE SET v_ub = 9;
      END IF;
    END IF;
    SET v_limit = v_ub + 1;

  SELECT IFNULL(SUM(t2.hdiff),0)
    INTO v_sumdiffs
    FROM (
      SELECT ec.hdiff
        FROM eventCard ec
        JOIN (
          SELECT card_id
            FROM eventCard
           WHERE member_id = p_memberid
             AND card_dt < v_eventdt
             AND event_id IN (
               SELECT event_id FROM eventMain WHERE course_id = v_courseid AND handicap_yn = 1
             )
           ORDER BY card_dt DESC
           LIMIT v_cardsmax
        ) last_cards ON ec.card_id = last_cards.card_id
       WHERE ec.member_id = p_memberid
         AND ec.card_dt < v_eventdt
       ORDER BY ec.hdiff
       LIMIT v_limit
    ) t2;

  SET v_hdcp = v_sumdiffs / (v_ub + 1);
  IF v_hdcp > 18 THEN SET v_hdcp = 18; END IF;

  IF v_totalscores <> 0 THEN
    INSERT INTO eventHandicap (event_id,member_id,handicap,totalcards,cardsused,totaldiffs)
      VALUES (p_eventid, p_memberid, ROUND(v_hdcp,0), v_totalscores, v_ub + 1, v_sumdiffs);

    UPDATE memberMain SET handicap = ROUND(v_hdcp,0) WHERE member_id = p_memberid;
    UPDATE eventCard
       SET net = gross - ROUND(v_hdcp,0), handicap = ROUND(v_hdcp,0)
     WHERE event_id = p_eventid AND member_id = p_memberid;
  ELSE
    INSERT INTO eventHandicap (event_id,member_id,handicap,totalcards,cardsused,totaldiffs)
      SELECT p_eventid, p_memberid, handicap, 0, 0, 0 FROM memberMain WHERE member_id = p_memberid;
  END IF;

  UPDATE eventCard ec
  JOIN eventHandicap eh ON ec.member_id = eh.member_id AND eh.event_id = p_eventid
     SET ec.handicap = eh.handicap
   WHERE ec.event_id = p_eventid;
END

$$

DELIMITER $$
CREATE PROCEDURE spMemberHandicap18(IN p_memberid INT, IN p_eventid INT)
BEGIN
  DECLARE v_courseid INT;
  DECLARE v_eventdt DATETIME;
  DECLARE v_cardsmax INT;
  DECLARE v_cardsused INT;
  DECLARE v_totalscores INT;
  DECLARE v_ub INT;
  DECLARE v_limit INT;
  DECLARE v_sumdiffs DECIMAL(12,4);
  DECLARE v_hdcp DECIMAL(12,4);

  DELETE FROM eventHandicap WHERE event_id = p_eventid AND member_id = p_memberid;

  SELECT start_dt, course_id
    INTO v_eventdt, v_courseid
    FROM eventMain
   WHERE event_id = p_eventid;

  SELECT cardsmax * 2, cardsused * 2
    INTO v_cardsmax, v_cardsused
    FROM courseMain
   WHERE course_id = v_courseid;

  SELECT COUNT(*)
    INTO v_totalscores
    FROM eventCard
   WHERE member_id = p_memberid
     AND card_dt < v_eventdt
     AND event_id IN (
       SELECT event_id FROM eventMain WHERE course_id = v_courseid AND handicap_yn = 1
     );

  IF v_totalscores >= v_cardsmax THEN
    SET v_ub = v_cardsused - 1;
    ELSE
      IF v_totalscores <= 3 THEN SET v_ub = 0;
      ELSEIF v_totalscores <= 5 THEN SET v_ub = 1;
    ELSEIF v_totalscores <= 7 THEN SET v_ub = 2;
    ELSEIF v_totalscores <= 9 THEN SET v_ub = 3;
    ELSEIF v_totalscores <= 11 THEN SET v_ub = 4;
    ELSEIF v_totalscores <= 13 THEN SET v_ub = 5;
    ELSEIF v_totalscores <= 15 THEN SET v_ub = 6;
    ELSEIF v_totalscores <= 17 THEN SET v_ub = 7;
    ELSEIF v_totalscores <= 19 THEN SET v_ub = 8;
      ELSE SET v_ub = 9;
      END IF;
    END IF;
    SET v_limit = v_ub + 1;

  SELECT IFNULL(SUM(t2.hdiff),0)
    INTO v_sumdiffs
    FROM (
      SELECT ec.hdiff
        FROM eventCard ec
        JOIN (
          SELECT card_id
            FROM eventCard
           WHERE member_id = p_memberid
             AND card_dt < v_eventdt
             AND event_id IN (
               SELECT event_id FROM eventMain WHERE course_id = v_courseid AND handicap_yn = 1
             )
           ORDER BY card_dt DESC
           LIMIT v_cardsmax
        ) last_cards ON ec.card_id = last_cards.card_id
       WHERE ec.member_id = p_memberid
         AND ec.card_dt < v_eventdt
       ORDER BY ec.hdiff
       LIMIT v_limit
    ) t2;

  SET v_hdcp = (v_sumdiffs * 2) / (v_ub + 1);
  IF v_hdcp > 36 THEN SET v_hdcp = 36; END IF;

  IF v_totalscores <> 0 THEN
    INSERT INTO eventHandicap (event_id,member_id,handicap18,totalcards,cardsused,totaldiffs)
      VALUES (p_eventid, p_memberid, ROUND(v_hdcp,0), FLOOR(v_totalscores/2), FLOOR((v_ub + 1)/2), v_sumdiffs);

    UPDATE memberMain SET handicap18 = ROUND(v_hdcp,0) WHERE member_id = p_memberid;
    UPDATE eventCard
       SET net = gross - ROUND(v_hdcp,0), handicap = ROUND(v_hdcp,0)
     WHERE event_id = p_eventid AND member_id = p_memberid;
  ELSE
    INSERT INTO eventHandicap (event_id,member_id,handicap,totalcards,cardsused,totaldiffs)
      SELECT p_eventid, p_memberid, handicap, 0, 0, 0 FROM memberMain WHERE member_id = p_memberid;
  END IF;

  UPDATE eventCard ec
  JOIN eventHandicap eh ON ec.member_id = eh.member_id AND eh.event_id = p_eventid
     SET ec.handicap = eh.handicap
   WHERE ec.event_id = p_eventid;
END


-- Batch 2

$$

DELIMITER $$
CREATE PROCEDURE spMoneyList()
BEGIN
  DELETE sem
    FROM subEventMain sem
    LEFT JOIN eventMain em ON sem.event_id = em.event_id
   WHERE em.event_id IS NULL;

  DELETE bbpg
    FROM subEventBBPayGross bbpg
    LEFT JOIN subEventMain sem ON bbpg.subevent_id = sem.subevent_id
   WHERE sem.subevent_id IS NULL;

  DELETE bbpn
    FROM subEventBBPayNet bbpn
    LEFT JOIN subEventMain sem ON bbpn.subevent_id = sem.subevent_id
   WHERE sem.subevent_id IS NULL;

  DELETE spg
    FROM subEventPayGross spg
    LEFT JOIN subEventMain sem ON spg.subevent_id = sem.subevent_id
   WHERE sem.subevent_id IS NULL;

  DELETE spn
    FROM subEventPayNet spn
    LEFT JOIN subEventMain sem ON spn.subevent_id = sem.subevent_id
   WHERE sem.subevent_id IS NULL;

  DELETE spo
    FROM subEventPayOut spo
    LEFT JOIN subEventMain sem ON spo.subevent_id = sem.subevent_id
   WHERE sem.subevent_id IS NULL;

  DELETE es
    FROM eventSkin es
    LEFT JOIN subEventMain sem ON es.subevent_id = sem.subevent_id
   WHERE sem.subevent_id IS NULL;
END


-- Batch 5


$$

DELIMITER $$
CREATE PROCEDURE spNetSkin(IN p_eventid INT, IN p_subeventid INT)
BEGIN
  DECLARE v_rosterid INT;
  DECLARE v_holecount INT;
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
  DECLARE v_handicap INT;
  DECLARE v_hole1 INT;
  DECLARE v_hole2 INT;
  DECLARE v_hole3 INT;
  DECLARE v_hole4 INT;
  DECLARE v_hole5 INT;
  DECLARE v_hole6 INT;
  DECLARE v_hole7 INT;
  DECLARE v_hole8 INT;
  DECLARE v_hole9 INT;
  DECLARE v_nine_id INT;
  DECLARE v_hhole1 INT;
  DECLARE v_hhole2 INT;
  DECLARE v_hhole3 INT;
  DECLARE v_hhole4 INT;
  DECLARE v_hhole5 INT;
  DECLARE v_hhole6 INT;
  DECLARE v_hhole7 INT;
  DECLARE v_hhole8 INT;
  DECLARE v_hhole9 INT;
  DECLARE v_handicaphole1 INT;
  DECLARE v_handicaphole2 INT;
  DECLARE v_handicaphole3 INT;
  DECLARE v_handicaphole4 INT;
  DECLARE v_handicaphole5 INT;
  DECLARE v_handicaphole6 INT;
  DECLARE v_handicaphole7 INT;
  DECLARE v_handicaphole8 INT;
  DECLARE v_handicaphole9 INT;
  DECLARE v_done INT DEFAULT 0;
  DECLARE card_cur CURSOR FOR
    SELECT member_id, card_id, handicap, nine_id,
           hole1,hole2,hole3,hole4,hole5,hole6,hole7,hole8,hole9
      FROM eventCard
     WHERE member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid)
       AND event_id = p_eventid;
  DECLARE flight_cur CURSOR FOR
    SELECT flight_id, hdcp1, hdcp2 FROM rosterFlight WHERE roster_id = v_rosterid;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

  CALL spHandicap(p_eventid);

  SELECT amount, roster_id
    INTO v_skinamount, v_rosterid
    FROM subEventMain
   WHERE subevent_id = p_subeventid;

  DELETE FROM subEventSkinNet WHERE subevent_id = p_subeventid;
  DELETE FROM subEventSkinNetResults WHERE subevent_id = p_subeventid;

  -- populate subEventSkinNet with adjusted holes
  SET v_done = 0;
  OPEN card_cur;
  card_loop: LOOP
    FETCH card_cur INTO v_memberid, v_cardid, v_handicap, v_nine_id,
                       v_hole1, v_hole2, v_hole3, v_hole4, v_hole5, v_hole6, v_hole7, v_hole8, v_hole9;
    IF v_done = 1 THEN
      LEAVE card_loop;
    END IF;

    SELECT handicaphole1,handicaphole2,handicaphole3,handicaphole4,handicaphole5,handicaphole6,handicaphole7,handicaphole8,handicaphole9
      INTO v_handicaphole1,v_handicaphole2,v_handicaphole3,v_handicaphole4,v_handicaphole5,v_handicaphole6,v_handicaphole7,v_handicaphole8,v_handicaphole9
      FROM courseNine WHERE nine_id = v_nine_id;

    SET v_hhole1 = v_hole1;
    IF v_handicaphole1 <= v_handicap THEN
      SET v_hhole1 = v_hole1 - 1;
      IF v_handicaphole1 + 9 <= v_handicap THEN SET v_hhole1 = v_hole1 - 2; END IF;
    END IF;
    SET v_hhole2 = v_hole2;
    IF v_handicaphole2 <= v_handicap THEN
      SET v_hhole2 = v_hole2 - 1;
      IF v_handicaphole2 + 9 <= v_handicap THEN SET v_hhole2 = v_hole2 - 2; END IF;
    END IF;
    SET v_hhole3 = v_hole3;
    IF v_handicaphole3 <= v_handicap THEN
      SET v_hhole3 = v_hole3 - 1;
      IF v_handicaphole3 + 9 <= v_handicap THEN SET v_hhole3 = v_hole3 - 2; END IF;
    END IF;
    SET v_hhole4 = v_hole4;
    IF v_handicaphole4 <= v_handicap THEN
      SET v_hhole4 = v_hole4 - 1;
      IF v_handicaphole4 + 9 <= v_handicap THEN SET v_hhole4 = v_hole4 - 2; END IF;
    END IF;
    SET v_hhole5 = v_hole5;
    IF v_handicaphole5 <= v_handicap THEN
      SET v_hhole5 = v_hole5 - 1;
      IF v_handicaphole5 + 9 <= v_handicap THEN SET v_hhole5 = v_hole5 - 2; END IF;
    END IF;
    SET v_hhole6 = v_hole6;
    IF v_handicaphole6 <= v_handicap THEN
      SET v_hhole6 = v_hole6 - 1;
      IF v_handicaphole6 + 9 <= v_handicap THEN SET v_hhole6 = v_hole6 - 2; END IF;
    END IF;
    SET v_hhole7 = v_hole7;
    IF v_handicaphole7 <= v_handicap THEN
      SET v_hhole7 = v_hole7 - 1;
      IF v_handicaphole7 + 9 <= v_handicap THEN SET v_hhole7 = v_hole7 - 2; END IF;
    END IF;
    SET v_hhole8 = v_hole8;
    IF v_handicaphole8 <= v_handicap THEN
      SET v_hhole8 = v_hole8 - 1;
      IF v_handicaphole8 + 9 <= v_handicap THEN SET v_hhole8 = v_hole8 - 2; END IF;
    END IF;
    SET v_hhole9 = v_hole9;
    IF v_handicaphole9 <= v_handicap THEN
      SET v_hhole9 = v_hole9 - 1;
      IF v_handicaphole9 + 9 <= v_handicap THEN SET v_hhole9 = v_hole9 - 2; END IF;
    END IF;

    IF v_handicap < 0 THEN
      IF 9 - v_handicaphole1 < ABS(v_handicap) THEN SET v_hhole1 = v_hole1 + 1; END IF;
      IF 9 - v_handicaphole2 < ABS(v_handicap) THEN SET v_hhole2 = v_hole2 + 1; END IF;
      IF 9 - v_handicaphole3 < ABS(v_handicap) THEN SET v_hhole3 = v_hole3 + 1; END IF;
      IF 9 - v_handicaphole4 < ABS(v_handicap) THEN SET v_hhole4 = v_hole4 + 1; END IF;
      IF 9 - v_handicaphole5 < ABS(v_handicap) THEN SET v_hhole5 = v_hole5 + 1; END IF;
      IF 9 - v_handicaphole6 < ABS(v_handicap) THEN SET v_hhole6 = v_hole6 + 1; END IF;
      IF 9 - v_handicaphole7 < ABS(v_handicap) THEN SET v_hhole7 = v_hole7 + 1; END IF;
      IF 9 - v_handicaphole8 < ABS(v_handicap) THEN SET v_hhole8 = v_hole8 + 1; END IF;
      IF 9 - v_handicaphole9 < ABS(v_handicap) THEN SET v_hhole9 = v_hole9 + 1; END IF;
    END IF;

    INSERT INTO subEventSkinNet
      (event_id,subevent_id,member_id,card_id,handicap,
       hole1,hole2,hole3,hole4,hole5,hole6,hole7,hole8,hole9,
       hhole1,hhole2,hhole3,hhole4,hhole5,hhole6,hhole7,hhole8,hhole9)
    VALUES
      (p_eventid,p_subeventid,v_memberid,v_cardid,v_handicap,
       v_hole1,v_hole2,v_hole3,v_hole4,v_hole5,v_hole6,v_hole7,v_hole8,v_hole9,
       v_hhole1,v_hhole2,v_hhole3,v_hhole4,v_hhole5,v_hhole6,v_hhole7,v_hhole8,v_hhole9);
  END LOOP;
  CLOSE card_cur;

  -- per-flight winners
  SET v_done = 0;
  OPEN flight_cur;
  flight_loop: LOOP
    FETCH flight_cur INTO v_flightid, v_hdcp1, v_hdcp2;
    IF v_done = 1 THEN
      LEAVE flight_loop;
    END IF;

    SET v_countwinners = 0;

    -- hole 1
    SELECT MIN(hhole1) INTO v_minhole
      FROM subEventSkinNet
     WHERE event_id = p_eventid AND handicap BETWEEN v_hdcp1 AND v_hdcp2
       AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);
    SELECT COUNT(DISTINCT member_id) INTO v_holecount
      FROM subEventSkinNet
     WHERE event_id = p_eventid AND hhole1 = v_minhole
       AND handicap BETWEEN v_hdcp1 AND v_hdcp2
       AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);
    IF v_holecount = 1 THEN
      SELECT member_id, netskin_id INTO v_memberid, v_cardid
        FROM subEventSkinNet
       WHERE hhole1 = v_minhole AND event_id = p_eventid
         AND handicap BETWEEN v_hdcp1 AND v_hdcp2
         AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid)
       LIMIT 1;
      INSERT INTO subEventSkinNetResults (event_id,member_id,subevent_id,flight_id,hole,score,amount,netskin_id)
        VALUES (p_eventid,v_memberid,p_subeventid,v_flightid,1,v_minhole,0,v_cardid);
      SET v_countwinners = v_countwinners + 1;
    END IF;

    -- holes 2..9 (repeat)
    -- For brevity, identical blocks for hhole2..hhole9
    -- hole 2
    SELECT MIN(hhole2) INTO v_minhole FROM subEventSkinNet
     WHERE event_id = p_eventid AND handicap BETWEEN v_hdcp1 AND v_hdcp2
       AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);
    SELECT COUNT(DISTINCT member_id) INTO v_holecount FROM subEventSkinNet
     WHERE event_id = p_eventid AND hhole2 = v_minhole
       AND handicap BETWEEN v_hdcp1 AND v_hdcp2
       AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);
    IF v_holecount = 1 THEN
      SELECT member_id, netskin_id INTO v_memberid, v_cardid
        FROM subEventSkinNet
       WHERE hhole2 = v_minhole AND event_id = p_eventid
         AND handicap BETWEEN v_hdcp1 AND v_hdcp2
         AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid)
       LIMIT 1;
      INSERT INTO subEventSkinNetResults (event_id,member_id,subevent_id,flight_id,hole,score,amount,netskin_id)
        VALUES (p_eventid,v_memberid,p_subeventid,v_flightid,2,v_minhole,0,v_cardid);
      SET v_countwinners = v_countwinners + 1;
    END IF;

    -- hole 3
    SELECT MIN(hhole3) INTO v_minhole FROM subEventSkinNet
     WHERE event_id = p_eventid AND handicap BETWEEN v_hdcp1 AND v_hdcp2
       AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);
    SELECT COUNT(DISTINCT member_id) INTO v_holecount FROM subEventSkinNet
     WHERE event_id = p_eventid AND hhole3 = v_minhole
       AND handicap BETWEEN v_hdcp1 AND v_hdcp2
       AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);
    IF v_holecount = 1 THEN
      SELECT member_id, netskin_id INTO v_memberid, v_cardid
        FROM subEventSkinNet
       WHERE hhole3 = v_minhole AND event_id = p_eventid
         AND handicap BETWEEN v_hdcp1 AND v_hdcp2
         AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid)
       LIMIT 1;
      INSERT INTO subEventSkinNetResults (event_id,member_id,subevent_id,flight_id,hole,score,amount,netskin_id)
        VALUES (p_eventid,v_memberid,p_subeventid,v_flightid,3,v_minhole,0,v_cardid);
      SET v_countwinners = v_countwinners + 1;
    END IF;

    -- hole 4
    SELECT MIN(hhole4) INTO v_minhole FROM subEventSkinNet
     WHERE event_id = p_eventid AND handicap BETWEEN v_hdcp1 AND v_hdcp2
       AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);
    SELECT COUNT(DISTINCT member_id) INTO v_holecount FROM subEventSkinNet
     WHERE event_id = p_eventid AND hhole4 = v_minhole
       AND handicap BETWEEN v_hdcp1 AND v_hdcp2
       AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);
    IF v_holecount = 1 THEN
      SELECT member_id, netskin_id INTO v_memberid, v_cardid
        FROM subEventSkinNet
       WHERE hhole4 = v_minhole AND event_id = p_eventid
         AND handicap BETWEEN v_hdcp1 AND v_hdcp2
         AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid)
       LIMIT 1;
      INSERT INTO subEventSkinNetResults (event_id,member_id,subevent_id,flight_id,hole,score,amount,netskin_id)
        VALUES (p_eventid,v_memberid,p_subeventid,v_flightid,4,v_minhole,0,v_cardid);
      SET v_countwinners = v_countwinners + 1;
    END IF;

    -- hole 5
    SELECT MIN(hhole5) INTO v_minhole FROM subEventSkinNet
     WHERE event_id = p_eventid AND handicap BETWEEN v_hdcp1 AND v_hdcp2
       AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);
    SELECT COUNT(DISTINCT member_id) INTO v_holecount FROM subEventSkinNet
     WHERE event_id = p_eventid AND hhole5 = v_minhole
       AND handicap BETWEEN v_hdcp1 AND v_hdcp2
       AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);
    IF v_holecount = 1 THEN
      SELECT member_id, netskin_id INTO v_memberid, v_cardid
        FROM subEventSkinNet
       WHERE hhole5 = v_minhole AND event_id = p_eventid
         AND handicap BETWEEN v_hdcp1 AND v_hdcp2
         AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid)
       LIMIT 1;
      INSERT INTO subEventSkinNetResults (event_id,member_id,subevent_id,flight_id,hole,score,amount,netskin_id)
        VALUES (p_eventid,v_memberid,p_subeventid,v_flightid,5,v_minhole,0,v_cardid);
      SET v_countwinners = v_countwinners + 1;
    END IF;

    -- hole 6
    SELECT MIN(hhole6) INTO v_minhole FROM subEventSkinNet
     WHERE event_id = p_eventid AND handicap BETWEEN v_hdcp1 AND v_hdcp2
       AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);
    SELECT COUNT(DISTINCT member_id) INTO v_holecount FROM subEventSkinNet
     WHERE event_id = p_eventid AND hhole6 = v_minhole
       AND handicap BETWEEN v_hdcp1 AND v_hdcp2
       AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);
    IF v_holecount = 1 THEN
      SELECT member_id, netskin_id INTO v_memberid, v_cardid
        FROM subEventSkinNet
       WHERE hhole6 = v_minhole AND event_id = p_eventid
         AND handicap BETWEEN v_hdcp1 AND v_hdcp2
         AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid)
       LIMIT 1;
      INSERT INTO subEventSkinNetResults (event_id,member_id,subevent_id,flight_id,hole,score,amount,netskin_id)
        VALUES (p_eventid,v_memberid,p_subeventid,v_flightid,6,v_minhole,0,v_cardid);
      SET v_countwinners = v_countwinners + 1;
    END IF;

    -- hole 7
    SELECT MIN(hhole7) INTO v_minhole FROM subEventSkinNet
     WHERE event_id = p_eventid AND handicap BETWEEN v_hdcp1 AND v_hdcp2
       AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);
    SELECT COUNT(DISTINCT member_id) INTO v_holecount FROM subEventSkinNet
     WHERE event_id = p_eventid AND hhole7 = v_minhole
       AND handicap BETWEEN v_hdcp1 AND v_hdcp2
       AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);
    IF v_holecount = 1 THEN
      SELECT member_id, netskin_id INTO v_memberid, v_cardid
        FROM subEventSkinNet
       WHERE hhole7 = v_minhole AND event_id = p_eventid
         AND handicap BETWEEN v_hdcp1 AND v_hdcp2
         AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid)
       LIMIT 1;
      INSERT INTO subEventSkinNetResults (event_id,member_id,subevent_id,flight_id,hole,score,amount,netskin_id)
        VALUES (p_eventid,v_memberid,p_subeventid,v_flightid,7,v_minhole,0,v_cardid);
      SET v_countwinners = v_countwinners + 1;
    END IF;

    -- hole 8
    SELECT MIN(hhole8) INTO v_minhole FROM subEventSkinNet
     WHERE event_id = p_eventid AND handicap BETWEEN v_hdcp1 AND v_hdcp2
       AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);
    SELECT COUNT(DISTINCT member_id) INTO v_holecount FROM subEventSkinNet
     WHERE event_id = p_eventid AND hhole8 = v_minhole
       AND handicap BETWEEN v_hdcp1 AND v_hdcp2
       AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);
    IF v_holecount = 1 THEN
      SELECT member_id, netskin_id INTO v_memberid, v_cardid
        FROM subEventSkinNet
       WHERE hhole8 = v_minhole AND event_id = p_eventid
         AND handicap BETWEEN v_hdcp1 AND v_hdcp2
         AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid)
       LIMIT 1;
      INSERT INTO subEventSkinNetResults (event_id,member_id,subevent_id,flight_id,hole,score,amount,netskin_id)
        VALUES (p_eventid,v_memberid,p_subeventid,v_flightid,8,v_minhole,0,v_cardid);
      SET v_countwinners = v_countwinners + 1;
    END IF;

    -- hole 9
    SELECT MIN(hhole9) INTO v_minhole FROM subEventSkinNet
     WHERE event_id = p_eventid AND handicap BETWEEN v_hdcp1 AND v_hdcp2
       AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);
    SELECT COUNT(DISTINCT member_id) INTO v_holecount FROM subEventSkinNet
     WHERE event_id = p_eventid AND hhole9 = v_minhole
       AND handicap BETWEEN v_hdcp1 AND v_hdcp2
       AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);
    IF v_holecount = 1 THEN
      SELECT member_id, netskin_id INTO v_memberid, v_cardid
        FROM subEventSkinNet
       WHERE hhole9 = v_minhole AND event_id = p_eventid
         AND handicap BETWEEN v_hdcp1 AND v_hdcp2
         AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid)
       LIMIT 1;
      INSERT INTO subEventSkinNetResults (event_id,member_id,subevent_id,flight_id,hole,score,amount,netskin_id)
        VALUES (p_eventid,v_memberid,p_subeventid,v_flightid,9,v_minhole,0,v_cardid);
      SET v_countwinners = v_countwinners + 1;
    END IF;

    SELECT COUNT(*) INTO v_countflight
      FROM subEventSkinNet
     WHERE event_id = p_eventid
       AND handicap BETWEEN v_hdcp1 AND v_hdcp2
       AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);

    IF v_countwinners <> 0 AND v_countflight <> 0 THEN
      SET v_totalskin = (v_skinamount * v_countflight) / v_countwinners;
      UPDATE subEventSkinNetResults
         SET amount = v_totalskin
       WHERE event_id = p_eventid AND subevent_id = p_subeventid AND flight_id = v_flightid;
    END IF;
  END LOOP;

  CLOSE flight_cur;
END


$$

DELIMITER $$
CREATE PROCEDURE spPayGross(
  IN p_subeventid INT,
  IN p_flightid INT
)
BEGIN
  DECLARE v_grossid INT;
  DECLARE v_score INT;
  DECLARE v_oldscore INT DEFAULT 0;
  DECLARE v_place INT DEFAULT 0;
  DECLARE v_ties INT DEFAULT 0;
  DECLARE v_currentplace INT DEFAULT 1;
  DECLARE v_placeamount DECIMAL(12,2) DEFAULT 0;
  DECLARE v_done INT DEFAULT 0;
  DECLARE cur CURSOR FOR
    SELECT Gross_id, score
      FROM subEventPayGross
     WHERE used_yn = 0
       AND subevent_id = p_subeventid
       AND flight_id = p_flightid
     ORDER BY score;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

  SELECT IFNULL(place, 0)
    INTO v_place
    FROM subEventPayGross
   WHERE used_yn = 1
     AND subevent_id = p_subeventid
     AND flight_id = p_flightid
   ORDER BY place DESC
   LIMIT 1;

  SELECT v_place + COUNT(*) - 1
    INTO v_place
    FROM subEventPayGross
   WHERE used_yn = 1
     AND subevent_id = p_subeventid
     AND flight_id = p_flightid
     AND place = v_place
     AND place <> 0;

  IF v_place < 0 THEN
    SET v_place = 0;
  END IF;

  OPEN cur;
  read_loop: LOOP
    FETCH cur INTO v_grossid, v_score;
    IF v_done = 1 THEN
      LEAVE read_loop;
    END IF;

    SET v_place = v_place + 1;

    IF v_oldscore = v_score THEN
      UPDATE subEventPayGross SET place = v_place WHERE Gross_id = v_grossid;
      SET v_ties = v_ties + 1;
    ELSE
      UPDATE subEventPayGross SET place = v_place WHERE Gross_id = v_grossid;
      SET v_placeamount = 0;

      IF v_ties = 0 THEN
        SELECT amount
          INTO v_placeamount
          FROM subEventPayOut
         WHERE place = v_place - 1
           AND subevent_id = p_subeventid
           AND flight_id = p_flightid;

        UPDATE subEventPayGross
           SET amount = v_placeamount, place = v_place - 1
         WHERE used_yn = 0
           AND place = v_place - 1
           AND subevent_id = p_subeventid
           AND flight_id = p_flightid;
      ELSE
        SELECT SUM(amount) / (v_ties + 1)
          INTO v_placeamount
          FROM subEventPayOut
         WHERE place >= v_currentplace
           AND place <= (v_place - 1)
           AND subevent_id = p_subeventid
           AND flight_id = p_flightid;

        UPDATE subEventPayGross
           SET amount = v_placeamount, place = v_currentplace
         WHERE used_yn = 0
           AND place >= v_currentplace
           AND place <= (v_place - 1)
           AND subevent_id = p_subeventid
           AND flight_id = p_flightid;
      END IF;

      SET v_oldscore = v_score;
      SET v_ties = 0;
      SET v_currentplace = v_place;
    END IF;
  END LOOP;
  CLOSE cur;

  IF v_ties > 0 THEN
    SELECT SUM(amount) / (v_ties + 1)
      INTO v_placeamount
      FROM subEventPayOut
     WHERE place = v_currentplace
       AND subevent_id = p_subeventid
       AND flight_id = p_flightid;

    UPDATE subEventPayGross
       SET amount = v_placeamount, place = v_currentplace
     WHERE used_yn = 0
       AND place >= v_currentplace
       AND subevent_id = p_subeventid
       AND flight_id = p_flightid;
  ELSE
    UPDATE subEventPayGross
       SET amount = 0
     WHERE place >= v_place - 1
       AND used_yn = 0
       AND subevent_id = p_subeventid
       AND flight_id = p_flightid;
  END IF;
END

$$

DELIMITER $$
CREATE PROCEDURE spPayNet(
  IN p_subeventid INT,
  IN p_flightid INT
)
BEGIN
  DECLARE v_netid INT;
  DECLARE v_score INT;
  DECLARE v_oldscore INT DEFAULT 0;
  DECLARE v_place INT DEFAULT 0;
  DECLARE v_ties INT DEFAULT 0;
  DECLARE v_currentplace INT DEFAULT 1;
  DECLARE v_placeamount DECIMAL(12,2) DEFAULT 0;
  DECLARE v_done INT DEFAULT 0;
  DECLARE cur CURSOR FOR
    SELECT Net_id, score
      FROM subEventPayNet
     WHERE used_yn = 0
       AND subevent_id = p_subeventid
       AND flight_id = p_flightid
     ORDER BY score;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

  SELECT IFNULL(place, 0)
    INTO v_place
    FROM subEventPayNet
   WHERE used_yn = 1
     AND subevent_id = p_subeventid
     AND flight_id = p_flightid
   ORDER BY place DESC
   LIMIT 1;

  SELECT v_place + COUNT(*) - 1
    INTO v_place
    FROM subEventPayNet
   WHERE used_yn = 1
     AND subevent_id = p_subeventid
     AND flight_id = p_flightid
     AND place = v_place
     AND place <> 0;

  IF v_place < 0 THEN
    SET v_place = 0;
  END IF;

  OPEN cur;
  read_loop: LOOP
    FETCH cur INTO v_netid, v_score;
    IF v_done = 1 THEN
      LEAVE read_loop;
    END IF;

    SET v_place = v_place + 1;

    IF v_oldscore = v_score THEN
      UPDATE subEventPayNet SET place = v_place WHERE Net_id = v_netid;
      SET v_ties = v_ties + 1;
    ELSE
      UPDATE subEventPayNet SET place = v_place WHERE Net_id = v_netid;
      SET v_placeamount = 0;

      IF v_ties = 0 THEN
        SELECT amount
          INTO v_placeamount
          FROM subEventPayOut
         WHERE place = v_place - 1
           AND subevent_id = p_subeventid
           AND flight_id = p_flightid;

        UPDATE subEventPayNet
           SET amount = v_placeamount, place = v_place - 1
         WHERE used_yn = 0
           AND place = v_place - 1
           AND subevent_id = p_subeventid
           AND flight_id = p_flightid;
      ELSE
        SELECT SUM(amount) / (v_ties + 1)
          INTO v_placeamount
          FROM subEventPayOut
         WHERE place >= v_currentplace
           AND place <= (v_place - 1)
           AND subevent_id = p_subeventid
           AND flight_id = p_flightid;

        UPDATE subEventPayNet
           SET amount = v_placeamount, place = v_currentplace
         WHERE used_yn = 0
           AND place >= v_currentplace
           AND place <= (v_place - 1)
           AND subevent_id = p_subeventid
           AND flight_id = p_flightid;
      END IF;

      SET v_oldscore = v_score;
      SET v_ties = 0;
      SET v_currentplace = v_place;
    END IF;
  END LOOP;
  CLOSE cur;

  IF v_ties > 0 THEN
    SELECT SUM(amount) / (v_ties + 1)
      INTO v_placeamount
      FROM subEventPayOut
     WHERE place = v_currentplace
       AND subevent_id = p_subeventid
       AND flight_id = p_flightid;

    UPDATE subEventPayNet
       SET amount = v_placeamount, place = v_currentplace
     WHERE used_yn = 0
       AND place >= v_currentplace
       AND subevent_id = p_subeventid
       AND flight_id = p_flightid;
  ELSE
    UPDATE subEventPayNet
       SET amount = 0
     WHERE place >= v_place - 1
       AND used_yn = 0
       AND subevent_id = p_subeventid
       AND flight_id = p_flightid;
  END IF;
END

$$

DELIMITER $$
CREATE PROCEDURE spPick(IN p_subeventid INT)
BEGIN
  DECLARE v_rosterid INT;
  DECLARE v_eventid INT;
  DECLARE v_courseid INT;
  DECLARE v_payout DECIMAL(10,4);
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

  SELECT cm.payout, em.course_id
    INTO v_payout, v_courseid
    FROM eventMain em
    JOIN courseMain cm ON em.course_id = cm.course_id
   WHERE em.event_id = v_eventid;

  DELETE FROM subEventPayOut WHERE subevent_id = p_subeventid;
  DELETE FROM subEventPayGross WHERE subevent_id = p_subeventid;
  DELETE FROM subEventPayNet WHERE subevent_id = p_subeventid;

  OPEN flight_cur;
  flight_loop: LOOP
    FETCH flight_cur INTO v_flightid, v_hdcp1, v_hdcp2;
    IF v_done = 1 THEN
      LEAVE flight_loop;
    END IF;

    IF v_courseid = 18 THEN
      INSERT INTO subEventPayGross (subevent_id,event_id,flight_id,card_id,member_id,amount,place,used_yn,score)
        SELECT p_subeventid, v_eventid, v_flightid, card_id, ec.member_id, 0, 0, 0, gross
          FROM eventCard ec
          JOIN memberMain mm ON ec.member_id = mm.member_id
         WHERE ec.event_id = v_eventid
           AND mm.rhandicap BETWEEN v_hdcp1 AND v_hdcp2
           AND ec.member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);

      INSERT INTO subEventPayNet (subevent_id,event_id,flight_id,card_id,member_id,amount,place,used_yn,score)
        SELECT p_subeventid, v_eventid, v_flightid, card_id, ec.member_id, 0, 0, 0, net
          FROM eventCard ec
          JOIN memberMain mm ON ec.member_id = mm.member_id
         WHERE ec.event_id = v_eventid
           AND mm.rhandicap BETWEEN v_hdcp1 AND v_hdcp2
           AND ec.member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);
    ELSE
      INSERT INTO subEventPayGross (subevent_id,event_id,flight_id,card_id,member_id,amount,place,used_yn,score)
        SELECT p_subeventid, v_eventid, v_flightid, card_id, member_id, 0, 0, 0, gross
          FROM eventCard
         WHERE event_id = v_eventid
           AND handicap BETWEEN v_hdcp1 AND v_hdcp2
           AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);

      INSERT INTO subEventPayNet (subevent_id,event_id,flight_id,card_id,member_id,amount,place,used_yn,score)
        SELECT p_subeventid, v_eventid, v_flightid, card_id, member_id, 0, 0, 0, net
          FROM eventCard
         WHERE event_id = v_eventid
           AND handicap BETWEEN v_hdcp1 AND v_hdcp2
           AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);
    END IF;

    SELECT COUNT(*) INTO v_countgross
      FROM subEventPayGross
     WHERE used_yn = 0 AND subevent_id = p_subeventid AND flight_id = v_flightid;

    SELECT COUNT(*) INTO v_countnet
      FROM subEventPayNet
     WHERE used_yn = 0 AND subevent_id = p_subeventid AND flight_id = v_flightid;

    SELECT amount * 0.5 INTO v_amountperplayer
      FROM subEventMain WHERE subevent_id = p_subeventid;

    SET v_placespaid = ROUND(v_countgross * v_payout * 0.5, 0);
    IF v_placespaid < 1 AND v_countgross >= 1 THEN
      SET v_placespaid = 1;
    END IF;

    SET v_purse = v_countgross * v_amountperplayer;

    INSERT INTO subEventPayOut (place,amount,flight_id,subevent_id)
      SELECT place, payout * v_purse, v_flightid, p_subeventid
        FROM eventPayOut
       WHERE placespaid = v_placespaid;

    CALL spPayGross(p_subeventid, v_flightid);
    CALL spPayNet(p_subeventid, v_flightid);

    WHILE v_countgross > 0 OR v_countnet > 0 DO
      IF v_countgross > 0 THEN
        SELECT amount, score
          INTO v_grosshigh, v_grossscore
          FROM subEventPayGross
         WHERE used_yn = 0 AND subevent_id = p_subeventid AND flight_id = v_flightid
         ORDER BY amount DESC
         LIMIT 1;
      ELSE
        SET v_grosshigh = 0;
      END IF;

      IF v_countnet > 0 THEN
        SELECT amount, score
          INTO v_nethigh, v_netscore
          FROM subEventPayNet
         WHERE used_yn = 0 AND subevent_id = p_subeventid AND flight_id = v_flightid
         ORDER BY amount DESC
         LIMIT 1;
      ELSE
        SET v_nethigh = 0;
      END IF;

      IF v_grosshigh = 0 AND v_nethigh = 0 THEN
        UPDATE subEventPayGross
           SET used_yn = 1
         WHERE used_yn = 0 AND subevent_id = p_subeventid AND flight_id = v_flightid;

        UPDATE subEventPayNet
           SET used_yn = 1, place = 0, amount = 0
         WHERE used_yn = 0 AND subevent_id = p_subeventid AND flight_id = v_flightid;
      ELSE
        IF v_grosshigh >= v_nethigh THEN
          UPDATE subEventPayGross
             SET used_yn = 1
           WHERE used_yn = 0 AND subevent_id = p_subeventid AND flight_id = v_flightid
             AND card_id IN (
               SELECT card_id
                 FROM subEventPayGross
                WHERE score = v_grossscore
                  AND subevent_id = p_subeventid AND used_yn = 0 AND flight_id = v_flightid
             );

          UPDATE subEventPayNet
             SET used_yn = 1, place = 0, amount = 0
           WHERE used_yn = 0 AND subevent_id = p_subeventid AND flight_id = v_flightid
             AND card_id IN (
               SELECT card_id
                 FROM subEventPayGross
                WHERE score = v_grossscore
                  AND subevent_id = p_subeventid AND used_yn = 1 AND flight_id = v_flightid
             );

          UPDATE subEventPayNet
             SET place = 0, amount = 0
           WHERE used_yn = 0 AND subevent_id = p_subeventid AND flight_id = v_flightid;

          CALL spPayNet(p_subeventid, v_flightid);
        ELSE
          UPDATE subEventPayNet
             SET used_yn = 1
           WHERE used_yn = 0 AND subevent_id = p_subeventid AND flight_id = v_flightid
             AND card_id IN (
               SELECT card_id
                 FROM subEventPayNet
                WHERE score = v_netscore
                  AND subevent_id = p_subeventid AND used_yn = 0 AND flight_id = v_flightid
             );

          UPDATE subEventPayGross
             SET used_yn = 1, place = 0, amount = 0
           WHERE used_yn = 0 AND subevent_id = p_subeventid AND flight_id = v_flightid
             AND card_id IN (
               SELECT card_id
                 FROM subEventPayNet
                WHERE score = v_netscore
                  AND subevent_id = p_subeventid AND used_yn = 1 AND flight_id = v_flightid
             );

          UPDATE subEventPayGross
             SET place = 0, amount = 0
           WHERE used_yn = 0 AND subevent_id = p_subeventid AND flight_id = v_flightid;

          CALL spPayGross(p_subeventid, v_flightid);
        END IF;
      END IF;

      SELECT COUNT(*) INTO v_countgross
        FROM subEventPayGross
       WHERE used_yn = 0 AND subevent_id = p_subeventid AND flight_id = v_flightid;

      SELECT COUNT(*) INTO v_countnet
        FROM subEventPayNet
       WHERE used_yn = 0 AND subevent_id = p_subeventid AND flight_id = v_flightid;
    END WHILE;
  END LOOP;

  CLOSE flight_cur;

  UPDATE subEventPayGross SET amount = NULL WHERE amount IS NULL OR amount = 0;
  UPDATE subEventPayNet SET amount = NULL WHERE amount IS NULL OR amount = 0;
END


$$

DELIMITER $$
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

$$

DELIMITER $$
CREATE PROCEDURE spPickNet(IN p_subeventid INT)
BEGIN
  DECLARE v_rosterid INT;
  DECLARE v_eventid INT;
  DECLARE v_courseid INT;
  DECLARE v_payout DECIMAL(10,4);
  DECLARE v_decimalhandicapyn INT;
  DECLARE v_flightid INT;
  DECLARE v_hdcp1 DECIMAL(10,2);
  DECLARE v_hdcp2 DECIMAL(10,2);
  DECLARE v_countnet INT;
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
  DELETE FROM subEventPayNet WHERE subevent_id = p_subeventid;

  OPEN flight_cur;
  flight_loop: LOOP
    FETCH flight_cur INTO v_flightid, v_hdcp1, v_hdcp2;
    IF v_done = 1 THEN
      LEAVE flight_loop;
    END IF;

    IF v_decimalhandicapyn = 0 THEN
      INSERT INTO subEventPayNet (subevent_id,event_id,flight_id,card_id,member_id,amount,place,used_yn,score)
        SELECT p_subeventid, v_eventid, v_flightid, card_id, member_id, 0, 0, 0, net
          FROM eventCard
         WHERE event_id = v_eventid
           AND handicap BETWEEN v_hdcp1 AND v_hdcp2
           AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);
    ELSE
      INSERT INTO subEventPayNet (subevent_id,event_id,flight_id,card_id,member_id,amount,place,used_yn,score)
        SELECT p_subeventid, v_eventid, v_flightid, card_id, ec.member_id, 0, 0, 0, net
          FROM eventCard ec
          JOIN (SELECT member_id, rhandicap, handicap FROM eventHandicap WHERE event_id = v_eventid) eh
            ON ec.member_id = eh.member_id
         WHERE ec.event_id = v_eventid
           AND eh.rhandicap BETWEEN v_hdcp1 AND v_hdcp2
           AND ec.member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);
    END IF;

    SELECT COUNT(*) INTO v_countnet
      FROM subEventPayNet
     WHERE used_yn = 0 AND subevent_id = p_subeventid AND flight_id = v_flightid;

    SELECT amount INTO v_amountperplayer
      FROM subEventMain WHERE subevent_id = p_subeventid;

    SET v_placespaid = ROUND(v_countnet * v_payout, 0);
    IF v_placespaid < 1 AND v_countnet >= 1 THEN
      SET v_placespaid = 1;
    END IF;

    SET v_purse = v_countnet * v_amountperplayer;

    INSERT INTO subEventPayOut (place,amount,flight_id,subevent_id)
      SELECT place, payout * v_purse, v_flightid, p_subeventid
        FROM eventPayOut
       WHERE placespaid = v_placespaid;

    CALL spPayNet(p_subeventid, v_flightid);
  END LOOP;

  CLOSE flight_cur;

  UPDATE subEventPayNet SET amount = NULL WHERE amount IS NULL OR amount = 0;
END

$$

DELIMITER $$
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

$$

DELIMITER $$
CREATE PROCEDURE spStrokeGross(IN p_subeventid INT)
BEGIN
  UPDATE subEventFlight f
  JOIN eventCard c ON f.card_id = c.card_id
   SET f.score = c.gross
 WHERE f.subevent_id = p_subeventid;
END


$$

DELIMITER $$
CREATE PROCEDURE spStrokeNet(IN p_subeventid INT)
BEGIN
  UPDATE subEventFlight f
  JOIN eventCard c ON f.card_id = c.card_id
   SET f.score = c.net
 WHERE f.subevent_id = p_subeventid;
END


$$

DELIMITER $$
CREATE PROCEDURE spUnPost(IN p_subeventid INT)
BEGIN
  DELETE FROM subEventBBPayGross WHERE subevent_id = p_subeventid;
  DELETE FROM subEventBBPayNet WHERE subevent_id = p_subeventid;
  DELETE FROM subEventPayGross WHERE subevent_id = p_subeventid;
  DELETE FROM subEventPayNet WHERE subevent_id = p_subeventid;
  DELETE FROM subEventFlight WHERE subevent_id = p_subeventid;
  DELETE FROM subEventPayChicago WHERE subevent_id = p_subeventid;
  DELETE FROM subEventSkinNet WHERE subevent_id = p_subeventid;
  DELETE FROM subEventSkinNetResults WHERE subevent_id = p_subeventid;
END


$$

DELIMITER $$
CREATE PROCEDURE sp_SubEventFlight_Final(
  IN p_subeventid INT,
  IN p_flightid INT
)
BEGIN
  DECLARE v_scoreid INT;
  DECLARE v_score INT;
  DECLARE v_oldscore INT DEFAULT 0;
  DECLARE v_place INT DEFAULT 0;
  DECLARE v_ties INT DEFAULT 0;
  DECLARE v_currentplace INT DEFAULT 1;
  DECLARE v_placeamount DECIMAL(12,2) DEFAULT 0;
  DECLARE v_done INT DEFAULT 0;
  DECLARE cur CURSOR FOR
    SELECT eventflight_id, score
      FROM subEventFlight
     WHERE used_yn = 0
       AND subevent_id = p_subeventid
       AND flight_id = p_flightid
     ORDER BY score;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

  -- Find last used place
  SELECT IFNULL(place, 0)
    INTO v_place
    FROM subEventFlight
   WHERE used_yn = 1
     AND subevent_id = p_subeventid
     AND flight_id = p_flightid
   ORDER BY place DESC
   LIMIT 1;

  SELECT v_place + COUNT(*) - 1
    INTO v_place
    FROM subEventFlight
   WHERE used_yn = 1
     AND subevent_id = p_subeventid
     AND flight_id = p_flightid
     AND place = v_place
     AND place <> 0;

  IF v_place < 0 THEN
    SET v_place = 0;
  END IF;

  OPEN cur;
  read_loop: LOOP
    FETCH cur INTO v_scoreid, v_score;
    IF v_done = 1 THEN
      LEAVE read_loop;
    END IF;

    SET v_place = v_place + 1;

    IF v_oldscore = v_score THEN
      UPDATE subEventFlight SET place = v_place WHERE eventflight_id = v_scoreid;
      SET v_ties = v_ties + 1;
    ELSE
      UPDATE subEventFlight SET place = v_place WHERE eventflight_id = v_scoreid;
      SET v_placeamount = 0;

      IF v_ties = 0 THEN
        SELECT amount
          INTO v_placeamount
          FROM subEventPayOut
         WHERE place = v_place - 1
           AND subevent_id = p_subeventid
           AND flight_id = p_flightid;

        UPDATE subEventFlight
           SET amount = v_placeamount, place = v_place - 1
         WHERE used_yn = 0
           AND place = v_place - 1
           AND subevent_id = p_subeventid
           AND flight_id = p_flightid;
      ELSE
        SELECT SUM(amount) / (v_ties + 1)
          INTO v_placeamount
          FROM subEventPayOut
         WHERE place >= v_currentplace
           AND place <= (v_place - 1)
           AND subevent_id = p_subeventid
           AND flight_id = p_flightid;

        UPDATE subEventFlight
           SET amount = v_placeamount, place = v_currentplace
         WHERE used_yn = 0
           AND place >= v_currentplace
           AND place <= (v_place - 1)
           AND subevent_id = p_subeventid
           AND flight_id = p_flightid;
      END IF;

      SET v_oldscore = v_score;
      SET v_ties = 0;
      SET v_currentplace = v_place;
    END IF;
  END LOOP;

  CLOSE cur;

  IF v_ties > 0 THEN
    SELECT SUM(amount) / (v_ties + 1)
      INTO v_placeamount
      FROM subEventPayOut
     WHERE place = v_currentplace
       AND subevent_id = p_subeventid
       AND flight_id = p_flightid;

    UPDATE subEventFlight
       SET amount = v_placeamount, place = v_currentplace
     WHERE used_yn = 0
       AND place >= v_currentplace
       AND subevent_id = p_subeventid
       AND flight_id = p_flightid;
  ELSE
    UPDATE subEventFlight
       SET amount = 0
     WHERE place >= v_place - 1
       AND used_yn = 0
       AND subevent_id = p_subeventid
       AND flight_id = p_flightid;
  END IF;
END


$$

DELIMITER $$
CREATE PROCEDURE sp_SubEventFlight_Insert(
  IN p_subeventid INT
)
BEGIN
  DECLARE v_rosterid INT DEFAULT NULL;
  DECLARE v_eventid INT DEFAULT NULL;
  DECLARE v_courseid INT DEFAULT NULL;
  DECLARE v_numholes INT DEFAULT NULL;
  DECLARE v_decimalhandicapyn INT DEFAULT 0;

  SELECT roster_id, event_id, course_id
    INTO v_rosterid, v_eventid, v_courseid
    FROM subEventMain
   WHERE subevent_id = p_subeventid;

  SELECT cn.numholes
    INTO v_numholes
    FROM eventMain em
    JOIN courseNine cn ON em.nine_id = cn.nine_id
   WHERE em.event_id = v_eventid;

  SELECT decimalhandicap_yn
    INTO v_decimalhandicapyn
    FROM courseMain
   WHERE course_id = v_courseid;

  DELETE FROM subEventFlight
   WHERE subevent_id = p_subeventid;

  IF v_decimalhandicapyn = 0 THEN
    IF v_courseid = 3 AND v_numholes = 18 THEN
      INSERT INTO subEventFlight (subevent_id, flight_id, card_id, member_id, handicap, score, amount)
        SELECT p_subeventid,
               (SELECT flight_id
                  FROM rosterFlight
                 WHERE hdcp1 <= handicap18 AND hdcp2 >= handicap18 AND roster_id = v_rosterid),
               card_id, eh.member_id, handicap18, 0, 0
          FROM eventHandicap eh
          JOIN rosterMemberLink mlink ON eh.member_id = mlink.member_id AND mlink.roster_id = v_rosterid
          JOIN (SELECT member_id, card_id FROM eventCard WHERE event_id = v_eventid) eCard
            ON eh.member_id = eCard.member_id
         WHERE eh.event_id = v_eventid;
    ELSE
      INSERT INTO subEventFlight (subevent_id, flight_id, card_id, member_id, handicap, score, amount)
        SELECT p_subeventid,
               (SELECT flight_id
                  FROM rosterFlight
                 WHERE hdcp1 <= handicap AND hdcp2 >= handicap AND roster_id = v_rosterid),
               card_id, eh.member_id, handicap, 0, 0
          FROM eventHandicap eh
          JOIN rosterMemberLink mlink ON eh.member_id = mlink.member_id AND mlink.roster_id = v_rosterid
          JOIN (SELECT member_id, card_id FROM eventCard WHERE event_id = v_eventid) eCard
            ON eh.member_id = eCard.member_id
         WHERE eh.event_id = v_eventid;
    END IF;
  ELSE
    INSERT INTO subEventFlight (subevent_id, flight_id, card_id, member_id, handicap, score, amount)
      SELECT p_subeventid,
             (SELECT flight_id
                FROM rosterFlight
               WHERE hdcp1 <= rhandicap AND hdcp2 >= rhandicap AND roster_id = v_rosterid),
             card_id, eh.member_id, rhandicap, 0, 0
        FROM eventHandicap eh
        JOIN rosterMemberLink mlink ON eh.member_id = mlink.member_id AND mlink.roster_id = v_rosterid
        JOIN (SELECT member_id, card_id FROM eventCard WHERE event_id = v_eventid) eCard
          ON eh.member_id = eCard.member_id
       WHERE eh.event_id = v_eventid;
  END IF;
END


$$

DELIMITER $$
CREATE PROCEDURE sp_SubEventPayOut_Insert(
  IN p_subeventid INT,
  IN p_flightid INT
)
BEGIN
  DECLARE v_countplayers INT DEFAULT 0;
  DECLARE v_purse DECIMAL(12,2) DEFAULT 0;
  DECLARE v_placespaid INT DEFAULT 0;
  DECLARE v_amountperplayer DECIMAL(12,2) DEFAULT 0;
  DECLARE v_amountaddedmoney DECIMAL(12,2) DEFAULT 0;

  SELECT COUNT(*)
    INTO v_countplayers
    FROM subEventFlight
   WHERE subevent_id = p_subeventid
     AND flight_id = p_flightid;

  SELECT amount, addedmoney
    INTO v_amountperplayer, v_amountaddedmoney
    FROM subEventMain
   WHERE subevent_id = p_subeventid;

  SET v_placespaid = ROUND(v_countplayers * 0.3, 0) + 1;
  SET v_purse = v_countplayers * v_amountperplayer + v_amountaddedmoney;

  DELETE FROM subEventPayOut
   WHERE subevent_id = p_subeventid
     AND flight_id = p_flightid;

  INSERT INTO subEventPayOut (place, amount, flight_id, subevent_id)
    SELECT place, payout * v_purse, p_flightid, p_subeventid
      FROM eventPayOut
     WHERE placespaid = v_placespaid;
END


$$

DELIMITER ;
