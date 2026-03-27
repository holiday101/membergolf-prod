import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import { z } from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomUUID, randomBytes, createHash } from "crypto";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import path from "path";
import fs from "fs";
import { eventsRouter } from "./routes/events.routes";
import { presignGet, presignPut, deleteObject } from "./s3";



dotenv.config();

const app = express();
const configuredOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = new Set(
  configuredOrigins.flatMap((origin) => {
    try {
      const url = new URL(origin);
      if (url.hostname.startsWith("www.")) {
        return [origin, `${url.protocol}//${url.hostname.slice(4)}${url.port ? `:${url.port}` : ""}`];
      }
      return [origin, `${url.protocol}//www.${url.hostname}${url.port ? `:${url.port}` : ""}`];
    } catch {
      return [origin];
    }
  })
);
const corsMiddleware = cors({
  origin(origin, callback) {
    // Allow non-browser requests and configured browser origins.
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
});

app.use(corsMiddleware);
app.use(express.json());
app.use("/api/events", eventsRouter);

app.get("/api/public/:courseId/events", async (req, res) => {
  try {
    const courseId = Number(req.params.courseId);
    if (!Number.isFinite(courseId)) return res.status(400).json({ error: "Invalid course" });
    const start = String(req.query.start ?? "");
    const end = String(req.query.end ?? "");
    if (!start || !end) return res.status(400).json({ error: "Missing start/end" });

    const [rows] = await pool.query<any[]>(
      `
      SELECT
        event_id AS id,
        eventMain.course_id,
        eventname,
        eventdescription,
        start_dt,
        end_dt,
        handicap_yn,
        eventMain.nine_id,
        n.ninename,
        n.numholes,
        n.startinghole,
        NULL AS user_id
      FROM eventMain
      LEFT JOIN courseNine n ON n.nine_id = eventMain.nine_id
      WHERE eventMain.course_id = ?
        AND start_dt <= ?
        AND end_dt >= ?
      ORDER BY start_dt ASC, event_id ASC
      `,
      [courseId, end, start]
    );
    res.json(rows);
  } catch (err) {
    console.error("public events error", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/public/:courseId/events/:eventId", async (req, res) => {
  try {
    const courseId = Number(req.params.courseId);
    const eventId = Number(req.params.eventId);
    if (!Number.isFinite(courseId) || !Number.isFinite(eventId)) {
      return res.status(400).json({ error: "Invalid event" });
    }
    const [rows] = await pool.query<any[]>(
      `
      SELECT
        event_id AS id,
        eventMain.course_id,
        eventname,
        eventdescription,
        start_dt,
        end_dt,
        handicap_yn,
        eventMain.nine_id,
        n.ninename
      FROM eventMain
      LEFT JOIN courseNine n ON n.nine_id = eventMain.nine_id
      WHERE eventMain.course_id = ? AND eventMain.event_id = ?
      LIMIT 1
      `,
      [courseId, eventId]
    );
    const event = rows?.[0];
    if (!event) return res.status(404).json({ error: "Not found" });
    res.json(event);
  } catch (err) {
    console.error("public event detail error", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/public/:courseId/events/:eventId/files", async (req, res) => {
  try {
    const courseId = Number(req.params.courseId);
    const eventId = Number(req.params.eventId);
    if (!Number.isFinite(courseId) || !Number.isFinite(eventId)) {
      return res.status(400).json({ error: "Invalid event" });
    }
    const [events] = await pool.query<any[]>(
      "SELECT event_id, course_id FROM eventMain WHERE event_id = ? LIMIT 1",
      [eventId]
    );
    const ev = events?.[0];
    if (!ev || ev.course_id !== courseId) return res.status(404).json({ error: "Not found" });

    const [rows] = await pool.query<any[]>(
      `
      SELECT eventfile_id, event_id, file_key, filename, content_type, size_bytes, uploaded_at
      FROM eventFile
      WHERE event_id = ?
      ORDER BY uploaded_at DESC, eventfile_id DESC
      `,
      [eventId]
    );

    const withUrls = await Promise.all(
      rows.map(async (row) => ({
        ...row,
        url: await presignGet(row.file_key),
      }))
    );
    res.json(withUrls);
  } catch (err) {
    console.error("public event files error", err);
    res.status(500).json({ error: "Server error" });
  }
});


app.get("/api/public/:courseId/events/:eventId/winnings", async (req, res) => {
  try {
    const courseId = Number(req.params.courseId);
    const eventId = Number(req.params.eventId);
    if (!Number.isFinite(courseId) || !Number.isFinite(eventId)) {
      return res.status(400).json({ error: "Invalid event" });
    }

    const [rows] = await pool.query<any[]>(
      `
      SELECT
        w.moneylist_id,
        w.member_id,
        m.firstname,
        m.lastname,
        w.amount,
        w.flight_id,
        f.flightname AS flight_name,
        w.place,
        w.description,
        w.payout_type,
        CASE
          WHEN w.payout_type = 'GROSS' THEN spg.score
          WHEN w.payout_type = 'NET'   THEN spn.score
          WHEN w.payout_type IN ('SKINS','SKIN','POWER_SKIN') THEN es.score
          ELSE NULL
        END AS score,
        CASE
          WHEN w.payout_type = 'GROSS' THEN spg.card_id
          WHEN w.payout_type = 'NET'   THEN spn.card_id
          WHEN w.payout_type IN ('SKINS','SKIN','POWER_SKIN') THEN es.card_id
          ELSE NULL
        END AS card_id
      FROM (
        SELECT
          ml.moneylist_id,
          ml.member_id,
          ml.amount,
          ml.flight_id,
          ml.place,
          ml.description,
          ml.payout_type,
          ml.subevent_id,
          ml.source_table,
          ml.source_id
        FROM eventMoneyList ml
        LEFT JOIN subEventMain se ON se.subevent_id = ml.subevent_id
        WHERE (ml.event_id = ? OR se.event_id = ?)
          AND ml.amount <> 0

        UNION ALL

        SELECT
          op.eventotherpay_id AS moneylist_id,
          op.member_id,
          op.amount,
          NULL AS flight_id,
          NULL AS place,
          op.description,
          'OTHER' AS payout_type,
          NULL AS subevent_id,
          NULL AS source_table,
          NULL AS source_id
        FROM eventOtherPay op
        WHERE op.event_id = ?
          AND op.amount <> 0
      ) w
      JOIN memberMain m ON m.member_id = w.member_id
      LEFT JOIN rosterFlight f ON f.flight_id = w.flight_id
      LEFT JOIN subEventPayGross spg ON w.payout_type = 'GROSS'
        AND w.source_table = 'subEventPayGross'
        AND spg.gross_id = w.source_id
      LEFT JOIN subEventPayNet spn ON w.payout_type = 'NET'
        AND w.source_table = 'subEventPayNet'
        AND spn.net_id = w.source_id
      LEFT JOIN eventSkin es ON w.payout_type IN ('SKINS','SKIN','POWER_SKIN')
        AND w.source_table = 'eventSkin'
        AND es.eventskin_id = w.source_id
      WHERE m.course_id = ?
      ORDER BY
        (w.flight_id IS NULL),
        w.flight_id,
        CASE WHEN w.payout_type IN ('GROSS','NET') THEN 0 ELSE 1 END,
        FIELD(w.payout_type, 'GROSS', 'NET', 'SKIN', 'POWER_SKIN', 'BB_GROSS', 'BB_NET', 'CHICAGO', 'OTHER'),
        w.amount DESC
      `,
      [eventId, eventId, eventId, courseId]
    );

    res.json(rows);
  } catch (err) {
    console.error("public event winnings error", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/public/:courseId/events/:eventId/scores", async (req, res) => {
  try {
    const courseId = Number(req.params.courseId);
    const eventId = Number(req.params.eventId);
    if (!Number.isFinite(courseId) || !Number.isFinite(eventId)) {
      return res.status(400).json({ error: "Invalid event" });
    }

    const [rows] = await pool.query<any[]>(
      `
      SELECT
        c.card_id,
        c.member_id,
        c.nine_id,
        m.firstname,
        m.lastname,
        c.card_dt,
        c.gross,
        c.net,
        c.adjustedscore,
        c.handicap,
        rf.flight_id,
        rf.flightname,
        c.numholes,
        n.startinghole,
        c.hole1, c.hole2, c.hole3, c.hole4, c.hole5, c.hole6, c.hole7, c.hole8, c.hole9,
        c.hole10, c.hole11, c.hole12, c.hole13, c.hole14, c.hole15, c.hole16, c.hole17, c.hole18,
        n.hole1 AS par1, n.hole2 AS par2, n.hole3 AS par3, n.hole4 AS par4, n.hole5 AS par5,
        n.hole6 AS par6, n.hole7 AS par7, n.hole8 AS par8, n.hole9 AS par9,
        n.hole10 AS par10, n.hole11 AS par11, n.hole12 AS par12, n.hole13 AS par13, n.hole14 AS par14,
        n.hole15 AS par15, n.hole16 AS par16, n.hole17 AS par17, n.hole18 AS par18
      FROM eventCard c
      JOIN memberMain m ON m.member_id = c.member_id
      LEFT JOIN (
        SELECT se.event_id, se.roster_id
        FROM subEventMain se
        JOIN subEventType st ON st.eventtype_id = se.eventtype_id
        WHERE se.event_id = ? AND LOWER(COALESCE(st.eventtypename, '')) LIKE '%skin%'
        ORDER BY se.subevent_id ASC
        LIMIT 1
      ) sx ON sx.event_id = c.event_id
      LEFT JOIN rosterFlight rf ON rf.roster_id = sx.roster_id AND c.handicap BETWEEN rf.hdcp1 AND rf.hdcp2
      LEFT JOIN courseNine n ON n.nine_id = c.nine_id
      WHERE c.course_id = ? AND c.event_id = ?
      ORDER BY (rf.flightname IS NULL), rf.flightname ASC, c.gross ASC, c.net ASC, c.card_dt ASC, c.card_id ASC
      `,
      [eventId, courseId, eventId]
    );

    res.json(rows);
  } catch (err) {
    console.error("public event scores error", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/public/:courseId/events/:eventId/scores/exists", async (req, res) => {
  try {
    const courseId = Number(req.params.courseId);
    const eventId = Number(req.params.eventId);
    if (!Number.isFinite(courseId) || !Number.isFinite(eventId)) {
      return res.status(400).json({ error: "Invalid event" });
    }

    const [rows] = await pool.query<any[]>(
      "SELECT COUNT(*) AS count FROM eventCard WHERE course_id = ? AND event_id = ?",
      [courseId, eventId]
    );

    res.json({ count: rows?.[0]?.count ?? 0 });
  } catch (err) {
    console.error("public event scores exists error", err);
    res.status(500).json({ error: "Server error" });
  }
});


app.get("/api/public/:courseId/members", async (req, res) => {
  try {
    const courseId = Number(req.params.courseId);
    if (!Number.isFinite(courseId)) return res.status(400).json({ error: "Invalid course" });
    const [rows] = await pool.query<any[]>(
      "SELECT member_id, firstname, lastname, rhandicap AS handicap FROM memberMain WHERE course_id = ? ORDER BY lastname ASC, firstname ASC",
      [courseId]
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});


app.get("/api/public/:courseId/moneylist", async (req, res) => {
  try {
    const courseId = Number(req.params.courseId);
    if (!Number.isFinite(courseId)) return res.status(400).json({ error: "Invalid course" });
    const yearParam = req.query.year;
    const year =
      yearParam === undefined || yearParam === null || yearParam === "" || yearParam === "all"
        ? null
        : Number(yearParam);
    if (year !== null && !Number.isFinite(year)) {
      return res.status(400).json({ error: "Invalid year" });
    }

    const [rows] = await pool.query<any[]>(
      `
      SELECT
        m.member_id,
        m.firstname,
        m.lastname,
        SUM(ml.amount) AS total_amount
      FROM eventMoneyList ml
      JOIN memberMain m ON m.member_id = ml.member_id
      LEFT JOIN eventMain e ON e.event_id = ml.event_id
      LEFT JOIN subEventMain se ON se.subevent_id = ml.subevent_id
      LEFT JOIN eventMain e2 ON e2.event_id = se.event_id
      WHERE m.course_id = ?
        AND ml.amount <> 0
        AND (
          ? IS NULL
          OR YEAR(ml.payout_date) = ?
        )
      GROUP BY m.member_id, m.firstname, m.lastname
      ORDER BY total_amount DESC, lastname ASC, firstname ASC
      `,
      [courseId, year, year]
    );

    res.json(
      rows.map((row) => ({
        ...row,
        total_amount: row.total_amount !== null ? Number(row.total_amount) : 0,
      }))
    );
  } catch (err) {
    console.error("public money list error", err);
    res.status(500).json({ error: "Server error" });
  }
});


app.get("/api/public/:courseId/moneylist/years", async (req, res) => {
  try {
    const courseId = Number(req.params.courseId);
    if (!Number.isFinite(courseId)) return res.status(400).json({ error: "Invalid course" });

    const [rows] = await pool.query<any[]>(
      `
      SELECT DISTINCT
        YEAR(ml.payout_date) AS year
      FROM eventMoneyList ml
      JOIN memberMain m ON m.member_id = ml.member_id
      LEFT JOIN eventMain e ON e.event_id = ml.event_id
      LEFT JOIN subEventMain se ON se.subevent_id = ml.subevent_id
      LEFT JOIN eventMain e2 ON e2.event_id = se.event_id
      WHERE m.course_id = ?
        AND ml.amount <> 0
        AND YEAR(ml.payout_date) IS NOT NULL
      ORDER BY year DESC
      `,
      [courseId]
    );

    res.json(rows.map((r) => r.year).filter((y: any) => y));
  } catch (err) {
    console.error("public money list years error", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/public/:courseId/course", async (req, res) => {
  try {
    const courseId = Number(req.params.courseId);
    if (!Number.isFinite(courseId)) return res.status(400).json({ error: "Invalid course" });
    const [rows] = await pool.query<any[]>(
      "SELECT course_id, coursename, leagueinfo, logo, titlesponsor, website, titlesponsor_link, decimalhandicap_yn, autoflight_yn FROM courseMain WHERE course_id = ? LIMIT 1",
      [courseId]
    );
    const course = rows?.[0];
    if (!course) return res.status(404).json({ error: "Not found" });

    // Keep public course metadata available even if an S3 asset fails to sign.
    let logo_url: string | null = null;
    let titlesponsor_url: string | null = null;
    try {
      logo_url = course.logo ? await presignGet(course.logo) : null;
    } catch (err) {
      console.error("public course logo presign error", { courseId, logo: course.logo, err });
    }
    try {
      titlesponsor_url = course.titlesponsor ? await presignGet(course.titlesponsor) : null;
    } catch (err) {
      console.error("public course sponsor presign error", {
        courseId,
        titlesponsor: course.titlesponsor,
        err,
      });
    }

    res.json({ ...course, logo_url, titlesponsor_url });
  } catch (err) {
    console.error("public course error", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/course", authMiddleware, async (req, res) => {
  try {
    const payload = (req as any).user as JwtPayload;
    if (!payload?.courseId) return res.status(403).json({ error: "Forbidden" });
    const [rows] = await pool.query<any[]>(
      "SELECT course_id, coursename, decimalhandicap_yn, autoflight_yn FROM courseMain WHERE course_id = ? LIMIT 1",
      [payload.courseId]
    );
    const course = rows?.[0];
    if (!course) return res.status(404).json({ error: "Not found" });
    res.json(course);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/public/:courseId/members/:memberId/winnings", async (req, res) => {
  try {
    const courseId = Number(req.params.courseId);
    const memberId = Number(req.params.memberId);
    if (!Number.isFinite(courseId) || !Number.isFinite(memberId)) {
      return res.status(400).json({ error: "Invalid params" });
    }
    const yearParam = req.query.year;
    const year =
      yearParam === undefined || yearParam === null || yearParam === "" || yearParam === "all"
        ? null
        : Number(yearParam);
    if (year !== null && !Number.isFinite(year)) {
      return res.status(400).json({ error: "Invalid year" });
    }

    const [rows] = await pool.query<any[]>(
      `
      SELECT
        ml.moneylist_id,
        ml.amount,
        ml.payout_date,
        ml.payout_type,
        ml.place,
        ml.description,
        COALESCE(e.eventname, e2.eventname) AS eventname
      FROM eventMoneyList ml
      JOIN memberMain m ON m.member_id = ml.member_id
      LEFT JOIN eventMain e ON e.event_id = ml.event_id
      LEFT JOIN subEventMain se ON se.subevent_id = ml.subevent_id
      LEFT JOIN eventMain e2 ON e2.event_id = se.event_id
      WHERE ml.member_id = ?
        AND m.course_id = ?
        AND ml.amount <> 0
        AND (? IS NULL OR YEAR(ml.payout_date) = ?)
      ORDER BY ml.payout_date ASC, ml.moneylist_id ASC
      `,
      [memberId, courseId, year, year]
    );

    res.json(
      rows.map((row) => ({
        ...row,
        amount: row.amount !== null ? Number(row.amount) : 0,
      }))
    );
  } catch (err) {
    console.error("member winnings error", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/public/:courseId/members/:memberId", async (req, res) => {
  try {
    const courseId = Number(req.params.courseId);
    const memberId = Number(req.params.memberId);
    if (!Number.isFinite(courseId) || !Number.isFinite(memberId)) {
      return res.status(400).json({ error: "Invalid member" });
    }

    const [members] = await pool.query<any[]>(
      "SELECT member_id, firstname, lastname, rhandicap AS handicap, handicap18 FROM memberMain WHERE course_id = ? AND member_id = ? LIMIT 1",
      [courseId, memberId]
    );
    const member = members?.[0];
    if (!member) return res.status(404).json({ error: "Not found" });

    const [nineRows] = await pool.query<any[]>(
      `
        SELECT DISTINCT n.nine_id, n.ninename, n.numholes, n.startinghole,
               n.hole1, n.hole2, n.hole3, n.hole4, n.hole5, n.hole6, n.hole7, n.hole8, n.hole9,
               n.hole10, n.hole11, n.hole12, n.hole13, n.hole14, n.hole15, n.hole16, n.hole17, n.hole18
        FROM eventCard c
        LEFT JOIN courseNine n ON n.nine_id = c.nine_id
        WHERE c.course_id = ? AND c.member_id = ?
        ORDER BY n.ninename ASC
      `,
      [courseId, memberId]
    );

    const [courseRows] = await pool.query<any[]>(
      "SELECT cardsmax, cardsused FROM courseMain WHERE course_id = ? LIMIT 1",
      [courseId]
    );
    const cardsmax = Number(courseRows?.[0]?.cardsmax ?? 0);
    const cardsused = Number(courseRows?.[0]?.cardsused ?? 0);

    const [eligibleCountRows] = await pool.query<any[]>(
      `
        SELECT COUNT(*) AS total
        FROM eventCard c
        JOIN eventMain e ON e.event_id = c.event_id
        WHERE c.course_id = ? AND c.member_id = ?
          AND e.handicap_yn = 1
          AND c.card_dt < NOW()
      `,
      [courseId, memberId]
    );
    const totalScores = Number(eligibleCountRows?.[0]?.total ?? 0);

    const capCardsMax = Math.max(cardsmax, 0);
    const capCardsUsed = Math.max(cardsused, 0);
    let usedBase = 0;
    if (totalScores >= capCardsMax && capCardsMax > 0) {
      usedBase = capCardsUsed - 1;
    } else if (totalScores <= 3) usedBase = 0;
    else if (totalScores <= 5) usedBase = 1;
    else if (totalScores <= 7) usedBase = 2;
    else if (totalScores <= 9) usedBase = 3;
    else if (totalScores <= 11) usedBase = 4;
    else if (totalScores <= 13) usedBase = 5;
    else if (totalScores <= 15) usedBase = 6;
    else if (totalScores <= 17) usedBase = 7;
    else if (totalScores <= 19) usedBase = 8;
    else usedBase = 9;

    const usedCount = totalScores > 0 ? Math.max(0, usedBase + 1) : 0;

    const [recentEligibleRounds] = await pool.query<any[]>(
      `
        SELECT
          c.card_id,
          c.event_id,
          c.card_dt,
          c.numholes,
          c.gross,
          c.net,
          c.hdiff,
          e.eventname
        FROM eventCard c
        JOIN eventMain e ON e.event_id = c.event_id
        WHERE c.course_id = ? AND c.member_id = ?
          AND e.handicap_yn = 1
          AND c.card_dt < NOW()
        ORDER BY c.card_dt DESC, c.card_id DESC
        LIMIT ?
      `,
      [courseId, memberId, capCardsMax > 0 ? capCardsMax : 0]
    );

    const usedCardIds = new Set<number>(
      [...recentEligibleRounds]
        .filter((r) => typeof r.hdiff === "number")
        .sort((a, b) => {
          if (a.hdiff !== b.hdiff) return a.hdiff - b.hdiff;
          if (a.card_dt !== b.card_dt) return String(b.card_dt).localeCompare(String(a.card_dt));
          return (b.card_id ?? 0) - (a.card_id ?? 0);
        })
        .slice(0, usedCount)
        .map((r) => Number(r.card_id))
    );
    const usedHdiffSum = [...recentEligibleRounds]
      .filter((r) => usedCardIds.has(Number(r.card_id)) && typeof r.hdiff === "number")
      .reduce((sum, r) => sum + Number(r.hdiff), 0);

    const roundsSql = `
      SELECT
        c.card_id,
        c.event_id,
        c.card_dt,
        c.gross,
        c.net,
        c.adjustedscore,
        c.numholes,
        e.eventname,
        c.hole1, c.hole2, c.hole3, c.hole4, c.hole5, c.hole6, c.hole7, c.hole8, c.hole9,
        c.hole10, c.hole11, c.hole12, c.hole13, c.hole14, c.hole15, c.hole16, c.hole17, c.hole18
      FROM eventCard c
      LEFT JOIN eventMain e ON e.event_id = c.event_id
      WHERE c.course_id = ? AND c.member_id = ? AND c.nine_id = ?
      ORDER BY c.card_dt DESC, c.card_id DESC
      LIMIT 10
    `;

    const groups: Array<{
      nine_id: number;
      ninename: string | null;
      numholes: number | null;
      startinghole: number | null;
      rounds: any[];
    }> = [];
    for (const nine of nineRows) {
      if (!nine?.nine_id) continue;
      const [rounds] = await pool.query<any[]>(roundsSql, [courseId, memberId, nine.nine_id]);
      groups.push({
        nine_id: nine.nine_id,
        ninename: nine.ninename ?? null,
        numholes: nine.numholes ?? null,
        startinghole: nine.startinghole ?? null,
        hole1: nine.hole1 ?? null,
        hole2: nine.hole2 ?? null,
        hole3: nine.hole3 ?? null,
        hole4: nine.hole4 ?? null,
        hole5: nine.hole5 ?? null,
        hole6: nine.hole6 ?? null,
        hole7: nine.hole7 ?? null,
        hole8: nine.hole8 ?? null,
        hole9: nine.hole9 ?? null,
        hole10: nine.hole10 ?? null,
        hole11: nine.hole11 ?? null,
        hole12: nine.hole12 ?? null,
        hole13: nine.hole13 ?? null,
        hole14: nine.hole14 ?? null,
        hole15: nine.hole15 ?? null,
        hole16: nine.hole16 ?? null,
        hole17: nine.hole17 ?? null,
        hole18: nine.hole18 ?? null,
        rounds,
      });
    }

    res.json({
      member,
      groups,
      handicap_calculation: {
        cardsmax: capCardsMax,
        cardsused: capCardsUsed,
        total_scores: totalScores,
        used_count: usedCount,
        used_hdiff_sum: Number(usedHdiffSum.toFixed(4)),
        rounds: recentEligibleRounds.map((r) => ({
          ...r,
          used_in_calc: usedCardIds.has(Number(r.card_id)),
        })),
      },
    });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/public/lead", async (req, res) => {
  try {
    const schema = z.object({
      name: z.string().min(1).max(120),
      course: z.string().min(1).max(120),
      email: z.string().email().max(255),
      phone: z.string().min(1).max(50),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.flatten());

    await sendLeadEmail(parsed.data);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? "Failed to send" });
  }
});

const pool = mysql.createPool({
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "appuser",
  password: process.env.DB_PASSWORD ?? "apppass",
  database: process.env.DB_NAME ?? "appdb",
  waitForConnections: true,
  connectionLimit: 10,
});

const sesRegion = process.env.SES_REGION;
const sesFromEmail = process.env.SES_FROM_EMAIL;
const sesConfigSet = process.env.SES_CONFIGURATION_SET;

const sesClient = sesRegion
  ? new SESClient({ region: sesRegion })
  : null;

async function findMemberIdByEmail(courseId: number | null | undefined, email: string) {
  if (!courseId) return null;
  const [rows] = await pool.query<any[]>(
    "SELECT member_id FROM memberMain WHERE course_id = ? AND email = ? LIMIT 1",
    [courseId, email]
  );
  return rows?.[0]?.member_id ?? null;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function sendInviteEmail({
  to,
  inviteUrl,
  courseName,
}: {
  to: string;
  inviteUrl: string;
  courseName: string;
}) {
  if (!sesClient) throw new Error("SES_REGION not configured");
  if (!sesFromEmail) throw new Error("SES_FROM_EMAIL not configured");

  const subject = `You're invited to ${courseName}`;
  const text = `You have been invited to ${courseName} on MemberGolf.\n\nOpen this link to create your account:\n${inviteUrl}\n\nThis link expires in 7 days.`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.4;">
      <h2>You're invited to ${courseName}</h2>
      <p>You have been invited to ${courseName} on MemberGolf.</p>
      <p><a href="${inviteUrl}">Create your account</a></p>
      <p>This link expires in 7 days.</p>
    </div>
  `;

  const command = new SendEmailCommand({
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject },
      Body: {
        Text: { Data: text },
        Html: { Data: html },
      },
    },
    Source: sesFromEmail,
    ConfigurationSetName: sesConfigSet || undefined,
  });

  await sesClient.send(command);
}

async function sendLeadEmail({
  name,
  course,
  email,
  phone,
}: {
  name: string;
  course: string;
  email: string;
  phone: string;
}) {
  if (!sesClient) throw new Error("SES_REGION not configured");
  if (!sesFromEmail) throw new Error("SES_FROM_EMAIL not configured");

  const subject = `New MemberGolf inquiry: ${course}`;
  const text = `New inquiry\n\nName: ${name}\nCourse: ${course}\nEmail: ${email}\nPhone: ${phone}\n`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.4;">
      <h2>New MemberGolf inquiry</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Course:</strong> ${course}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone}</p>
    </div>
  `;

  const command = new SendEmailCommand({
    Destination: { ToAddresses: [ADMIN_EMAIL] },
    Message: {
      Subject: { Data: subject },
      Body: {
        Text: { Data: text },
        Html: { Data: html },
      },
    },
    ReplyToAddresses: [email],
    Source: sesFromEmail,
    ConfigurationSetName: sesConfigSet || undefined,
  });

  await sesClient.send(command);
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

const JWT_SECRET = requireEnv("JWT_SECRET");
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "7d";
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "jaredholland101@gmail.com").toLowerCase();

type JwtPayload = {
  userId: number;
  email: string;
  courseId?: number | null;
  memberId?: number | null;
  isAdmin?: boolean;
  adminYn?: number | null;
  globalYn?: number | null;
};

function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const header = req.header("Authorization");
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "Missing token" });

  const token = header.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    (req as any).user = payload; // simple attach
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function isAdmin(payload: JwtPayload | undefined): boolean {
  if (!payload?.email) return false;
  return (
    payload.email.toLowerCase() === ADMIN_EMAIL ||
    payload.isAdmin === true ||
    payload.adminYn === 1
  );
}

function isGlobal(payload: JwtPayload | undefined): boolean {
  if (payload?.globalYn === 1) return true;
  return payload?.courseId == null;
}

async function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = (req as any).user as JwtPayload | undefined;
  if (isAdmin(user)) return next();
  if (!user?.userId) return res.status(403).json({ error: "Forbidden" });

  try {
    const [rows] = await pool.query<any[]>(
      "SELECT admin_yn, global_yn, email FROM users WHERE id=? LIMIT 1",
      [user.userId]
    );
    const row = rows?.[0];
    if (!row) return res.status(403).json({ error: "Forbidden" });
    user.adminYn = row.admin_yn ?? 0;
    user.globalYn = row.global_yn ?? 0;
    user.email = row.email ?? user.email;
    if (isAdmin(user)) return next();
  } catch {
    return res.status(500).json({ error: "Server error" });
  }

  return res.status(403).json({ error: "Forbidden" });
}

app.get("/health", async (_req, res) => {
  const [rows] = await pool.query("SELECT 1 as ok");
  res.json({ ok: true, rows });
});

app.get("/items", async (_req, res) => {
  const [rows] = await pool.query("SELECT id, name, created_at FROM items ORDER BY id DESC");
  res.json(rows);
});

app.post("/items", async (req, res) => {
  const schema = z.object({ name: z.string().min(1).max(255) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const [result] = await pool.execute<mysql.ResultSetHeader>(
    "INSERT INTO items (name) VALUES (?)",
    [parsed.data.name]
  );

  res.status(201).json({ id: result.insertId, name: parsed.data.name });
});

// Update item
app.put("/items/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  const schema = z.object({ name: z.string().min(1).max(255) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const [result] = await pool.execute<mysql.ResultSetHeader>(
    "UPDATE items SET name=? WHERE id=?",
    [parsed.data.name, id]
  );

  if (result.affectedRows === 0) return res.status(404).json({ error: "Not found" });
  res.json({ id, name: parsed.data.name });
});

// Delete item
app.delete("/items/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  const [result] = await pool.execute<mysql.ResultSetHeader>(
    "DELETE FROM items WHERE id=?",
    [id]
  );

  if (result.affectedRows === 0) return res.status(404).json({ error: "Not found" });
  res.status(204).send();
});

app.post("/auth/register", async (req, res) => {
  const schema = z.object({
    email: z.string().email().max(255),
    password: z.string().min(8).max(72),
    first_name: z.string().max(100).optional().nullable(),
    last_name: z.string().max(100).optional().nullable(),
    course_id: z.number().int().positive(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const email = parsed.data.email.toLowerCase().trim();
  const courseId = parsed.data.course_id;

  const memberId = await findMemberIdByEmail(courseId, email);
  if (!memberId) {
    return res.status(400).json({ error: "Email not found for this course" });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  try {
    const [result] = await pool.execute<mysql.ResultSetHeader>(
      "INSERT INTO users (email, password_hash, first_name, last_name, course_id) VALUES (?, ?, ?, ?, ?)",
      [
        email,
        passwordHash,
        parsed.data.first_name ?? null,
        parsed.data.last_name ?? null,
        courseId,
      ]
    );

    const token = jwt.sign(
      {
        userId: result.insertId,
        email,
        courseId,
          isAdmin: false,
        adminYn: 0,
        globalYn: 0,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      token,
      user: {
        id: result.insertId,
        email,
        firstName: parsed.data.first_name ?? null,
        lastName: parsed.data.last_name ?? null,
        courseId,
          isAdmin: false,
        adminYn: 0,
        globalYn: 0,
      },
    });
  } catch (err: any) {
    if (String(err?.code) === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Email already registered" });
    }
    return res.status(500).json({ error: "Server error" });
  }
});

app.post("/auth/invite", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const schema = z.object({
      email: z.string().email().max(255),
      course_id: z.number().int().positive().optional().nullable(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.flatten());

    const email = parsed.data.email.toLowerCase().trim();
    const courseId = isGlobal(payload) ? parsed.data.course_id ?? null : payload.courseId ?? null;
    if (!courseId) return res.status(400).json({ error: "Missing course_id" });

    const memberId = await findMemberIdByEmail(courseId, email);
    if (!memberId) return res.status(404).json({ error: "Member email not found" });

    const token = randomBytes(32).toString("base64url");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await pool.execute(
      `INSERT INTO memberInvite (course_id, member_id, email, token_hash, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
      [courseId, memberId, email, tokenHash, expiresAt]
    );

    const baseUrl = process.env.INVITE_BASE_URL ?? "membergolf://invite";
    const inviteUrl = `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}token=${token}`;

    const [courseRows] = await pool.query<any[]>(
      "SELECT coursename FROM courseMain WHERE course_id = ? LIMIT 1",
      [courseId]
    );
    const courseName = courseRows?.[0]?.coursename ?? "your course";

    await sendInviteEmail({ to: email, inviteUrl, courseName });

    res.status(201).json({ token, inviteUrl, expiresAt });
  } catch (err) {
    console.error("invite create error", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/auth/invite/accept", async (req, res) => {
  const schema = z.object({
    token: z.string().min(10),
    password: z.string().min(8).max(72),
    first_name: z.string().max(100).optional().nullable(),
    last_name: z.string().max(100).optional().nullable(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const tokenHash = hashToken(parsed.data.token);

  const [invites] = await pool.query<any[]>(
    `SELECT invite_id, course_id, member_id, email, expires_at, used_at
     FROM memberInvite
     WHERE token_hash = ?
     LIMIT 1`,
    [tokenHash]
  );
  const invite = invites?.[0];
  if (!invite) return res.status(400).json({ error: "Invalid invite" });
  if (invite.used_at) return res.status(400).json({ error: "Invite already used" });
  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
    return res.status(400).json({ error: "Invite expired" });
  }

  const [existing] = await pool.query<any[]>(
    "SELECT id FROM users WHERE email = ? LIMIT 1",
    [invite.email]
  );
  if (existing.length) return res.status(409).json({ error: "Email already registered" });

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const [result] = await pool.execute<mysql.ResultSetHeader>(
    "INSERT INTO users (email, password_hash, first_name, last_name, course_id) VALUES (?, ?, ?, ?, ?)",
    [
      invite.email,
      passwordHash,
      parsed.data.first_name ?? null,
      parsed.data.last_name ?? null,
      invite.course_id,
    ]
  );

  await pool.execute("UPDATE memberInvite SET used_at = NOW() WHERE invite_id = ?", [invite.invite_id]);

  const token = jwt.sign(
    {
      userId: result.insertId,
      email: invite.email,
      courseId: invite.course_id,
      memberId: invite.member_id,
      isAdmin: false,
      adminYn: 0,
      globalYn: 0,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  res.status(201).json({
    token,
    user: {
      id: result.insertId,
      email: invite.email,
      firstName: parsed.data.first_name ?? null,
      lastName: parsed.data.last_name ?? null,
      courseId: invite.course_id,
      memberId: invite.member_id,
      isAdmin: false,
      adminYn: 0,
      globalYn: 0,
    },
  });
});

app.post("/auth/login", async (req, res) => {
  const schema = z.object({
    email: z.string().email().max(255),
    password: z.string().min(1).max(72),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const email = parsed.data.email.toLowerCase().trim();

  const [rows] = await pool.query<any[]>(
    "SELECT id, email, password_hash, first_name, last_name, course_id, admin_yn, global_yn FROM users WHERE email=? LIMIT 1",
    [email]
  );

  if (!rows.length) return res.status(401).json({ error: "Invalid email or password" });

  const user = rows[0];
  const ok = await bcrypt.compare(parsed.data.password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid email or password" });

  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      courseId: user.course_id ?? null,
      isAdmin: isAdmin({ email: user.email, adminYn: user.admin_yn }),
      adminYn: user.admin_yn ?? 0,
      globalYn: user.global_yn ?? 0,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name ?? null,
      lastName: user.last_name ?? null,
      courseId: user.course_id ?? null,
      isAdmin: isAdmin({ email: user.email, adminYn: user.admin_yn }),
      adminYn: user.admin_yn ?? 0,
      globalYn: user.global_yn ?? 0,
    },
  });
});

app.get("/me", authMiddleware, async (req, res) => {
  const payload = (req as any).user as JwtPayload;
  try {
    const [rows] = await pool.query<any[]>(
      "SELECT id, email, first_name, last_name, course_id, admin_yn, global_yn FROM users WHERE id=? LIMIT 1",
      [payload.userId]
    );
    const row = rows[0];
    if (!row) return res.status(401).json({ error: "Invalid token" });

    res.json({
      user: {
        userId: row.id,
        email: row.email,
        firstName: row.first_name ?? null,
        lastName: row.last_name ?? null,
        courseId: row.course_id ?? null,
          isAdmin: isAdmin({ ...payload, email: row.email, adminYn: row.admin_yn }),
        adminYn: row.admin_yn ?? 0,
        globalYn: row.global_yn ?? 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/nines", authMiddleware, async (req, res) => {
  const payload = (req as any).user as JwtPayload;
  if (!payload?.courseId) return res.status(403).json({ error: "Forbidden" });
  const [rows] = await pool.query<any[]>(
    `SELECT
      nine_id,
      ninename,
      numholes,
      startinghole,
      hole1, hole2, hole3, hole4, hole5, hole6, hole7, hole8, hole9,
      hole10, hole11, hole12, hole13, hole14, hole15, hole16, hole17, hole18
     FROM courseNine
     WHERE course_id = ?
     ORDER BY ninename ASC`,
    [payload.courseId]
  );
  res.json(rows);
});

app.get("/courses/manage", authMiddleware, requireAdmin, async (req, res) => {
  const payload = (req as any).user as JwtPayload;
  const [rows] = await pool.query<any[]>(
    isGlobal(payload)
      ? "SELECT * FROM courseMain ORDER BY coursename ASC"
      : "SELECT * FROM courseMain WHERE course_id = ? LIMIT 1",
    isGlobal(payload) ? [] : [payload.courseId]
  );
  const withUrls = await Promise.all(
    rows.map(async (course) => ({
      ...course,
      logo_url: course.logo ? await presignGet(course.logo) : null,
      titlesponsor_url: course.titlesponsor ? await presignGet(course.titlesponsor) : null,
    }))
  );
  res.json(withUrls);
});

app.get("/courses/manage/:id/nines", authMiddleware, requireAdmin, async (req, res) => {
  const payload = (req as any).user as JwtPayload;
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
  if (!isGlobal(payload) && payload.courseId !== id) return res.status(403).json({ error: "Forbidden" });

  const [rows] = await pool.query<any[]>(
    `
    SELECT
      nine_id,
      course_id,
      ninename,
      numholes,
      startinghole,
      hole1, hole2, hole3, hole4, hole5, hole6, hole7, hole8, hole9,
      hole10, hole11, hole12, hole13, hole14, hole15, hole16, hole17, hole18,
      handicaphole1, handicaphole2, handicaphole3, handicaphole4, handicaphole5,
      handicaphole6, handicaphole7, handicaphole8, handicaphole9,
      handicaphole10, handicaphole11, handicaphole12, handicaphole13, handicaphole14,
      handicaphole15, handicaphole16, handicaphole17, handicaphole18
    FROM courseNine
    WHERE course_id = ?
    ORDER BY ninename ASC, nine_id ASC
    `,
    [id]
  );
  res.json(rows);
});

app.get("/courses/manage/:id/nines/:nineId", authMiddleware, requireAdmin, async (req, res) => {
  const payload = (req as any).user as JwtPayload;
  const id = Number(req.params.id);
  const nineId = Number(req.params.nineId);
  if (!Number.isFinite(id) || !Number.isFinite(nineId)) {
    return res.status(400).json({ error: "Invalid id" });
  }
  if (!isGlobal(payload) && payload.courseId !== id) return res.status(403).json({ error: "Forbidden" });

  const [rows] = await pool.query<any[]>(
    `
    SELECT
      nine_id,
      course_id,
      ninename,
      sloperating,
      courserating,
      numholes,
      startinghole,
      hole1, hole2, hole3, hole4, hole5, hole6, hole7, hole8, hole9,
      hole10, hole11, hole12, hole13, hole14, hole15, hole16, hole17, hole18,
      handicaphole1, handicaphole2, handicaphole3, handicaphole4, handicaphole5,
      handicaphole6, handicaphole7, handicaphole8, handicaphole9,
      handicaphole10, handicaphole11, handicaphole12, handicaphole13, handicaphole14,
      handicaphole15, handicaphole16, handicaphole17, handicaphole18
    FROM courseNine
    WHERE course_id = ? AND nine_id = ?
    LIMIT 1
    `,
    [id, nineId]
  );
  if (!rows.length) return res.status(404).json({ error: "Not found" });
  res.json(rows[0]);
});

app.post("/courses/manage/:id/nines", authMiddleware, requireAdmin, async (req, res) => {
  const payload = (req as any).user as JwtPayload;
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
  if (!isGlobal(payload) && payload.courseId !== id) return res.status(403).json({ error: "Forbidden" });

  const schema = z.object({
    ninename: z.string().min(1).max(100),
    sloperating: z.number().optional().nullable(),
    courserating: z.number().optional().nullable(),
    numholes: z.number().int().min(9).max(18).optional().nullable(),
    startinghole: z.number().int().optional().nullable(),
    hole1: z.number().int().optional().nullable(),
    hole2: z.number().int().optional().nullable(),
    hole3: z.number().int().optional().nullable(),
    hole4: z.number().int().optional().nullable(),
    hole5: z.number().int().optional().nullable(),
    hole6: z.number().int().optional().nullable(),
    hole7: z.number().int().optional().nullable(),
    hole8: z.number().int().optional().nullable(),
    hole9: z.number().int().optional().nullable(),
    hole10: z.number().int().optional().nullable(),
    hole11: z.number().int().optional().nullable(),
    hole12: z.number().int().optional().nullable(),
    hole13: z.number().int().optional().nullable(),
    hole14: z.number().int().optional().nullable(),
    hole15: z.number().int().optional().nullable(),
    hole16: z.number().int().optional().nullable(),
    hole17: z.number().int().optional().nullable(),
    hole18: z.number().int().optional().nullable(),
    handicaphole1: z.number().int().optional().nullable(),
    handicaphole2: z.number().int().optional().nullable(),
    handicaphole3: z.number().int().optional().nullable(),
    handicaphole4: z.number().int().optional().nullable(),
    handicaphole5: z.number().int().optional().nullable(),
    handicaphole6: z.number().int().optional().nullable(),
    handicaphole7: z.number().int().optional().nullable(),
    handicaphole8: z.number().int().optional().nullable(),
    handicaphole9: z.number().int().optional().nullable(),
    handicaphole10: z.number().int().optional().nullable(),
    handicaphole11: z.number().int().optional().nullable(),
    handicaphole12: z.number().int().optional().nullable(),
    handicaphole13: z.number().int().optional().nullable(),
    handicaphole14: z.number().int().optional().nullable(),
    handicaphole15: z.number().int().optional().nullable(),
    handicaphole16: z.number().int().optional().nullable(),
    handicaphole17: z.number().int().optional().nullable(),
    handicaphole18: z.number().int().optional().nullable(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const [result] = await pool.execute<mysql.ResultSetHeader>(
    `
    INSERT INTO courseNine (
      course_id, ninename, sloperating, courserating, numholes, startinghole,
      hole1, hole2, hole3, hole4, hole5, hole6, hole7, hole8, hole9,
      hole10, hole11, hole12, hole13, hole14, hole15, hole16, hole17, hole18,
      handicaphole1, handicaphole2, handicaphole3, handicaphole4, handicaphole5, handicaphole6,
      handicaphole7, handicaphole8, handicaphole9, handicaphole10, handicaphole11, handicaphole12,
      handicaphole13, handicaphole14, handicaphole15, handicaphole16, handicaphole17, handicaphole18
    )
    VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?
    )
    `,
    [
      id,
      parsed.data.ninename.trim(),
      parsed.data.sloperating ?? null,
      parsed.data.courserating ?? null,
      parsed.data.numholes ?? 9,
      parsed.data.startinghole ?? 1,
      parsed.data.hole1 ?? null,
      parsed.data.hole2 ?? null,
      parsed.data.hole3 ?? null,
      parsed.data.hole4 ?? null,
      parsed.data.hole5 ?? null,
      parsed.data.hole6 ?? null,
      parsed.data.hole7 ?? null,
      parsed.data.hole8 ?? null,
      parsed.data.hole9 ?? null,
      parsed.data.hole10 ?? null,
      parsed.data.hole11 ?? null,
      parsed.data.hole12 ?? null,
      parsed.data.hole13 ?? null,
      parsed.data.hole14 ?? null,
      parsed.data.hole15 ?? null,
      parsed.data.hole16 ?? null,
      parsed.data.hole17 ?? null,
      parsed.data.hole18 ?? null,
      parsed.data.handicaphole1 ?? null,
      parsed.data.handicaphole2 ?? null,
      parsed.data.handicaphole3 ?? null,
      parsed.data.handicaphole4 ?? null,
      parsed.data.handicaphole5 ?? null,
      parsed.data.handicaphole6 ?? null,
      parsed.data.handicaphole7 ?? null,
      parsed.data.handicaphole8 ?? null,
      parsed.data.handicaphole9 ?? null,
      parsed.data.handicaphole10 ?? null,
      parsed.data.handicaphole11 ?? null,
      parsed.data.handicaphole12 ?? null,
      parsed.data.handicaphole13 ?? null,
      parsed.data.handicaphole14 ?? null,
      parsed.data.handicaphole15 ?? null,
      parsed.data.handicaphole16 ?? null,
      parsed.data.handicaphole17 ?? null,
      parsed.data.handicaphole18 ?? null,
    ]
  );

  res.status(201).json({ nine_id: result.insertId, course_id: id });
});

app.post("/courses/manage", authMiddleware, requireAdmin, async (req, res) => {
  const payload = (req as any).user as JwtPayload;
  if (!isGlobal(payload)) return res.status(403).json({ error: "Forbidden" });

  const schema = z.object({
    coursename: z.string().min(1).max(200),
    leagueinfo: z.string().max(20000).optional().nullable(),
    website: z.string().max(250).optional().nullable(),
    titlesponsor_link: z.string().max(512).optional().nullable(),
    payout: z.number().optional().nullable(),
    cardsused: z.number().int().optional().nullable(),
    cardsmax: z.number().int().optional().nullable(),
    handicap_yn: z.number().int().optional().nullable(),
    decimalhandicap_yn: z.number().int().optional().nullable(),
    autoflight_yn: z.number().int().optional().nullable(),
    active_yn: z.number().int().optional().nullable(),
    logo: z.string().max(512).optional().nullable(),
    titlesponsor: z.string().max(512).optional().nullable(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const [result] = await pool.execute<mysql.ResultSetHeader>(
    `INSERT INTO courseMain
      (coursename, leagueinfo, website, titlesponsor_link, payout, cardsused, cardsmax, handicap_yn, decimalhandicap_yn, autoflight_yn, active_yn, logo, titlesponsor)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      parsed.data.coursename.trim(),
      parsed.data.leagueinfo ?? null,
      parsed.data.website ?? null,
      parsed.data.titlesponsor_link ?? null,
      parsed.data.payout ?? null,
      parsed.data.cardsused ?? null,
      parsed.data.cardsmax ?? null,
      parsed.data.handicap_yn ?? null,
      parsed.data.decimalhandicap_yn ?? null,
      parsed.data.autoflight_yn ?? 1,
      parsed.data.active_yn ?? 1,
      parsed.data.logo ?? null,
      parsed.data.titlesponsor ?? null,
    ]
  );
  res.status(201).json({ id: result.insertId });
});

app.put("/courses/manage/:id", authMiddleware, requireAdmin, async (req, res) => {
  const payload = (req as any).user as JwtPayload;
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
  if (!isGlobal(payload) && payload.courseId !== id) return res.status(403).json({ error: "Forbidden" });

  const schema = z.object({
    coursename: z.string().min(1).max(200).optional(),
    leagueinfo: z.string().max(20000).optional().nullable(),
    website: z.string().max(250).optional().nullable(),
    titlesponsor_link: z.string().max(512).optional().nullable(),
    payout: z.number().optional().nullable(),
    cardsused: z.number().int().optional().nullable(),
    cardsmax: z.number().int().optional().nullable(),
    handicap_yn: z.number().int().optional().nullable(),
    decimalhandicap_yn: z.number().int().optional().nullable(),
    autoflight_yn: z.number().int().optional().nullable(),
    active_yn: z.number().int().optional().nullable(),
    logo: z.string().max(512).optional().nullable(),
    titlesponsor: z.string().max(512).optional().nullable(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const fields: string[] = [];
  const values: any[] = [];
  for (const key of Object.keys(parsed.data) as Array<keyof typeof parsed.data>) {
    fields.push(`${key}=?`);
    values.push((parsed.data as any)[key]);
  }
  if (!fields.length) return res.status(400).json({ error: "No fields to update" });

  values.push(id);
  const [result] = await pool.execute<mysql.ResultSetHeader>(
    `UPDATE courseMain SET ${fields.join(", ")} WHERE course_id = ?`,
    values
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: "Not found" });
  res.json({ id });
});

app.put("/courses/manage/:id/nines/:nineId", authMiddleware, requireAdmin, async (req, res) => {
  const payload = (req as any).user as JwtPayload;
  const id = Number(req.params.id);
  const nineId = Number(req.params.nineId);
  if (!Number.isFinite(id) || !Number.isFinite(nineId)) {
    return res.status(400).json({ error: "Invalid id" });
  }
  if (!isGlobal(payload) && payload.courseId !== id) return res.status(403).json({ error: "Forbidden" });

  const schema = z.object({
    ninename: z.string().min(1).max(100).optional(),
    sloperating: z.number().optional().nullable(),
    courserating: z.number().optional().nullable(),
    numholes: z.number().int().min(9).max(18).optional(),
    startinghole: z.number().int().optional().nullable(),
    hole1: z.number().int().optional().nullable(),
    hole2: z.number().int().optional().nullable(),
    hole3: z.number().int().optional().nullable(),
    hole4: z.number().int().optional().nullable(),
    hole5: z.number().int().optional().nullable(),
    hole6: z.number().int().optional().nullable(),
    hole7: z.number().int().optional().nullable(),
    hole8: z.number().int().optional().nullable(),
    hole9: z.number().int().optional().nullable(),
    hole10: z.number().int().optional().nullable(),
    hole11: z.number().int().optional().nullable(),
    hole12: z.number().int().optional().nullable(),
    hole13: z.number().int().optional().nullable(),
    hole14: z.number().int().optional().nullable(),
    hole15: z.number().int().optional().nullable(),
    hole16: z.number().int().optional().nullable(),
    hole17: z.number().int().optional().nullable(),
    hole18: z.number().int().optional().nullable(),
    handicaphole1: z.number().int().optional().nullable(),
    handicaphole2: z.number().int().optional().nullable(),
    handicaphole3: z.number().int().optional().nullable(),
    handicaphole4: z.number().int().optional().nullable(),
    handicaphole5: z.number().int().optional().nullable(),
    handicaphole6: z.number().int().optional().nullable(),
    handicaphole7: z.number().int().optional().nullable(),
    handicaphole8: z.number().int().optional().nullable(),
    handicaphole9: z.number().int().optional().nullable(),
    handicaphole10: z.number().int().optional().nullable(),
    handicaphole11: z.number().int().optional().nullable(),
    handicaphole12: z.number().int().optional().nullable(),
    handicaphole13: z.number().int().optional().nullable(),
    handicaphole14: z.number().int().optional().nullable(),
    handicaphole15: z.number().int().optional().nullable(),
    handicaphole16: z.number().int().optional().nullable(),
    handicaphole17: z.number().int().optional().nullable(),
    handicaphole18: z.number().int().optional().nullable(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const fields: string[] = [];
  const values: any[] = [];
  for (const key of Object.keys(parsed.data) as Array<keyof typeof parsed.data>) {
    fields.push(`${key} = ?`);
    values.push((parsed.data as any)[key]);
  }
  if (!fields.length) return res.status(400).json({ error: "No fields to update" });

  values.push(nineId, id);
  const [result] = await pool.execute<mysql.ResultSetHeader>(
    `UPDATE courseNine SET ${fields.join(", ")} WHERE nine_id = ? AND course_id = ?`,
    values
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: "Not found" });
  res.json({ nine_id: nineId, course_id: id });
});

app.delete("/courses/manage/:id/nines/:nineId", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const payload = (req as any).user as JwtPayload;
    if (!isGlobal(payload)) return res.status(403).json({ error: "Forbidden" });

    const id = Number(req.params.id);
    const nineId = Number(req.params.nineId);
    if (!Number.isFinite(id) || !Number.isFinite(nineId)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const [result] = await pool.execute<mysql.ResultSetHeader>(
      "DELETE FROM courseNine WHERE nine_id = ? AND course_id = ?",
      [nineId, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Not found" });
    res.status(204).send();
  } catch (err: any) {
    if (String(err?.code || "").startsWith("ER_ROW_IS_REFERENCED")) {
      return res.status(409).json({
        error: "Nine cannot be deleted because related records exist.",
      });
    }
    console.error("delete nine failed", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/courses/manage/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const payload = (req as any).user as JwtPayload;
    if (!isGlobal(payload)) return res.status(403).json({ error: "Forbidden" });

    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

    const [result] = await pool.execute<mysql.ResultSetHeader>(
      "DELETE FROM courseMain WHERE course_id = ?",
      [id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Not found" });
    res.status(204).send();
  } catch (err: any) {
    if (String(err?.code || "").startsWith("ER_ROW_IS_REFERENCED")) {
      return res.status(409).json({
        error: "Course cannot be deleted because related records exist.",
      });
    }
    console.error("course delete error", err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.post("/courses/manage/:id/assets/presign", authMiddleware, async (req, res) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
    if (!isAdmin(payload) && payload.courseId !== id) return res.status(403).json({ error: "Forbidden" });

    const schema = z.object({
      field: z.enum(["logo", "titlesponsor"]),
      filename: z.string().min(1).max(255),
      contentType: z.string().optional().nullable(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.flatten());

    const ext = path.extname(parsed.data.filename || "").slice(0, 10);
    const key = `courses/${id}/${parsed.data.field}-${randomUUID()}${ext}`;
    const uploadUrl = await presignPut(key);
    res.json({ uploadUrl, fileKey: key });
  } catch (err) {
    console.error("course asset presign error", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/courses/manage/:id/assets/:field", authMiddleware, async (req, res) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const id = Number(req.params.id);
    const field = String(req.params.field);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
    if (!isAdmin(payload) && payload.courseId !== id) return res.status(403).json({ error: "Forbidden" });
    if (!["logo", "titlesponsor"].includes(field)) {
      return res.status(400).json({ error: "Invalid field" });
    }

    const [rows] = await pool.query<any[]>(
      "SELECT logo, titlesponsor FROM courseMain WHERE course_id = ? LIMIT 1",
      [id]
    );
    const row = rows?.[0];
    if (!row) return res.status(404).json({ error: "Not found" });
    const key = row[field];

    if (key) {
      await deleteObject(key);
    }

    await pool.execute(`UPDATE courseMain SET ${field} = NULL WHERE course_id = ?`, [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error("course asset delete error", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/courses", authMiddleware, requireAdmin, async (_req, res) => {
  const [rows] = await pool.query<any[]>(
    "SELECT course_id, coursename FROM courseMain ORDER BY coursename ASC"
  );
  res.json(rows);
});

app.get("/members", authMiddleware, async (req, res) => {
  const payload = (req as any).user as JwtPayload;
  const [rows] = await pool.query<any[]>(
    payload?.courseId
      ? "SELECT member_id, firstname, lastname, rhandicap AS handicap FROM memberMain WHERE course_id = ? ORDER BY lastname ASC, firstname ASC"
      : "SELECT member_id, firstname, lastname, rhandicap AS handicap FROM memberMain ORDER BY lastname ASC, firstname ASC",
    payload?.courseId ? [payload.courseId] : []
  );
  res.json(rows);
});

app.get("/subevents", authMiddleware, async (req, res) => {
  try {
    const payload = (req as any).user as JwtPayload;
    if (!payload?.courseId && !isGlobal(payload)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const eventId = req.query.event ? Number(req.query.event) : null;
    if (req.query.event && !Number.isFinite(eventId)) {
      return res.status(400).json({ error: "Invalid event" });
    }
    const [rows] = await pool.query<any[]>(
      `
      SELECT
        s.subevent_id,
        s.course_id,
        s.event_id,
        e.eventname,
        s.eventtype_id,
        t.eventtypename,
        s.roster_id,
        r.rostername,
        s.amount,
        s.addedmoney,
        c.autoflight_yn
      FROM subEventMain s
      LEFT JOIN eventMain e ON e.event_id = s.event_id
      LEFT JOIN subEventType t ON t.eventtype_id = s.eventtype_id
      LEFT JOIN courseMain c ON c.course_id = s.course_id
      LEFT JOIN rosterMain r ON r.roster_id = s.roster_id
      WHERE 1=1
      ${payload?.courseId && !isGlobal(payload) ? "AND s.course_id = ?" : ""}
      ${eventId ? "AND s.event_id = ?" : ""}
      ORDER BY s.subevent_id DESC
      `,
      [
        ...(payload?.courseId && !isGlobal(payload) ? [payload.courseId] : []),
        ...(eventId ? [eventId] : []),
      ]
    );
    res.json(rows);
  } catch (err) {
    console.error("subevents error", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/subevent/types", authMiddleware, async (_req, res) => {
  const [rows] = await pool.query<any[]>(
    "SELECT eventtype_id, eventtypename FROM subEventType ORDER BY eventtypename ASC"
  );
  res.json(rows);
});

app.get("/subevent/numholes", authMiddleware, async (_req, res) => {
  const [rows] = await pool.query<any[]>(
    "SELECT eventnumhole_id, eventnumholename FROM subEventNumHole ORDER BY eventnumholename ASC"
  );
  res.json(rows);
});

app.get("/subevent/rosters", authMiddleware, async (req, res) => {
  const payload = (req as any).user as JwtPayload;
  const [rows] = await pool.query<any[]>(
    payload?.courseId
      ? "SELECT roster_id, rostername FROM rosterMain WHERE course_id = ? ORDER BY rostername ASC"
      : "SELECT roster_id, rostername FROM rosterMain ORDER BY rostername ASC",
    payload?.courseId ? [payload.courseId] : []
  );
  res.json(rows);
});

app.get("/subevents/:id", authMiddleware, async (req, res) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const subeventId = Number(req.params.id);
    if (!Number.isFinite(subeventId)) return res.status(400).json({ error: "Invalid subevent" });
    if (!payload?.courseId && !isGlobal(payload)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [rows] = await pool.query<any[]>(
      `
      SELECT
        s.subevent_id,
        s.course_id,
        s.event_id,
        e.eventname,
        s.eventtype_id,
        t.eventtypename,
        s.eventnumhole_id,
        s.roster_id,
        s.amount,
        s.addedmoney,
        s.drawn_hole,
        c.autoflight_yn,
        COALESCE(n.startinghole, 1) AS startinghole
      FROM subEventMain s
      LEFT JOIN eventMain e ON e.event_id = s.event_id
      LEFT JOIN subEventType t ON t.eventtype_id = s.eventtype_id
      LEFT JOIN courseMain c ON c.course_id = s.course_id
      LEFT JOIN courseNine n ON n.nine_id = e.nine_id
      WHERE s.subevent_id = ?
      LIMIT 1
      `,
      [subeventId]
    );
    const row = rows?.[0];
    if (!row) return res.status(404).json({ error: "Not found" });
    if (!isGlobal(payload) && row.course_id !== payload.courseId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.json(row);
  } catch (err) {
    console.error("subevent detail error", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/subevents/:id/skins", authMiddleware, async (req, res) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const subeventId = Number(req.params.id);
    if (!Number.isFinite(subeventId)) return res.status(400).json({ error: "Invalid subevent" });
    if (!payload?.courseId && !isGlobal(payload)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [subRows] = await pool.query<any[]>(
      "SELECT subevent_id, course_id FROM subEventMain WHERE subevent_id = ? LIMIT 1",
      [subeventId]
    );
    const sub = subRows?.[0];
    if (!sub) return res.status(404).json({ error: "Not found" });
    if (!isGlobal(payload) && sub.course_id !== payload.courseId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [rows] = await pool.query<any[]>(
      `
      SELECT
        es.eventskin_id,
        es.member_id,
        m.firstname,
        m.lastname,
        es.flight_id,
        rf.flightname,
        es.hole,
        es.score,
        es.amount,
        (es.hole - 1 + COALESCE((
          SELECT MAX(n.startinghole)
          FROM eventCard ec
          LEFT JOIN courseNine n ON n.nine_id = ec.nine_id
          WHERE ec.card_id = es.card_id
        ), 1)) AS holenum
      FROM eventSkin es
      INNER JOIN memberMain m ON m.member_id = es.member_id
      INNER JOIN rosterFlight rf ON rf.flight_id = es.flight_id
      WHERE es.subevent_id = ?
      ORDER BY rf.flightname ASC, es.hole ASC, m.lastname ASC, m.firstname ASC
      `,
      [subeventId]
    );
    res.json(rows);
  } catch (err) {
    console.error("subevent skins list error", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/subevents/:id/skins/cards", authMiddleware, async (req, res) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const subeventId = Number(req.params.id);
    if (!Number.isFinite(subeventId)) return res.status(400).json({ error: "Invalid subevent" });
    if (!payload?.courseId && !isGlobal(payload)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [subRows] = await pool.query<any[]>(
      "SELECT subevent_id, course_id, event_id, roster_id FROM subEventMain WHERE subevent_id = ? LIMIT 1",
      [subeventId]
    );
    const sub = subRows?.[0];
    if (!sub) return res.status(404).json({ error: "Not found" });
    if (!isGlobal(payload) && sub.course_id !== payload.courseId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [rows] = await pool.query<any[]>(
      `
      SELECT
        ec.card_id,
        ec.member_id,
        m.firstname,
        m.lastname,
        rf.flight_id,
        rf.flightname,
        ec.card_dt,
        ec.gross,
        ec.net,
        ec.handicap,
        ec.nine_id,
        COALESCE(n.numholes, 9) AS numholes,
        COALESCE(n.startinghole, 1) AS startinghole,
        ec.hole1, ec.hole2, ec.hole3, ec.hole4, ec.hole5, ec.hole6, ec.hole7, ec.hole8, ec.hole9,
        n.hole1 AS par1, n.hole2 AS par2, n.hole3 AS par3, n.hole4 AS par4, n.hole5 AS par5,
        n.hole6 AS par6, n.hole7 AS par7, n.hole8 AS par8, n.hole9 AS par9
      FROM eventCard ec
      INNER JOIN memberMain m ON m.member_id = ec.member_id
      INNER JOIN rosterMemberLink rml ON rml.member_id = ec.member_id AND rml.roster_id = ?
      INNER JOIN rosterFlight rf ON rf.roster_id = ? AND ec.handicap BETWEEN rf.hdcp1 AND rf.hdcp2
      LEFT JOIN courseNine n ON n.nine_id = ec.nine_id
      WHERE ec.event_id = ?
      ORDER BY rf.flightname ASC, m.lastname ASC, m.firstname ASC, ec.card_dt ASC, ec.card_id ASC
      `,
      [sub.roster_id, sub.roster_id, sub.event_id]
    );

    res.json(rows);
  } catch (err) {
    console.error("subevent skins cards error", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/subevents/:id/skins/post", authMiddleware, async (req, res) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const subeventId = Number(req.params.id);
    if (!Number.isFinite(subeventId)) return res.status(400).json({ error: "Invalid subevent" });
    if (!payload?.courseId && !isGlobal(payload)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [subRows] = await pool.query<any[]>(
      "SELECT subevent_id, course_id FROM subEventMain WHERE subevent_id = ? LIMIT 1",
      [subeventId]
    );
    const sub = subRows?.[0];
    if (!sub) return res.status(404).json({ error: "Not found" });
    if (!isGlobal(payload) && sub.course_id !== payload.courseId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await pool.query("CALL spSkinCodeX(?)", [subeventId]);
    await syncEventMoneyListForSubevent(subeventId);
    res.json({ ok: true });
  } catch (err) {
    console.error("subevent skins post error", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/subevents/:id/skins/unpost", authMiddleware, async (req, res) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const subeventId = Number(req.params.id);
    if (!Number.isFinite(subeventId)) return res.status(400).json({ error: "Invalid subevent" });
    if (!payload?.courseId && !isGlobal(payload)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [subRows] = await pool.query<any[]>(
      "SELECT subevent_id, course_id FROM subEventMain WHERE subevent_id = ? LIMIT 1",
      [subeventId]
    );
    const sub = subRows?.[0];
    if (!sub) return res.status(404).json({ error: "Not found" });
    if (!isGlobal(payload) && sub.course_id !== payload.courseId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await pool.query("CALL spUnPost(?)", [subeventId]);
    await syncEventMoneyListForSubevent(subeventId);
    res.json({ ok: true });
  } catch (err) {
    console.error("subevent skins unpost error", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.patch("/subevents/:id/skins/:skinId", authMiddleware, async (req, res) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const subeventId = Number(req.params.id);
    const skinId = Number(req.params.skinId);
    if (!Number.isFinite(subeventId) || !Number.isFinite(skinId)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    if (!payload?.courseId && !isGlobal(payload)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const schema = z.object({
      amount: z.number(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.flatten());

    const [rows] = await pool.query<any[]>(
      `
      SELECT es.eventskin_id, s.course_id
      FROM eventSkin es
      INNER JOIN subEventMain s ON s.subevent_id = es.subevent_id
      WHERE es.subevent_id = ? AND es.eventskin_id = ?
      LIMIT 1
      `,
      [subeventId, skinId]
    );
    const row = rows?.[0];
    if (!row) return res.status(404).json({ error: "Not found" });
    if (!isGlobal(payload) && row.course_id !== payload.courseId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await pool.execute("UPDATE eventSkin SET amount = ? WHERE eventskin_id = ?", [
      parsed.data.amount,
      skinId,
    ]);
    await syncEventMoneyListForSubevent(subeventId);
    res.json({ ok: true });
  } catch (err) {
    console.error("subevent skins amount update error", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/subevents/:id/powerskin/post", authMiddleware, async (req, res) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const subeventId = Number(req.params.id);
    if (!Number.isFinite(subeventId)) return res.status(400).json({ error: "Invalid subevent" });
    if (!payload?.courseId && !isGlobal(payload)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [subRows] = await pool.query<any[]>(
      "SELECT subevent_id, course_id, drawn_hole FROM subEventMain WHERE subevent_id = ? LIMIT 1",
      [subeventId]
    );
    const sub = subRows?.[0];
    if (!sub) return res.status(404).json({ error: "Not found" });
    if (!isGlobal(payload) && sub.course_id !== payload.courseId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (!sub.drawn_hole) {
      return res.status(400).json({ error: "Drawn hole must be set before posting Power Skin" });
    }

    await pool.query("CALL spPowerSkin(?)", [subeventId]);
    await syncEventMoneyListForSubevent(subeventId);
    res.json({ ok: true });
  } catch (err) {
    console.error("subevent powerskin post error", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/subevents/:id/powerskin/unpost", authMiddleware, async (req, res) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const subeventId = Number(req.params.id);
    if (!Number.isFinite(subeventId)) return res.status(400).json({ error: "Invalid subevent" });
    if (!payload?.courseId && !isGlobal(payload)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [subRows] = await pool.query<any[]>(
      "SELECT subevent_id, course_id FROM subEventMain WHERE subevent_id = ? LIMIT 1",
      [subeventId]
    );
    const sub = subRows?.[0];
    if (!sub) return res.status(404).json({ error: "Not found" });
    if (!isGlobal(payload) && sub.course_id !== payload.courseId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await pool.execute("DELETE FROM eventSkin WHERE subevent_id = ?", [subeventId]);
    await syncEventMoneyListForSubevent(subeventId);
    res.json({ ok: true });
  } catch (err) {
    console.error("subevent powerskin unpost error", err);
    res.status(500).json({ error: "Server error" });
  }
});

async function recalculateBestBallGross(eventId: number) {
  await pool.query(
    `
    UPDATE eventBestBall eb
    LEFT JOIN eventCard c1 ON c1.card_id = eb.card1_id
    LEFT JOIN eventCard c2 ON c2.card_id = eb.card2_id
    SET
      eb.gross =
        COALESCE(LEAST(c1.hole1, c2.hole1), c1.hole1, c2.hole1, 0) +
        COALESCE(LEAST(c1.hole2, c2.hole2), c1.hole2, c2.hole2, 0) +
        COALESCE(LEAST(c1.hole3, c2.hole3), c1.hole3, c2.hole3, 0) +
        COALESCE(LEAST(c1.hole4, c2.hole4), c1.hole4, c2.hole4, 0) +
        COALESCE(LEAST(c1.hole5, c2.hole5), c1.hole5, c2.hole5, 0) +
        COALESCE(LEAST(c1.hole6, c2.hole6), c1.hole6, c2.hole6, 0) +
        COALESCE(LEAST(c1.hole7, c2.hole7), c1.hole7, c2.hole7, 0) +
        COALESCE(LEAST(c1.hole8, c2.hole8), c1.hole8, c2.hole8, 0) +
        COALESCE(LEAST(c1.hole9, c2.hole9), c1.hole9, c2.hole9, 0) +
        COALESCE(LEAST(c1.hole10, c2.hole10), c1.hole10, c2.hole10, 0) +
        COALESCE(LEAST(c1.hole11, c2.hole11), c1.hole11, c2.hole11, 0) +
        COALESCE(LEAST(c1.hole12, c2.hole12), c1.hole12, c2.hole12, 0) +
        COALESCE(LEAST(c1.hole13, c2.hole13), c1.hole13, c2.hole13, 0) +
        COALESCE(LEAST(c1.hole14, c2.hole14), c1.hole14, c2.hole14, 0) +
        COALESCE(LEAST(c1.hole15, c2.hole15), c1.hole15, c2.hole15, 0) +
        COALESCE(LEAST(c1.hole16, c2.hole16), c1.hole16, c2.hole16, 0) +
        COALESCE(LEAST(c1.hole17, c2.hole17), c1.hole17, c2.hole17, 0) +
        COALESCE(LEAST(c1.hole18, c2.hole18), c1.hole18, c2.hole18, 0),
      eb.score =
        COALESCE(LEAST(c1.hole1, c2.hole1), c1.hole1, c2.hole1, 0) +
        COALESCE(LEAST(c1.hole2, c2.hole2), c1.hole2, c2.hole2, 0) +
        COALESCE(LEAST(c1.hole3, c2.hole3), c1.hole3, c2.hole3, 0) +
        COALESCE(LEAST(c1.hole4, c2.hole4), c1.hole4, c2.hole4, 0) +
        COALESCE(LEAST(c1.hole5, c2.hole5), c1.hole5, c2.hole5, 0) +
        COALESCE(LEAST(c1.hole6, c2.hole6), c1.hole6, c2.hole6, 0) +
        COALESCE(LEAST(c1.hole7, c2.hole7), c1.hole7, c2.hole7, 0) +
        COALESCE(LEAST(c1.hole8, c2.hole8), c1.hole8, c2.hole8, 0) +
        COALESCE(LEAST(c1.hole9, c2.hole9), c1.hole9, c2.hole9, 0) +
        COALESCE(LEAST(c1.hole10, c2.hole10), c1.hole10, c2.hole10, 0) +
        COALESCE(LEAST(c1.hole11, c2.hole11), c1.hole11, c2.hole11, 0) +
        COALESCE(LEAST(c1.hole12, c2.hole12), c1.hole12, c2.hole12, 0) +
        COALESCE(LEAST(c1.hole13, c2.hole13), c1.hole13, c2.hole13, 0) +
        COALESCE(LEAST(c1.hole14, c2.hole14), c1.hole14, c2.hole14, 0) +
        COALESCE(LEAST(c1.hole15, c2.hole15), c1.hole15, c2.hole15, 0) +
        COALESCE(LEAST(c1.hole16, c2.hole16), c1.hole16, c2.hole16, 0) +
        COALESCE(LEAST(c1.hole17, c2.hole17), c1.hole17, c2.hole17, 0) +
        COALESCE(LEAST(c1.hole18, c2.hole18), c1.hole18, c2.hole18, 0)
    WHERE eb.event_id = ?
    `,
    [eventId]
  );
}

async function resolveBestBallNetTableName() {
  const [rows] = await pool.query<any[]>(
    `
    SELECT TABLE_NAME AS table_name
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND TABLE_NAME IN ("subEventBBPayNet", "subEventBBPaynet")
    ORDER BY TABLE_NAME = "subEventBBPayNet" DESC
    LIMIT 1
    `
  );
  return rows?.[0]?.table_name ?? "subEventBBPayNet";
}


async function syncEventMoneyListForSubevent(subeventId: number) {
  const bestBallNetTable = await resolveBestBallNetTableName();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query("DELETE FROM eventMoneyList WHERE subevent_id = ?", [subeventId]);

    await conn.query(
      `
      INSERT INTO eventMoneyList
        (
          member_id,
          amount,
          event_id,
          subevent_id,
          payout_date,
          description,
          place,
          flight_id,
          payout_type,
          source_table,
          source_id
        )
      SELECT
        g.member_id,
        ROUND(g.amount, 2) AS amount,
        g.event_id,
        g.subevent_id,
        DATE(e.end_dt) AS payout_date,
        CASE
          WHEN rf.flightname IS NOT NULL AND TRIM(rf.flightname) <> '' THEN CONCAT(TRIM(rf.flightname), ' Gross')
          ELSE 'Gross'
        END AS description,
        g.place,
        g.flight_id,
        'GROSS' AS payout_type,
        'subEventPayGross' AS source_table,
        g.gross_id AS source_id
      FROM subEventPayGross g
      INNER JOIN eventMain e ON e.event_id = g.event_id
      LEFT JOIN rosterFlight rf ON rf.flight_id = g.flight_id
      WHERE g.subevent_id = ?
        AND g.member_id IS NOT NULL
        AND COALESCE(g.amount, 0) <> 0
        AND COALESCE(g.place, 0) > 0
      `,
      [subeventId]
    );

    await conn.query(
      `
      INSERT INTO eventMoneyList
        (
          member_id,
          amount,
          event_id,
          subevent_id,
          payout_date,
          description,
          place,
          flight_id,
          payout_type,
          source_table,
          source_id
        )
      SELECT
        n.member_id,
        ROUND(n.amount, 2) AS amount,
        n.event_id,
        n.subevent_id,
        DATE(e.end_dt) AS payout_date,
        CASE
          WHEN rf.flightname IS NOT NULL AND TRIM(rf.flightname) <> '' THEN CONCAT(TRIM(rf.flightname), ' Net')
          ELSE 'Net'
        END AS description,
        n.place,
        n.flight_id,
        'NET' AS payout_type,
        'subEventPayNet' AS source_table,
        n.net_id AS source_id
      FROM subEventPayNet n
      INNER JOIN eventMain e ON e.event_id = n.event_id
      LEFT JOIN rosterFlight rf ON rf.flight_id = n.flight_id
      WHERE n.subevent_id = ?
        AND n.member_id IS NOT NULL
        AND COALESCE(n.amount, 0) <> 0
        AND COALESCE(n.place, 0) > 0
      `,
      [subeventId]
    );

    // Determine if this subevent is a Power Skin type
    const [subTypeRows] = await conn.query<any[]>(
      `SELECT COALESCE(st.eventtypename, '') AS eventtypename
       FROM subEventMain s
       LEFT JOIN subEventType st ON st.eventtype_id = s.eventtype_id
       WHERE s.subevent_id = ? LIMIT 1`,
      [subeventId]
    );
    const skinPayoutType = (subTypeRows?.[0]?.eventtypename || '').toLowerCase().includes('power') ? 'POWER_SKIN' : 'SKIN';

    await conn.query(
      `
      INSERT INTO eventMoneyList
        (
          member_id,
          amount,
          event_id,
          subevent_id,
          payout_date,
          description,
          place,
          flight_id,
          payout_type,
          source_table,
          source_id
        )
      SELECT
        es.member_id,
        ROUND(es.amount, 2) AS amount,
        es.event_id,
        es.subevent_id,
        DATE(e.end_dt) AS payout_date,
        CONCAT('Hole ', es.hole) AS description,
        NULL AS place,
        es.flight_id,
        ? AS payout_type,
        'eventSkin' AS source_table,
        es.eventskin_id AS source_id
      FROM eventSkin es
      INNER JOIN eventMain e ON e.event_id = es.event_id
      WHERE es.subevent_id = ?
        AND es.member_id IS NOT NULL
        AND COALESCE(es.amount, 0) <> 0
      `,
      [skinPayoutType, subeventId]
    );

    await conn.query(
      `
      INSERT INTO eventMoneyList
        (
          member_id,
          amount,
          event_id,
          subevent_id,
          payout_date,
          description,
          place,
          flight_id,
          payout_type,
          source_table,
          source_id
        )
      SELECT
        winners.member_id,
        ROUND(winners.amount, 2) AS amount,
        winners.event_id,
        winners.subevent_id,
        DATE(e.end_dt) AS payout_date,
        CASE
          WHEN rf.flightname IS NOT NULL AND TRIM(rf.flightname) <> '' THEN CONCAT(TRIM(rf.flightname), ' Best Ball Gross')
          ELSE 'Best Ball Gross'
        END AS description,
        winners.place,
        winners.flight_id,
        'BB_GROSS' AS payout_type,
        'subEventBBPayGross' AS source_table,
        winners.source_id
      FROM (
        SELECT
          gross_id AS source_id,
          member1_id AS member_id,
          amount,
          event_id,
          subevent_id,
          place,
          flight_id
        FROM subEventBBPayGross
        WHERE subevent_id = ?
          AND member1_id IS NOT NULL
          AND COALESCE(amount, 0) <> 0
          AND COALESCE(place, 0) > 0
        UNION ALL
        SELECT
          gross_id AS source_id,
          member2_id AS member_id,
          amount,
          event_id,
          subevent_id,
          place,
          flight_id
        FROM subEventBBPayGross
        WHERE subevent_id = ?
          AND member2_id IS NOT NULL
          AND COALESCE(amount, 0) <> 0
          AND COALESCE(place, 0) > 0
      ) winners
      INNER JOIN eventMain e ON e.event_id = winners.event_id
      LEFT JOIN rosterFlight rf ON rf.flight_id = winners.flight_id
      `,
      [subeventId, subeventId]
    );

    await conn.query(
      `
      INSERT INTO eventMoneyList
        (
          member_id,
          amount,
          event_id,
          subevent_id,
          payout_date,
          description,
          place,
          flight_id,
          payout_type,
          source_table,
          source_id
        )
      SELECT
        winners.member_id,
        ROUND(winners.amount, 2) AS amount,
        winners.event_id,
        winners.subevent_id,
        DATE(e.end_dt) AS payout_date,
        CASE
          WHEN rf.flightname IS NOT NULL AND TRIM(rf.flightname) <> '' THEN CONCAT(TRIM(rf.flightname), ' Best Ball Net')
          ELSE 'Best Ball Net'
        END AS description,
        winners.place,
        winners.flight_id,
        'BB_NET' AS payout_type,
        'subEventBBPayNet' AS source_table,
        winners.source_id
      FROM (
        SELECT
          net_id AS source_id,
          member1_id AS member_id,
          amount,
          event_id,
          subevent_id,
          place,
          flight_id
        FROM ${bestBallNetTable}
        WHERE subevent_id = ?
          AND member1_id IS NOT NULL
          AND COALESCE(amount, 0) <> 0
          AND COALESCE(place, 0) > 0
        UNION ALL
        SELECT
          net_id AS source_id,
          member2_id AS member_id,
          amount,
          event_id,
          subevent_id,
          place,
          flight_id
        FROM ${bestBallNetTable}
        WHERE subevent_id = ?
          AND member2_id IS NOT NULL
          AND COALESCE(amount, 0) <> 0
          AND COALESCE(place, 0) > 0
      ) winners
      INNER JOIN eventMain e ON e.event_id = winners.event_id
      LEFT JOIN rosterFlight rf ON rf.flight_id = winners.flight_id
      `,
      [subeventId, subeventId]
    );

    await conn.query(
      `
      INSERT INTO eventMoneyList
        (
          member_id,
          amount,
          event_id,
          subevent_id,
          payout_date,
          description,
          place,
          flight_id,
          payout_type,
          source_table,
          source_id
        )
      SELECT
        c.member_id,
        ROUND(c.amount, 2) AS amount,
        s.event_id,
        c.subevent_id,
        DATE(e.end_dt) AS payout_date,
        CASE
          WHEN rf.flightname IS NOT NULL AND TRIM(rf.flightname) <> '' THEN CONCAT(TRIM(rf.flightname), ' Chicago')
          ELSE 'Chicago'
        END AS description,
        c.place,
        c.flight_id,
        'CHICAGO' AS payout_type,
        'subEventPayChicago' AS source_table,
        c.chicago_id AS source_id
      FROM subEventPayChicago c
      INNER JOIN subEventMain s ON s.subevent_id = c.subevent_id
      INNER JOIN eventMain e ON e.event_id = s.event_id
      LEFT JOIN rosterFlight rf ON rf.flight_id = c.flight_id
      WHERE c.subevent_id = ?
        AND c.member_id IS NOT NULL
        AND COALESCE(c.amount, 0) <> 0
        AND COALESCE(c.place, 0) > 0
      `,
      [subeventId]
    );

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

app.get("/subevents/:id/bestball", authMiddleware, async (req, res) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const subeventId = Number(req.params.id);
    if (!Number.isFinite(subeventId)) return res.status(400).json({ error: "Invalid subevent" });
    if (!payload?.courseId && !isGlobal(payload)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [subRows] = await pool.query<any[]>(
      "SELECT subevent_id, course_id, event_id, roster_id FROM subEventMain WHERE subevent_id = ? LIMIT 1",
      [subeventId]
    );
    const sub = subRows?.[0];
    if (!sub) return res.status(404).json({ error: "Not found" });
    if (!isGlobal(payload) && sub.course_id !== payload.courseId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const bestBallNetTable = await resolveBestBallNetTableName();
    await recalculateBestBallGross(sub.event_id);

    const [cards] = await pool.query<any[]>(
      `
      SELECT
        ec.card_id,
        ec.member_id,
        m.firstname,
        m.lastname,
        ec.handicap,
        ec.card_dt,
        ec.gross,
        ec.net,
        rf.flight_id,
        rf.flightname
      FROM eventCard ec
      LEFT JOIN memberMain m ON m.member_id = ec.member_id
      LEFT JOIN rosterFlight rf ON rf.roster_id = ? AND ec.handicap BETWEEN rf.hdcp1 AND rf.hdcp2
      WHERE ec.event_id = ?
      ORDER BY m.lastname ASC, m.firstname ASC, ec.card_id ASC
      `,
      [sub.roster_id ?? null, sub.event_id]
    );

    const [pairings] = await pool.query<any[]>(
      `
      SELECT
        eb.bestball_id,
        eb.card1_id,
        eb.card2_id,
        eb.member1_id,
        eb.member2_id,
        m1.firstname AS member1_firstname,
        m1.lastname AS member1_lastname,
        m2.firstname AS member2_firstname,
        m2.lastname AS member2_lastname,
        eb.handicap1,
        eb.handicap2,
        eb.handicap,
        eb.gross,
        eb.net,
        rf.flight_id,
        rf.flightname
      FROM eventBestBall eb
      LEFT JOIN memberMain m1 ON m1.member_id = eb.member1_id
      LEFT JOIN memberMain m2 ON m2.member_id = eb.member2_id
      LEFT JOIN rosterFlight rf ON rf.roster_id = ? AND eb.handicap BETWEEN rf.hdcp1 AND rf.hdcp2
      WHERE eb.event_id = ?
      ORDER BY rf.flightname ASC, m1.lastname ASC, m1.firstname ASC, m2.lastname ASC, m2.firstname ASC, eb.bestball_id ASC
      `,
      [sub.roster_id ?? null, sub.event_id]
    );

    const [gross] = await pool.query<any[]>(
      `
      SELECT
        g.gross_id,
        g.bestball_id,
        g.flight_id,
        rf.flightname,
        g.score,
        g.place,
        g.amount,
        g.used_yn,
        m1.firstname AS member1_firstname,
        m1.lastname AS member1_lastname,
        m2.firstname AS member2_firstname,
        m2.lastname AS member2_lastname
      FROM subEventBBPayGross g
      LEFT JOIN memberMain m1 ON m1.member_id = g.member1_id
      LEFT JOIN memberMain m2 ON m2.member_id = g.member2_id
      LEFT JOIN rosterFlight rf ON rf.flight_id = g.flight_id
      WHERE g.subevent_id = ?
      ORDER BY (g.flight_id IS NULL), rf.flightname ASC, g.place ASC, g.score ASC, m1.lastname ASC, m1.firstname ASC
      `,
      [subeventId]
    );

    const [net] = await pool.query<any[]>(
      `
      SELECT
        n.net_id,
        n.bestball_id,
        n.flight_id,
        rf.flightname,
        n.score,
        n.place,
        n.amount,
        n.used_yn,
        m1.firstname AS member1_firstname,
        m1.lastname AS member1_lastname,
        m2.firstname AS member2_firstname,
        m2.lastname AS member2_lastname
      FROM ${bestBallNetTable} n
      LEFT JOIN memberMain m1 ON m1.member_id = n.member1_id
      LEFT JOIN memberMain m2 ON m2.member_id = n.member2_id
      LEFT JOIN rosterFlight rf ON rf.flight_id = n.flight_id
      WHERE n.subevent_id = ?
      ORDER BY (n.flight_id IS NULL), rf.flightname ASC, n.place ASC, n.score ASC, m1.lastname ASC, m1.firstname ASC
      `,
      [subeventId]
    );

    const [payouts] = await pool.query<any[]>(
      `
      SELECT
        p.place,
        p.amount,
        p.flight_id,
        rf.flightname
      FROM subEventPayOut p
      LEFT JOIN rosterFlight rf ON rf.flight_id = p.flight_id
      WHERE p.subevent_id = ?
      ORDER BY (p.flight_id IS NULL), rf.flightname ASC, p.place ASC
      `,
      [subeventId]
    );

    return res.json({ cards, pairings, gross, net, payouts });
  } catch (err) {
    console.error("subevent best ball list error", err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.post("/subevents/:id/bestball/pairings", authMiddleware, async (req, res) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const subeventId = Number(req.params.id);
    if (!Number.isFinite(subeventId)) return res.status(400).json({ error: "Invalid subevent" });
    if (!payload?.courseId && !isGlobal(payload)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const schema = z.object({
      card1_id: z.number().int(),
      card2_id: z.number().int(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.flatten());
    if (parsed.data.card1_id === parsed.data.card2_id) {
      return res.status(400).json({ error: "Pairing requires two different cards" });
    }

    const [subRows] = await pool.query<any[]>(
      "SELECT subevent_id, course_id, event_id FROM subEventMain WHERE subevent_id = ? LIMIT 1",
      [subeventId]
    );
    const sub = subRows?.[0];
    if (!sub) return res.status(404).json({ error: "Not found" });
    if (!isGlobal(payload) && sub.course_id !== payload.courseId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [cardRows] = await pool.query<any[]>(
      `
      SELECT card_id, member_id, handicap
      FROM eventCard
      WHERE event_id = ? AND card_id IN (?, ?)
      `,
      [sub.event_id, parsed.data.card1_id, parsed.data.card2_id]
    );
    if (!cardRows || cardRows.length !== 2) {
      return res.status(400).json({ error: "Cards must belong to the same event" });
    }

    const cardById = new Map<number, any>();
    for (const row of cardRows) cardById.set(Number(row.card_id), row);
    const card1 = cardById.get(parsed.data.card1_id);
    const card2 = cardById.get(parsed.data.card2_id);
    if (!card1 || !card2) {
      return res.status(400).json({ error: "Cards must belong to the same event" });
    }

    const handicap1 = card1.handicap != null ? Number(card1.handicap) : null;
    const handicap2 = card2.handicap != null ? Number(card2.handicap) : null;
    const pairHandicap =
      handicap1 == null && handicap2 == null
        ? null
        : Number((((handicap1 ?? 0) + (handicap2 ?? 0)) / 2).toFixed(2));

    const [insertResult]: any = await pool.execute(
      `
      INSERT INTO eventBestBall
        (event_id, member1_id, member2_id, card1_id, card2_id, handicap1, handicap2, handicap)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        sub.event_id,
        card1.member_id ?? null,
        card2.member_id ?? null,
        parsed.data.card1_id,
        parsed.data.card2_id,
        handicap1,
        handicap2,
        pairHandicap,
      ]
    );

    await pool.query("CALL BBCalculate(?)", [sub.event_id]);
    await recalculateBestBallGross(sub.event_id);
    return res.status(201).json({ bestball_id: insertResult.insertId });
  } catch (err) {
    console.error("subevent best ball pairing create error", err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.delete("/subevents/:id/bestball/pairings/:bestballId", authMiddleware, async (req, res) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const subeventId = Number(req.params.id);
    const bestballId = Number(req.params.bestballId);
    if (!Number.isFinite(subeventId) || !Number.isFinite(bestballId)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    if (!payload?.courseId && !isGlobal(payload)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [subRows] = await pool.query<any[]>(
      "SELECT subevent_id, course_id, event_id FROM subEventMain WHERE subevent_id = ? LIMIT 1",
      [subeventId]
    );
    const sub = subRows?.[0];
    if (!sub) return res.status(404).json({ error: "Not found" });
    if (!isGlobal(payload) && sub.course_id !== payload.courseId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [rows] = await pool.query<any[]>(
      "SELECT bestball_id FROM eventBestBall WHERE bestball_id = ? AND event_id = ? LIMIT 1",
      [bestballId, sub.event_id]
    );
    if (!rows?.length) return res.status(404).json({ error: "Not found" });

    await pool.execute("DELETE FROM eventBestBall WHERE bestball_id = ?", [bestballId]);
    await pool.query("CALL BBCalculate(?)", [sub.event_id]);
    await recalculateBestBallGross(sub.event_id);
    return res.json({ ok: true });
  } catch (err) {
    console.error("subevent best ball pairing delete error", err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.post("/subevents/:id/bestball/post", authMiddleware, async (req, res) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const subeventId = Number(req.params.id);
    if (!Number.isFinite(subeventId)) return res.status(400).json({ error: "Invalid subevent" });
    if (!payload?.courseId && !isGlobal(payload)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [subRows] = await pool.query<any[]>(
      "SELECT subevent_id, course_id, event_id FROM subEventMain WHERE subevent_id = ? LIMIT 1",
      [subeventId]
    );
    const sub = subRows?.[0];
    if (!sub) return res.status(404).json({ error: "Not found" });
    if (!isGlobal(payload) && sub.course_id !== payload.courseId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const bestBallNetTable = await resolveBestBallNetTableName();

    await pool.query("CALL BBCalculate(?)", [sub.event_id]);
    await recalculateBestBallGross(sub.event_id);
    await pool.query("CALL spBBFlightPick(?)", [subeventId]);
    await syncEventMoneyListForSubevent(subeventId);

    const [diagRows] = await pool.query<any[]>(
      `
      SELECT
        (SELECT COUNT(*) FROM eventBestBall WHERE event_id = ?) AS pairing_rows,
        (SELECT COUNT(*) FROM subEventPayOut WHERE subevent_id = ?) AS payout_rows,
        (SELECT COUNT(*) FROM subEventBBPayGross WHERE subevent_id = ?) AS gross_rows,
        (SELECT COUNT(*) FROM ${bestBallNetTable} WHERE subevent_id = ?) AS net_rows,
        (SELECT COUNT(*) FROM subEventBBPayGross WHERE subevent_id = ? AND COALESCE(place, 0) > 0 AND COALESCE(amount, 0) > 0) AS gross_winner_rows,
        (SELECT COUNT(*) FROM ${bestBallNetTable} WHERE subevent_id = ? AND COALESCE(place, 0) > 0 AND COALESCE(amount, 0) > 0) AS net_winner_rows
      `,
      [sub.event_id, subeventId, subeventId, subeventId, subeventId, subeventId]
    );

    return res.json({ ok: true, diagnostics: diagRows?.[0] ?? null });
  } catch (err) {
    console.error("subevent best ball post error", err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.post("/subevents/:id/bestball/unpost", authMiddleware, async (req, res) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const subeventId = Number(req.params.id);
    if (!Number.isFinite(subeventId)) return res.status(400).json({ error: "Invalid subevent" });
    if (!payload?.courseId && !isGlobal(payload)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [subRows] = await pool.query<any[]>(
      "SELECT subevent_id, course_id FROM subEventMain WHERE subevent_id = ? LIMIT 1",
      [subeventId]
    );
    const sub = subRows?.[0];
    if (!sub) return res.status(404).json({ error: "Not found" });
    if (!isGlobal(payload) && sub.course_id !== payload.courseId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await pool.query("CALL spUnPost(?)", [subeventId]);
    await syncEventMoneyListForSubevent(subeventId);
    return res.json({ ok: true });
  } catch (err) {
    console.error("subevent best ball unpost error", err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.patch("/subevents/:id/bestball/gross/:grossId", authMiddleware, async (req, res) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const subeventId = Number(req.params.id);
    const grossId = Number(req.params.grossId);
    if (!Number.isFinite(subeventId) || !Number.isFinite(grossId)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    if (!payload?.courseId && !isGlobal(payload)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const schema = z.object({ amount: z.number().nullable() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.flatten());

    const [rows] = await pool.query<any[]>(
      `
      SELECT g.gross_id, s.course_id
      FROM subEventBBPayGross g
      INNER JOIN subEventMain s ON s.subevent_id = g.subevent_id
      WHERE g.subevent_id = ? AND g.gross_id = ?
      LIMIT 1
      `,
      [subeventId, grossId]
    );
    const row = rows?.[0];
    if (!row) return res.status(404).json({ error: "Not found" });
    if (!isGlobal(payload) && row.course_id !== payload.courseId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await pool.execute("UPDATE subEventBBPayGross SET amount = ? WHERE gross_id = ?", [
      parsed.data.amount,
      grossId,
    ]);
    await syncEventMoneyListForSubevent(subeventId);
    return res.json({ ok: true });
  } catch (err) {
    console.error("subevent best ball gross amount update error", err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.patch("/subevents/:id/bestball/net/:netId", authMiddleware, async (req, res) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const subeventId = Number(req.params.id);
    const netId = Number(req.params.netId);
    if (!Number.isFinite(subeventId) || !Number.isFinite(netId)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    if (!payload?.courseId && !isGlobal(payload)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const schema = z.object({ amount: z.number().nullable() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.flatten());

    const bestBallNetTable = await resolveBestBallNetTableName();

    const [rows] = await pool.query<any[]>(
      `
      SELECT n.net_id, s.course_id
      FROM ${bestBallNetTable} n
      INNER JOIN subEventMain s ON s.subevent_id = n.subevent_id
      WHERE n.subevent_id = ? AND n.net_id = ?
      LIMIT 1
      `,
      [subeventId, netId]
    );
    const row = rows?.[0];
    if (!row) return res.status(404).json({ error: "Not found" });
    if (!isGlobal(payload) && row.course_id !== payload.courseId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await pool.execute(`UPDATE ${bestBallNetTable} SET amount = ? WHERE net_id = ?`, [
      parsed.data.amount,
      netId,
    ]);
    await syncEventMoneyListForSubevent(subeventId);
    return res.json({ ok: true });
  } catch (err) {
    console.error("subevent best ball net amount update error", err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.get("/subevents/:id/chicago", authMiddleware, async (req, res) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const subeventId = Number(req.params.id);
    if (!Number.isFinite(subeventId)) return res.status(400).json({ error: "Invalid subevent" });
    if (!payload?.courseId && !isGlobal(payload)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [subRows] = await pool.query<any[]>(
      "SELECT subevent_id, course_id FROM subEventMain WHERE subevent_id = ? LIMIT 1",
      [subeventId]
    );
    const sub = subRows?.[0];
    if (!sub) return res.status(404).json({ error: "Not found" });
    if (!isGlobal(payload) && sub.course_id !== payload.courseId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [rows] = await pool.query<any[]>(
      `
      SELECT
        c.chicago_id,
        c.card_id,
        c.member_id,
        m.firstname,
        m.lastname,
        c.flight_id,
        rf.flightname,
        c.score,
        c.place,
        c.amount,
        c.used_yn
      FROM subEventPayChicago c
      LEFT JOIN memberMain m ON m.member_id = c.member_id
      LEFT JOIN rosterFlight rf ON rf.flight_id = c.flight_id
      WHERE c.subevent_id = ?
      ORDER BY (c.flight_id IS NULL), rf.flightname ASC, c.place ASC, c.score ASC, m.lastname ASC, m.firstname ASC
      `,
      [subeventId]
    );

    const [payoutRows] = await pool.query<any[]>(
      `
      SELECT
        p.place,
        p.amount,
        p.flight_id,
        rf.flightname
      FROM subEventPayOut p
      LEFT JOIN rosterFlight rf ON rf.flight_id = p.flight_id
      WHERE p.subevent_id = ?
      ORDER BY (p.flight_id IS NULL), rf.flightname ASC, p.place ASC
      `,
      [subeventId]
    );

    return res.json({ rows, payouts: payoutRows });
  } catch (err) {
    console.error("subevent chicago list error", err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.post("/subevents/:id/chicago/post", authMiddleware, async (req, res) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const subeventId = Number(req.params.id);
    if (!Number.isFinite(subeventId)) return res.status(400).json({ error: "Invalid subevent" });
    if (!payload?.courseId && !isGlobal(payload)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [subRows] = await pool.query<any[]>(
      "SELECT subevent_id, course_id FROM subEventMain WHERE subevent_id = ? LIMIT 1",
      [subeventId]
    );
    const sub = subRows?.[0];
    if (!sub) return res.status(404).json({ error: "Not found" });
    if (!isGlobal(payload) && sub.course_id !== payload.courseId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await pool.query("CALL spChicago(?)", [subeventId]);
    await syncEventMoneyListForSubevent(subeventId);
    return res.json({ ok: true });
  } catch (err) {
    console.error("subevent chicago post error", err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.post("/subevents/:id/chicago/unpost", authMiddleware, async (req, res) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const subeventId = Number(req.params.id);
    if (!Number.isFinite(subeventId)) return res.status(400).json({ error: "Invalid subevent" });
    if (!payload?.courseId && !isGlobal(payload)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [subRows] = await pool.query<any[]>(
      "SELECT subevent_id, course_id FROM subEventMain WHERE subevent_id = ? LIMIT 1",
      [subeventId]
    );
    const sub = subRows?.[0];
    if (!sub) return res.status(404).json({ error: "Not found" });
    if (!isGlobal(payload) && sub.course_id !== payload.courseId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await pool.query("CALL spUnPost(?)", [subeventId]);
    await syncEventMoneyListForSubevent(subeventId);
    return res.json({ ok: true });
  } catch (err) {
    console.error("subevent chicago unpost error", err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.patch("/subevents/:id/chicago/:chicagoId", authMiddleware, async (req, res) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const subeventId = Number(req.params.id);
    const chicagoId = Number(req.params.chicagoId);
    if (!Number.isFinite(subeventId) || !Number.isFinite(chicagoId)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    if (!payload?.courseId && !isGlobal(payload)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const schema = z.object({ amount: z.number().nullable() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.flatten());

    const [rows] = await pool.query<any[]>(
      `
      SELECT c.chicago_id, s.course_id
      FROM subEventPayChicago c
      INNER JOIN subEventMain s ON s.subevent_id = c.subevent_id
      WHERE c.subevent_id = ? AND c.chicago_id = ?
      LIMIT 1
      `,
      [subeventId, chicagoId]
    );
    const row = rows?.[0];
    if (!row) return res.status(404).json({ error: "Not found" });
    if (!isGlobal(payload) && row.course_id !== payload.courseId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await pool.execute("UPDATE subEventPayChicago SET amount = ? WHERE chicago_id = ?", [
      parsed.data.amount,
      chicagoId,
    ]);
    await syncEventMoneyListForSubevent(subeventId);
    return res.json({ ok: true });
  } catch (err) {
    console.error("subevent chicago amount update error", err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.post("/subevents/:id/stroke/autoflight", authMiddleware, async (req, res) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const subeventId = Number(req.params.id);
    if (!Number.isFinite(subeventId)) return res.status(400).json({ error: "Invalid subevent" });
    if (!isAdmin(payload)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (!payload?.courseId && !isGlobal(payload)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [subRows] = await pool.query<any[]>(
      `
      SELECT s.subevent_id, s.course_id, s.roster_id, c.autoflight_yn
      FROM subEventMain s
      LEFT JOIN courseMain c ON c.course_id = s.course_id
      WHERE s.subevent_id = ?
      LIMIT 1
      `,
      [subeventId]
    );
    const sub = subRows?.[0];
    if (!sub) return res.status(404).json({ error: "Not found" });
    if (!isGlobal(payload) && sub.course_id !== payload.courseId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (Number(sub.autoflight_yn ?? 1) !== 1) {
      return res.status(403).json({ error: "Auto Flight is disabled for this course" });
    }
    if (!sub.roster_id) {
      return res.status(400).json({ error: "Roster is required before auto flighting" });
    }

    await pool.query("CALL sp_SubEventFlight_Insert(?)", [subeventId]);
    return res.json({ ok: true });
  } catch (err) {
    console.error("subevent stroke autoflight error", err);
    res.status(500).json({ error: "Server error" });
  }
});

type StrokePayRow = {
  row_id: number;
  flight_id: number | null;
  card_id: number | null;
  member_id: number | null;
  score: number | null;
  lastname: string | null;
  firstname: string | null;
};

function strokeWinnerKey(row: { card_id: number | null; member_id: number | null }, fallback: string) {
  if (typeof row.card_id === "number") return `card:${row.card_id}`;
  if (typeof row.member_id === "number") return `member:${row.member_id}`;
  return fallback;
}

function strokeSortByScoreNameCard(a: StrokePayRow, b: StrokePayRow) {
  const aScore = typeof a.score === "number" ? a.score : Number.MAX_SAFE_INTEGER;
  const bScore = typeof b.score === "number" ? b.score : Number.MAX_SAFE_INTEGER;
  if (aScore !== bScore) return aScore - bScore;

  const aName = `${(a.lastname ?? "").trim().toLowerCase()}|${(a.firstname ?? "").trim().toLowerCase()}`;
  const bName = `${(b.lastname ?? "").trim().toLowerCase()}|${(b.firstname ?? "").trim().toLowerCase()}`;
  if (aName !== bName) return aName.localeCompare(bName);

  const aCard = typeof a.card_id === "number" ? a.card_id : Number.MAX_SAFE_INTEGER;
  const bCard = typeof b.card_id === "number" ? b.card_id : Number.MAX_SAFE_INTEGER;
  if (aCard !== bCard) return aCard - bCard;

  return a.row_id - b.row_id;
}

function roundCurrencyAmount(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function assignStrokeAwards(rows: StrokePayRow[], activeKeys: Set<string>, payoutByPlace: Map<number, number>) {
  const ranked = [...rows]
    .map((row, idx) => ({ row, key: strokeWinnerKey(row, `row:${idx}`) }))
    .filter((r) => activeKeys.has(r.key))
    .sort((a, b) => strokeSortByScoreNameCard(a.row, b.row));

  const awards = new Map<string, { place: number | null; amount: number | null }>();
  let rankCursor = 1;
  let i = 0;
  while (i < ranked.length) {
    const score = ranked[i].row.score;
    let j = i;
    while (j + 1 < ranked.length && ranked[j + 1].row.score === score) j += 1;

    const groupSize = j - i + 1;
    const placeStart = rankCursor;
    const placeEnd = rankCursor + groupSize - 1;

    let payoutSum = 0;
    for (let place = placeStart; place <= placeEnd; place += 1) {
      const v = payoutByPlace.get(place);
      payoutSum += typeof v === "number" && Number.isFinite(v) ? v : 0;
    }
    const eachAmount = payoutSum > 0 ? roundCurrencyAmount(payoutSum / groupSize) : null;

    for (let k = i; k <= j; k += 1) {
      awards.set(ranked[k].key, { place: placeStart, amount: eachAmount });
    }

    rankCursor += groupSize;
    i = j + 1;
  }

  return awards;
}

async function normalizeStrokePayouts(subeventId: number) {
  const [grossRowsRaw] = await pool.query<any[]>(
    `
    SELECT
      g.gross_id AS row_id,
      g.flight_id,
      g.card_id,
      g.member_id,
      g.score,
      m.lastname,
      m.firstname
    FROM subEventPayGross g
    LEFT JOIN memberMain m ON m.member_id = g.member_id
    WHERE g.subevent_id = ?
    `,
    [subeventId]
  );

  const [netRowsRaw] = await pool.query<any[]>(
    `
    SELECT
      n.net_id AS row_id,
      n.flight_id,
      n.card_id,
      n.member_id,
      n.score,
      m.lastname,
      m.firstname
    FROM subEventPayNet n
    LEFT JOIN memberMain m ON m.member_id = n.member_id
    WHERE n.subevent_id = ?
    `,
    [subeventId]
  );

  const [payoutRows] = await pool.query<any[]>(
    `
    SELECT flight_id, place, amount
    FROM subEventPayOut
    WHERE subevent_id = ?
    ORDER BY (flight_id IS NULL), flight_id ASC, place ASC
    `,
    [subeventId]
  );

  const payoutByFlight = new Map<string, Map<number, number>>();
  for (const row of payoutRows) {
    const key = String(row.flight_id ?? "na");
    const place = Number(row.place);
    const amount = Number(row.amount ?? 0);
    if (!Number.isFinite(place) || place <= 0) continue;
    const map = payoutByFlight.get(key) ?? new Map<number, number>();
    map.set(place, Number.isFinite(amount) ? amount : 0);
    payoutByFlight.set(key, map);
  }

  const grossByFlight = new Map<string, StrokePayRow[]>();
  for (const row of grossRowsRaw as StrokePayRow[]) {
    const key = String(row.flight_id ?? "na");
    const arr = grossByFlight.get(key) ?? [];
    arr.push(row);
    grossByFlight.set(key, arr);
  }

  const netByFlight = new Map<string, StrokePayRow[]>();
  for (const row of netRowsRaw as StrokePayRow[]) {
    const key = String(row.flight_id ?? "na");
    const arr = netByFlight.get(key) ?? [];
    arr.push(row);
    netByFlight.set(key, arr);
  }

  const flights = new Set<string>([...grossByFlight.keys(), ...netByFlight.keys()]);

  for (const flightKey of flights) {
    const payoutByPlace = payoutByFlight.get(flightKey) ?? new Map<number, number>();
    const grossRows = (grossByFlight.get(flightKey) ?? []).sort(strokeSortByScoreNameCard);
    const netRows = (netByFlight.get(flightKey) ?? []).sort(strokeSortByScoreNameCard);

    const grossActive = new Set(grossRows.map((row, idx) => strokeWinnerKey(row, `gross:${idx}`)));
    const netActive = new Set(netRows.map((row, idx) => strokeWinnerKey(row, `net:${idx}`)));

    for (let pass = 0; pass < 20; pass += 1) {
      const grossAwards = assignStrokeAwards(grossRows, grossActive, payoutByPlace);
      const netAwards = assignStrokeAwards(netRows, netActive, payoutByPlace);

      let changed = false;
      for (const key of grossActive) {
        if (!netActive.has(key)) continue;
        const g = grossAwards.get(key);
        const n = netAwards.get(key);
        const gAmt = Number(g?.amount ?? 0);
        const nAmt = Number(n?.amount ?? 0);
        if (!(gAmt > 0 && nAmt > 0)) continue;

        // Single card can only win one side: keep higher amount, tie stays Gross.
        if (gAmt >= nAmt) {
          netActive.delete(key);
        } else {
          grossActive.delete(key);
        }
        changed = true;
      }

      if (!changed) break;
    }

    const finalGross = assignStrokeAwards(grossRows, grossActive, payoutByPlace);
    const finalNet = assignStrokeAwards(netRows, netActive, payoutByPlace);

    for (let idx = 0; idx < grossRows.length; idx += 1) {
      const row = grossRows[idx];
      const key = strokeWinnerKey(row, `gross:${idx}`);
      const award = finalGross.get(key);
      await pool.execute("UPDATE subEventPayGross SET place = ?, amount = ? WHERE gross_id = ?", [
        award?.place ?? null,
        award?.amount ?? null,
        row.row_id,
      ]);
    }

    for (let idx = 0; idx < netRows.length; idx += 1) {
      const row = netRows[idx];
      const key = strokeWinnerKey(row, `net:${idx}`);
      const award = finalNet.get(key);
      await pool.execute("UPDATE subEventPayNet SET place = ?, amount = ? WHERE net_id = ?", [
        award?.place ?? null,
        award?.amount ?? null,
        row.row_id,
      ]);
    }
  }
}

type LegacyStrokeRow = {
  row_id: number;
  flight_id: number | null;
  card_id: number | null;
  score: number | null;
  place: number | null;
  amount: number | null;
  used_yn: number | null;
};

function legacyScoreValue(score: number | null) {
  return typeof score === "number" && Number.isFinite(score) ? score : Number.MAX_SAFE_INTEGER;
}

function legacyAmountValue(amount: number | null) {
  return typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
}

function recalcLegacySide(rows: LegacyStrokeRow[], payoutByPlace: Map<number, number>) {
  let vPlace = 0;
  for (const row of rows) {
    if (row.used_yn === 1 && typeof row.place === "number" && row.place > vPlace) vPlace = row.place;
  }
  const usedAtVPlace = rows.filter((r) => r.used_yn === 1 && r.place === vPlace && (r.place ?? 0) !== 0).length;
  vPlace = vPlace + usedAtVPlace - 1;
  if (vPlace < 0) vPlace = 0;

  const activeRows = rows
    .filter((r) => r.used_yn !== 1)
    .sort((a, b) => {
      const byScore = legacyScoreValue(a.score) - legacyScoreValue(b.score);
      if (byScore !== 0) return byScore;
      return a.row_id - b.row_id;
    });

  let vOldScore = 0;
  let vTies = 0;
  let vCurrentPlace = 1;

  for (const row of activeRows) {
    vPlace += 1;
    row.place = vPlace;

    const score = legacyScoreValue(row.score);
    if (vOldScore === score) {
      vTies += 1;
      continue;
    }

    let vPlaceAmount = 0;
    if (vTies === 0) {
      const targetPlace = vPlace - 1;
      vPlaceAmount = legacyAmountValue(payoutByPlace.get(targetPlace) ?? 0);
      for (const active of activeRows) {
        if ((active.place ?? 0) === targetPlace) {
          active.amount = vPlaceAmount;
          active.place = targetPlace;
        }
      }
    } else {
      const start = vCurrentPlace;
      const end = vPlace - 1;
      let sum = 0;
      for (let p = start; p <= end; p += 1) sum += legacyAmountValue(payoutByPlace.get(p) ?? 0);
      vPlaceAmount = sum / (vTies + 1);
      for (const active of activeRows) {
        const place = active.place ?? 0;
        if (place >= start && place <= end) {
          active.amount = vPlaceAmount;
          active.place = start;
        }
      }
    }

    vOldScore = score;
    vTies = 0;
    vCurrentPlace = vPlace;
  }

  if (vTies > 0) {
    const sumAtPlace = legacyAmountValue(payoutByPlace.get(vCurrentPlace) ?? 0);
    const vPlaceAmount = sumAtPlace / (vTies + 1);
    for (const active of activeRows) {
      if ((active.place ?? 0) >= vCurrentPlace) {
        active.amount = vPlaceAmount;
        active.place = vCurrentPlace;
      }
    }
  } else {
    const cut = vPlace - 1;
    for (const active of activeRows) {
      if ((active.place ?? 0) >= cut) {
        active.amount = 0;
      }
    }
  }
}

async function applyLegacyStrokeFallback(subeventId: number) {
  const [grossRowsRaw] = await pool.query<any[]>(
    `
    SELECT gross_id AS row_id, flight_id, card_id, score, place, amount, used_yn
    FROM subEventPayGross
    WHERE subevent_id = ?
    `,
    [subeventId]
  );
  const [netRowsRaw] = await pool.query<any[]>(
    `
    SELECT net_id AS row_id, flight_id, card_id, score, place, amount, used_yn
    FROM subEventPayNet
    WHERE subevent_id = ?
    `,
    [subeventId]
  );
  const [payoutRows] = await pool.query<any[]>(
    `
    SELECT flight_id, place, amount
    FROM subEventPayOut
    WHERE subevent_id = ?
    `,
    [subeventId]
  );

  const payoutByFlight = new Map<string, Map<number, number>>();
  for (const row of payoutRows) {
    const flightKey = String(row.flight_id ?? "na");
    const place = Number(row.place);
    if (!Number.isFinite(place) || place <= 0) continue;
    const amount = Number(row.amount ?? 0);
    const map = payoutByFlight.get(flightKey) ?? new Map<number, number>();
    map.set(place, Number.isFinite(amount) ? amount : 0);
    payoutByFlight.set(flightKey, map);
  }

  const grossByFlight = new Map<string, LegacyStrokeRow[]>();
  for (const row of grossRowsRaw as LegacyStrokeRow[]) {
    const key = String(row.flight_id ?? "na");
    const arr = grossByFlight.get(key) ?? [];
    arr.push({ ...row, used_yn: 0, place: 0, amount: 0 });
    grossByFlight.set(key, arr);
  }

  const netByFlight = new Map<string, LegacyStrokeRow[]>();
  for (const row of netRowsRaw as LegacyStrokeRow[]) {
    const key = String(row.flight_id ?? "na");
    const arr = netByFlight.get(key) ?? [];
    arr.push({ ...row, used_yn: 0, place: 0, amount: 0 });
    netByFlight.set(key, arr);
  }

  const flights = new Set<string>([...grossByFlight.keys(), ...netByFlight.keys()]);

  for (const flightKey of flights) {
    const payoutByPlace = payoutByFlight.get(flightKey) ?? new Map<number, number>();
    const grossRows = grossByFlight.get(flightKey) ?? [];
    const netRows = netByFlight.get(flightKey) ?? [];

    recalcLegacySide(grossRows, payoutByPlace);
    recalcLegacySide(netRows, payoutByPlace);

    const activeGross = () => grossRows.filter((r) => r.used_yn !== 1);
    const activeNet = () => netRows.filter((r) => r.used_yn !== 1);

    const topByAmount = (rows: LegacyStrokeRow[]) => {
      const active = rows.filter((r) => r.used_yn !== 1);
      if (!active.length) return null;
      active.sort((a, b) => {
        const byAmount = legacyAmountValue(b.amount) - legacyAmountValue(a.amount);
        if (byAmount !== 0) return byAmount;
        const byScore = legacyScoreValue(a.score) - legacyScoreValue(b.score);
        if (byScore !== 0) return byScore;
        return a.row_id - b.row_id;
      });
      return active[0] ?? null;
    };

    while (activeGross().length > 0 || activeNet().length > 0) {
      const grossTop = topByAmount(grossRows);
      const netTop = topByAmount(netRows);
      const grossHigh = legacyAmountValue(grossTop?.amount ?? 0);
      const netHigh = legacyAmountValue(netTop?.amount ?? 0);

      if (grossHigh === 0 && netHigh === 0) {
        for (const row of activeGross()) row.used_yn = 1;
        for (const row of activeNet()) {
          row.used_yn = 1;
          row.place = 0;
          row.amount = 0;
        }
        continue;
      }

      if (grossHigh >= netHigh && grossTop) {
        const targetScore = legacyScoreValue(grossTop.score);
        const selectedCards = new Set<number>();
        for (const row of activeGross()) {
          if (legacyScoreValue(row.score) === targetScore) {
            row.used_yn = 1;
            if (typeof row.card_id === "number") selectedCards.add(row.card_id);
          }
        }

        for (const row of activeNet()) {
          if (typeof row.card_id === "number" && selectedCards.has(row.card_id)) {
            row.used_yn = 1;
            row.place = 0;
            row.amount = 0;
          }
        }
        for (const row of activeNet()) {
          row.place = 0;
          row.amount = 0;
        }
        recalcLegacySide(netRows, payoutByPlace);
      } else if (netTop) {
        const targetScore = legacyScoreValue(netTop.score);
        const selectedCards = new Set<number>();
        for (const row of activeNet()) {
          if (legacyScoreValue(row.score) === targetScore) {
            row.used_yn = 1;
            if (typeof row.card_id === "number") selectedCards.add(row.card_id);
          }
        }

        for (const row of activeGross()) {
          if (typeof row.card_id === "number" && selectedCards.has(row.card_id)) {
            row.used_yn = 1;
            row.place = 0;
            row.amount = 0;
          }
        }
        for (const row of activeGross()) {
          row.place = 0;
          row.amount = 0;
        }
        recalcLegacySide(grossRows, payoutByPlace);
      }
    }

    for (const row of grossRows) {
      const amount = legacyAmountValue(row.amount) > 0 ? row.amount : null;
      await pool.execute("UPDATE subEventPayGross SET place = ?, amount = ?, used_yn = ? WHERE gross_id = ?", [
        row.place ?? 0,
        amount,
        row.used_yn ?? 0,
        row.row_id,
      ]);
    }
    for (const row of netRows) {
      const amount = legacyAmountValue(row.amount) > 0 ? row.amount : null;
      await pool.execute("UPDATE subEventPayNet SET place = ?, amount = ?, used_yn = ? WHERE net_id = ?", [
        row.place ?? 0,
        amount,
        row.used_yn ?? 0,
        row.row_id,
      ]);
    }
  }
}

app.get("/subevents/:id/stroke", authMiddleware, async (req, res) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const subeventId = Number(req.params.id);
    if (!Number.isFinite(subeventId)) return res.status(400).json({ error: "Invalid subevent" });
    if (!payload?.courseId && !isGlobal(payload)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [subRows] = await pool.query<any[]>(
      "SELECT subevent_id, course_id FROM subEventMain WHERE subevent_id = ? LIMIT 1",
      [subeventId]
    );
    const sub = subRows?.[0];
    if (!sub) return res.status(404).json({ error: "Not found" });
    if (!isGlobal(payload) && sub.course_id !== payload.courseId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [grossRows] = await pool.query<any[]>(
      `
      SELECT
        g.gross_id,
        g.card_id,
        g.member_id,
        m.firstname,
        m.lastname,
        g.flight_id,
        rf.flightname,
        g.score,
        g.place,
        g.amount,
        g.used_yn
      FROM subEventPayGross g
      LEFT JOIN memberMain m ON m.member_id = g.member_id
      LEFT JOIN rosterFlight rf ON rf.flight_id = g.flight_id
      WHERE g.subevent_id = ?
      ORDER BY (g.flight_id IS NULL), rf.flightname ASC, g.place ASC, g.score ASC, m.lastname ASC, m.firstname ASC
      `,
      [subeventId]
    );

    const [netRows] = await pool.query<any[]>(
      `
      SELECT
        n.net_id,
        n.card_id,
        n.member_id,
        m.firstname,
        m.lastname,
        n.flight_id,
        rf.flightname,
        n.score,
        n.place,
        n.amount,
        n.used_yn
      FROM subEventPayNet n
      LEFT JOIN memberMain m ON m.member_id = n.member_id
      LEFT JOIN rosterFlight rf ON rf.flight_id = n.flight_id
      WHERE n.subevent_id = ?
      ORDER BY (n.flight_id IS NULL), rf.flightname ASC, n.place ASC, n.score ASC, m.lastname ASC, m.firstname ASC
      `,
      [subeventId]
    );

    const [payoutRows] = await pool.query<any[]>(
      `
      SELECT
        p.place,
        p.amount,
        p.flight_id,
        rf.flightname
      FROM subEventPayOut p
      LEFT JOIN rosterFlight rf ON rf.flight_id = p.flight_id
      WHERE p.subevent_id = ?
      ORDER BY (p.flight_id IS NULL), rf.flightname ASC, p.place ASC
      `,
      [subeventId]
    );

    res.json({ gross: grossRows, net: netRows, payouts: payoutRows });
  } catch (err) {
    console.error("subevent stroke list error", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/subevents/:id/stroke/post", authMiddleware, async (req, res) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const subeventId = Number(req.params.id);
    if (!Number.isFinite(subeventId)) return res.status(400).json({ error: "Invalid subevent" });
    if (!payload?.courseId && !isGlobal(payload)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [subRows] = await pool.query<any[]>(
      `
      SELECT subevent_id, course_id, eventtype_id
      FROM subEventMain
      WHERE subevent_id = ?
      LIMIT 1
      `,
      [subeventId]
    );
    const sub = subRows?.[0];
    if (!sub) return res.status(404).json({ error: "Not found" });
    if (!isGlobal(payload) && sub.course_id !== payload.courseId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    let mode: "net" | "gross" | "gross_net" = "gross_net";
    if (sub.eventtype_id === 5) {
      await pool.query("CALL spPickNet(?)", [subeventId]);
      mode = "net";
    } else if (sub.eventtype_id === 6) {
      await pool.query("CALL spPickGross(?)", [subeventId]);
      mode = "gross";
    } else {
      await pool.query("CALL spPick(?)", [subeventId]);
      mode = "gross_net";
    }

    const [diagRows] = await pool.query<any[]>(
      `
      SELECT
        (SELECT COUNT(*) FROM subEventPayOut WHERE subevent_id = ?) AS payout_rows,
        (SELECT COUNT(*) FROM subEventPayGross WHERE subevent_id = ?) AS gross_rows,
        (SELECT COUNT(*) FROM subEventPayNet WHERE subevent_id = ?) AS net_rows,
        (SELECT COUNT(*) FROM subEventPayGross WHERE subevent_id = ? AND COALESCE(place, 0) > 0 AND COALESCE(amount, 0) > 0) AS gross_winner_rows,
        (SELECT COUNT(*) FROM subEventPayNet WHERE subevent_id = ? AND COALESCE(place, 0) > 0 AND COALESCE(amount, 0) > 0) AS net_winner_rows,
        (SELECT COUNT(*) FROM subEventPayGross WHERE subevent_id = ? AND used_yn = 1) AS gross_used_rows,
        (SELECT COUNT(*) FROM subEventPayNet WHERE subevent_id = ? AND used_yn = 1) AS net_used_rows
      `,
      [subeventId, subeventId, subeventId, subeventId, subeventId, subeventId, subeventId]
    );

    let diagnostics = diagRows?.[0] ?? null;
    let fallbackApplied = false;
    const grossWinners = Number(diagnostics?.gross_winner_rows ?? 0);
    const netWinners = Number(diagnostics?.net_winner_rows ?? 0);
    const payoutRows = Number(diagnostics?.payout_rows ?? 0);

    if (grossWinners + netWinners === 0 && payoutRows > 0) {
      console.warn("stroke post produced no winner rows; applying legacy fallback", { subeventId, mode, diagnostics });
      await applyLegacyStrokeFallback(subeventId);
      fallbackApplied = true;

      const [diagRowsAfter] = await pool.query<any[]>(
        `
        SELECT
          (SELECT COUNT(*) FROM subEventPayOut WHERE subevent_id = ?) AS payout_rows,
          (SELECT COUNT(*) FROM subEventPayGross WHERE subevent_id = ?) AS gross_rows,
          (SELECT COUNT(*) FROM subEventPayNet WHERE subevent_id = ?) AS net_rows,
          (SELECT COUNT(*) FROM subEventPayGross WHERE subevent_id = ? AND COALESCE(place, 0) > 0 AND COALESCE(amount, 0) > 0) AS gross_winner_rows,
          (SELECT COUNT(*) FROM subEventPayNet WHERE subevent_id = ? AND COALESCE(place, 0) > 0 AND COALESCE(amount, 0) > 0) AS net_winner_rows,
          (SELECT COUNT(*) FROM subEventPayGross WHERE subevent_id = ? AND used_yn = 1) AS gross_used_rows,
          (SELECT COUNT(*) FROM subEventPayNet WHERE subevent_id = ? AND used_yn = 1) AS net_used_rows
        `,
        [subeventId, subeventId, subeventId, subeventId, subeventId, subeventId, subeventId]
      );
      diagnostics = diagRowsAfter?.[0] ?? diagnostics;
    }

    await syncEventMoneyListForSubevent(subeventId);
    return res.json({ ok: true, mode, diagnostics, fallbackApplied });
  } catch (err) {
    console.error("subevent stroke post error", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/subevents/:id/stroke/unpost", authMiddleware, async (req, res) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const subeventId = Number(req.params.id);
    if (!Number.isFinite(subeventId)) return res.status(400).json({ error: "Invalid subevent" });
    if (!payload?.courseId && !isGlobal(payload)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [subRows] = await pool.query<any[]>(
      "SELECT subevent_id, course_id FROM subEventMain WHERE subevent_id = ? LIMIT 1",
      [subeventId]
    );
    const sub = subRows?.[0];
    if (!sub) return res.status(404).json({ error: "Not found" });
    if (!isGlobal(payload) && sub.course_id !== payload.courseId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await pool.query("CALL spUnPost(?)", [subeventId]);
    await syncEventMoneyListForSubevent(subeventId);
    return res.json({ ok: true });
  } catch (err) {
    console.error("subevent stroke unpost error", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.patch("/subevents/:id/stroke/gross/:grossId", authMiddleware, async (req, res) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const subeventId = Number(req.params.id);
    const grossId = Number(req.params.grossId);
    if (!Number.isFinite(subeventId) || !Number.isFinite(grossId)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    if (!payload?.courseId && !isGlobal(payload)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const schema = z.object({
      amount: z.number().nullable(),
      place: z.number().int().nullable().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.flatten());

    const [rows] = await pool.query<any[]>(
      `
      SELECT g.gross_id, s.course_id
      FROM subEventPayGross g
      INNER JOIN subEventMain s ON s.subevent_id = g.subevent_id
      WHERE g.subevent_id = ? AND g.gross_id = ?
      LIMIT 1
      `,
      [subeventId, grossId]
    );
    const row = rows?.[0];
    if (!row) return res.status(404).json({ error: "Not found" });
    if (!isGlobal(payload) && row.course_id !== payload.courseId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const sets: string[] = ["amount = ?"];
    const params: any[] = [roundCurrencyAmount(parsed.data.amount)];
    if (parsed.data.place !== undefined) {
      sets.push("place = ?");
      params.push(parsed.data.place);
    }
    params.push(grossId);
    await pool.execute(`UPDATE subEventPayGross SET ${sets.join(", ")} WHERE gross_id = ?`, params);
    await syncEventMoneyListForSubevent(subeventId);
    return res.json({ ok: true });
  } catch (err) {
    console.error("subevent stroke gross update error", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.patch("/subevents/:id/stroke/net/:netId", authMiddleware, async (req, res) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const subeventId = Number(req.params.id);
    const netId = Number(req.params.netId);
    if (!Number.isFinite(subeventId) || !Number.isFinite(netId)) {
      return res.status(400).json({ error: "Invalid id" });
    }
    if (!payload?.courseId && !isGlobal(payload)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const schema = z.object({
      amount: z.number().nullable(),
      place: z.number().int().nullable().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.flatten());

    const [rows] = await pool.query<any[]>(
      `
      SELECT n.net_id, s.course_id
      FROM subEventPayNet n
      INNER JOIN subEventMain s ON s.subevent_id = n.subevent_id
      WHERE n.subevent_id = ? AND n.net_id = ?
      LIMIT 1
      `,
      [subeventId, netId]
    );
    const row = rows?.[0];
    if (!row) return res.status(404).json({ error: "Not found" });
    if (!isGlobal(payload) && row.course_id !== payload.courseId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const sets: string[] = ["amount = ?"];
    const params: any[] = [roundCurrencyAmount(parsed.data.amount)];
    if (parsed.data.place !== undefined) {
      sets.push("place = ?");
      params.push(parsed.data.place);
    }
    params.push(netId);
    await pool.execute(`UPDATE subEventPayNet SET ${sets.join(", ")} WHERE net_id = ?`, params);
    await syncEventMoneyListForSubevent(subeventId);
    return res.json({ ok: true });
  } catch (err) {
    console.error("subevent stroke net update error", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/subevents", authMiddleware, async (req, res) => {
  try {
    const payload = (req as any).user as JwtPayload;
    if (!payload?.courseId && !isGlobal(payload)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const schema = z.object({
      event_id: z.number().int(),
      eventtype_id: z.number().int().optional().nullable(),
      eventnumhole_id: z.number().int().optional().nullable(),
      roster_id: z.number().int().optional().nullable(),
      amount: z.number().optional().nullable(),
      addedmoney: z.number().optional().nullable(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.flatten());

    const [events] = await pool.query<any[]>(
      "SELECT event_id, course_id FROM eventMain WHERE event_id = ? LIMIT 1",
      [parsed.data.event_id]
    );
    const ev = events?.[0];
    if (!ev) return res.status(404).json({ error: "Event not found" });
    if (!isGlobal(payload) && ev.course_id !== payload.courseId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [result] = await pool.execute<mysql.ResultSetHeader>(
      `
        INSERT INTO subEventMain
          (course_id, event_id, eventtype_id, eventnumhole_id, roster_id, amount, addedmoney)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        ev.course_id,
        parsed.data.event_id,
        parsed.data.eventtype_id ?? null,
        parsed.data.eventnumhole_id ?? null,
        parsed.data.roster_id ?? null,
        parsed.data.amount ?? null,
        parsed.data.addedmoney ?? null,
      ]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error("subevent create error", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/subevents/:id", authMiddleware, async (req, res) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const subeventId = Number(req.params.id);
    if (!Number.isFinite(subeventId)) return res.status(400).json({ error: "Invalid subevent" });
    if (!payload?.courseId && !isGlobal(payload)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const schema = z.object({
      eventtype_id: z.number().int().optional().nullable(),
      eventnumhole_id: z.number().int().optional().nullable(),
      roster_id: z.number().int().optional().nullable(),
      amount: z.number().optional().nullable(),
      addedmoney: z.number().optional().nullable(),
      drawn_hole: z.number().int().min(1).max(9).optional().nullable(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.flatten());

    const [rows] = await pool.query<any[]>(
      "SELECT subevent_id, course_id FROM subEventMain WHERE subevent_id = ? LIMIT 1",
      [subeventId]
    );
    const row = rows?.[0];
    if (!row) return res.status(404).json({ error: "Not found" });
    if (!isGlobal(payload) && row.course_id !== payload.courseId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await pool.execute(
      `UPDATE subEventMain
       SET eventtype_id = ?, eventnumhole_id = ?, roster_id = ?, amount = ?, addedmoney = ?, drawn_hole = ?
       WHERE subevent_id = ?`,
      [
        parsed.data.eventtype_id ?? null,
        parsed.data.eventnumhole_id ?? null,
        parsed.data.roster_id ?? null,
        parsed.data.amount ?? null,
        parsed.data.addedmoney ?? null,
        parsed.data.drawn_hole ?? null,
        subeventId,
      ]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("subevent update error", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/subevents/:id", authMiddleware, async (req, res) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const subeventId = Number(req.params.id);
    if (!Number.isFinite(subeventId)) return res.status(400).json({ error: "Invalid subevent" });
    if (!payload?.courseId && !isGlobal(payload)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [rows] = await pool.query<any[]>(
      "SELECT subevent_id, course_id FROM subEventMain WHERE subevent_id = ? LIMIT 1",
      [subeventId]
    );
    const row = rows?.[0];
    if (!row) return res.status(404).json({ error: "Not found" });
    if (!isGlobal(payload) && row.course_id !== payload.courseId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await pool.execute("DELETE FROM subEventMain WHERE subevent_id = ?", [subeventId]);
    res.json({ ok: true });
  } catch (err) {
    console.error("subevent delete error", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/members/:id", authMiddleware, async (req, res) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const memberId = Number(req.params.id);
    if (!Number.isFinite(memberId)) return res.status(400).json({ error: "Invalid member" });
    if (!payload?.courseId && !isGlobal(payload)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [members] = await pool.query<any[]>(
      payload?.courseId && !isGlobal(payload)
        ? "SELECT member_id, course_id, firstname, lastname, email, rhandicap AS handicap, handicap18 FROM memberMain WHERE course_id = ? AND member_id = ? LIMIT 1"
        : "SELECT member_id, course_id, firstname, lastname, email, rhandicap AS handicap, handicap18 FROM memberMain WHERE member_id = ? LIMIT 1",
      payload?.courseId && !isGlobal(payload) ? [payload.courseId, memberId] : [memberId]
    );
    const member = members?.[0];
    if (!member) return res.status(404).json({ error: "Not found" });

    const [nineRows] = await pool.query<any[]>(
      `
        SELECT DISTINCT n.nine_id, n.ninename, n.numholes, n.startinghole,
               n.hole1, n.hole2, n.hole3, n.hole4, n.hole5, n.hole6, n.hole7, n.hole8, n.hole9,
               n.hole10, n.hole11, n.hole12, n.hole13, n.hole14, n.hole15, n.hole16, n.hole17, n.hole18
        FROM eventCard c
        LEFT JOIN courseNine n ON n.nine_id = c.nine_id
        WHERE c.course_id = ? AND c.member_id = ?
        ORDER BY n.ninename ASC
      `,
      [member.course_id ?? payload.courseId, memberId]
    );

    const roundsSql = `
      SELECT
        c.card_id,
        c.event_id,
        c.card_dt,
        c.gross,
        c.net,
        c.adjustedscore,
        c.numholes,
        e.eventname,
        c.hole1, c.hole2, c.hole3, c.hole4, c.hole5, c.hole6, c.hole7, c.hole8, c.hole9,
        c.hole10, c.hole11, c.hole12, c.hole13, c.hole14, c.hole15, c.hole16, c.hole17, c.hole18
      FROM eventCard c
      LEFT JOIN eventMain e ON e.event_id = c.event_id
      WHERE c.course_id = ? AND c.member_id = ? AND c.nine_id = ?
      ORDER BY c.card_dt DESC, c.card_id DESC
      LIMIT 10
    `;

    const groups: Array<{
      nine_id: number;
      ninename: string | null;
      numholes: number | null;
      startinghole: number | null;
      rounds: any[];
    }> = [];
    const courseId = member.course_id ?? payload.courseId;
    for (const nine of nineRows) {
      if (!nine?.nine_id) continue;
      const [rounds] = await pool.query<any[]>(roundsSql, [courseId, memberId, nine.nine_id]);
      groups.push({
        nine_id: nine.nine_id,
        ninename: nine.ninename ?? null,
        numholes: nine.numholes ?? null,
        startinghole: nine.startinghole ?? null,
        hole1: nine.hole1 ?? null,
        hole2: nine.hole2 ?? null,
        hole3: nine.hole3 ?? null,
        hole4: nine.hole4 ?? null,
        hole5: nine.hole5 ?? null,
        hole6: nine.hole6 ?? null,
        hole7: nine.hole7 ?? null,
        hole8: nine.hole8 ?? null,
        hole9: nine.hole9 ?? null,
        hole10: nine.hole10 ?? null,
        hole11: nine.hole11 ?? null,
        hole12: nine.hole12 ?? null,
        hole13: nine.hole13 ?? null,
        hole14: nine.hole14 ?? null,
        hole15: nine.hole15 ?? null,
        hole16: nine.hole16 ?? null,
        hole17: nine.hole17 ?? null,
        hole18: nine.hole18 ?? null,
        rounds,
      });
    }

    res.json({ member, groups });
  } catch (err) {
    console.error("member detail error", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/members/:id", authMiddleware, async (req, res) => {
  const payload = (req as any).user as JwtPayload;
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  const schema = z.object({
    firstname: z.string().min(1).max(50).optional(),
    lastname: z.string().min(1).max(50).optional(),
    email: z.string().email().max(255).optional().nullable(),
    handicap: z.number().optional().nullable(),
    handicap18: z.number().optional().nullable(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const [rows] = await pool.query<any[]>(
    "SELECT member_id, course_id FROM memberMain WHERE member_id = ? LIMIT 1",
    [id]
  );
  const member = rows?.[0];
  if (!member) return res.status(404).json({ error: "Not found" });
  if (!isGlobal(payload) && member.course_id !== payload.courseId) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const fields: string[] = [];
  const values: any[] = [];

  if (parsed.data.firstname !== undefined) {
    fields.push("firstname=?");
    values.push(parsed.data.firstname.trim());
  }
  if (parsed.data.lastname !== undefined) {
    fields.push("lastname=?");
    values.push(parsed.data.lastname.trim());
  }
  if (parsed.data.email !== undefined) {
    fields.push("email=?");
    values.push(parsed.data.email ? parsed.data.email.toLowerCase().trim() : null);
  }
  if (parsed.data.handicap !== undefined) {
    fields.push("handicap=?", "rhandicap=?");
    values.push(parsed.data.handicap ?? null, parsed.data.handicap ?? null);
  }
  if (parsed.data.handicap18 !== undefined) {
    fields.push("handicap18=?");
    values.push(parsed.data.handicap18 ?? null);
  }

  if (!fields.length) return res.status(400).json({ error: "No fields to update" });

  values.push(id);
  const [result] = await pool.execute<mysql.ResultSetHeader>(
    `UPDATE memberMain SET ${fields.join(", ")} WHERE member_id = ?`,
    values
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: "Not found" });
  res.json({ id });
});

app.get("/api/events/:id/winnings", authMiddleware, async (req, res) => {
  const payload = (req as any).user as JwtPayload;
  if (!payload?.courseId) return res.status(403).json({ error: "Forbidden" });
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  const [eventRows] = await pool.query<any[]>(
    "SELECT event_id FROM eventMain WHERE event_id = ? AND course_id = ? LIMIT 1",
    [id, payload.courseId]
  );
  if (!eventRows.length) return res.status(404).json({ error: "Not found" });

  const [rows] = await pool.query<any[]>(
    `
      SELECT p.eventotherpay_id, p.event_id, p.member_id, p.amount, p.description,
             m.firstname, m.lastname
      FROM eventOtherPay p
      LEFT JOIN memberMain m ON m.member_id = p.member_id
      WHERE p.event_id = ?
      ORDER BY p.eventotherpay_id DESC
    `,
    [id]
  );
  res.json(rows);
});

app.post("/api/events/:id/winnings", authMiddleware, async (req, res) => {
  const payload = (req as any).user as JwtPayload;
  if (!payload?.courseId) return res.status(403).json({ error: "Forbidden" });
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  const schema = z.object({
    member_id: z.number().int(),
    amount: z.number(),
    description: z.string().max(200).optional().nullable(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const [eventRows] = await pool.query<any[]>(
    "SELECT event_id, end_dt FROM eventMain WHERE event_id = ? AND course_id = ? LIMIT 1",
    [id, payload.courseId]
  );
  if (!eventRows.length) return res.status(404).json({ error: "Not found" });

  try {
    const [result] = await pool.execute<mysql.ResultSetHeader>(
      "INSERT INTO eventOtherPay (event_id, member_id, amount, description) VALUES (?, ?, ?, ?)",
      [id, parsed.data.member_id, parsed.data.amount, parsed.data.description ?? null]
    );
    const otherPayId = result.insertId;
    const payoutDate = eventRows[0].end_dt ? new Date(eventRows[0].end_dt).toISOString().slice(0, 10) : null;
    await pool.execute(
      `INSERT INTO eventMoneyList
        (member_id, amount, event_id, subevent_id, payout_date, description, place, flight_id, payout_type, source_table, source_id)
       VALUES (?, ?, ?, NULL, ?, ?, NULL, NULL, 'OTHER', 'eventOtherPay', ?)`,
      [parsed.data.member_id, parsed.data.amount, id, payoutDate, parsed.data.description ?? null, otherPayId]
    );
    res.status(201).json({ id: otherPayId });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/api/events/:id/winnings/:payId", authMiddleware, async (req, res) => {
  const payload = (req as any).user as JwtPayload;
  if (!payload?.courseId) return res.status(403).json({ error: "Forbidden" });
  const id = Number(req.params.id);
  const payId = Number(req.params.payId);
  if (!Number.isFinite(id) || !Number.isFinite(payId)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const schema = z.object({
    member_id: z.number().int(),
    amount: z.number(),
    description: z.string().max(200).optional().nullable(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const [eventRows] = await pool.query<any[]>(
    "SELECT event_id, course_id FROM eventMain WHERE event_id = ? AND course_id = ? LIMIT 1",
    [id, payload.courseId]
  );
  if (!eventRows.length) return res.status(404).json({ error: "Not found" });

  try {
    await pool.execute(
      `
        UPDATE eventOtherPay
        SET member_id = ?, amount = ?, description = ?
        WHERE eventotherpay_id = ? AND event_id = ?
      `,
      [parsed.data.member_id, parsed.data.amount, parsed.data.description ?? null, payId, id]
    );
    await pool.execute(
      `UPDATE eventMoneyList
       SET member_id = ?, amount = ?, description = ?
       WHERE source_table = 'eventOtherPay' AND source_id = ?`,
      [parsed.data.member_id, parsed.data.amount, parsed.data.description ?? null, payId]
    );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/api/events/:id/winnings/:payId", authMiddleware, async (req, res) => {
  const payload = (req as any).user as JwtPayload;
  if (!payload?.courseId) return res.status(403).json({ error: "Forbidden" });
  const id = Number(req.params.id);
  const payId = Number(req.params.payId);
  if (!Number.isFinite(id) || !Number.isFinite(payId)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const [eventRows] = await pool.query<any[]>(
    "SELECT event_id, course_id FROM eventMain WHERE event_id = ? AND course_id = ? LIMIT 1",
    [id, payload.courseId]
  );
  if (!eventRows.length) return res.status(404).json({ error: "Not found" });

  try {
    await pool.execute(
      "DELETE FROM eventOtherPay WHERE eventotherpay_id = ? AND event_id = ?",
      [payId, id]
    );
    await pool.execute(
      "DELETE FROM eventMoneyList WHERE source_table = 'eventOtherPay' AND source_id = ?",
      [payId]
    );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/events/:id/handicaps", authMiddleware, async (req, res) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

    const [eventRows] = await pool.query<any[]>(
      "SELECT event_id, course_id FROM eventMain WHERE event_id = ? LIMIT 1",
      [id]
    );
    if (!eventRows.length) return res.status(404).json({ error: "Not found" });
    if (!isGlobal(payload) && eventRows[0].course_id !== payload.courseId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await pool.query("CALL spHandicap(?)", [id]);
    await pool.execute("UPDATE eventMain SET last_handicap_posted = NOW() WHERE event_id = ?", [id]);

    const [rows] = await pool.query<any[]>(
      `
        SELECT m.member_id, m.firstname, m.lastname,
               eh.rhandicap, eh.rhandicap18
        FROM eventHandicap eh
        INNER JOIN memberMain m ON m.member_id = eh.member_id
        WHERE eh.event_id = ?
        ORDER BY m.lastname ASC, m.firstname ASC
      `,
      [id]
    );

    const [meta] = await pool.query<any[]>(
      "SELECT last_handicap_posted FROM eventMain WHERE event_id = ? LIMIT 1",
      [id]
    );
    res.json({ rows, last_posted: meta?.[0]?.last_handicap_posted ?? null });
  } catch (err) {
    console.error("post handicaps error", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/events/:id/handicaps", authMiddleware, async (req, res) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

    const [eventRows] = await pool.query<any[]>(
      "SELECT event_id, course_id, last_handicap_posted FROM eventMain WHERE event_id = ? LIMIT 1",
      [id]
    );
    if (!eventRows.length) return res.status(404).json({ error: "Not found" });
    if (!isGlobal(payload) && eventRows[0].course_id !== payload.courseId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [rows] = await pool.query<any[]>(
      `
        SELECT m.member_id, m.firstname, m.lastname,
               eh.rhandicap, eh.rhandicap18
        FROM eventHandicap eh
        INNER JOIN memberMain m ON m.member_id = eh.member_id
        WHERE eh.event_id = ?
        ORDER BY m.lastname ASC, m.firstname ASC
      `,
      [id]
    );
    res.json({ rows, last_posted: eventRows[0].last_handicap_posted ?? null });
  } catch (err) {
    console.error("get handicaps error", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/events/:id/files", authMiddleware, async (req, res) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const eventId = Number(req.params.id);
    if (!Number.isFinite(eventId)) return res.status(400).json({ error: "Invalid event" });

    const [events] = await pool.query<any[]>(
      "SELECT event_id, course_id FROM eventMain WHERE event_id = ? LIMIT 1",
      [eventId]
    );
    const ev = events?.[0];
    if (!ev) return res.status(404).json({ error: "Not found" });
    if (!isGlobal(payload) && ev.course_id !== payload.courseId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [rows] = await pool.query<any[]>(
      `
      SELECT eventfile_id, event_id, file_key, filename, content_type, size_bytes, uploaded_at
      FROM eventFile
      WHERE event_id = ?
      ORDER BY uploaded_at DESC, eventfile_id DESC
      `,
      [eventId]
    );
    const withUrls = await Promise.all(
      rows.map(async (row) => ({
        ...row,
        url: await presignGet(row.file_key),
      }))
    );
    res.json(withUrls);
  } catch (err) {
    console.error("event files error", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/events/:id/files/presign", authMiddleware, async (req, res) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const eventId = Number(req.params.id);
    if (!Number.isFinite(eventId)) return res.status(400).json({ error: "Invalid event" });

    const schema = z.object({
      filename: z.string().min(1).max(255),
      contentType: z.string().optional().nullable(),
      size: z.number().int().optional().nullable(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.flatten());

    const [events] = await pool.query<any[]>(
      "SELECT event_id, course_id FROM eventMain WHERE event_id = ? LIMIT 1",
      [eventId]
    );
    const ev = events?.[0];
    if (!ev) return res.status(404).json({ error: "Not found" });
    if (!isGlobal(payload) && ev.course_id !== payload.courseId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const ext = path.extname(parsed.data.filename || "").slice(0, 10);
    const key = `events/${eventId}/${randomUUID()}${ext}`;
    const uploadUrl = await presignPut(key);
    res.json({ uploadUrl, fileKey: key });
  } catch (err) {
    console.error("event files presign error", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/events/:id/files", authMiddleware, async (req, res) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const eventId = Number(req.params.id);
    if (!Number.isFinite(eventId)) return res.status(400).json({ error: "Invalid event" });

    const schema = z.object({
      fileKey: z.string().min(1).max(512),
      filename: z.string().min(1).max(255),
      contentType: z.string().optional().nullable(),
      size: z.number().int().optional().nullable(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.flatten());

    const [events] = await pool.query<any[]>(
      "SELECT event_id, course_id FROM eventMain WHERE event_id = ? LIMIT 1",
      [eventId]
    );
    const ev = events?.[0];
    if (!ev) return res.status(404).json({ error: "Not found" });
    if (!isGlobal(payload) && ev.course_id !== payload.courseId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [result] = await pool.execute<mysql.ResultSetHeader>(
      `INSERT INTO eventFile (event_id, file_key, filename, content_type, size_bytes)
       VALUES (?, ?, ?, ?, ?)`,
      [
        eventId,
        parsed.data.fileKey,
        parsed.data.filename,
        parsed.data.contentType ?? null,
        parsed.data.size ?? null,
      ]
    );
    res.json({ eventfile_id: result.insertId });
  } catch (err) {
    console.error("event files create error", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/api/events/:id/files/:fileId", authMiddleware, async (req, res) => {
  try {
    const payload = (req as any).user as JwtPayload;
    const eventId = Number(req.params.id);
    const fileId = Number(req.params.fileId);
    if (!Number.isFinite(eventId) || !Number.isFinite(fileId)) {
      return res.status(400).json({ error: "Invalid file" });
    }

    const [rows] = await pool.query<any[]>(
      "SELECT eventfile_id, event_id, file_key FROM eventFile WHERE eventfile_id = ? AND event_id = ?",
      [fileId, eventId]
    );
    const row = rows?.[0];
    if (!row) return res.status(404).json({ error: "Not found" });

    const [events] = await pool.query<any[]>(
      "SELECT event_id, course_id FROM eventMain WHERE event_id = ? LIMIT 1",
      [eventId]
    );
    const ev = events?.[0];
    if (!ev) return res.status(404).json({ error: "Not found" });
    if (!isGlobal(payload) && ev.course_id !== payload.courseId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await deleteObject(row.file_key);
    await pool.execute("DELETE FROM eventFile WHERE eventfile_id = ?", [fileId]);
    res.json({ ok: true });
  } catch (err) {
    console.error("event files delete error", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/members", authMiddleware, async (req, res) => {
  const payload = (req as any).user as JwtPayload;
  if (!payload?.courseId) return res.status(403).json({ error: "Forbidden" });

  const schema = z.object({
    firstname: z.string().min(1).max(50),
    lastname: z.string().min(1).max(50),
    handicap: z.number().optional().nullable(),
    handicap18: z.number().optional().nullable(),
    roster_ids: z.array(z.number().int()).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.execute<mysql.ResultSetHeader>(
      "INSERT INTO memberMain (course_id, firstname, lastname, handicap, rhandicap, handicap18) VALUES (?, ?, ?, ?, ?, ?)",
      [
        payload.courseId,
        parsed.data.firstname.trim(),
        parsed.data.lastname.trim(),
        parsed.data.handicap ?? null,
        parsed.data.handicap ?? null,
        parsed.data.handicap18 ?? null,
      ]
    );
    const memberId = result.insertId;
    const hdcpValue = parsed.data.handicap != null && Number.isFinite(parsed.data.handicap)
      ? Math.trunc(parsed.data.handicap)
      : 0;

    const rosterIds = parsed.data.roster_ids ?? [];
    for (const rosterId of rosterIds) {
      const [rosterRows] = await conn.query<any[]>(
        "SELECT roster_id FROM rosterMain WHERE roster_id = ? AND course_id = ? LIMIT 1",
        [rosterId, payload.courseId]
      );
      if (rosterRows.length) {
        await conn.execute(
          "INSERT INTO rosterMemberLink (roster_id, member_id, hdcp) VALUES (?, ?, ?)",
          [rosterId, memberId, hdcpValue]
        );
      }
    }

    await conn.commit();
    res.status(201).json({ id: memberId });
  } catch {
    await conn.rollback();
    res.status(500).json({ error: "Server error" });
  } finally {
    conn.release();
  }
});

app.delete("/members/:id", authMiddleware, async (req, res) => {
  const payload = (req as any).user as JwtPayload;
  if (!payload?.courseId) return res.status(403).json({ error: "Forbidden" });
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query<any[]>(
      "SELECT member_id, course_id FROM memberMain WHERE member_id = ? LIMIT 1",
      [id]
    );
    const member = rows?.[0];
    if (!member) {
      await conn.rollback();
      return res.status(404).json({ error: "Not found" });
    }
    if (member.course_id !== payload.courseId) {
      await conn.rollback();
      return res.status(403).json({ error: "Forbidden" });
    }

    await conn.query("DELETE FROM eventCard WHERE member_id = ?", [id]);
    await conn.query("DELETE FROM rosterMemberLink WHERE member_id = ?", [id]);
    await conn.query("DELETE FROM eventHandicap WHERE member_id = ?", [id]);
    await conn.query("DELETE FROM eventMoneyList WHERE member_id = ?", [id]);
    await conn.query("DELETE FROM memberMain WHERE member_id = ?", [id]);

    await conn.commit();
    res.status(204).send();
  } catch {
    await conn.rollback();
    res.status(500).json({ error: "Server error" });
  } finally {
    conn.release();
  }
});

app.get("/rosters", authMiddleware, async (req, res) => {
  const payload = (req as any).user as JwtPayload;
  const [rows] = await pool.query<any[]>(
    payload?.courseId
      ? "SELECT roster_id, rostername, course_id, active_yn FROM rosterMain WHERE course_id = ? ORDER BY rostername ASC"
      : "SELECT roster_id, rostername, course_id, active_yn FROM rosterMain ORDER BY rostername ASC",
    payload?.courseId ? [payload.courseId] : []
  );
  res.json(rows);
});

app.post("/rosters", authMiddleware, async (req, res) => {
  const payload = (req as any).user as JwtPayload;
  if (!payload?.courseId) return res.status(403).json({ error: "Forbidden" });

  const schema = z.object({
    rostername: z.string().min(1).max(50),
    active_yn: z.number().int().optional().nullable(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  try {
    const [result] = await pool.execute<mysql.ResultSetHeader>(
      "INSERT INTO rosterMain (rostername, course_id, active_yn) VALUES (?, ?, ?)",
      [parsed.data.rostername.trim(), payload.courseId, parsed.data.active_yn ?? 1]
    );
    res.status(201).json({ id: result.insertId });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/rosters/:id", authMiddleware, async (req, res) => {
  const payload = (req as any).user as JwtPayload;
  if (!payload?.courseId) return res.status(403).json({ error: "Forbidden" });
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query<any[]>(
      "SELECT roster_id, course_id FROM rosterMain WHERE roster_id = ? LIMIT 1",
      [id]
    );
    const roster = rows?.[0];
    if (!roster) {
      await conn.rollback();
      return res.status(404).json({ error: "Not found" });
    }
    if (roster.course_id !== payload.courseId) {
      await conn.rollback();
      return res.status(403).json({ error: "Forbidden" });
    }

    await conn.query("DELETE FROM rosterMemberLink WHERE roster_id = ?", [id]);
    await conn.query("DELETE FROM rosterFlight WHERE roster_id = ?", [id]);
    await conn.query("DELETE FROM rosterMain WHERE roster_id = ?", [id]);

    await conn.commit();
    res.status(204).send();
  } catch {
    await conn.rollback();
    res.status(500).json({ error: "Server error" });
  } finally {
    conn.release();
  }
});

app.get("/rosters/:id", authMiddleware, async (req, res) => {
  const payload = (req as any).user as JwtPayload;
  if (!payload?.courseId) return res.status(403).json({ error: "Forbidden" });
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
  const [rows] = await pool.query<any[]>(
    "SELECT roster_id, rostername, course_id, active_yn FROM rosterMain WHERE roster_id = ? AND course_id = ? LIMIT 1",
    [id, payload.courseId]
  );
  const roster = rows?.[0];
  if (!roster) return res.status(404).json({ error: "Not found" });
  res.json(roster);
});

app.get("/rosters/:id/flights", authMiddleware, async (req, res) => {
  const payload = (req as any).user as JwtPayload;
  if (!payload?.courseId) return res.status(403).json({ error: "Forbidden" });
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
  const [rows] = await pool.query<any[]>(
    "SELECT flight_id, roster_id, flightname, hdcp1, hdcp2 FROM rosterFlight WHERE roster_id = ? ORDER BY flightname ASC",
    [id]
  );
  res.json(rows);
});

app.post("/rosters/:id/flights", authMiddleware, async (req, res) => {
  const payload = (req as any).user as JwtPayload;
  if (!payload?.courseId) return res.status(403).json({ error: "Forbidden" });
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  const schema = z.object({
    flightname: z.string().min(1).max(50),
    hdcp1: z.number().optional().nullable(),
    hdcp2: z.number().optional().nullable(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  try {
    const [result] = await pool.execute<mysql.ResultSetHeader>(
      "INSERT INTO rosterFlight (roster_id, flightname, hdcp1, hdcp2) VALUES (?, ?, ?, ?)",
      [id, parsed.data.flightname.trim(), parsed.data.hdcp1 ?? null, parsed.data.hdcp2 ?? null]
    );
    res.status(201).json({ id: result.insertId });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/rosters/:id/flights/:flightId", authMiddleware, async (req, res) => {
  const payload = (req as any).user as JwtPayload;
  if (!payload?.courseId) return res.status(403).json({ error: "Forbidden" });
  const rosterId = Number(req.params.id);
  const flightId = Number(req.params.flightId);
  if (!Number.isFinite(rosterId) || !Number.isFinite(flightId)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  try {
    const [rows] = await pool.query<any[]>(
      `
        SELECT f.flight_id
        FROM rosterFlight f
        JOIN rosterMain r ON r.roster_id = f.roster_id
        WHERE f.flight_id = ? AND f.roster_id = ? AND r.course_id = ?
        LIMIT 1
      `,
      [flightId, rosterId, payload.courseId]
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });

    const [result] = await pool.execute<mysql.ResultSetHeader>(
      "DELETE FROM rosterFlight WHERE flight_id = ?",
      [flightId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Not found" });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});


app.get("/rosters/:id/members", authMiddleware, async (req, res) => {
  const payload = (req as any).user as JwtPayload;
  if (!payload?.courseId) return res.status(403).json({ error: "Forbidden" });

  const rosterId = Number(req.params.id);
  if (!Number.isFinite(rosterId)) return res.status(400).json({ error: "Invalid id" });

  try {
    const [rosterRows] = await pool.query<any[]>(
      "SELECT roster_id, rostername, course_id FROM rosterMain WHERE roster_id = ? LIMIT 1",
      [rosterId]
    );
    const roster = rosterRows?.[0];
    if (!roster) return res.status(404).json({ error: "Not found" });
    if (roster.course_id !== payload.courseId) return res.status(403).json({ error: "Forbidden" });

    const [onRoster] = await pool.query<any[]>(
      `
        SELECT
          m.member_id,
          m.firstname,
          m.lastname,
          m.rhandicap AS handicap
        FROM memberMain m
        WHERE m.course_id = ?
          AND EXISTS (
            SELECT 1
            FROM rosterMemberLink rml
            WHERE rml.roster_id = ? AND rml.member_id = m.member_id
          )
        ORDER BY m.lastname ASC, m.firstname ASC
      `,
      [payload.courseId, rosterId]
    );

    const [notOnRoster] = await pool.query<any[]>(
      `
        SELECT
          m.member_id,
          m.firstname,
          m.lastname,
          m.rhandicap AS handicap
        FROM memberMain m
        WHERE m.course_id = ?
          AND NOT EXISTS (
            SELECT 1
            FROM rosterMemberLink rml
            WHERE rml.roster_id = ? AND rml.member_id = m.member_id
          )
        ORDER BY m.lastname ASC, m.firstname ASC
      `,
      [payload.courseId, rosterId]
    );

    res.json({
      roster: {
        roster_id: roster.roster_id,
        rostername: roster.rostername,
      },
      onRoster,
      notOnRoster,
    });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/rosters/:id/members", authMiddleware, async (req, res) => {
  const payload = (req as any).user as JwtPayload;
  if (!payload?.courseId) return res.status(403).json({ error: "Forbidden" });

  const rosterId = Number(req.params.id);
  if (!Number.isFinite(rosterId)) return res.status(400).json({ error: "Invalid id" });

  const schema = z.object({
    member_id: z.number().int(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const memberId = parsed.data.member_id;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rosterRows] = await conn.query<any[]>(
      "SELECT roster_id, course_id FROM rosterMain WHERE roster_id = ? LIMIT 1",
      [rosterId]
    );
    const roster = rosterRows?.[0];
    if (!roster) {
      await conn.rollback();
      return res.status(404).json({ error: "Not found" });
    }
    if (roster.course_id !== payload.courseId) {
      await conn.rollback();
      return res.status(403).json({ error: "Forbidden" });
    }

    const [memberRows] = await conn.query<any[]>(
      "SELECT member_id, course_id, rhandicap FROM memberMain WHERE member_id = ? LIMIT 1",
      [memberId]
    );
    const member = memberRows?.[0];
    if (!member || member.course_id !== payload.courseId) {
      await conn.rollback();
      return res.status(404).json({ error: "Member not found" });
    }

    const [existingRows] = await conn.query<any[]>(
      "SELECT rostermemberlink_id FROM rosterMemberLink WHERE roster_id = ? AND member_id = ? LIMIT 1",
      [rosterId, memberId]
    );
    if (!existingRows.length) {
      const hdcpValue = member.rhandicap == null ? 0 : Number(member.rhandicap);
      await conn.execute(
        "INSERT INTO rosterMemberLink (roster_id, member_id, hdcp) VALUES (?, ?, ?)",
        [rosterId, memberId, Number.isFinite(hdcpValue) ? Math.trunc(hdcpValue) : 0]
      );
    }

    await conn.commit();
    res.status(201).json({ ok: true });
  } catch {
    await conn.rollback();
    res.status(500).json({ error: "Server error" });
  } finally {
    conn.release();
  }
});

app.delete("/rosters/:id/members/:memberId", authMiddleware, async (req, res) => {
  const payload = (req as any).user as JwtPayload;
  if (!payload?.courseId) return res.status(403).json({ error: "Forbidden" });

  const rosterId = Number(req.params.id);
  const memberId = Number(req.params.memberId);
  if (!Number.isFinite(rosterId) || !Number.isFinite(memberId)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rosterRows] = await conn.query<any[]>(
      "SELECT roster_id, course_id FROM rosterMain WHERE roster_id = ? LIMIT 1",
      [rosterId]
    );
    const roster = rosterRows?.[0];
    if (!roster) {
      await conn.rollback();
      return res.status(404).json({ error: "Not found" });
    }
    if (roster.course_id !== payload.courseId) {
      await conn.rollback();
      return res.status(403).json({ error: "Forbidden" });
    }

    const [result] = await conn.execute<mysql.ResultSetHeader>(
      "DELETE FROM rosterMemberLink WHERE roster_id = ? AND member_id = ?",
      [rosterId, memberId]
    );
    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ error: "Not found" });
    }

    await conn.commit();
    res.status(204).send();
  } catch {
    await conn.rollback();
    res.status(500).json({ error: "Server error" });
  } finally {
    conn.release();
  }
});
app.get("/users", authMiddleware, requireAdmin, async (_req, res) => {
  const [rows] = await pool.query<any[]>(
    `
      SELECT u.id, u.email, u.first_name, u.last_name, u.course_id, u.admin_yn, u.created_at, c.coursename
      FROM users u
      LEFT JOIN courseMain c ON c.course_id = u.course_id
      ORDER BY u.last_name ASC, u.first_name ASC
    `
  );
  res.json(rows);
});

app.post("/users", authMiddleware, requireAdmin, async (req, res) => {
  const schema = z.object({
    email: z.string().email().max(255),
    password: z.string().min(8).max(72),
    first_name: z.string().max(100).optional().nullable(),
    last_name: z.string().max(100).optional().nullable(),
    course_id: z.number().int().positive().optional().nullable(),
    admin_yn: z.number().int().optional().nullable(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const email = parsed.data.email.toLowerCase().trim();
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  try {
    const [result] = await pool.execute<mysql.ResultSetHeader>(
      "INSERT INTO users (email, password_hash, first_name, last_name, course_id, admin_yn) VALUES (?, ?, ?, ?, ?, ?)",
      [
        email,
        passwordHash,
        parsed.data.first_name ?? null,
        parsed.data.last_name ?? null,
        parsed.data.course_id ?? null,
        parsed.data.admin_yn ?? 0,
      ]
    );
    res.status(201).json({ id: result.insertId, email });
  } catch (err: any) {
    if (String(err?.code) === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Email already registered" });
    }
    return res.status(500).json({ error: "Server error" });
  }
});

app.put("/users/:id", authMiddleware, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  const schema = z.object({
    email: z.string().email().max(255).optional(),
    password: z.string().min(8).max(72).optional(),
    first_name: z.string().max(100).optional().nullable(),
    last_name: z.string().max(100).optional().nullable(),
    course_id: z.number().int().positive().optional().nullable(),
    admin_yn: z.number().int().optional().nullable(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const fields: string[] = [];
  const values: any[] = [];

  if (parsed.data.email) {
    fields.push("email=?");
    values.push(parsed.data.email.toLowerCase().trim());
  }
  if (parsed.data.password) {
    fields.push("password_hash=?");
    values.push(await bcrypt.hash(parsed.data.password, 12));
  }
  if (parsed.data.first_name !== undefined) {
    fields.push("first_name=?");
    values.push(parsed.data.first_name ?? null);
  }
  if (parsed.data.last_name !== undefined) {
    fields.push("last_name=?");
    values.push(parsed.data.last_name ?? null);
  }
  if (parsed.data.course_id !== undefined) {
    fields.push("course_id=?");
    values.push(parsed.data.course_id ?? null);
  }
  if (parsed.data.admin_yn !== undefined) {
    fields.push("admin_yn=?");
    values.push(parsed.data.admin_yn ?? 0);
  }

  if (!fields.length) return res.status(400).json({ error: "No fields to update" });

  values.push(id);
  const [result] = await pool.execute<mysql.ResultSetHeader>(
    `UPDATE users SET ${fields.join(", ")} WHERE id=?`,
    values
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: "Not found" });
  res.json({ id });
});

const clientDistCandidates = [
  process.env.CLIENT_DIST_PATH,
  path.resolve(__dirname, "../../client/dist"),
  path.resolve(process.cwd(), "client/dist"),
  path.resolve(process.cwd(), "../client/dist"),
].filter((p): p is string => Boolean(p));

const clientDist = clientDistCandidates.find((p) => fs.existsSync(path.join(p, "index.html")));
if (clientDist) {
  app.use(
    "/assets",
    express.static(path.join(clientDist, "assets"), {
      immutable: true,
      maxAge: "1y",
    }),
  );
  app.use(
    express.static(clientDist, {
      index: false,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith("index.html")) {
          res.setHeader("Cache-Control", "no-cache, must-revalidate");
        }
      },
    }),
  );
  app.get(/.*/, (req, res, next) => {
    // Keep API requests out of SPA fallback, but allow deep links like /public/:courseId.
    if (req.path.startsWith("/api")) return next();
    res.setHeader("Cache-Control", "no-cache, must-revalidate");
    return res.sendFile(path.join(clientDist, "index.html"));
  });
}

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => console.log(`API running on http://localhost:${port}`));
