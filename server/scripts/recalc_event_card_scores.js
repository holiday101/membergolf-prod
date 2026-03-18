const path = require("path");
const dotenv = require("dotenv");
const mysql = require("mysql2/promise");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

function usage() {
  console.error("Usage: node server/scripts/recalc_event_card_scores.js <eventId> [--dry-run]");
}

function mergeHoleValues(source) {
  const holes = {};
  for (let i = 1; i <= 18; i += 1) {
    const value = source?.[`hole${i}`];
    holes[i] = typeof value === "number" ? value : value == null ? null : Number(value);
    if (holes[i] != null && Number.isNaN(holes[i])) holes[i] = null;
  }
  return holes;
}

function inferNumholes(card) {
  if (Number(card?.numholes) === 18) return 18;
  for (let i = 10; i <= 18; i += 1) {
    if (card?.[`hole${i}`] != null) return 18;
  }
  return 9;
}

function sumHoleValues(holes, holeCount) {
  let total = 0;
  let count = 0;
  for (let i = 1; i <= holeCount; i += 1) {
    if (typeof holes[i] === "number") {
      total += holes[i];
      count += 1;
    }
  }
  return count ? total : null;
}

function holeStrokeAllowance(courseHandicap, holeRank, holeCount) {
  if (holeCount <= 0) return 0;
  const rank = Math.min(Math.max(Math.trunc(holeRank), 1), holeCount);
  if (courseHandicap >= 0) {
    const base = Math.floor(courseHandicap / holeCount);
    const remainder = courseHandicap % holeCount;
    return base + (rank <= remainder ? 1 : 0);
  }

  const absHandicap = Math.abs(courseHandicap);
  const base = -Math.floor(absHandicap / holeCount);
  const remainder = absHandicap % holeCount;
  return base - (rank <= remainder ? 1 : 0);
}

function computeAdjustedScore(holes, nine, handicap, numholes) {
  if (!nine) return sumHoleValues(holes, numholes);

  let total = 0;
  let usedAnyHole = false;
  for (let i = 1; i <= numholes; i += 1) {
    const posted = holes[i];
    if (posted == null) continue;
    usedAnyHole = true;

    const parValue = nine[`hole${i}`];
    const par = typeof parValue === "number" ? parValue : parValue == null ? null : Number(parValue);
    if (par == null || Number.isNaN(par)) {
      total += posted;
      continue;
    }

    let cap = par + 2;
    if (handicap != null) {
      const rankValue = nine[`handicaphole${i}`];
      const rank = typeof rankValue === "number" ? rankValue : rankValue == null ? i : Number(rankValue);
      const strokes = holeStrokeAllowance(handicap, Number.isNaN(rank) ? i : rank, numholes);
      cap = par + 2 + strokes;
    }

    total += Math.min(posted, cap);
  }

  return usedAnyHole ? total : null;
}

function totalParForNine(nine, numholes) {
  if (!nine || (numholes !== 9 && numholes !== 18)) return null;
  let total = 0;
  let count = 0;
  for (let i = 1; i <= numholes; i += 1) {
    const parValue = nine[`hole${i}`];
    const par = typeof parValue === "number" ? parValue : parValue == null ? null : Number(parValue);
    if (par == null || Number.isNaN(par)) continue;
    total += par;
    count += 1;
  }
  return count ? total : null;
}

function computeHdiff(adjustedScore, totalPar, numholes) {
  if (adjustedScore == null || totalPar == null) return null;
  if (!Number.isFinite(adjustedScore) || !Number.isFinite(totalPar)) return null;
  const raw = (adjustedScore - totalPar) * 0.96;
  const normalized = numholes === 18 ? raw / 2 : raw;
  return Number(normalized.toFixed(2));
}

function applicableHandicap(eventHandicap, member, numholes) {
  if (eventHandicap) {
    if (numholes === 18) {
      if (eventHandicap.handicap18 != null) return Number(eventHandicap.handicap18);
      if (eventHandicap.rhandicap18 != null) return Math.round(Number(eventHandicap.rhandicap18));
    }
    if (eventHandicap.handicap != null) return Number(eventHandicap.handicap);
    if (eventHandicap.rhandicap != null) return Math.round(Number(eventHandicap.rhandicap));
  }

  if (!member) return null;
  if (numholes === 18) {
    if (member.handicap18 != null) return Number(member.handicap18);
    if (member.rhandicap != null) return Math.round(Number(member.rhandicap) * 2);
  }
  if (member.handicap != null) return Number(member.handicap);
  if (member.rhandicap != null) return Math.round(Number(member.rhandicap));
  return null;
}

