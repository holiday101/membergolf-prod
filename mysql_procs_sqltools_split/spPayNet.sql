CREATE PROCEDURE spPayNet(
  IN p_subeventid INT,
  IN p_flightid INT
)
BEGIN
  DECLARE v_netid INT;
  DECLARE v_score INT;
  DECLARE v_oldscore INT DEFAULT 0;
  DECLARE v_place INT DEFAULT 0;
  DECLARE v_ties INT DEFAULT 0;
  DECLARE v_currentplace INT DEFAULT 1;
  DECLARE v_placeamount DECIMAL(12,2) DEFAULT 0;
  DECLARE v_done INT DEFAULT 0;
  DECLARE cur CURSOR FOR
    SELECT Net_id, score
      FROM subEventPayNet
     WHERE used_yn = 0
       AND subevent_id = p_subeventid
       AND flight_id = p_flightid
     ORDER BY score;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

  SELECT IFNULL(place, 0)
    INTO v_place
    FROM subEventPayNet
   WHERE used_yn = 1
     AND subevent_id = p_subeventid
     AND flight_id = p_flightid
   ORDER BY place DESC
   LIMIT 1;

  SELECT v_place + COUNT(*) - 1
    INTO v_place
    FROM subEventPayNet
   WHERE used_yn = 1
     AND subevent_id = p_subeventid
     AND flight_id = p_flightid
     AND place = v_place
     AND place <> 0;

  IF v_place < 0 THEN
    SET v_place = 0;
  END IF;

  OPEN cur;
  read_loop: LOOP
    FETCH cur INTO v_netid, v_score;
    IF v_done = 1 THEN
      LEAVE read_loop;
    END IF;

    SET v_place = v_place + 1;

    IF v_oldscore = v_score THEN
      UPDATE subEventPayNet SET place = v_place WHERE Net_id = v_netid;
      SET v_ties = v_ties + 1;
    ELSE
      UPDATE subEventPayNet SET place = v_place WHERE Net_id = v_netid;
      SET v_placeamount = 0;

      IF v_ties = 0 THEN
        SELECT amount
          INTO v_placeamount
          FROM subEventPayOut
         WHERE place = v_place - 1
           AND subevent_id = p_subeventid
           AND flight_id = p_flightid;

        UPDATE subEventPayNet
           SET amount = v_placeamount, place = v_place - 1
         WHERE used_yn = 0
           AND place = v_place - 1
           AND subevent_id = p_subeventid
           AND flight_id = p_flightid;
      ELSE
        SELECT SUM(amount) / (v_ties + 1)
          INTO v_placeamount
          FROM subEventPayOut
         WHERE place >= v_currentplace
           AND place <= (v_place - 1)
           AND subevent_id = p_subeventid
           AND flight_id = p_flightid;

        UPDATE subEventPayNet
           SET amount = v_placeamount, place = v_currentplace
         WHERE used_yn = 0
           AND place >= v_currentplace
           AND place <= (v_place - 1)
           AND subevent_id = p_subeventid
           AND flight_id = p_flightid;
      END IF;

      SET v_oldscore = v_score;
      SET v_ties = 0;
      SET v_currentplace = v_place;
    END IF;
  END LOOP;
  CLOSE cur;

  IF v_ties > 0 THEN
    SELECT SUM(amount) / (v_ties + 1)
      INTO v_placeamount
      FROM subEventPayOut
     WHERE place = v_currentplace
       AND subevent_id = p_subeventid
       AND flight_id = p_flightid;

    UPDATE subEventPayNet
       SET amount = v_placeamount, place = v_currentplace
     WHERE used_yn = 0
       AND place >= v_currentplace
       AND subevent_id = p_subeventid
       AND flight_id = p_flightid;
  ELSE
    UPDATE subEventPayNet
       SET amount = 0
     WHERE place >= v_place - 1
       AND used_yn = 0
       AND subevent_id = p_subeventid
       AND flight_id = p_flightid;
  END IF;
END
