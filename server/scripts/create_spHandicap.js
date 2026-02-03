const path = require("path");
const dotenv = require("dotenv");
const mysql = require("mysql2/promise");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function ensureColumn(pool, table, column, def) {
  const [rows] = await pool.query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    [process.env.DB_NAME, table, column]
  );
  if (Array.isArray(rows) && rows.length === 0) {
    await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${def}`);
  }
}

async function main() {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 3,
    multipleStatements: true,
  });

  await ensureColumn(pool, "eventHandicap", "rhandicap18", "REAL NULL");

  const proc = `
DROP PROCEDURE IF EXISTS spHandicap;
CREATE PROCEDURE spHandicap(IN pEventID INT)
BEGIN
  DECLARE v_UB INT DEFAULT 0;
  DECLARE v_courseid INT DEFAULT 0;
  DECLARE v_memberid INT DEFAULT 0;
  DECLARE v_totalscores INT DEFAULT 0;
  DECLARE v_eventdt DATETIME;
  DECLARE v_cardsmax INT DEFAULT 0;
  DECLARE v_cardsused INT DEFAULT 0;
  DECLARE v_maxhandicap INT DEFAULT 0;
  DECLARE v_sumdiffs DOUBLE DEFAULT 0;
  DECLARE v_HDCP DOUBLE DEFAULT 0;
  DECLARE v_limit INT DEFAULT 0;
  DECLARE done INT DEFAULT 0;

  DECLARE member_cursor CURSOR FOR
    SELECT member_id, maxhandicap
    FROM memberMain
    WHERE course_id = v_courseid;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

  DELETE FROM eventHandicap WHERE event_id = pEventID;

  SELECT start_dt, course_id
    INTO v_eventdt, v_courseid
  FROM eventMain
  WHERE event_id = pEventID;

  SELECT cardsmax, cardsused
    INTO v_cardsmax, v_cardsused
  FROM courseMain
  WHERE course_id = v_courseid;

  DELETE FROM memberHandicap WHERE course_id = v_courseid;

  INSERT INTO memberHandicap (course_id, event_id, member_id, card_id, card_dt, hdiff)
  SELECT ec.course_id, ec.event_id, ec.member_id, ec.card_id, ec.card_dt, ec.hdiff
  FROM eventCard ec
  INNER JOIN eventMain em ON ec.event_id = em.event_id
  WHERE ec.course_id = v_courseid
    AND em.handicap_yn = 1;

  OPEN member_cursor;

  read_loop: LOOP
    FETCH member_cursor INTO v_memberid, v_maxhandicap;
    IF done = 1 THEN
      LEAVE read_loop;
    END IF;

    SELECT COUNT(*)
      INTO v_totalscores
    FROM memberHandicap
    WHERE member_id = v_memberid
      AND card_dt < v_eventdt;

    IF v_totalscores >= v_cardsmax THEN
      SET v_UB = v_cardsused - 1;
    ELSE
      IF v_totalscores <= 3 THEN
        SET v_UB = 0;
      ELSEIF v_totalscores <= 5 THEN
        SET v_UB = 1;
      ELSEIF v_totalscores <= 7 THEN
        SET v_UB = 2;
      ELSEIF v_totalscores <= 9 THEN
        SET v_UB = 3;
      ELSEIF v_totalscores <= 11 THEN
        SET v_UB = 4;
      ELSEIF v_totalscores <= 13 THEN
        SET v_UB = 5;
      ELSEIF v_totalscores <= 15 THEN
        SET v_UB = 6;
      ELSEIF v_totalscores <= 17 THEN
        SET v_UB = 7;
      ELSEIF v_totalscores <= 19 THEN
        SET v_UB = 8;
      ELSE
        SET v_UB = 9;
      END IF;
    END IF;

    SET v_limit = v_UB + 1;

    SELECT COALESCE(SUM(hdiff),0)
      INTO v_sumdiffs
    FROM (
      SELECT hdiff
      FROM (
        SELECT hdiff
        FROM memberHandicap
        WHERE member_id = v_memberid
          AND card_dt < v_eventdt
        ORDER BY card_dt DESC, card_id DESC
        LIMIT v_cardsmax
      ) recent
      ORDER BY hdiff
      LIMIT v_limit
    ) sel;

    SET v_HDCP = v_sumdiffs / (v_UB + 1);

    IF v_courseid = 19 OR v_courseid = 25 THEN
      IF v_courseid = 19 THEN
        SET v_maxhandicap = 36;
      ELSE
        SET v_maxhandicap = 54;
      END IF;
    ELSE
      IF v_HDCP > 18 THEN
        SET v_HDCP = 18;
      END IF;
    END IF;

    IF v_HDCP > v_maxhandicap THEN
      SET v_HDCP = v_maxhandicap;
    END IF;

    IF v_totalscores <> 0 THEN
      INSERT INTO eventHandicap
        (handicap_id, event_id, member_id, handicap, rhandicap, handicap18, rhandicap18, totalcards, cardsused, totaldiffs)
      VALUES
        (NULL, pEventID, v_memberid, ROUND(v_HDCP,0), ROUND(v_HDCP,2), ROUND(v_HDCP*2,0), ROUND(v_HDCP*2,2),
         v_totalscores, v_UB + 1, v_sumdiffs);

      UPDATE memberMain
      SET handicap = ROUND(v_HDCP,0),
          handicap18 = ROUND(v_HDCP*2,0),
          rhandicap = ROUND(v_HDCP,2)
      WHERE member_id = v_memberid;

      UPDATE eventCard
      SET net = gross - ROUND(v_HDCP,0),
          handicap = ROUND(v_HDCP,0)
      WHERE course_id = v_courseid
        AND numholes = 9
        AND event_id = pEventID
        AND member_id = v_memberid;

      UPDATE eventCard
      SET net = gross - ROUND(v_HDCP*2,0),
          handicap = ROUND(v_HDCP*2,0)
      WHERE course_id = v_courseid
        AND numholes = 18
        AND event_id = pEventID
        AND member_id = v_memberid;
    ELSE
      INSERT INTO eventHandicap
        (handicap_id, event_id, member_id, handicap, rhandicap, handicap18, rhandicap18, totalcards, cardsused, totaldiffs)
      SELECT NULL, pEventID, v_memberid, handicap, handicap, handicap18, handicap18, 0, 0, 0
      FROM memberMain
      WHERE member_id = v_memberid;
    END IF;
  END LOOP;

  CLOSE member_cursor;

  UPDATE eventCard ec
  INNER JOIN eventHandicap eh ON ec.member_id = eh.member_id
  SET ec.handicap = eh.handicap
  WHERE ec.event_id = pEventID
    AND eh.event_id = pEventID
    AND ec.numholes = 9;

  UPDATE eventCard ec
  INNER JOIN eventHandicap eh ON ec.member_id = eh.member_id
  SET ec.handicap = eh.handicap18
  WHERE ec.event_id = pEventID
    AND eh.event_id = pEventID
    AND ec.numholes = 18;
END;
`;

  await pool.query(proc);
  await pool.end();
  console.log("spHandicap created and eventHandicap.rhandicap18 ensured.");
}

main().catch((err) => {
  console.error("Failed to create procedure:", err);
  process.exit(1);
});
