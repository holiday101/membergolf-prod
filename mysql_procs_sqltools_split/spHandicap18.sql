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
