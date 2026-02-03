const path = require("path");
const dotenv = require("dotenv");
const mysql = require("mysql2/promise");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const DB_NAME = process.env.DB_NAME;

const ensurePrimaryKey = async (conn, table, column) => {
  const [rows] = await conn.query(
    "SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_TYPE = 'PRIMARY KEY'",
    [DB_NAME, table]
  );
  if (Array.isArray(rows) && rows.length === 0) {
    await conn.query(`ALTER TABLE \`${table}\` ADD PRIMARY KEY (\`${column}\`)`);
  }
};

const ensureAutoIncrement = async (conn, table, column) => {
  await conn.query(`ALTER TABLE \`${table}\` MODIFY \`${column}\` INT NOT NULL AUTO_INCREMENT`);
};

const columnExists = async (conn, table, column) => {
  const [rows] = await conn.query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    [DB_NAME, table, column]
  );
  return Array.isArray(rows) && rows.length > 0;
};

const indexExists = async (conn, table, indexName) => {
  const [rows] = await conn.query(
    "SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?",
    [DB_NAME, table, indexName]
  );
  return Array.isArray(rows) && rows.length > 0;
};

const ensureIndex = async (conn, table, indexName, columns, unique = false) => {
  const exists = await indexExists(conn, table, indexName);
  if (exists) return;
  const cols = columns.map((c) => `\`${c}\``).join(", ");
  const stmt = unique
    ? `CREATE UNIQUE INDEX \`${indexName}\` ON \`${table}\` (${cols})`
    : `CREATE INDEX \`${indexName}\` ON \`${table}\` (${cols})`;
  await conn.query(stmt);
};

const ensureIndexIfColumns = async (conn, table, indexName, columns, unique = false) => {
  for (const col of columns) {
    const ok = await columnExists(conn, table, col);
    if (!ok) return;
  }
  await ensureIndex(conn, table, indexName, columns, unique);
};

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: DB_NAME,
    multipleStatements: true,
  });

  // Step 1: PK + AUTO_INCREMENT
  const pkAuto = [
    ["courseMain", "course_id"],
    ["courseNine", "nine_id"],
    ["eventMain", "event_id"],
    ["eventMoneyList", "eventmoneylist_id"],
    ["eventPayout", "eventpayout_id"],
    ["rosterMain", "roster_id"],
    ["rosterFlight", "flight_id"],
    ["rosterMemberLink", "rostermemberlink_id"],
  ];
  for (const [table, col] of pkAuto) {
    await ensurePrimaryKey(conn, table, col);
    await ensureAutoIncrement(conn, table, col);
  }

  // Step 3: indexes
  await ensureIndex(conn, "eventMain", "idx_eventMain_course_dates", ["course_id", "start_dt", "end_dt"]);
  await ensureIndex(conn, "eventMain", "idx_eventMain_course", ["course_id"]);
  await ensureIndex(conn, "eventMain", "idx_eventMain_nine", ["nine_id"]);

  await ensureIndex(conn, "eventCard", "idx_eventCard_event", ["event_id"]);
  await ensureIndex(conn, "eventCard", "idx_eventCard_member_date", ["member_id", "card_dt"]);
  await ensureIndex(conn, "eventCard", "idx_eventCard_course_member_nine_date", ["course_id", "member_id", "nine_id", "card_dt"]);
  await ensureIndex(conn, "eventCard", "idx_eventCard_event_member", ["event_id", "member_id"]);

  await ensureIndex(conn, "eventHandicap", "idx_eventHandicap_event", ["event_id"]);
  try {
    await ensureIndex(conn, "eventHandicap", "uniq_eventHandicap_event_member", ["event_id", "member_id"], true);
  } catch (err) {
    if (err && err.code === "ER_DUP_ENTRY") {
      await ensureIndex(conn, "eventHandicap", "idx_eventHandicap_event_member", ["event_id", "member_id"]);
    } else {
      throw err;
    }
  }

  await ensureIndex(conn, "memberMain", "idx_memberMain_course_name", ["course_id", "lastname", "firstname"]);
  await ensureIndex(conn, "memberHandicap", "idx_memberHandicap_member_date", ["member_id", "card_dt"]);
  await ensureIndex(conn, "memberHandicap", "idx_memberHandicap_course_date", ["course_id", "card_dt"]);

  await ensureIndex(conn, "courseNine", "idx_courseNine_course", ["course_id"]);

  await ensureIndex(conn, "subEventMain", "idx_subEventMain_event", ["event_id"]);
  await ensureIndex(conn, "subEventMain", "idx_subEventMain_course", ["course_id"]);
  await ensureIndex(conn, "subEventMain", "idx_subEventMain_eventtype", ["eventtype_id"]);
  await ensureIndex(conn, "subEventMain", "idx_subEventMain_roster", ["roster_id"]);

  try {
    await ensureIndex(conn, "rosterMemberLink", "uniq_rosterMemberLink_roster_member", ["roster_id", "member_id"], true);
  } catch (err) {
    if (err && err.code === "ER_DUP_ENTRY") {
      await ensureIndex(conn, "rosterMemberLink", "idx_rosterMemberLink_roster_member", ["roster_id", "member_id"]);
    } else {
      throw err;
    }
  }
  await ensureIndex(conn, "rosterMemberLink", "idx_rosterMemberLink_member", ["member_id"]);

  await ensureIndex(conn, "eventOtherPay", "idx_eventOtherPay_event", ["event_id"]);
  await ensureIndex(conn, "eventOtherPay", "idx_eventOtherPay_member", ["member_id"]);

  await ensureIndex(conn, "eventMoneyList", "idx_eventMoneyList_event", ["event_id"]);
  await ensureIndex(conn, "eventMoneyList", "idx_eventMoneyList_member", ["member_id"]);

  await ensureIndex(conn, "users", "idx_users_course", ["course_id"]);
  await ensureIndex(conn, "users", "idx_users_global_admin", ["global_yn", "admin_yn"]);

  const subEventTables = [
    "subEventPayGross",
    "subEventPayNet",
    "subEventPayChicago",
    "subEventBBPayGross",
    "subEventBBPaynet",
    "subEventSkinNetResults",
    "subEventFlight",
    "eventSkin",
  ];
  for (const table of subEventTables) {
    await ensureIndexIfColumns(conn, table, `idx_${table}_event_subevent`, ["event_id", "subevent_id"]);
    await ensureIndexIfColumns(conn, table, `idx_${table}_member`, ["member_id"]);
    await ensureIndexIfColumns(conn, table, `idx_${table}_card`, ["card_id"]);
  }

  await conn.end();
  console.log("Keys and indexes applied.");
}

main().catch((err) => {
  console.error("Failed to apply keys/indexes:", err);
  process.exit(1);
});
