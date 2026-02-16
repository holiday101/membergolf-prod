CREATE PROCEDURE sp_SubEventFlight_Insert(
  IN p_subeventid INT
)
BEGIN
  DECLARE v_rosterid INT DEFAULT NULL;
  DECLARE v_eventid INT DEFAULT NULL;
  DECLARE v_courseid INT DEFAULT NULL;
  DECLARE v_numholes INT DEFAULT NULL;
  DECLARE v_decimalhandicapyn INT DEFAULT 0;

  SELECT roster_id, event_id, course_id
    INTO v_rosterid, v_eventid, v_courseid
    FROM subEventMain
   WHERE subevent_id = p_subeventid;

  SELECT cn.numholes
    INTO v_numholes
    FROM eventMain em
    JOIN courseNine cn ON em.nine_id = cn.nine_id
   WHERE em.event_id = v_eventid;

  SELECT decimalhandicap_yn
    INTO v_decimalhandicapyn
    FROM courseMain
   WHERE course_id = v_courseid;

  DELETE FROM subEventFlight
   WHERE subevent_id = p_subeventid;

  IF v_decimalhandicapyn = 0 THEN
    IF v_courseid = 3 AND v_numholes = 18 THEN
      INSERT INTO subEventFlight (subevent_id, flight_id, card_id, member_id, handicap, score, amount)
        SELECT p_subeventid,
               (SELECT flight_id
                  FROM rosterFlight
                 WHERE hdcp1 <= handicap18 AND hdcp2 >= handicap18 AND roster_id = v_rosterid),
               card_id, eh.member_id, handicap18, 0, 0
          FROM eventHandicap eh
          JOIN rosterMemberLink mlink ON eh.member_id = mlink.member_id AND mlink.roster_id = v_rosterid
          JOIN (SELECT member_id, card_id FROM eventCard WHERE event_id = v_eventid) eCard
            ON eh.member_id = eCard.member_id
         WHERE eh.event_id = v_eventid;
    ELSE
      INSERT INTO subEventFlight (subevent_id, flight_id, card_id, member_id, handicap, score, amount)
        SELECT p_subeventid,
               (SELECT flight_id
                  FROM rosterFlight
                 WHERE hdcp1 <= handicap AND hdcp2 >= handicap AND roster_id = v_rosterid),
               card_id, eh.member_id, handicap, 0, 0
          FROM eventHandicap eh
          JOIN rosterMemberLink mlink ON eh.member_id = mlink.member_id AND mlink.roster_id = v_rosterid
          JOIN (SELECT member_id, card_id FROM eventCard WHERE event_id = v_eventid) eCard
            ON eh.member_id = eCard.member_id
         WHERE eh.event_id = v_eventid;
    END IF;
  ELSE
    INSERT INTO subEventFlight (subevent_id, flight_id, card_id, member_id, handicap, score, amount)
      SELECT p_subeventid,
             (SELECT flight_id
                FROM rosterFlight
               WHERE hdcp1 <= rhandicap AND hdcp2 >= rhandicap AND roster_id = v_rosterid),
             card_id, eh.member_id, rhandicap, 0, 0
        FROM eventHandicap eh
        JOIN rosterMemberLink mlink ON eh.member_id = mlink.member_id AND mlink.roster_id = v_rosterid
        JOIN (SELECT member_id, card_id FROM eventCard WHERE event_id = v_eventid) eCard
          ON eh.member_id = eCard.member_id
       WHERE eh.event_id = v_eventid;
  END IF;
END

