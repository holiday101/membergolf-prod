CREATE PROCEDURE spStrokeGross(IN p_subeventid INT)
BEGIN
  UPDATE subEventFlight f
  JOIN eventCard c ON f.card_id = c.card_id
   SET f.score = c.gross
 WHERE f.subevent_id = p_subeventid;
END

