const path = require("path");
const dotenv = require("dotenv");
const sql = require("mssql");
const mysql = require("mysql2/promise");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const MSSQL_CONN = process.env.MSSQL_CONN;

if (!MSSQL_CONN) {
  console.error("Missing MSSQL_CONN in environment.");
  process.exit(1);
}

async function main() {
  const mysqlPool = await mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 5,
  });

  const parseConn = (str) => {
    const out = {};
    str.split(";").forEach((part) => {
      const [rawKey, ...rest] = part.split("=");
      if (!rawKey || !rest.length) return;
      const key = rawKey.trim().toLowerCase();
      const value = rest.join("=").trim();
      out[key] = value;
    });
    return out;
  };

  const conn = parseConn(MSSQL_CONN);
  const mssqlPool = await sql.connect({
    server: conn["data source"] || conn["server"] || "",
    database: conn["initial catalog"] || conn["database"] || "",
    user: conn["user id"] || conn["uid"] || conn["user"] || "",
    password: conn["password"] || "",
    options: { encrypt: true, trustServerCertificate: true },
  });

  const [tableRows] = await mysqlPool.query(
    "SHOW TABLES LIKE 'memberHandicap'"
  );
  if (Array.isArray(tableRows) && tableRows.length === 0) {
    console.log("MySQL memberHandicap missing. Creating from SQL Server schema...");
    const schema = await mssqlPool
      .request()
      .query(
        "SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, NUMERIC_PRECISION, NUMERIC_SCALE, IS_NULLABLE " +
          "FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'memberHandicap' ORDER BY ORDINAL_POSITION"
      );
    const mapType = (row) => {
      const type = String(row.DATA_TYPE || "").toLowerCase();
      const len = row.CHARACTER_MAXIMUM_LENGTH;
      const prec = row.NUMERIC_PRECISION;
      const scale = row.NUMERIC_SCALE;
      if (type === "int") return "INT";
      if (type === "bigint") return "BIGINT";
      if (type === "smallint") return "SMALLINT";
      if (type === "tinyint") return "TINYINT";
      if (type === "bit") return "TINYINT(1)";
      if (type === "float") return "DOUBLE";
      if (type === "real") return "FLOAT";
      if (type === "decimal" || type === "numeric") {
        return `DECIMAL(${prec || 10},${scale || 0})`;
      }
      if (type === "datetime" || type === "datetime2" || type === "smalldatetime")
        return "DATETIME";
      if (type === "date") return "DATE";
      if (type === "uniqueidentifier") return "CHAR(36)";
      if (type === "nvarchar" || type === "varchar") {
        if (!len || len < 0 || len > 65535) return "TEXT";
        return `VARCHAR(${len})`;
      }
      if (type === "nchar" || type === "char") {
        if (!len || len < 0 || len > 255) return "CHAR(255)";
        return `CHAR(${len})`;
      }
      if (type === "text" || type === "ntext") return "TEXT";
      return "TEXT";
    };

    const cols = schema.recordset.map((row) => {
      const col = row.COLUMN_NAME;
      const colType = mapType(row);
      const nullable = row.IS_NULLABLE === "YES" ? "NULL" : "NOT NULL";
      return `\`${col}\` ${colType} ${nullable}`;
    });

    const createSql = `CREATE TABLE memberHandicap (${cols.join(", ")})`;
    await mysqlPool.query(createSql);
  }

  console.log("Truncating MySQL memberHandicap...");
  await mysqlPool.query("SET FOREIGN_KEY_CHECKS=0");
  await mysqlPool.query("TRUNCATE TABLE memberHandicap");
  await mysqlPool.query("SET FOREIGN_KEY_CHECKS=1");

  console.log("Streaming from SQL Server memberHandicap...");

  const request = new sql.Request(mssqlPool);
  request.stream = true;

  const batchSize = 500;
  let columns = null;
  let batch = [];
  let total = 0;

  const flush = async () => {
    if (!batch.length) return;
    const rows = batch;
    batch = [];
    const placeholders = rows.map(() => `(${columns.map(() => "?").join(",")})`).join(",");
    const values = rows.flatMap((row) => columns.map((col) => row[col]));
    const sqlText = `INSERT INTO memberHandicap (${columns.join(",")}) VALUES ${placeholders}`;
    await mysqlPool.query(sqlText, values);
  };

  await new Promise((resolve, reject) => {
    request.on("error", reject);
    request.on("row", async (row) => {
      if (!columns) {
        columns = Object.keys(row);
        if (!columns.length) {
          reject(new Error("No columns found in memberHandicap."));
          return;
        }
      }
      batch.push(row);
      total += 1;
      if (batch.length >= batchSize) {
        request.pause();
        flush()
          .then(() => {
            request.resume();
          })
          .catch(reject);
      }
    });
    request.on("done", async () => {
      try {
        await flush();
        resolve();
      } catch (err) {
        reject(err);
      }
    });
    request.query("SELECT * FROM memberHandicap");
  });

  await mssqlPool.close();
  await mysqlPool.end();

  console.log(`Done. Copied ${total} rows.`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
