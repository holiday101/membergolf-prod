CREATE PROCEDURE spPowerSkin(IN p_subeventid INT)
BEGIN
  /*
    spPowerSkin
    -----------
    Purpose:
    1) Read subevent context from subEventMain (event_id, roster_id, amount, drawn_hole).
    2) drawn_hole is 1-9: one hole is drawn for the entire event.
    3) Iterate every flight in that roster.
    4) For each flight, find the lowest score on drawn_hole among eligible cards.
    5) ALL players tied at that low score win (ties ARE winners, unlike regular skins).
    6) Pot per flight = amount_per_player * number_of_players_in_flight.
       Winners split the pot equally.
    7) Results stored in eventSkin table (same as gross skins).
  */

  DECLARE v_eventid INT;
  DECLARE v_rosterid INT;
  DECLARE v_skinamount DECIMAL(12,2);
  DECLARE v_drawnhole INT;

  DECLARE v_flightid INT;
  DECLARE v_hdcp1 DECIMAL(12,2);
  DECLARE v_hdcp2 DECIMAL(12,2);

  DECLARE v_minscore INT;
  DECLARE v_winnercount INT;
  DECLARE v_playercount INT;
  DECLARE v_perperson DECIMAL(12,2);

  DECLARE v_done INT DEFAULT 0;

  DECLARE flight_cur CURSOR FOR
    SELECT flight_id, hdcp1, hdcp2
    FROM rosterFlight
    WHERE roster_id = v_rosterid
    ORDER BY flight_id;

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

  /* Load subevent context. */
  SELECT event_id, roster_id, amount, drawn_hole
    INTO v_eventid, v_rosterid, v_skinamount, v_drawnhole
    FROM subEventMain
   WHERE subevent_id = p_subeventid
   LIMIT 1;

  IF v_eventid IS NULL OR v_rosterid IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'spPowerSkin: subevent/event/roster not found';
  END IF;

  IF v_drawnhole IS NULL OR v_drawnhole < 1 OR v_drawnhole > 9 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'spPowerSkin: drawn_hole must be set (1-9)';
  END IF;

  /* Clear any existing results for this subevent. */
  DELETE FROM eventSkin WHERE subevent_id = p_subeventid;

  OPEN flight_cur;

  flight_loop: LOOP
    FETCH flight_cur INTO v_flightid, v_hdcp1, v_hdcp2;
    IF v_done = 1 THEN
      LEAVE flight_loop;
    END IF;

    /* Count paid entries in this flight. */
    SELECT COUNT(*)
      INTO v_playercount
      FROM eventCard ec
     WHERE ec.event_id = v_eventid
       AND ec.member_id IN (
         SELECT rml.member_id
           FROM rosterMemberLink rml
          WHERE rml.roster_id = v_rosterid
       )
       AND ec.handicap BETWEEN v_hdcp1 AND v_hdcp2;

    IF v_playercount = 0 THEN
      ITERATE flight_loop;
    END IF;

    /* Find lowest score on drawn_hole for this flight. */
    SELECT MIN(
      CASE v_drawnhole
        WHEN 1 THEN ec.hole1
        WHEN 2 THEN ec.hole2
        WHEN 3 THEN ec.hole3
        WHEN 4 THEN ec.hole4
        WHEN 5 THEN ec.hole5
        WHEN 6 THEN ec.hole6
        WHEN 7 THEN ec.hole7
        WHEN 8 THEN ec.hole8
        WHEN 9 THEN ec.hole9
      END
    )
      INTO v_minscore
      FROM eventCard ec
     WHERE ec.event_id = v_eventid
       AND ec.member_id IN (
         SELECT rml.member_id
           FROM rosterMemberLink rml
          WHERE rml.roster_id = v_rosterid
       )
       AND ec.handicap BETWEEN v_hdcp1 AND v_hdcp2;

    IF v_minscore IS NULL THEN
      ITERATE flight_loop;
    END IF;

    /* Count all distinct members tied at the low score (ALL ties win). */
    SELECT COUNT(DISTINCT ec.member_id)
      INTO v_winnercount
      FROM eventCard ec
     WHERE ec.event_id = v_eventid
       AND ec.member_id IN (
         SELECT rml.member_id
           FROM rosterMemberLink rml
          WHERE rml.roster_id = v_rosterid
       )
       AND ec.handicap BETWEEN v_hdcp1 AND v_hdcp2
       AND (
         CASE v_drawnhole
           WHEN 1 THEN ec.hole1
           WHEN 2 THEN ec.hole2
           WHEN 3 THEN ec.hole3
           WHEN 4 THEN ec.hole4
           WHEN 5 THEN ec.hole5
           WHEN 6 THEN ec.hole6
           WHEN 7 THEN ec.hole7
           WHEN 8 THEN ec.hole8
           WHEN 9 THEN ec.hole9
         END
       ) = v_minscore;

    IF v_winnercount = 0 THEN
      ITERATE flight_loop;
    END IF;

    /* Pot = amount_per_player * players in flight. Each winner gets equal share. */
    SET v_perperson = (v_skinamount * v_playercount) / v_winnercount;

    /* Insert one row per distinct winning member (use their first card if multiple). */
    INSERT INTO eventSkin (event_id, member_id, subevent_id, flight_id, hole, score, amount, card_id)
    SELECT
      v_eventid,
      ec.member_id,
      p_subeventid,
      v_flightid,
      v_drawnhole,
      v_minscore,
      v_perperson,
      MIN(ec.card_id)
    FROM eventCard ec
    WHERE ec.event_id = v_eventid
      AND ec.member_id IN (
        SELECT rml.member_id
          FROM rosterMemberLink rml
         WHERE rml.roster_id = v_rosterid
      )
      AND ec.handicap BETWEEN v_hdcp1 AND v_hdcp2
      AND (
        CASE v_drawnhole
          WHEN 1 THEN ec.hole1
          WHEN 2 THEN ec.hole2
          WHEN 3 THEN ec.hole3
          WHEN 4 THEN ec.hole4
          WHEN 5 THEN ec.hole5
          WHEN 6 THEN ec.hole6
          WHEN 7 THEN ec.hole7
          WHEN 8 THEN ec.hole8
          WHEN 9 THEN ec.hole9
        END
      ) = v_minscore
    GROUP BY ec.member_id;

  END LOOP;

  CLOSE flight_cur;
END
