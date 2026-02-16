CREATE PROCEDURE spMoneyList()
BEGIN
  DELETE sem
    FROM subEventMain sem
    LEFT JOIN eventMain em ON sem.event_id = em.event_id
   WHERE em.event_id IS NULL;

  DELETE bbpg
    FROM subEventBBPayGross bbpg
    LEFT JOIN subEventMain sem ON bbpg.subevent_id = sem.subevent_id
   WHERE sem.subevent_id IS NULL;

  DELETE bbpn
    FROM subEventBBPayNet bbpn
    LEFT JOIN subEventMain sem ON bbpn.subevent_id = sem.subevent_id
   WHERE sem.subevent_id IS NULL;

  DELETE spg
    FROM subEventPayGross spg
    LEFT JOIN subEventMain sem ON spg.subevent_id = sem.subevent_id
   WHERE sem.subevent_id IS NULL;

  DELETE spn
    FROM subEventPayNet spn
    LEFT JOIN subEventMain sem ON spn.subevent_id = sem.subevent_id
   WHERE sem.subevent_id IS NULL;

  DELETE spo
    FROM subEventPayOut spo
    LEFT JOIN subEventMain sem ON spo.subevent_id = sem.subevent_id
   WHERE sem.subevent_id IS NULL;

  DELETE es
    FROM eventSkin es
    LEFT JOIN subEventMain sem ON es.subevent_id = sem.subevent_id
   WHERE sem.subevent_id IS NULL;
END


-- Batch 5

