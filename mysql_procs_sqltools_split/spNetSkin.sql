CREATE PROCEDURE spNetSkin(IN p_eventid INT, IN p_subeventid INT)
BEGIN
  DECLARE v_rosterid INT;
  DECLARE v_numholes INT DEFAULT 9;
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
  DECLARE v_hole1 INT; DECLARE v_hole2 INT; DECLARE v_hole3 INT;
  DECLARE v_hole4 INT; DECLARE v_hole5 INT; DECLARE v_hole6 INT;
  DECLARE v_hole7 INT; DECLARE v_hole8 INT; DECLARE v_hole9 INT;
  DECLARE v_hole10 INT; DECLARE v_hole11 INT; DECLARE v_hole12 INT;
  DECLARE v_hole13 INT; DECLARE v_hole14 INT; DECLARE v_hole15 INT;
  DECLARE v_hole16 INT; DECLARE v_hole17 INT; DECLARE v_hole18 INT;
  DECLARE v_nine_id INT;
  DECLARE v_hhole1 INT; DECLARE v_hhole2 INT; DECLARE v_hhole3 INT;
  DECLARE v_hhole4 INT; DECLARE v_hhole5 INT; DECLARE v_hhole6 INT;
  DECLARE v_hhole7 INT; DECLARE v_hhole8 INT; DECLARE v_hhole9 INT;
  DECLARE v_hhole10 INT; DECLARE v_hhole11 INT; DECLARE v_hhole12 INT;
  DECLARE v_hhole13 INT; DECLARE v_hhole14 INT; DECLARE v_hhole15 INT;
  DECLARE v_hhole16 INT; DECLARE v_hhole17 INT; DECLARE v_hhole18 INT;
  DECLARE v_handicaphole1 INT; DECLARE v_handicaphole2 INT; DECLARE v_handicaphole3 INT;
  DECLARE v_handicaphole4 INT; DECLARE v_handicaphole5 INT; DECLARE v_handicaphole6 INT;
  DECLARE v_handicaphole7 INT; DECLARE v_handicaphole8 INT; DECLARE v_handicaphole9 INT;
  DECLARE v_handicaphole10 INT; DECLARE v_handicaphole11 INT; DECLARE v_handicaphole12 INT;
  DECLARE v_handicaphole13 INT; DECLARE v_handicaphole14 INT; DECLARE v_handicaphole15 INT;
  DECLARE v_handicaphole16 INT; DECLARE v_handicaphole17 INT; DECLARE v_handicaphole18 INT;
  DECLARE v_hole INT;
  DECLARE v_done INT DEFAULT 0;
  DECLARE card_cur CURSOR FOR
    SELECT member_id, card_id, handicap, nine_id,
           hole1,hole2,hole3,hole4,hole5,hole6,hole7,hole8,hole9,
           hole10,hole11,hole12,hole13,hole14,hole15,hole16,hole17,hole18
      FROM eventCard
     WHERE member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid)
       AND event_id = p_eventid;
  DECLARE flight_cur CURSOR FOR
    SELECT flight_id, hdcp1, hdcp2 FROM rosterFlight WHERE roster_id = v_rosterid;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

  CALL spHandicap(p_eventid, NULL);

  SELECT amount, roster_id
    INTO v_skinamount, v_rosterid
    FROM subEventMain
   WHERE subevent_id = p_subeventid;

  /* Determine hole count from courseNine (9 or 18). */
  SELECT cn.numholes
    INTO v_numholes
    FROM eventMain em
    JOIN courseNine cn ON em.nine_id = cn.nine_id
   WHERE em.event_id = p_eventid;

  IF v_numholes IS NULL THEN
    SET v_numholes = 9;
  END IF;

  DELETE FROM subEventSkinNet WHERE subevent_id = p_subeventid;
  DELETE FROM subEventSkinNetResults WHERE subevent_id = p_subeventid;

  -- populate subEventSkinNet with adjusted holes
  SET v_done = 0;
  OPEN card_cur;
  card_loop: LOOP
    FETCH card_cur INTO v_memberid, v_cardid, v_handicap, v_nine_id,
                       v_hole1, v_hole2, v_hole3, v_hole4, v_hole5, v_hole6, v_hole7, v_hole8, v_hole9,
                       v_hole10, v_hole11, v_hole12, v_hole13, v_hole14, v_hole15, v_hole16, v_hole17, v_hole18;
    IF v_done = 1 THEN
      LEAVE card_loop;
    END IF;

    SELECT handicaphole1,handicaphole2,handicaphole3,handicaphole4,handicaphole5,handicaphole6,handicaphole7,handicaphole8,handicaphole9,
           handicaphole10,handicaphole11,handicaphole12,handicaphole13,handicaphole14,handicaphole15,handicaphole16,handicaphole17,handicaphole18
      INTO v_handicaphole1,v_handicaphole2,v_handicaphole3,v_handicaphole4,v_handicaphole5,v_handicaphole6,v_handicaphole7,v_handicaphole8,v_handicaphole9,
           v_handicaphole10,v_handicaphole11,v_handicaphole12,v_handicaphole13,v_handicaphole14,v_handicaphole15,v_handicaphole16,v_handicaphole17,v_handicaphole18
      FROM courseNine WHERE nine_id = v_nine_id;

    -- Handicap adjustments for holes 1-9
    SET v_hhole1 = v_hole1;
    IF v_handicaphole1 <= v_handicap THEN
      SET v_hhole1 = v_hole1 - 1;
      IF v_handicaphole1 + v_numholes <= v_handicap THEN SET v_hhole1 = v_hole1 - 2; END IF;
    END IF;
    SET v_hhole2 = v_hole2;
    IF v_handicaphole2 <= v_handicap THEN
      SET v_hhole2 = v_hole2 - 1;
      IF v_handicaphole2 + v_numholes <= v_handicap THEN SET v_hhole2 = v_hole2 - 2; END IF;
    END IF;
    SET v_hhole3 = v_hole3;
    IF v_handicaphole3 <= v_handicap THEN
      SET v_hhole3 = v_hole3 - 1;
      IF v_handicaphole3 + v_numholes <= v_handicap THEN SET v_hhole3 = v_hole3 - 2; END IF;
    END IF;
    SET v_hhole4 = v_hole4;
    IF v_handicaphole4 <= v_handicap THEN
      SET v_hhole4 = v_hole4 - 1;
      IF v_handicaphole4 + v_numholes <= v_handicap THEN SET v_hhole4 = v_hole4 - 2; END IF;
    END IF;
    SET v_hhole5 = v_hole5;
    IF v_handicaphole5 <= v_handicap THEN
      SET v_hhole5 = v_hole5 - 1;
      IF v_handicaphole5 + v_numholes <= v_handicap THEN SET v_hhole5 = v_hole5 - 2; END IF;
    END IF;
    SET v_hhole6 = v_hole6;
    IF v_handicaphole6 <= v_handicap THEN
      SET v_hhole6 = v_hole6 - 1;
      IF v_handicaphole6 + v_numholes <= v_handicap THEN SET v_hhole6 = v_hole6 - 2; END IF;
    END IF;
    SET v_hhole7 = v_hole7;
    IF v_handicaphole7 <= v_handicap THEN
      SET v_hhole7 = v_hole7 - 1;
      IF v_handicaphole7 + v_numholes <= v_handicap THEN SET v_hhole7 = v_hole7 - 2; END IF;
    END IF;
    SET v_hhole8 = v_hole8;
    IF v_handicaphole8 <= v_handicap THEN
      SET v_hhole8 = v_hole8 - 1;
      IF v_handicaphole8 + v_numholes <= v_handicap THEN SET v_hhole8 = v_hole8 - 2; END IF;
    END IF;
    SET v_hhole9 = v_hole9;
    IF v_handicaphole9 <= v_handicap THEN
      SET v_hhole9 = v_hole9 - 1;
      IF v_handicaphole9 + v_numholes <= v_handicap THEN SET v_hhole9 = v_hole9 - 2; END IF;
    END IF;

    -- Handicap adjustments for holes 10-18 (only if 18-hole event)
    SET v_hhole10 = v_hole10; SET v_hhole11 = v_hole11; SET v_hhole12 = v_hole12;
    SET v_hhole13 = v_hole13; SET v_hhole14 = v_hole14; SET v_hhole15 = v_hole15;
    SET v_hhole16 = v_hole16; SET v_hhole17 = v_hole17; SET v_hhole18 = v_hole18;

    IF v_numholes > 9 THEN
      IF v_handicaphole10 IS NOT NULL AND v_handicaphole10 <= v_handicap THEN
        SET v_hhole10 = v_hole10 - 1;
        IF v_handicaphole10 + v_numholes <= v_handicap THEN SET v_hhole10 = v_hole10 - 2; END IF;
      END IF;
      IF v_handicaphole11 IS NOT NULL AND v_handicaphole11 <= v_handicap THEN
        SET v_hhole11 = v_hole11 - 1;
        IF v_handicaphole11 + v_numholes <= v_handicap THEN SET v_hhole11 = v_hole11 - 2; END IF;
      END IF;
      IF v_handicaphole12 IS NOT NULL AND v_handicaphole12 <= v_handicap THEN
        SET v_hhole12 = v_hole12 - 1;
        IF v_handicaphole12 + v_numholes <= v_handicap THEN SET v_hhole12 = v_hole12 - 2; END IF;
      END IF;
      IF v_handicaphole13 IS NOT NULL AND v_handicaphole13 <= v_handicap THEN
        SET v_hhole13 = v_hole13 - 1;
        IF v_handicaphole13 + v_numholes <= v_handicap THEN SET v_hhole13 = v_hole13 - 2; END IF;
      END IF;
      IF v_handicaphole14 IS NOT NULL AND v_handicaphole14 <= v_handicap THEN
        SET v_hhole14 = v_hole14 - 1;
        IF v_handicaphole14 + v_numholes <= v_handicap THEN SET v_hhole14 = v_hole14 - 2; END IF;
      END IF;
      IF v_handicaphole15 IS NOT NULL AND v_handicaphole15 <= v_handicap THEN
        SET v_hhole15 = v_hole15 - 1;
        IF v_handicaphole15 + v_numholes <= v_handicap THEN SET v_hhole15 = v_hole15 - 2; END IF;
      END IF;
      IF v_handicaphole16 IS NOT NULL AND v_handicaphole16 <= v_handicap THEN
        SET v_hhole16 = v_hole16 - 1;
        IF v_handicaphole16 + v_numholes <= v_handicap THEN SET v_hhole16 = v_hole16 - 2; END IF;
      END IF;
      IF v_handicaphole17 IS NOT NULL AND v_handicaphole17 <= v_handicap THEN
        SET v_hhole17 = v_hole17 - 1;
        IF v_handicaphole17 + v_numholes <= v_handicap THEN SET v_hhole17 = v_hole17 - 2; END IF;
      END IF;
      IF v_handicaphole18 IS NOT NULL AND v_handicaphole18 <= v_handicap THEN
        SET v_hhole18 = v_hole18 - 1;
        IF v_handicaphole18 + v_numholes <= v_handicap THEN SET v_hhole18 = v_hole18 - 2; END IF;
      END IF;
    END IF;

    -- Negative handicap adjustments (plus handicap players)
    IF v_handicap < 0 THEN
      IF v_numholes - v_handicaphole1 < ABS(v_handicap) THEN SET v_hhole1 = v_hole1 + 1; END IF;
      IF v_numholes - v_handicaphole2 < ABS(v_handicap) THEN SET v_hhole2 = v_hole2 + 1; END IF;
      IF v_numholes - v_handicaphole3 < ABS(v_handicap) THEN SET v_hhole3 = v_hole3 + 1; END IF;
      IF v_numholes - v_handicaphole4 < ABS(v_handicap) THEN SET v_hhole4 = v_hole4 + 1; END IF;
      IF v_numholes - v_handicaphole5 < ABS(v_handicap) THEN SET v_hhole5 = v_hole5 + 1; END IF;
      IF v_numholes - v_handicaphole6 < ABS(v_handicap) THEN SET v_hhole6 = v_hole6 + 1; END IF;
      IF v_numholes - v_handicaphole7 < ABS(v_handicap) THEN SET v_hhole7 = v_hole7 + 1; END IF;
      IF v_numholes - v_handicaphole8 < ABS(v_handicap) THEN SET v_hhole8 = v_hole8 + 1; END IF;
      IF v_numholes - v_handicaphole9 < ABS(v_handicap) THEN SET v_hhole9 = v_hole9 + 1; END IF;
      IF v_numholes > 9 THEN
        IF v_handicaphole10 IS NOT NULL AND v_numholes - v_handicaphole10 < ABS(v_handicap) THEN SET v_hhole10 = v_hole10 + 1; END IF;
        IF v_handicaphole11 IS NOT NULL AND v_numholes - v_handicaphole11 < ABS(v_handicap) THEN SET v_hhole11 = v_hole11 + 1; END IF;
        IF v_handicaphole12 IS NOT NULL AND v_numholes - v_handicaphole12 < ABS(v_handicap) THEN SET v_hhole12 = v_hole12 + 1; END IF;
        IF v_handicaphole13 IS NOT NULL AND v_numholes - v_handicaphole13 < ABS(v_handicap) THEN SET v_hhole13 = v_hole13 + 1; END IF;
        IF v_handicaphole14 IS NOT NULL AND v_numholes - v_handicaphole14 < ABS(v_handicap) THEN SET v_hhole14 = v_hole14 + 1; END IF;
        IF v_handicaphole15 IS NOT NULL AND v_numholes - v_handicaphole15 < ABS(v_handicap) THEN SET v_hhole15 = v_hole15 + 1; END IF;
        IF v_handicaphole16 IS NOT NULL AND v_numholes - v_handicaphole16 < ABS(v_handicap) THEN SET v_hhole16 = v_hole16 + 1; END IF;
        IF v_handicaphole17 IS NOT NULL AND v_numholes - v_handicaphole17 < ABS(v_handicap) THEN SET v_hhole17 = v_hole17 + 1; END IF;
        IF v_handicaphole18 IS NOT NULL AND v_numholes - v_handicaphole18 < ABS(v_handicap) THEN SET v_hhole18 = v_hole18 + 1; END IF;
      END IF;
    END IF;

    INSERT INTO subEventSkinNet
      (event_id,subevent_id,member_id,card_id,handicap,
       hole1,hole2,hole3,hole4,hole5,hole6,hole7,hole8,hole9,
       hhole1,hhole2,hhole3,hhole4,hhole5,hhole6,hhole7,hhole8,hhole9,
       hole10,hole11,hole12,hole13,hole14,hole15,hole16,hole17,hole18,
       hhole10,hhole11,hhole12,hhole13,hhole14,hhole15,hhole16,hhole17,hhole18)
    VALUES
      (p_eventid,p_subeventid,v_memberid,v_cardid,v_handicap,
       v_hole1,v_hole2,v_hole3,v_hole4,v_hole5,v_hole6,v_hole7,v_hole8,v_hole9,
       v_hhole1,v_hhole2,v_hhole3,v_hhole4,v_hhole5,v_hhole6,v_hhole7,v_hhole8,v_hhole9,
       v_hole10,v_hole11,v_hole12,v_hole13,v_hole14,v_hole15,v_hole16,v_hole17,v_hole18,
       v_hhole10,v_hhole11,v_hhole12,v_hhole13,v_hhole14,v_hhole15,v_hhole16,v_hhole17,v_hhole18);
  END LOOP;
  CLOSE card_cur;

  -- per-flight winners using a loop over holes
  SET v_done = 0;
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
          WHEN 1 THEN hhole1 WHEN 2 THEN hhole2 WHEN 3 THEN hhole3
          WHEN 4 THEN hhole4 WHEN 5 THEN hhole5 WHEN 6 THEN hhole6
          WHEN 7 THEN hhole7 WHEN 8 THEN hhole8 WHEN 9 THEN hhole9
          WHEN 10 THEN hhole10 WHEN 11 THEN hhole11 WHEN 12 THEN hhole12
          WHEN 13 THEN hhole13 WHEN 14 THEN hhole14 WHEN 15 THEN hhole15
          WHEN 16 THEN hhole16 WHEN 17 THEN hhole17 WHEN 18 THEN hhole18
        END
      ) INTO v_minhole
        FROM subEventSkinNet
       WHERE event_id = p_eventid AND handicap BETWEEN v_hdcp1 AND v_hdcp2
         AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);

      IF v_minhole IS NOT NULL THEN
        SELECT COUNT(DISTINCT member_id) INTO v_holecount
          FROM subEventSkinNet
         WHERE event_id = p_eventid
           AND (
             CASE v_hole
               WHEN 1 THEN hhole1 WHEN 2 THEN hhole2 WHEN 3 THEN hhole3
               WHEN 4 THEN hhole4 WHEN 5 THEN hhole5 WHEN 6 THEN hhole6
               WHEN 7 THEN hhole7 WHEN 8 THEN hhole8 WHEN 9 THEN hhole9
               WHEN 10 THEN hhole10 WHEN 11 THEN hhole11 WHEN 12 THEN hhole12
               WHEN 13 THEN hhole13 WHEN 14 THEN hhole14 WHEN 15 THEN hhole15
               WHEN 16 THEN hhole16 WHEN 17 THEN hhole17 WHEN 18 THEN hhole18
             END
           ) = v_minhole
           AND handicap BETWEEN v_hdcp1 AND v_hdcp2
           AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);

        IF v_holecount = 1 THEN
          SELECT member_id, netskin_id INTO v_memberid, v_cardid
            FROM subEventSkinNet
           WHERE event_id = p_eventid
             AND (
               CASE v_hole
                 WHEN 1 THEN hhole1 WHEN 2 THEN hhole2 WHEN 3 THEN hhole3
                 WHEN 4 THEN hhole4 WHEN 5 THEN hhole5 WHEN 6 THEN hhole6
                 WHEN 7 THEN hhole7 WHEN 8 THEN hhole8 WHEN 9 THEN hhole9
                 WHEN 10 THEN hhole10 WHEN 11 THEN hhole11 WHEN 12 THEN hhole12
                 WHEN 13 THEN hhole13 WHEN 14 THEN hhole14 WHEN 15 THEN hhole15
                 WHEN 16 THEN hhole16 WHEN 17 THEN hhole17 WHEN 18 THEN hhole18
               END
             ) = v_minhole
             AND handicap BETWEEN v_hdcp1 AND v_hdcp2
             AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid)
           LIMIT 1;
          INSERT INTO subEventSkinNetResults (event_id,member_id,subevent_id,flight_id,hole,score,amount,netskin_id)
            VALUES (p_eventid,v_memberid,p_subeventid,v_flightid,v_hole,v_minhole,0,v_cardid);
          SET v_countwinners = v_countwinners + 1;
        END IF;
      END IF;

      SET v_hole = v_hole + 1;
    END LOOP;

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
