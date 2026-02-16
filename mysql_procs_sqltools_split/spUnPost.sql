CREATE PROCEDURE spUnPost(IN p_subeventid INT)
BEGIN
  DELETE FROM subEventBBPayGross WHERE subevent_id = p_subeventid;
  DELETE FROM subEventBBPayNet WHERE subevent_id = p_subeventid;
  DELETE FROM subEventPayGross WHERE subevent_id = p_subeventid;
  DELETE FROM subEventPayNet WHERE subevent_id = p_subeventid;
  DELETE FROM subEventFlight WHERE subevent_id = p_subeventid;
  DELETE FROM subEventPayChicago WHERE subevent_id = p_subeventid;
  DELETE FROM subEventSkinNet WHERE subevent_id = p_subeventid;
  DELETE FROM subEventSkinNetResults WHERE subevent_id = p_subeventid;
END

