-- Fixes a bug in spPayGross/spPayNet where the cursor loop that ranks and pays out
-- players silently stopped after the very first place group. A bare
-- `SELECT amount INTO v_placeamount FROM subEventPayOut WHERE place = v_place - 1 ...`
-- returns zero rows on the first non-tied group (place 0 never exists), which trips
-- the procedure's shared `CONTINUE HANDLER FOR NOT FOUND` and terminates the cursor
-- loop right after processing place 1 -- every other place was left unpaid (NULL).
-- Fix: assign via a subquery (`SET v_placeamount = (SELECT ...)`) instead of INTO,
-- which never raises a not-found condition.
DELIMITER $$

DROP PROCEDURE IF EXISTS spPayGross$$
CREATE PROCEDURE spPayGross(
  IN p_subeventid INT,
  IN p_flightid INT
)
BEGIN
  DECLARE v_grossid INT;
  DECLARE v_score INT;
  DECLARE v_oldscore INT DEFAULT 0;
  DECLARE v_place INT DEFAULT 0;
  DECLARE v_ties INT DEFAULT 0;
  DECLARE v_currentplace INT DEFAULT 1;
  DECLARE v_placeamount DECIMAL(12,2) DEFAULT 0;
  DECLARE v_done INT DEFAULT 0;
  DECLARE cur CURSOR FOR
    SELECT Gross_id, score
      FROM subEventPayGross
     WHERE used_yn = 0
       AND subevent_id = p_subeventid
       AND flight_id = p_flightid
     ORDER BY score;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

  SELECT IFNULL(place, 0)
    INTO v_place
    FROM subEventPayGross
   WHERE used_yn = 1
     AND subevent_id = p_subeventid
     AND flight_id = p_flightid
   ORDER BY place DESC
   LIMIT 1;

  SELECT v_place + COUNT(*) - 1
    INTO v_place
    FROM subEventPayGross
   WHERE used_yn = 1
     AND subevent_id = p_subeventid
     AND flight_id = p_flightid
     AND place = v_place
     AND place <> 0;
  IF v_place < 0 THEN
    SET v_place = 0;
  END IF;

  SET v_done = 0;

  OPEN cur;
  read_loop: LOOP
    FETCH cur INTO v_grossid, v_score;
    IF v_done = 1 THEN
      LEAVE read_loop;
    END IF;

    SET v_place = v_place + 1;

    IF v_oldscore = v_score THEN
      UPDATE subEventPayGross SET place = v_place WHERE Gross_id = v_grossid;
      SET v_ties = v_ties + 1;
    ELSE
      UPDATE subEventPayGross SET place = v_place WHERE Gross_id = v_grossid;
      SET v_placeamount = 0;

      IF v_ties = 0 THEN
        SET v_placeamount = (
          SELECT amount
            FROM subEventPayOut
           WHERE place = v_place - 1
             AND subevent_id = p_subeventid
             AND flight_id = p_flightid
        );

        UPDATE subEventPayGross
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

        UPDATE subEventPayGross
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

    UPDATE subEventPayGross
       SET amount = v_placeamount, place = v_currentplace
     WHERE used_yn = 0
       AND place >= v_currentplace
       AND subevent_id = p_subeventid
       AND flight_id = p_flightid;
  ELSE
    UPDATE subEventPayGross
       SET amount = 0
     WHERE place >= v_place - 1
       AND used_yn = 0
       AND subevent_id = p_subeventid
       AND flight_id = p_flightid;
  END IF;
END
$$

DROP PROCEDURE IF EXISTS spPayNet$$
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

  SET v_done = 0;

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
        SET v_placeamount = (
          SELECT amount
            FROM subEventPayOut
           WHERE place = v_place - 1
             AND subevent_id = p_subeventid
             AND flight_id = p_flightid
        );

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
$$

DELIMITER ;
