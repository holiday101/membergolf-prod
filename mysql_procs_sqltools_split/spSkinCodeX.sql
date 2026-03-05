CREATE PROCEDURE spSkinCodeX(IN p_subeventid INT)
BEGIN
  /*
    spSkinCodeX
    -----------
    Purpose:
    1) Read subevent context from subEventMain (subevent_id -> event_id, roster_id, amount).
    2) Iterate every flight in that roster.
    3) For each flight, evaluate skins hole-by-hole (1..9) using eventCard scores.
    4) Flight eligibility is based on eventCard.handicap BETWEEN flight hdcp1 and hdcp2.
    5) Only single-winner holes get a skin (ties do not win a skin).
    6) Total skin pot per flight = amount_per_player * number_of_players_in_flight.
       Each winning skin row gets an equal split of that pot.
  */

  DECLARE v_eventid INT;
  DECLARE v_rosterid INT;
  DECLARE v_skinamount DECIMAL(12,2);

  DECLARE v_flightid INT;
  DECLARE v_hdcp1 DECIMAL(12,2);
  DECLARE v_hdcp2 DECIMAL(12,2);

  DECLARE v_hole INT;
  DECLARE v_minscore INT;
  DECLARE v_tiecount INT;
  DECLARE v_memberid INT;
  DECLARE v_cardid INT;

  DECLARE v_playercount INT;
  DECLARE v_winnercount INT;
  DECLARE v_perskin DECIMAL(12,2);

  DECLARE v_done INT DEFAULT 0;

  DECLARE flight_cur CURSOR FOR
    SELECT flight_id, hdcp1, hdcp2
    FROM rosterFlight
    WHERE roster_id = v_rosterid
    ORDER BY flight_id;

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

  /* Load subevent context. */
  SELECT event_id, roster_id, amount
    INTO v_eventid, v_rosterid, v_skinamount
    FROM subEventMain
   WHERE subevent_id = p_subeventid
   LIMIT 1;

  /* Safety: nothing to do if subevent not found or missing event/roster. */
  IF v_eventid IS NULL OR v_rosterid IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'spSkinCodeX: subevent/event/roster not found';
  END IF;

  /* Rebuild skins for this subevent from scratch. */
  DELETE FROM eventSkin WHERE subevent_id = p_subeventid;

  OPEN flight_cur;

  flight_loop: LOOP
    FETCH flight_cur INTO v_flightid, v_hdcp1, v_hdcp2;
    IF v_done = 1 THEN
      LEAVE flight_loop;
    END IF;

    /*
      Count paid entries in this flight (card rows), not distinct members.
      This allows "play twice" players to contribute two entries to the pot.
    */
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

    SET v_winnercount = 0;
    SET v_hole = 1;

    hole_loop: LOOP
      IF v_hole > 9 THEN
        LEAVE hole_loop;
      END IF;

      /*
        Find lowest score on current hole for eligible cards in this flight.
        CASE keeps this procedure compact while looping hole number.
      */
      SELECT MIN(
        CASE v_hole
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

      /* If no scores for this hole/flight, move on. */
      IF v_minscore IS NOT NULL THEN
        /* Count distinct members tied at the low score for this hole. */
        SELECT COUNT(DISTINCT ec.member_id)
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
             CASE v_hole
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

        /* Only single winner gets the skin for this hole. */
        IF v_tiecount = 1 THEN
          SELECT ec.member_id, ec.card_id
            INTO v_memberid, v_cardid
            FROM eventCard ec
           WHERE ec.event_id = v_eventid
             AND ec.member_id IN (
               SELECT rml.member_id
                 FROM rosterMemberLink rml
                WHERE rml.roster_id = v_rosterid
             )
             AND ec.handicap BETWEEN v_hdcp1 AND v_hdcp2
             AND (
               CASE v_hole
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
           ORDER BY ec.card_id
           LIMIT 1;

          INSERT INTO eventSkin
            (event_id, member_id, subevent_id, flight_id, hole, score, amount, card_id)
          VALUES
            (v_eventid, v_memberid, p_subeventid, v_flightid, v_hole, v_minscore, 0, v_cardid);

          SET v_winnercount = v_winnercount + 1;
        END IF;
      END IF;

      SET v_hole = v_hole + 1;
    END LOOP;

    /*
      Apply payout per skin within this flight.
      pot = amount_per_player * player_count
      per-skin amount = pot / winner_count
    */
    IF v_winnercount > 0 AND v_playercount > 0 AND v_skinamount IS NOT NULL THEN
      SET v_perskin = (v_skinamount * v_playercount) / v_winnercount;
      UPDATE eventSkin
         SET amount = v_perskin
       WHERE subevent_id = p_subeventid
         AND event_id = v_eventid
         AND flight_id = v_flightid;
    END IF;
  END LOOP;

  CLOSE flight_cur;
END
