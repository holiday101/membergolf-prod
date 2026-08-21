-- Adds a "Skins Auto Flight" sub event type: same skins-per-hole scoring as
-- regular Skins (single outright winner per hole, no split ties), but flights
-- are auto-computed - the admin picks a flight COUNT on the sub event
-- (subEventMain.auto_flights, already added by add-bestball-auto-flight.sql)
-- instead of needing pre-existing rosterFlight hdcp ranges configured on the
-- roster. Entries (eventCard rows) are allocated evenly (NTILE) by handicap
-- across that many of the roster's flight slots, mirroring the approach used
-- for spBBAutoFlightPick.

INSERT INTO subEventType (eventtypename)
  SELECT 'Skins Auto Flight'
   WHERE NOT EXISTS (SELECT 1 FROM subEventType WHERE eventtypename = 'Skins Auto Flight');

DROP PROCEDURE IF EXISTS spSkinAutoFlightPick;

DELIMITER $$
CREATE PROCEDURE spSkinAutoFlightPick(IN p_subeventid INT)
BEGIN
  DECLARE v_eventid INT;
  DECLARE v_rosterid INT;
  DECLARE v_skinamount DECIMAL(12,2);
  DECLARE v_numholes INT DEFAULT 9;
  DECLARE v_requestedflights INT;
  DECLARE v_availableflights INT;
  DECLARE v_totalflights INT;

  DECLARE v_rn INT DEFAULT 0;
  DECLARE v_flightid INT;

  DECLARE v_hole INT;
  DECLARE v_minscore INT;
  DECLARE v_tiecount INT;
  DECLARE v_memberid INT;
  DECLARE v_cardid INT;

  DECLARE v_playercount INT;
  DECLARE v_winnercount INT;
  DECLARE v_perskin DECIMAL(12,2);

  /* Load subevent context. */
  SELECT event_id, roster_id, amount, COALESCE(auto_flights, 1)
    INTO v_eventid, v_rosterid, v_skinamount, v_requestedflights
    FROM subEventMain
   WHERE subevent_id = p_subeventid
   LIMIT 1;

  IF v_eventid IS NULL OR v_rosterid IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'spSkinAutoFlightPick: subevent/event/roster not found';
  END IF;

  /* Determine hole count from courseNine (9 or 18). */
  SELECT cn.numholes
    INTO v_numholes
    FROM eventMain em
    JOIN courseNine cn ON em.nine_id = cn.nine_id
   WHERE em.event_id = v_eventid;

  IF v_numholes IS NULL THEN
    SET v_numholes = 9;
  END IF;

  SELECT COUNT(*) INTO v_availableflights FROM rosterFlight WHERE roster_id = v_rosterid;
  SET v_totalflights = LEAST(GREATEST(v_requestedflights, 1), v_availableflights);

  /* Rebuild skins for this subevent from scratch. */
  DELETE FROM eventSkin WHERE subevent_id = p_subeventid;

  IF v_totalflights > 0 THEN

    DROP TEMPORARY TABLE IF EXISTS tmp_skaf_flights;
    CREATE TEMPORARY TABLE tmp_skaf_flights AS
      SELECT flight_id, rn FROM (
        SELECT flight_id, ROW_NUMBER() OVER (ORDER BY hdcp1 ASC) AS rn
          FROM rosterFlight
         WHERE roster_id = v_rosterid
      ) ranked
      WHERE rn <= v_totalflights;

    /* Bucket every paid entry (card row) - not distinct members - so a
       "play twice" player's two cards each land in a bucket on their own,
       same "count card rows, not members" convention spSkinCodeX uses for
       the pot. */
    DROP TEMPORARY TABLE IF EXISTS tmp_skaf_cards;
    CREATE TEMPORARY TABLE tmp_skaf_cards AS
      SELECT ec.card_id, ec.member_id, ec.handicap,
             NTILE(v_totalflights) OVER (ORDER BY ec.handicap ASC, ec.card_id ASC) AS bucket
        FROM eventCard ec
       WHERE ec.event_id = v_eventid
         AND ec.member_id IN (
           SELECT rml.member_id FROM rosterMemberLink rml WHERE rml.roster_id = v_rosterid
         );

    SET v_rn = 0;
    WHILE v_rn < v_totalflights DO
      SET v_rn = v_rn + 1;

      SELECT flight_id INTO v_flightid FROM tmp_skaf_flights WHERE rn = v_rn LIMIT 1;

      SELECT COUNT(*) INTO v_playercount FROM tmp_skaf_cards WHERE bucket = v_rn;

      SET v_winnercount = 0;
      SET v_hole = 1;

      hole_loop: LOOP
        IF v_hole > v_numholes THEN
          LEAVE hole_loop;
        END IF;

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
            WHEN 10 THEN ec.hole10
            WHEN 11 THEN ec.hole11
            WHEN 12 THEN ec.hole12
            WHEN 13 THEN ec.hole13
            WHEN 14 THEN ec.hole14
            WHEN 15 THEN ec.hole15
            WHEN 16 THEN ec.hole16
            WHEN 17 THEN ec.hole17
            WHEN 18 THEN ec.hole18
          END
        )
          INTO v_minscore
          FROM eventCard ec
          JOIN tmp_skaf_cards t ON t.card_id = ec.card_id
         WHERE t.bucket = v_rn;

        IF v_minscore IS NOT NULL THEN
          SELECT COUNT(DISTINCT ec.member_id)
            INTO v_tiecount
            FROM eventCard ec
            JOIN tmp_skaf_cards t ON t.card_id = ec.card_id
           WHERE t.bucket = v_rn
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
                 WHEN 10 THEN ec.hole10
                 WHEN 11 THEN ec.hole11
                 WHEN 12 THEN ec.hole12
                 WHEN 13 THEN ec.hole13
                 WHEN 14 THEN ec.hole14
                 WHEN 15 THEN ec.hole15
                 WHEN 16 THEN ec.hole16
                 WHEN 17 THEN ec.hole17
                 WHEN 18 THEN ec.hole18
               END
             ) = v_minscore;

          /* Only single winner gets the skin for this hole. */
          IF v_tiecount = 1 THEN
            SELECT ec.member_id, ec.card_id
              INTO v_memberid, v_cardid
              FROM eventCard ec
              JOIN tmp_skaf_cards t ON t.card_id = ec.card_id
             WHERE t.bucket = v_rn
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
                   WHEN 10 THEN ec.hole10
                   WHEN 11 THEN ec.hole11
                   WHEN 12 THEN ec.hole12
                   WHEN 13 THEN ec.hole13
                   WHEN 14 THEN ec.hole14
                   WHEN 15 THEN ec.hole15
                   WHEN 16 THEN ec.hole16
                   WHEN 17 THEN ec.hole17
                   WHEN 18 THEN ec.hole18
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
        Apply payout per skin within this flight bucket.
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
    END WHILE;

    DROP TEMPORARY TABLE IF EXISTS tmp_skaf_flights;
    DROP TEMPORARY TABLE IF EXISTS tmp_skaf_cards;
  END IF;
END$$
DELIMITER ;
