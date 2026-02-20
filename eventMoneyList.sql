DROP TABLE IF EXISTS eventMoneyList;

CREATE TABLE eventMoneyList (
  moneylist_id BIGINT PRIMARY KEY AUTO_INCREMENT,

  member_id BIGINT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,

  -- reporting fields
  event_id BIGINT NULL,
  subevent_id BIGINT NULL,
  payout_date DATE NULL,

  description VARCHAR(255) NULL,
  place INT NULL,

  -- polymorphic source pointer
  source_table ENUM(
    'subEventBBPayGross',
    'subEventBBPayNet',
    'subEventPayGross',
    'subEventPayNet',
    'subEventPayChicago',
    'eventOtherPay'
  ) NOT NULL,
  source_id BIGINT NOT NULL,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_member (member_id),
  INDEX idx_source (source_table, source_id),
  INDEX idx_event (event_id, subevent_id),

  CONSTRAINT fk_winnings_member
    FOREIGN KEY (member_id) REFERENCES memberMain(member_id)
    ON DELETE CASCADE
);
