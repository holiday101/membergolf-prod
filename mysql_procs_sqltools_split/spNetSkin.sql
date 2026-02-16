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

