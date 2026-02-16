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

