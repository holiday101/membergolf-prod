import { Request, Response } from "express";
import { z } from "zod";
import { pool } from "../db/pool";

// Basic helpers
function requireUserId(req: Request): number {
  const id = req.user?.id;
  if (!id) throw new Error("Unauthorized");
  return id;
}
function getCourseId(req: Request): number | null {
  return req.user?.courseId ?? null;
}
function requireCourseId(req: Request): number {
  const courseId = getCourseId(req);
  if (!courseId) throw new Error("Forbidden");
  return courseId;
}

function parseISODateTime(s: unknown): string {
  if (typeof s !== "string" || !s.trim()) throw new Error("Invalid datetime");
  const raw = s.trim();
  const pad = (n: number) => String(n).padStart(2, "0");

  // Accept MySQL-style DATE and DATETIME strings directly.
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw} 00:00:00`;
  const mysqlDateTime = raw.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})(?::(\d{2}))?$/);
  if (mysqlDateTime) return `${mysqlDateTime[1]} ${mysqlDateTime[2]}:${mysqlDateTime[3] ?? "00"}`;

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid datetime");
  // Normalize to MySQL DATETIME format in UTC.
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(
    d.getUTCHours()
  )}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

type NineCalcRow = {
  nine_id: number | null;
  numholes: number | null;
  sloperating: number | null;
  courserating: number | null;
};

type CardDerivedValues = {
  nineId: number | null;
  numholes: number | null;
  handicap: number | null;
  net: number | null;
  adjustedScore: number | null;
  hdiff: number | null;
};

async function getEffectiveNine(
  courseId: number,
  eventId: number,
  requestedNineId: number | null | undefined
): Promise<NineCalcRow | null> {
  let effectiveNineId = requestedNineId ?? null;
  if (effectiveNineId == null) {
    const [eventRows]: any = await pool.query(
      "SELECT nine_id FROM eventMain WHERE event_id = ? AND course_id = ? LIMIT 1",
      [eventId, courseId]
    );
    effectiveNineId = eventRows?.[0]?.nine_id ?? null;
  }
  if (effectiveNineId == null) return null;

  const [nineRows]: any = await pool.query(
    `
      SELECT nine_id, numholes, sloperating, courserating
      FROM courseNine
      WHERE nine_id = ? AND course_id = ?
      LIMIT 1
    `,
    [effectiveNineId, courseId]
  );
  return nineRows?.[0] ?? null;
}

async function getApplicableHandicap(
  courseId: number,
  eventId: number,
  memberId: number | null,
  numholes: number | null
): Promise<number | null> {
  if (!memberId) return null;

  const [eventHandicapRows]: any = await pool.query(
    `
      SELECT handicap, handicap18, rhandicap, rhandicap18
      FROM eventHandicap
      WHERE event_id = ? AND member_id = ?
      LIMIT 1
    `,
    [eventId, memberId]
  );
  const eventHandicap = eventHandicapRows?.[0];
  if (eventHandicap) {
    if (numholes === 18) {
      if (eventHandicap.handicap18 != null) return Number(eventHandicap.handicap18);
      if (eventHandicap.rhandicap18 != null) return Math.round(Number(eventHandicap.rhandicap18));
    }
    if (eventHandicap.handicap != null) return Number(eventHandicap.handicap);
    if (eventHandicap.rhandicap != null) return Math.round(Number(eventHandicap.rhandicap));
  }

  const [memberRows]: any = await pool.query(
    `
      SELECT handicap, handicap18, rhandicap
      FROM memberMain
      WHERE member_id = ? AND course_id = ?
      LIMIT 1
    `,
    [memberId, courseId]
  );
  const member = memberRows?.[0];
  if (!member) return null;
  if (numholes === 18) {
    if (member.handicap18 != null) return Number(member.handicap18);
    if (member.rhandicap != null) return Math.round(Number(member.rhandicap) * 2);
  }
  if (member.handicap != null) return Number(member.handicap);
  if (member.rhandicap != null) return Math.round(Number(member.rhandicap));
  return null;
}

function computeAdjustedScore(gross: number | null): number | null {
  return gross == null ? null : gross;
}

function computeHdiff(
  adjustedScore: number | null,
  slopeRating: number | null,
  courseRating: number | null
): number | null {
  if (adjustedScore == null || slopeRating == null || courseRating == null) return null;
  const slope = Number(slopeRating);
  const rating = Number(courseRating);
  if (!Number.isFinite(adjustedScore) || !Number.isFinite(slope) || !Number.isFinite(rating) || slope === 0) {
    return null;
  }
  return Number((((adjustedScore - rating) * 113) / slope).toFixed(2));
}

async function buildDerivedCardValues(
  courseId: number,
  eventId: number,
  memberId: number | null,
  requestedNineId: number | null | undefined,
  gross: number | null
): Promise<CardDerivedValues> {
  const nine = await getEffectiveNine(courseId, eventId, requestedNineId);
  const numholes = nine?.numholes ?? null;
  const handicap = await getApplicableHandicap(courseId, eventId, memberId, numholes);
  const adjustedScore = computeAdjustedScore(gross);
  return {
    nineId: nine?.nine_id ?? (requestedNineId ?? null),
    numholes,
    handicap,
    net: gross != null && handicap != null ? gross - handicap : null,
    adjustedScore,
    hdiff: computeHdiff(adjustedScore, nine?.sloperating ?? null, nine?.courserating ?? null),
  };
}

// GET /api/events?start=...&end=...
export async function listEvents(req: Request, res: Response) {
  try {
    requireUserId(req);
    const start = parseISODateTime(req.query.start);
    const end = parseISODateTime(req.query.end);
    const courseId = getCourseId(req);
    if (!courseId) return res.status(403).json({ error: "Forbidden" });

    const sql = `
      SELECT
        eventMain.event_id AS id,
        eventMain.course_id,
        eventMain.eventname,
        eventMain.eventdescription,
        eventMain.start_dt,
        eventMain.end_dt,
        eventMain.handicap_yn,
        eventMain.nine_id,
        n.ninename AS ninename,
        NULL AS user_id
      FROM eventMain
      LEFT JOIN courseNine n ON n.nine_id = eventMain.nine_id
      WHERE start_dt <= ?
        AND end_dt >= ?
        AND eventMain.course_id = ?
      ORDER BY start_dt ASC, eventMain.event_id ASC
    `;

    const [rows] = await pool.query(sql, [end, start, courseId]);
    res.json(rows);
  } catch (err: any) {
    res.status(err.message === "Unauthorized" ? 401 : err.message === "Forbidden" ? 403 : 400).json({ error: err.message });
  }
}

// GET /api/events/:id
export async function getEvent(req: Request, res: Response) {
  try {
    requireUserId(req);
    const courseId = requireCourseId(req);
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) throw new Error("Invalid id");

    const [rows]: any = await pool.query(
      `
        SELECT
          eventMain.event_id AS id,
          eventMain.course_id,
          eventMain.eventname,
          eventMain.eventdescription,
          eventMain.start_dt,
          eventMain.end_dt,
          eventMain.handicap_yn,
          eventMain.nine_id,
          n.ninename AS ninename,
          n.numholes AS numholes,
          n.startinghole AS startinghole
        FROM eventMain
        LEFT JOIN courseNine n ON n.nine_id = eventMain.nine_id
        WHERE eventMain.event_id = ? AND eventMain.course_id = ?
        LIMIT 1
      `,
      [id, courseId]
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (err: any) {
    res.status(err.message === "Unauthorized" ? 401 : err.message === "Forbidden" ? 403 : 400).json({ error: err.message });
  }
}

// GET /api/events/:id/cards
export async function listEventCards(req: Request, res: Response) {
  try {
    requireUserId(req);
    const courseId = requireCourseId(req);
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) throw new Error("Invalid id");

    const [rows]: any = await pool.query(
      `
        SELECT
          c.card_id,
          c.event_id,
          c.member_id,
          c.nine_id,
          m.firstname,
          m.lastname,
          c.gross,
          c.net,
          c.adjustedscore,
          c.handicap,
          c.hdiff,
          c.numholes,
          c.card_dt,
          c.hole1, c.hole2, c.hole3, c.hole4, c.hole5, c.hole6, c.hole7, c.hole8, c.hole9,
          c.hole10, c.hole11, c.hole12, c.hole13, c.hole14, c.hole15, c.hole16, c.hole17, c.hole18
        FROM eventCard c
        LEFT JOIN memberMain m ON m.member_id = c.member_id
        WHERE c.event_id = ? AND c.course_id = ?
        ORDER BY c.card_id DESC
      `,
      [id, courseId]
    );
    res.json(rows);
  } catch (err: any) {
    res.status(err.message === "Unauthorized" ? 401 : err.message === "Forbidden" ? 403 : 400).json({ error: err.message });
  }
}

// PUT /api/events/:id/cards/:cardId
export async function updateEventCard(req: Request, res: Response) {
  try {
    requireUserId(req);
    const courseId = requireCourseId(req);
    const eventId = Number(req.params.id);
    const cardId = Number(req.params.cardId);
    if (!Number.isFinite(eventId) || !Number.isFinite(cardId)) throw new Error("Invalid id");

    const schema = z.object({
      member_id: z.number().int().optional().nullable(),
      nine_id: z.number().int().optional().nullable(),
      gross: z.number().int().optional().nullable(),
      net: z.number().int().optional().nullable(),
      card_dt: z.string().optional().nullable(),
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
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.flatten());

    const [existingRows]: any = await pool.query(
      `
        SELECT member_id, nine_id, gross
        FROM eventCard
        WHERE card_id = ? AND event_id = ? AND course_id = ?
        LIMIT 1
      `,
      [cardId, eventId, courseId]
    );
    const existing = existingRows?.[0];
    if (!existing) return res.status(404).json({ error: "Not found" });

    const fields: string[] = [];
    const values: any[] = [];
    if (parsed.data.member_id !== undefined) {
      fields.push("member_id=?");
      values.push(parsed.data.member_id);
    }
    if (parsed.data.nine_id !== undefined) {
      fields.push("nine_id=?");
      values.push(parsed.data.nine_id);
    }
    if (parsed.data.gross !== undefined) {
      fields.push("gross=?");
      values.push(parsed.data.gross);
    }
    if (parsed.data.card_dt !== undefined) {
      fields.push("card_dt=?");
      values.push(parsed.data.card_dt === null ? null : parseISODateTime(parsed.data.card_dt));
    }
    for (let i = 1; i <= 18; i += 1) {
      const key = `hole${i}` as keyof typeof parsed.data;
      if (parsed.data[key] !== undefined) {
        fields.push(`${key}=?`);
        values.push((parsed.data as any)[key]);
      }
    }
    if (!fields.length) return res.status(400).json({ error: "No fields to update" });

    const effectiveMemberId =
      parsed.data.member_id !== undefined ? parsed.data.member_id ?? null : existing.member_id ?? null;
    const effectiveNineId =
      parsed.data.nine_id !== undefined ? parsed.data.nine_id ?? null : existing.nine_id ?? null;
    const effectiveGross =
      parsed.data.gross !== undefined ? parsed.data.gross ?? null : existing.gross ?? null;
    const derived = await buildDerivedCardValues(courseId, eventId, effectiveMemberId, effectiveNineId, effectiveGross);
    fields.push("handicap=?", "net=?", "adjustedscore=?", "hdiff=?", "numholes=?");
    values.push(derived.handicap, derived.net, derived.adjustedScore, derived.hdiff, derived.numholes);

    values.push(cardId, eventId, courseId);
    const [result]: any = await pool.execute(
      `UPDATE eventCard SET ${fields.join(", ")} WHERE card_id = ? AND event_id = ? AND course_id = ?`,
      values
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Not found" });
    res.json({ card_id: cardId });
  } catch (err: any) {
    res.status(err.message === "Unauthorized" ? 401 : err.message === "Forbidden" ? 403 : 400).json({ error: err.message });
  }
}

// DELETE /api/events/:id/cards/:cardId
export async function deleteEventCard(req: Request, res: Response) {
  try {
    requireUserId(req);
    const courseId = requireCourseId(req);
    const eventId = Number(req.params.id);
    const cardId = Number(req.params.cardId);
    if (!Number.isFinite(eventId) || !Number.isFinite(cardId)) throw new Error("Invalid id");

    const [result]: any = await pool.execute(
      `DELETE FROM eventCard WHERE card_id = ? AND event_id = ? AND course_id = ?`,
      [cardId, eventId, courseId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(err.message === "Unauthorized" ? 401 : err.message === "Forbidden" ? 403 : 400).json({ error: err.message });
  }
}

// POST /api/events/:id/cards
export async function createEventCard(req: Request, res: Response) {
  try {
    requireUserId(req);
    const courseId = requireCourseId(req);
    const eventId = Number(req.params.id);
    if (!Number.isFinite(eventId)) throw new Error("Invalid id");

    const schema = z.object({
      member_id: z.number().int(),
      nine_id: z.number().int().optional().nullable(),
      gross: z.number().int().optional().nullable(),
      net: z.number().int().optional().nullable(),
      card_dt: z.string().optional().nullable(),
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
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.flatten());

    const holes: number[] = [];
    for (let i = 1; i <= 18; i += 1) {
      const key = `hole${i}` as keyof typeof parsed.data;
      const val = parsed.data[key];
      if (typeof val === "number") holes.push(val);
    }
    const gross = parsed.data.gross ?? (holes.length ? holes.reduce((a, b) => a + b, 0) : null);
    const cardDt = parsed.data.card_dt == null ? null : parseISODateTime(parsed.data.card_dt);
    const derived = await buildDerivedCardValues(
      courseId,
      eventId,
      parsed.data.member_id,
      parsed.data.nine_id ?? null,
      gross
    );

    const [result]: any = await pool.execute(
      `INSERT INTO eventCard
        (course_id, member_id, event_id, gross, net, adjustedscore, handicap, hdiff, card_dt,
         hole1, hole2, hole3, hole4, hole5, hole6, hole7, hole8, hole9,
         hole10, hole11, hole12, hole13, hole14, hole15, hole16, hole17, hole18, nine_id, numholes)
       VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?,
         ?, ?, ?, ?, ?, ?, ?, ?, ?,
         ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        courseId,
        parsed.data.member_id,
        eventId,
        gross,
        derived.net,
        derived.adjustedScore,
        derived.handicap,
        derived.hdiff,
        cardDt,
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
        derived.nineId,
        derived.numholes,
      ]
    );
    res.status(201).json({ card_id: result.insertId });
  } catch (err: any) {
    res.status(err.message === "Unauthorized" ? 401 : err.message === "Forbidden" ? 403 : 400).json({ error: err.message });
  }
}

