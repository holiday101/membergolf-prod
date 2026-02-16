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
