CREATE PROCEDURE spPowerSkin(IN p_subeventid INT)
BEGIN
  /*
    spPowerSkin
    -----------
    Purpose:
    1) Read subevent context from subEventMain (event_id, roster_id, amount, drawn_hole).
    2) Iterate every flight in that roster.
    3) For each flight, evaluate only the single drawn_hole.
    4) ALL cards tied at the lowest score on the drawn hole win.
       A player with two cards both matching the low score wins twice.
    5) Pot per flight = amount_per_player * number_of_cards_in_flight.
       Each winning card row gets an equal share of that pot.
    6) Results stored in eventSkin table.
  */

  DECLARE v_eventid   INT;
  DECLARE v_rosterid  INT;
  DECLARE v_skinamount DECIMAL(12,2);
  DECLARE v_drawn_hole INT;

  DECLARE v_flightid INT;
  DECLARE v_hdcp1    DECIMAL(12,2);
  DECLARE v_hdcp2    DECIMAL(12,2);

  DECLARE v_minscore   INT;
  DECLARE v_tiecount   INT;
  DECLARE v_playercount INT;
  DECLARE v_perskin    DECIMAL(12,2);

  DECLARE v_done INT DEFAULT 0;

  DECLARE flight_cur CURSOR FOR
    SELECT flight_id, hdcp1, hdcp2
    FROM rosterFlight
    WHERE roster_id = v_rosterid
    ORDER BY flight_id;

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

  /* Load subevent context including the single drawn hole. */
  SELECT event_id, roster_id, amount, drawn_hole
    INTO v_eventid, v_rosterid, v_skinamount, v_drawn_hole
    FROM subEventMain
   WHERE subevent_id = p_subeventid
   LIMIT 1;

  IF v_eventid IS NULL OR v_rosterid IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'spPowerSkin: subevent/event/roster not found';
  END IF;

  IF v_drawn_hole IS NULL OR v_drawn_hole < 1 OR v_drawn_hole > 9 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'spPowerSkin: drawn_hole not set or out of range (1-9)';
  END IF;

  /* Clear any existing results for this subevent. */
  DELETE FROM eventSkin WHERE subevent_id = p_subeventid;

  OPEN flight_cur;

  flight_loop: LOOP
    FETCH flight_cur INTO v_flightid, v_hdcp1, v_hdcp2;
    IF v_done = 1 THEN
      LEAVE flight_loop;
    END IF;

    /* Count paid entries (cards) in this flight — each card is one entry in the pot. */
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

    /* Find the lowest score on the drawn hole across all eligible cards. */
    SELECT MIN(
      CASE v_drawn_hole
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

    IF v_minscore IS NOT NULL THEN
      /* Count winning cards (not distinct members) — each card with the low score is one win. */
      SELECT COUNT(ec.card_id)
        INTO v_tiecount
        FROM eventCard ec
       WHERE ec.event_id = v_eventid
         AND ec.member_id IN (
           SELECT rml.member_id
             FROM rosterMemberLink rml
            WHERE rml.roster_id = v_rosterid
         )
         AND ec.handicap BETWEEN v_hdcp1 AND v_hdcp2
         AND (
           CASE v_drawn_hole
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

      IF v_tiecount >= 1 THEN
        /* Insert one row per winning card — a player with two winning cards gets two rows. */
        INSERT INTO eventSkin
          (event_id, member_id, subevent_id, flight_id, hole, score, amount, card_id)
        SELECT
          v_eventid,
          ec.member_id,
          p_subeventid,
          v_flightid,
          v_drawn_hole,
          v_minscore,
          0,
          ec.card_id
        FROM eventCard ec
        WHERE ec.event_id = v_eventid
          AND ec.member_id IN (
            SELECT rml.member_id
              FROM rosterMemberLink rml
             WHERE rml.roster_id = v_rosterid
          )
          AND ec.handicap BETWEEN v_hdcp1 AND v_hdcp2
          AND (
            CASE v_drawn_hole
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

        /* pot / winning cards = payout per card */
        SET v_perskin = (v_skinamount * v_playercount) / v_tiecount;
        UPDATE eventSkin
           SET amount = v_perskin
         WHERE subevent_id = p_subeventid
           AND event_id = v_eventid
           AND flight_id = v_flightid;
      END IF;
    END IF;
  END LOOP;

  CLOSE flight_cur;
END