// POST /api/events
export async function createEvent(req: Request, res: Response) {
  try {
    requireUserId(req);
    const courseId = requireCourseId(req);

    const {
      eventname,
      eventdescription = null,
      start_dt,
      end_dt,
      handicap_yn = 0,
      nine_id = null,
    } = req.body ?? {};

    if (!eventname || typeof eventname !== "string") throw new Error("eventname required");
    const start = parseISODateTime(start_dt);
    const end = parseISODateTime(end_dt);

    const sql = `
      INSERT INTO eventMain (course_id, eventname, eventdescription, start_dt, end_dt, handicap_yn, nine_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const [result]: any = await pool.execute(sql, [
      courseId,
      eventname,
      eventdescription,
      start,
      end,
      Number(Boolean(handicap_yn)),
      nine_id,
    ]);

    const [rows]: any = await pool.query(`SELECT * FROM eventMain WHERE event_id = ? AND course_id = ?`, [
      result.insertId,
      courseId,
    ]);

    res.status(201).json(rows[0]);
  } catch (err: any) {
    res.status(err.message === "Unauthorized" ? 401 : err.message === "Forbidden" ? 403 : 400).json({ error: err.message });
  }
}

// PUT /api/events/:id
export async function updateEvent(req: Request, res: Response) {
  try {
    requireUserId(req);
    const courseId = requireCourseId(req);
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) throw new Error("Invalid id");

    const {
      course_id,
      eventname,
      eventdescription,
      start_dt,
      end_dt,
      handicap_yn,
      nine_id,
    } = req.body ?? {};

    // Minimal validation; tighten as desired
    if (eventname !== undefined && typeof eventname !== "string") throw new Error("eventname must be string");
    const parsedStart = start_dt !== undefined ? parseISODateTime(start_dt) : null;
    const parsedEnd = end_dt !== undefined ? parseISODateTime(end_dt) : null;

    const sql = `
      UPDATE eventMain
      SET
        eventname = COALESCE(?, eventname),
        eventdescription = COALESCE(?, eventdescription),
        start_dt = COALESCE(?, start_dt),
        end_dt = COALESCE(?, end_dt),
        handicap_yn = COALESCE(?, handicap_yn),
        nine_id = COALESCE(?, nine_id)
      WHERE event_id = ? AND course_id = ?
    `;

    const [result]: any = await pool.execute(sql, [
      eventname ?? null,
      eventdescription ?? null,
      parsedStart,
      parsedEnd,
      handicap_yn !== undefined ? Number(Boolean(handicap_yn)) : null,
      nine_id ?? null,
      id,
      courseId,
    ]);

    if (result.affectedRows === 0) return res.status(404).json({ error: "Not found" });

    const [rows]: any = await pool.query(`SELECT * FROM eventMain WHERE event_id = ? AND course_id = ?`, [id, courseId]);
    res.json(rows[0]);
  } catch (err: any) {
    res.status(err.message === "Unauthorized" ? 401 : err.message === "Forbidden" ? 403 : 400).json({ error: err.message });
  }
}

// DELETE /api/events/:id
export async function deleteEvent(req: Request, res: Response) {
  try {
    requireUserId(req);
    const courseId = requireCourseId(req);
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) throw new Error("Invalid id");

    const [result]: any = await pool.execute(`DELETE FROM eventMain WHERE event_id = ? AND course_id = ?`, [
      id,
      courseId,
    ]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Not found" });

    res.status(204).send();
  } catch (err: any) {
    res.status(err.message === "Unauthorized" ? 401 : err.message === "Forbidden" ? 403 : 400).json({ error: err.message });
  }
}
