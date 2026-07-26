CREATE PROCEDURE spPickGrossNetSplit(IN p_subeventid INT)
BEGIN
  DECLARE v_rosterid INT;
  DECLARE v_eventid INT;
  DECLARE v_courseid INT;
  DECLARE v_payout DECIMAL(10,4);
  DECLARE v_decimalhandicapyn INT;
  DECLARE v_grossflights INT;
  DECLARE v_totalflights INT;
  DECLARE v_rn INT DEFAULT 0;
  DECLARE v_flightid INT;
  DECLARE v_countgross INT;
  DECLARE v_countnet INT;
  DECLARE v_purse DECIMAL(12,2);
  DECLARE v_placespaid INT;
  DECLARE v_amountperplayer DECIMAL(12,2);

  SELECT roster_id, event_id, course_id, COALESCE(gross_flights, 0)
    INTO v_rosterid, v_eventid, v_courseid, v_grossflights
    FROM subEventMain
   WHERE subevent_id = p_subeventid;

  SELECT cm.payout
    INTO v_payout
    FROM eventMain em
    JOIN courseMain cm ON em.course_id = cm.course_id
   WHERE em.event_id = v_eventid;

  CALL spHandicap(v_eventid);

  SELECT decimalhandicap_yn INTO v_decimalhandicapyn
    FROM courseMain WHERE course_id = v_courseid;

  SELECT COUNT(*) INTO v_totalflights FROM rosterFlight WHERE roster_id = v_rosterid;

  DELETE FROM subEventPayOut WHERE subevent_id = p_subeventid;
  DELETE FROM subEventPayGross WHERE subevent_id = p_subeventid;
  DELETE FROM subEventPayNet WHERE subevent_id = p_subeventid;

  IF v_totalflights > 0 THEN
    -- Reflight every time we post: rank the roster's flight slots by handicap range (lowest first),
    -- then split the actual field of players into that many equal-sized groups by handicap, so flight
    -- membership tracks who's actually entered rather than fixed hdcp1/hdcp2 cutoffs.
    DROP TEMPORARY TABLE IF EXISTS tmp_gns_flights;
    CREATE TEMPORARY TABLE tmp_gns_flights AS
      SELECT flight_id, ROW_NUMBER() OVER (ORDER BY hdcp1 ASC) AS rn
        FROM rosterFlight
       WHERE roster_id = v_rosterid;

    DROP TEMPORARY TABLE IF EXISTS tmp_gns_players;
    IF v_decimalhandicapyn = 0 THEN
      CREATE TEMPORARY TABLE tmp_gns_players AS
        SELECT card_id, member_id, gross, net,
               NTILE(v_totalflights) OVER (ORDER BY handicap ASC, member_id ASC) AS bucket
          FROM eventCard
         WHERE event_id = v_eventid
           AND member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);
    ELSE
      CREATE TEMPORARY TABLE tmp_gns_players AS
        SELECT ec.card_id, ec.member_id, ec.gross, ec.net,
               NTILE(v_totalflights) OVER (ORDER BY eh.rhandicap ASC, ec.member_id ASC) AS bucket
          FROM eventCard ec
          JOIN (SELECT member_id, rhandicap FROM eventHandicap WHERE event_id = v_eventid) eh
            ON ec.member_id = eh.member_id
         WHERE ec.event_id = v_eventid
           AND ec.member_id IN (SELECT member_id FROM rosterMemberLink WHERE roster_id = v_rosterid);
    END IF;

    WHILE v_rn < v_totalflights DO
      SET v_rn = v_rn + 1;

      SELECT flight_id INTO v_flightid FROM tmp_gns_flights WHERE rn = v_rn LIMIT 1;

      IF v_rn <= v_grossflights THEN
        -- Best (lowest handicap) groups: pay out on gross score, full purse.
        INSERT INTO subEventPayGross (subevent_id,event_id,flight_id,card_id,member_id,amount,place,used_yn,score)
          SELECT p_subeventid, v_eventid, v_flightid, card_id, member_id, 0, 0, 0, gross
            FROM tmp_gns_players
           WHERE bucket = v_rn;

        SELECT COUNT(*) INTO v_countgross
          FROM subEventPayGross
         WHERE used_yn = 0 AND subevent_id = p_subeventid AND flight_id = v_flightid;

        SELECT amount INTO v_amountperplayer
          FROM subEventMain WHERE subevent_id = p_subeventid;

        -- If 2 or fewer players in the group, refund everyone their entry fee
        IF v_countgross <= 2 THEN
          UPDATE subEventPayGross
             SET amount = v_amountperplayer, place = 1, used_yn = 1
           WHERE subevent_id = p_subeventid AND flight_id = v_flightid;
        ELSE
          SET v_placespaid = ROUND(v_countgross * v_payout, 0);
          IF v_placespaid < 1 THEN
            SET v_placespaid = 1;
          END IF;

          SET v_purse = v_countgross * v_amountperplayer;

          INSERT INTO subEventPayOut (place,amount,flight_id,subevent_id)
            SELECT place, payout * v_purse, v_flightid, p_subeventid
              FROM eventPayOut
             WHERE placespaid = v_placespaid;

          CALL spPayGross(p_subeventid, v_flightid);
        END IF;
      ELSE
        -- Remaining (higher handicap) groups: pay out on net score, full purse.
        INSERT INTO subEventPayNet (subevent_id,event_id,flight_id,card_id,member_id,amount,place,used_yn,score)
          SELECT p_subeventid, v_eventid, v_flightid, card_id, member_id, 0, 0, 0, net
            FROM tmp_gns_players
           WHERE bucket = v_rn;

        SELECT COUNT(*) INTO v_countnet
          FROM subEventPayNet
         WHERE used_yn = 0 AND subevent_id = p_subeventid AND flight_id = v_flightid;

        SELECT amount INTO v_amountperplayer
          FROM subEventMain WHERE subevent_id = p_subeventid;

        -- If 2 or fewer players in the group, refund everyone their entry fee
        IF v_countnet <= 2 THEN
          UPDATE subEventPayNet
             SET amount = v_amountperplayer, place = 1, used_yn = 1
           WHERE subevent_id = p_subeventid AND flight_id = v_flightid;
        ELSE
          SET v_placespaid = ROUND(v_countnet * v_payout, 0);
          IF v_placespaid < 1 THEN
            SET v_placespaid = 1;
          END IF;

          SET v_purse = v_countnet * v_amountperplayer;

          INSERT INTO subEventPayOut (place,amount,flight_id,subevent_id)
            SELECT place, payout * v_purse, v_flightid, p_subeventid
              FROM eventPayOut
             WHERE placespaid = v_placespaid;

          CALL spPayNet(p_subeventid, v_flightid);
        END IF;
      END IF;
    END WHILE;

    DROP TEMPORARY TABLE IF EXISTS tmp_gns_flights;
    DROP TEMPORARY TABLE IF EXISTS tmp_gns_players;
  END IF;

  UPDATE subEventPayGross SET amount = NULL WHERE amount IS NULL OR amount = 0;
  UPDATE subEventPayNet SET amount = NULL WHERE amount IS NULL OR amount = 0;
END
