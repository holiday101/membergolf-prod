-- MySQL table DDL (non-aspnet). Uses IF NOT EXISTS to avoid changing existing tables.

CREATE TABLE IF NOT EXISTS courseMain (
  course_id INT NOT NULL AUTO_INCREMENT,
  coursename VARCHAR(300) NULL,
  handicap_yn INT NULL,
  cardsused INT NULL,
  cardsmax INT NULL,
  slogan VARCHAR(4000) NULL,
  website VARCHAR(500) NULL,
  decimalhandicap_yn INT NULL,
  payout DOUBLE NULL,
  active_yn INT NULL,
  PRIMARY KEY (course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS courseNine (
  nine_id INT NOT NULL AUTO_INCREMENT,
  course_id INT NULL,
  ninename VARCHAR(100) NULL,
  sloperating DOUBLE NULL,
  courserating DOUBLE NULL,
  startinghole INT NULL,
  numholes INT NULL,
  hole1 INT NULL,
  hole2 INT NULL,
  hole3 INT NULL,
  hole4 INT NULL,
  hole5 INT NULL,
  hole6 INT NULL,
  hole7 INT NULL,
  hole8 INT NULL,
  hole9 INT NULL,
  handicaphole1 INT NULL,
  handicaphole2 INT NULL,
  handicaphole3 INT NULL,
  handicaphole4 INT NULL,
  handicaphole5 INT NULL,
  handicaphole6 INT NULL,
  handicaphole7 INT NULL,
  handicaphole8 INT NULL,
  handicaphole9 INT NULL,
  hole10 INT NULL,
  hole11 INT NULL,
  hole12 INT NULL,
  hole13 INT NULL,
  hole14 INT NULL,
  hole15 INT NULL,
  hole16 INT NULL,
  hole17 INT NULL,
  hole18 INT NULL,
  handicaphole10 INT NULL,
  handicaphole11 INT NULL,
  handicaphole12 INT NULL,
  handicaphole13 INT NULL,
  handicaphole14 INT NULL,
  handicaphole15 INT NULL,
  handicaphole16 INT NULL,
  handicaphole17 INT NULL,
  handicaphole18 INT NULL,
  PRIMARY KEY (nine_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS coursePreference (
  coursepreference_id INT NOT NULL AUTO_INCREMENT,
  course_id INT NULL,
  darkcolor CHAR(20) NULL,
  lightcolor CHAR(20) NULL,
  textlightcolor CHAR(20) NULL,
  textdarkcolor CHAR(20) NULL,
  bordercolor CHAR(20) NULL,
  linkcolor CHAR(20) NULL,
  txtsize INT NOT NULL,
  headercolor CHAR(20) NULL,
  headertextcolor CHAR(20) NULL,
  PRIMARY KEY (coursepreference_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS eventBestBall (
  bestball_id INT NOT NULL AUTO_INCREMENT,
  event_id INT NULL,
  member1_id INT NULL,
  member2_id INT NULL,
  card1_id INT NULL,
  card2_id INT NULL,
  handicap1 INT NULL,
  handicap2 INT NULL,
  score INT NULL,
  net INT NULL,
  gross INT NULL,
  handicap DOUBLE NULL,
  PRIMARY KEY (bestball_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS eventCard (
  card_id INT NOT NULL AUTO_INCREMENT,
  course_id INT NULL,
  member_id INT NULL,
  event_id INT NULL,
  nine_id INT NULL,
  hole1 INT NULL,
  hole2 INT NULL,
  hole3 INT NULL,
  hole4 INT NULL,
  hole5 INT NULL,
  hole6 INT NULL,
  hole7 INT NULL,
  hole8 INT NULL,
  hole9 INT NULL,
  gross INT NULL,
  net INT NULL,
  adjustedscore INT NULL,
  handicap INT NULL,
  hdiff DOUBLE NULL,
  card_dt DATETIME NULL,
  newhandicap INT NULL,
  oldhandicap INT NULL,
  skins_yn INT NULL,
  hole10 INT NULL,
  hole11 INT NULL,
  hole12 INT NULL,
  hole13 INT NULL,
  hole14 INT NULL,
  hole15 INT NULL,
  hole16 INT NULL,
  hole17 INT NULL,
  hole18 INT NULL,
  numholes INT NULL,
  PRIMARY KEY (card_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS eventCard18d (
  card18_id INT NOT NULL AUTO_INCREMENT,
  course_id INT NULL,
  member_id INT NULL,
  event_id INT NULL,
  gross INT NULL,
  net INT NULL,
  adjustedscore INT NULL,
  handicap INT NULL,
  hdiff DOUBLE NULL,
  card_dt DATETIME NULL,
  nine_id INT NULL,
  hole1 INT NULL,
  hole2 INT NULL,
  hole3 INT NULL,
  hole4 INT NULL,
  hole5 INT NULL,
  hole6 INT NULL,
  hole7 INT NULL,
  hole8 INT NULL,
  hole9 INT NULL,
  hole10 INT NULL,
  hole11 INT NULL,
  hole12 INT NULL,
  hole13 INT NULL,
  hole14 INT NULL,
  hole15 INT NULL,
  hole16 INT NULL,
  hole17 INT NULL,
  hole18 INT NULL,
  skins_yn INT NULL,
  PRIMARY KEY (card18_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS eventFile (
  eventfile_id INT NOT NULL AUTO_INCREMENT,
  filename VARCHAR(100) NULL,
  filetype VARCHAR(100) NULL,
  event_id INT NULL,
  PRIMARY KEY (eventfile_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS eventHandicap (
  handicap_id INT NOT NULL AUTO_INCREMENT,
  event_id INT NULL,
  member_id INT NULL,
  handicap INT NULL,
  rhandicap DOUBLE NULL,
  totalcards INT NULL,
  cardsused INT NULL,
  totaldiffs DOUBLE NULL,
  handicap18 INT NULL,
  totalcards18 INT NULL,
  cardsused18 INT NULL,
  totaldiffs18 DOUBLE NULL,
  PRIMARY KEY (handicap_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS eventMain (
  event_id INT NOT NULL AUTO_INCREMENT,
  course_id INT NULL,
  eventname VARCHAR(400) NULL,
  eventdescription VARCHAR(4000) NULL,
  start_dt DATETIME NULL,
  end_dt DATETIME NULL,
  handicap_yn INT NULL,
  oldevent_id INT NULL,
  nine_id INT NULL,
  PRIMARY KEY (event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS eventMoneyList (
  eventmoneylist_id INT NOT NULL AUTO_INCREMENT,
  event_id INT NULL,
  subeventtype_id INT NULL,
  member_id INT NULL,
  description VARCHAR(500) NULL,
  PRIMARY KEY (eventmoneylist_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS eventOtherPay (
  eventotherpay_id INT NOT NULL AUTO_INCREMENT,
  event_id INT NULL,
  member_id INT NULL,
  amount DOUBLE NULL,
  description VARCHAR(400) NULL,
  PRIMARY KEY (eventotherpay_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS eventPayOut (
  eventpayout_id INT NOT NULL AUTO_INCREMENT,
  placespaid INT NULL,
  place INT NULL,
  payout DOUBLE NULL,
  PRIMARY KEY (eventpayout_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS eventSkin (
  eventskin_id INT NOT NULL AUTO_INCREMENT,
  event_id INT NULL,
  subevent_id INT NULL,
  flight_id INT NULL,
  member_id INT NULL,
  hole INT NULL,
  score INT NULL,
  amount DOUBLE NULL,
  card_id INT NULL,
  PRIMARY KEY (eventskin_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS fileMain (
  file_id INT NOT NULL AUTO_INCREMENT,
  filetype_id INT NULL,
  filepath VARCHAR(500) NULL,
  course_id INT NULL,
  link VARCHAR(500) NULL,
  PRIMARY KEY (file_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS memberCourseLink (
  membercourse_id INT NOT NULL AUTO_INCREMENT,
  userID CHAR(36) NULL,
  member_id INT NULL,
  course_id INT NULL,
  PRIMARY KEY (membercourse_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS memberHandicap (
  handicap_id INT NOT NULL AUTO_INCREMENT,
  member_id INT NULL,
  hdiff DOUBLE NULL,
  card_dt DATE NULL,
  card_id INT NULL,
  event_id INT NULL,
  course_id INT NULL,
  PRIMARY KEY (handicap_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS memberMain (
  member_id INT NOT NULL AUTO_INCREMENT,
  course_id INT NULL,
  firstname VARCHAR(100) NULL,
  lastname VARCHAR(100) NULL,
  handicap INT NULL,
  handicap18 INT NULL,
  oldmember_id INT NULL,
  handicapold INT NULL,
  rhandicap DOUBLE NULL,
  maxhandicap INT NULL,
  maxhandicap18 INT NULL,
  membernameold VARCHAR(300) NULL,
  PRIMARY KEY (member_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS rosterFlight (
  flight_id INT NOT NULL AUTO_INCREMENT,
  roster_id INT NULL,
  flightname VARCHAR(100) NULL,
  hdcp1 DOUBLE NULL,
  hdcp2 DOUBLE NULL,
  PRIMARY KEY (flight_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS rosterMain (
  roster_id INT NOT NULL AUTO_INCREMENT,
  rostername VARCHAR(100) NULL,
  course_id INT NULL,
  PRIMARY KEY (roster_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS rosterMemberLink (
  rostermemberlink_id INT NOT NULL AUTO_INCREMENT,
  roster_id INT NULL,
  member_id INT NULL,
  hdcp INT NULL,
  PRIMARY KEY (rostermemberlink_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sponsorFile (
  sponsor_id INT NOT NULL AUTO_INCREMENT,
  sponsortype_id INT NULL,
  sponsorfilepath VARCHAR(500) NULL,
  course_id INT NULL,
  sponsorlink VARCHAR(500) NULL,
  PRIMARY KEY (sponsor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sponsorType (
  sponsortype_id INT NOT NULL AUTO_INCREMENT,
  sponsortypename VARCHAR(100) NULL,
  PRIMARY KEY (sponsortype_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS subEventBBPayGross (
  gross_id INT NOT NULL AUTO_INCREMENT,
  bestball_id INT NULL,
  amount DOUBLE NULL,
  used_yn INT NULL,
  score INT NULL,
  place INT NULL,
  subevent_id INT NULL,
  event_id INT NULL,
  flight_id INT NULL,
  member1_id INT NULL,
  member2_id INT NULL,
  PRIMARY KEY (gross_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS subEventBBPayNet (
  net_id INT NOT NULL AUTO_INCREMENT,
  bestball_id INT NULL,
  amount DOUBLE NULL,
  used_yn INT NULL,
  score INT NULL,
  place INT NULL,
  subevent_id INT NULL,
  event_id INT NULL,
  flight_id INT NULL,
  member1_id INT NULL,
  member2_id INT NULL,
  PRIMARY KEY (net_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS subEventFlight (
  eventflight_id INT NOT NULL AUTO_INCREMENT,
  subevent_id INT NULL,
  card_id INT NULL,
  member_id INT NULL,
  handicap DOUBLE NULL,
  flight_id INT NULL,
  score INT NULL,
  amount DECIMAL(19,4) NULL,
  place INT NULL,
  used_yn INT NULL,
  card18_id INT NULL,
  PRIMARY KEY (eventflight_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS subEventMain (
  subevent_id INT NOT NULL AUTO_INCREMENT,
  course_id INT NULL,
  event_id INT NULL,
  eventtype_id INT NULL,
  eventnumhole_id INT NULL,
  roster_id INT NULL,
  amount DOUBLE NULL,
  addedmoney DOUBLE NULL,
  PRIMARY KEY (subevent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS subEventNumHole (
  eventnumhole_id INT NOT NULL AUTO_INCREMENT,
  eventnumholename VARCHAR(100) NULL,
  PRIMARY KEY (eventnumhole_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS subEventPayChicago (
  chicago_id INT NOT NULL AUTO_INCREMENT,
  card_id INT NULL,
  amount DOUBLE NULL,
  used_yn INT NULL,
  score INT NULL,
  place INT NULL,
  subevent_id INT NULL,
  event_id INT NULL,
  flight_id INT NULL,
  member_id INT NULL,
  PRIMARY KEY (chicago_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS subEventPayGross (
  gross_id INT NOT NULL AUTO_INCREMENT,
  card_id INT NULL,
  amount DOUBLE NULL,
  used_yn INT NULL,
  score INT NULL,
  place INT NULL,
  subevent_id INT NULL,
  event_id INT NULL,
  flight_id INT NULL,
  member_id INT NULL,
  PRIMARY KEY (gross_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS subEventPayNet (
  net_id INT NOT NULL AUTO_INCREMENT,
  card_id INT NULL,
  amount DOUBLE NULL,
  used_yn INT NULL,
  score INT NULL,
  place INT NULL,
  subevent_id INT NULL,
  event_id INT NULL,
  flight_id INT NULL,
  member_id INT NULL,
  PRIMARY KEY (net_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS subEventPayOut (
  place INT NULL,
  amount DOUBLE NULL,
  subevent_id INT NULL,
  flight_id INT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS subEventSkinNet (
  netskin_id INT NOT NULL AUTO_INCREMENT,
  subevent_id INT NULL,
  event_id INT NULL,
  member_id INT NULL,
  card_id INT NULL,
  handicap INT NULL,
  hole1 INT NULL,
  hole2 INT NULL,
  hole3 INT NULL,
  hole4 INT NULL,
  hole5 INT NULL,
  hole6 INT NULL,
  hole7 INT NULL,
  hole8 INT NULL,
  hole9 INT NULL,
  hhole1 INT NULL,
  hhole2 INT NULL,
  hhole3 INT NULL,
  hhole4 INT NULL,
  hhole5 INT NULL,
  hhole6 INT NULL,
  hhole7 INT NULL,
  hhole8 INT NULL,
  hhole9 INT NULL,
  amount INT NULL,
  hole10 INT NULL,
  hole11 INT NULL,
  hole12 INT NULL,
  hole13 INT NULL,
  hole14 INT NULL,
  hole15 INT NULL,
  hole16 INT NULL,
  hole17 INT NULL,
  hole18 INT NULL,
  hhole10 INT NULL,
  hhole11 INT NULL,
  hhole12 INT NULL,
  hhole13 INT NULL,
  hhole14 INT NULL,
  hhole15 INT NULL,
  hhole16 INT NULL,
  hhole17 INT NULL,
  hhole18 INT NULL,
  PRIMARY KEY (netskin_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS subEventSkinNetResults (
  eventskin_id INT NOT NULL AUTO_INCREMENT,
  event_id INT NULL,
  subevent_id INT NULL,
  flight_id INT NULL,
  member_id INT NULL,
  hole INT NULL,
  score INT NULL,
  amount DOUBLE NULL,
  netskin_id INT NULL,
  PRIMARY KEY (eventskin_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS subEventType (
  eventtype_id INT NOT NULL AUTO_INCREMENT,
  eventtypename VARCHAR(100) NULL,
  PRIMARY KEY (eventtype_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tmpMoneyList (
  tmpmoneylist_id INT NOT NULL AUTO_INCREMENT,
  member_id INT NULL,
  event_id INT NULL,
  card_id INT NULL,
  description VARCHAR(500) NULL,
  flight_id INT NULL,
  score INT NULL,
  amount DOUBLE NULL,
  typename VARCHAR(500) NULL,
  PRIMARY KEY (tmpmoneylist_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Indexes (no foreign keys)
CREATE INDEX IF NOT EXISTS idx_courseNine_course_id ON courseNine(course_id);
CREATE INDEX IF NOT EXISTS idx_coursePreference_course_id ON coursePreference(course_id);
CREATE INDEX IF NOT EXISTS idx_eventBestBall_event_id ON eventBestBall(event_id);
CREATE INDEX IF NOT EXISTS idx_eventBestBall_member1_id ON eventBestBall(member1_id);
CREATE INDEX IF NOT EXISTS idx_eventBestBall_member2_id ON eventBestBall(member2_id);
CREATE INDEX IF NOT EXISTS idx_eventBestBall_card1_id ON eventBestBall(card1_id);
CREATE INDEX IF NOT EXISTS idx_eventBestBall_card2_id ON eventBestBall(card2_id);

CREATE INDEX IF NOT EXISTS idx_eventCard_event_id ON eventCard(event_id);
CREATE INDEX IF NOT EXISTS idx_eventCard_member_id ON eventCard(member_id);
CREATE INDEX IF NOT EXISTS idx_eventCard_course_id ON eventCard(course_id);
CREATE INDEX IF NOT EXISTS idx_eventCard_card_dt ON eventCard(card_dt);
CREATE INDEX IF NOT EXISTS idx_eventCard_handicap ON eventCard(handicap);
CREATE INDEX IF NOT EXISTS idx_eventCard_numholes ON eventCard(numholes);

CREATE INDEX IF NOT EXISTS idx_eventCard18d_event_id ON eventCard18d(event_id);
CREATE INDEX IF NOT EXISTS idx_eventCard18d_member_id ON eventCard18d(member_id);
CREATE INDEX IF NOT EXISTS idx_eventCard18d_card_dt ON eventCard18d(card_dt);

CREATE INDEX IF NOT EXISTS idx_eventFile_event_id ON eventFile(event_id);
CREATE INDEX IF NOT EXISTS idx_eventHandicap_event_id ON eventHandicap(event_id);
CREATE INDEX IF NOT EXISTS idx_eventHandicap_member_id ON eventHandicap(member_id);
CREATE INDEX IF NOT EXISTS idx_eventMain_course_id ON eventMain(course_id);
CREATE INDEX IF NOT EXISTS idx_eventMain_nine_id ON eventMain(nine_id);
CREATE INDEX IF NOT EXISTS idx_eventMoneyList_event_id ON eventMoneyList(event_id);
CREATE INDEX IF NOT EXISTS idx_eventMoneyList_member_id ON eventMoneyList(member_id);
CREATE INDEX IF NOT EXISTS idx_eventMoneyList_subeventtype_id ON eventMoneyList(subeventtype_id);
CREATE INDEX IF NOT EXISTS idx_eventOtherPay_event_id ON eventOtherPay(event_id);
CREATE INDEX IF NOT EXISTS idx_eventOtherPay_member_id ON eventOtherPay(member_id);
CREATE INDEX IF NOT EXISTS idx_eventPayOut_placespaid ON eventPayOut(placespaid);
CREATE INDEX IF NOT EXISTS idx_eventSkin_event_id ON eventSkin(event_id);
CREATE INDEX IF NOT EXISTS idx_eventSkin_subevent_id ON eventSkin(subevent_id);
CREATE INDEX IF NOT EXISTS idx_eventSkin_flight_id ON eventSkin(flight_id);
CREATE INDEX IF NOT EXISTS idx_eventSkin_member_id ON eventSkin(member_id);
CREATE INDEX IF NOT EXISTS idx_eventSkin_card_id ON eventSkin(card_id);

CREATE INDEX IF NOT EXISTS idx_fileMain_course_id ON fileMain(course_id);
CREATE INDEX IF NOT EXISTS idx_memberCourseLink_userID ON memberCourseLink(userID);
CREATE INDEX IF NOT EXISTS idx_memberCourseLink_member_id ON memberCourseLink(member_id);
CREATE INDEX IF NOT EXISTS idx_memberCourseLink_course_id ON memberCourseLink(course_id);
CREATE INDEX IF NOT EXISTS idx_memberHandicap_member_id ON memberHandicap(member_id);
CREATE INDEX IF NOT EXISTS idx_memberHandicap_course_id ON memberHandicap(course_id);
CREATE INDEX IF NOT EXISTS idx_memberHandicap_card_dt ON memberHandicap(card_dt);
CREATE INDEX IF NOT EXISTS idx_memberMain_course_id ON memberMain(course_id);

CREATE INDEX IF NOT EXISTS idx_rosterFlight_roster_id ON rosterFlight(roster_id);
CREATE INDEX IF NOT EXISTS idx_rosterMain_course_id ON rosterMain(course_id);
CREATE INDEX IF NOT EXISTS idx_rosterMemberLink_roster_id ON rosterMemberLink(roster_id);
CREATE INDEX IF NOT EXISTS idx_rosterMemberLink_member_id ON rosterMemberLink(member_id);

CREATE INDEX IF NOT EXISTS idx_sponsorFile_course_id ON sponsorFile(course_id);
CREATE INDEX IF NOT EXISTS idx_sponsorFile_sponsortype_id ON sponsorFile(sponsortype_id);

CREATE INDEX IF NOT EXISTS idx_subEventBBPayGross_subevent_id ON subEventBBPayGross(subevent_id);
CREATE INDEX IF NOT EXISTS idx_subEventBBPayGross_flight_id ON subEventBBPayGross(flight_id);
CREATE INDEX IF NOT EXISTS idx_subEventBBPayGross_bestball_id ON subEventBBPayGross(bestball_id);
CREATE INDEX IF NOT EXISTS idx_subEventBBPayNet_subevent_id ON subEventBBPayNet(subevent_id);
CREATE INDEX IF NOT EXISTS idx_subEventBBPayNet_flight_id ON subEventBBPayNet(flight_id);
CREATE INDEX IF NOT EXISTS idx_subEventBBPayNet_bestball_id ON subEventBBPayNet(bestball_id);

CREATE INDEX IF NOT EXISTS idx_subEventFlight_subevent_id ON subEventFlight(subevent_id);
CREATE INDEX IF NOT EXISTS idx_subEventFlight_flight_id ON subEventFlight(flight_id);
CREATE INDEX IF NOT EXISTS idx_subEventFlight_member_id ON subEventFlight(member_id);
CREATE INDEX IF NOT EXISTS idx_subEventFlight_card_id ON subEventFlight(card_id);

CREATE INDEX IF NOT EXISTS idx_subEventMain_event_id ON subEventMain(event_id);
CREATE INDEX IF NOT EXISTS idx_subEventMain_roster_id ON subEventMain(roster_id);
CREATE INDEX IF NOT EXISTS idx_subEventMain_eventtype_id ON subEventMain(eventtype_id);
CREATE INDEX IF NOT EXISTS idx_subEventMain_course_id ON subEventMain(course_id);

CREATE INDEX IF NOT EXISTS idx_subEventPayChicago_subevent_id ON subEventPayChicago(subevent_id);
CREATE INDEX IF NOT EXISTS idx_subEventPayChicago_flight_id ON subEventPayChicago(flight_id);
CREATE INDEX IF NOT EXISTS idx_subEventPayChicago_card_id ON subEventPayChicago(card_id);
CREATE INDEX IF NOT EXISTS idx_subEventPayChicago_member_id ON subEventPayChicago(member_id);

CREATE INDEX IF NOT EXISTS idx_subEventPayGross_subevent_id ON subEventPayGross(subevent_id);
CREATE INDEX IF NOT EXISTS idx_subEventPayGross_flight_id ON subEventPayGross(flight_id);
CREATE INDEX IF NOT EXISTS idx_subEventPayGross_card_id ON subEventPayGross(card_id);
CREATE INDEX IF NOT EXISTS idx_subEventPayGross_member_id ON subEventPayGross(member_id);

CREATE INDEX IF NOT EXISTS idx_subEventPayNet_subevent_id ON subEventPayNet(subevent_id);
CREATE INDEX IF NOT EXISTS idx_subEventPayNet_flight_id ON subEventPayNet(flight_id);
CREATE INDEX IF NOT EXISTS idx_subEventPayNet_card_id ON subEventPayNet(card_id);
CREATE INDEX IF NOT EXISTS idx_subEventPayNet_member_id ON subEventPayNet(member_id);

CREATE INDEX IF NOT EXISTS idx_subEventPayOut_subevent_id ON subEventPayOut(subevent_id);
CREATE INDEX IF NOT EXISTS idx_subEventPayOut_flight_id ON subEventPayOut(flight_id);
CREATE INDEX IF NOT EXISTS idx_subEventPayOut_place ON subEventPayOut(place);

CREATE INDEX IF NOT EXISTS idx_subEventSkinNet_subevent_id ON subEventSkinNet(subevent_id);
CREATE INDEX IF NOT EXISTS idx_subEventSkinNet_event_id ON subEventSkinNet(event_id);
CREATE INDEX IF NOT EXISTS idx_subEventSkinNet_member_id ON subEventSkinNet(member_id);
CREATE INDEX IF NOT EXISTS idx_subEventSkinNetResults_subevent_id ON subEventSkinNetResults(subevent_id);
CREATE INDEX IF NOT EXISTS idx_subEventSkinNetResults_event_id ON subEventSkinNetResults(event_id);
CREATE INDEX IF NOT EXISTS idx_subEventSkinNetResults_flight_id ON subEventSkinNetResults(flight_id);

CREATE INDEX IF NOT EXISTS idx_tmpMoneyList_event_id ON tmpMoneyList(event_id);
CREATE INDEX IF NOT EXISTS idx_tmpMoneyList_member_id ON tmpMoneyList(member_id);
CREATE INDEX IF NOT EXISTS idx_tmpMoneyList_card_id ON tmpMoneyList(card_id);
CREATE INDEX IF NOT EXISTS idx_tmpMoneyList_flight_id ON tmpMoneyList(flight_id);
