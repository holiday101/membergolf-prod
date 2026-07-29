-- Adds indexes for the hot-path queries used by the stroke payout stored
-- procedures (spPick, spPickGross, spPickGrossNetSplit, spPayGross, spPayNet
-- -- the "Post Scores" flow). All of these filter/order on
-- subevent_id + flight_id (+ used_yn / place), which none of the existing
-- indexes covered, so every call was doing a full table scan against tables
-- with 180k+ rows -- run once per flight and then again per remaining
-- player inside the tie-breaking loop. subEventPayOut additionally had no
-- indexes at all (not even a primary key).

ALTER TABLE subEventPayGross ADD INDEX idx_subEventPayGross_subevent_flight_used (subevent_id, flight_id, used_yn);
ALTER TABLE subEventPayNet   ADD INDEX idx_subEventPayNet_subevent_flight_used (subevent_id, flight_id, used_yn);
ALTER TABLE subEventPayOut   ADD INDEX idx_subEventPayOut_subevent_flight_place (subevent_id, flight_id, place);
