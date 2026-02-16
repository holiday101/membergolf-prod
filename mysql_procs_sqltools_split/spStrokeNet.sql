CREATE PROCEDURE spStrokeNet(IN p_subeventid INT)
BEGIN
  UPDATE subEventFlight f
  JOIN eventCard c ON f.card_id = c.card_id
   SET f.score = c.net
 WHERE f.subevent_id = p_subeventid;
END

