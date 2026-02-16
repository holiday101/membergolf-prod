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