async function main() {
  const eventId = Number(process.argv[2]);
  const dryRun = process.argv.includes("--dry-run");
  if (!Number.isFinite(eventId)) {
    usage();
    process.exit(1);
  }

  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 4,
  });

  const conn = await pool.getConnection();
  try {
    const [eventRows] = await conn.query(
      "SELECT event_id, course_id, nine_id FROM eventMain WHERE event_id = ? LIMIT 1",
      [eventId]
    );
    const eventRow = eventRows[0];
    if (!eventRow) throw new Error(`Event ${eventId} not found`);

    const [cards] = await conn.query(
      `
        SELECT
          card_id,
          member_id,
          nine_id,
          gross,
          net,
          adjustedscore,
          handicap,
          hdiff,
          numholes,
          hole1, hole2, hole3, hole4, hole5, hole6, hole7, hole8, hole9,
          hole10, hole11, hole12, hole13, hole14, hole15, hole16, hole17, hole18
        FROM eventCard
        WHERE event_id = ? AND course_id = ?
        ORDER BY card_id ASC
      `,
      [eventId, eventRow.course_id]
    );

    const usedNineIds = new Set();
    if (eventRow.nine_id != null) usedNineIds.add(Number(eventRow.nine_id));
    for (const card of cards) {
      if (card.nine_id != null) usedNineIds.add(Number(card.nine_id));
    }

    const nineMap = new Map();
    if (usedNineIds.size) {
      const placeholders = [...usedNineIds].map(() => "?").join(", ");
      const [nines] = await conn.query(
        `
          SELECT
            nine_id,
            numholes,
            sloperating,
            courserating,
            hole1, hole2, hole3, hole4, hole5, hole6, hole7, hole8, hole9,
            hole10, hole11, hole12, hole13, hole14, hole15, hole16, hole17, hole18,
            handicaphole1, handicaphole2, handicaphole3, handicaphole4, handicaphole5,
            handicaphole6, handicaphole7, handicaphole8, handicaphole9,
            handicaphole10, handicaphole11, handicaphole12, handicaphole13, handicaphole14,
            handicaphole15, handicaphole16, handicaphole17, handicaphole18
          FROM courseNine
          WHERE course_id = ? AND nine_id IN (${placeholders})
        `,
        [eventRow.course_id, ...usedNineIds]
      );
      for (const nine of nines) nineMap.set(Number(nine.nine_id), nine);
    }

    const [eventHandicaps] = await conn.query(
      `
        SELECT member_id, handicap, handicap18, rhandicap, rhandicap18
        FROM eventHandicap
        WHERE event_id = ?
      `,
      [eventId]
    );
    const eventHandicapMap = new Map(eventHandicaps.map((row) => [Number(row.member_id), row]));

    const memberIds = [...new Set(cards.map((card) => Number(card.member_id)).filter(Number.isFinite))];
    const memberMap = new Map();
    if (memberIds.length) {
      const placeholders = memberIds.map(() => "?").join(", ");
      const [members] = await conn.query(
        `
          SELECT member_id, handicap, handicap18, rhandicap
          FROM memberMain
          WHERE course_id = ? AND member_id IN (${placeholders})
        `,
        [eventRow.course_id, ...memberIds]
      );
      for (const member of members) memberMap.set(Number(member.member_id), member);
    }

    const updates = [];
    for (const card of cards) {
      const effectiveNineId = card.nine_id != null ? Number(card.nine_id) : eventRow.nine_id != null ? Number(eventRow.nine_id) : null;
      const nine = effectiveNineId != null ? nineMap.get(effectiveNineId) ?? null : null;
      const numholes = nine?.numholes != null ? Number(nine.numholes) : inferNumholes(card);
      const holes = mergeHoleValues(card);
      const gross = sumHoleValues(holes, numholes);
      const eventHandicap = eventHandicapMap.get(Number(card.member_id)) ?? null;
      const member = memberMap.get(Number(card.member_id)) ?? null;
      const handicap = applicableHandicap(eventHandicap, member, numholes);
      const adjustedScore = computeAdjustedScore(holes, nine, handicap, numholes);
      const totalPar = totalParForNine(nine, numholes);
      const hdiff = computeHdiff(adjustedScore, totalPar, numholes);
      const net = gross != null && handicap != null ? gross - handicap : null;

      updates.push({
        card_id: Number(card.card_id),
        gross,
        net,
        adjustedScore,
        handicap,
        hdiff,
        numholes,
      });
    }

    if (!dryRun) await conn.beginTransaction();
    for (const row of updates) {
      if (!dryRun) {
        await conn.execute(
          `
            UPDATE eventCard
            SET gross = ?,
                net = ?,
                adjustedscore = ?,
                handicap = ?,
                hdiff = ?,
                numholes = ?
            WHERE card_id = ? AND event_id = ?
          `,
          [row.gross, row.net, row.adjustedScore, row.handicap, row.hdiff, row.numholes, row.card_id, eventId]
        );
      }
    }
    if (!dryRun) await conn.commit();

    console.log(`${dryRun ? "Dry run" : "Updated"} ${updates.length} card(s) for event ${eventId}.`);
    for (const row of updates.slice(0, 10)) {
      console.log(
        `card ${row.card_id}: gross=${row.gross ?? "null"} net=${row.net ?? "null"} adjusted=${row.adjustedScore ?? "null"} hdiff=${row.hdiff ?? "null"}`
      );
    }
    if (updates.length > 10) {
      console.log(`... ${updates.length - 10} more card(s)`);
    }
  } catch (err) {
    if (!dryRun) {
      try {
        await conn.rollback();
      } catch (_rollbackErr) {
        // ignore rollback failures
      }
    }
    throw err;
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Failed to recalculate event card scores:", err.message || err);
  process.exit(1);
});
