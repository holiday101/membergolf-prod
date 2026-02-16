CREATE PROCEDURE sp_SubEventPayOut_Insert(
  IN p_subeventid INT,
  IN p_flightid INT
)
BEGIN
  DECLARE v_countplayers INT DEFAULT 0;
  DECLARE v_purse DECIMAL(12,2) DEFAULT 0;
  DECLARE v_placespaid INT DEFAULT 0;
  DECLARE v_amountperplayer DECIMAL(12,2) DEFAULT 0;
  DECLARE v_amountaddedmoney DECIMAL(12,2) DEFAULT 0;

  SELECT COUNT(*)
    INTO v_countplayers
    FROM subEventFlight
   WHERE subevent_id = p_subeventid
     AND flight_id = p_flightid;

  SELECT amount, addedmoney
    INTO v_amountperplayer, v_amountaddedmoney
    FROM subEventMain
   WHERE subevent_id = p_subeventid;

  SET v_placespaid = ROUND(v_countplayers * 0.3, 0) + 1;
  SET v_purse = v_countplayers * v_amountperplayer + v_amountaddedmoney;

  DELETE FROM subEventPayOut
   WHERE subevent_id = p_subeventid
     AND flight_id = p_flightid;

  INSERT INTO subEventPayOut (place, amount, flight_id, subevent_id)
    SELECT place, payout * v_purse, p_flightid, p_subeventid
      FROM eventPayOut
     WHERE placespaid = v_placespaid;
END

