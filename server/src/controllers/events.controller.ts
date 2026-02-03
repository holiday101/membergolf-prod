import { Request, Response } from "express";
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
  // Expect ISO strings like "2026-01-26T00:00:00.000Z" or "2026-01-26T00:00:00Z"
  // mysql2 can handle JS Date too, but we’ll keep strings for clarity.
  return s;
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
    if (parsed.data.net !== undefined) {
      fields.push("net=?");
      values.push(parsed.data.net);
    }
    if (parsed.data.card_dt !== undefined) {
      fields.push("card_dt=?");
      values.push(parsed.data.card_dt);
    }
    for (let i = 1; i <= 18; i += 1) {
      const key = `hole${i}` as keyof typeof parsed.data;
      if (parsed.data[key] !== undefined) {
        fields.push(`${key}=?`);
        values.push((parsed.data as any)[key]);
      }
    }
    if (!fields.length) return res.status(400).json({ error: "No fields to update" });

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

    const [result]: any = await pool.execute(
      `INSERT INTO eventCard
        (course_id, member_id, event_id, gross, net, card_dt,
         hole1, hole2, hole3, hole4, hole5, hole6, hole7, hole8, hole9,
         hole10, hole11, hole12, hole13, hole14, hole15, hole16, hole17, hole18, nine_id)
       VALUES
        (?, ?, ?, ?, ?, ?,
         ?, ?, ?, ?, ?, ?, ?, ?, ?,
         ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        courseId,
        parsed.data.member_id,
        eventId,
        gross,
        parsed.data.net ?? null,
        parsed.data.card_dt ?? null,
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
        parsed.data.nine_id ?? null,
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
    if (start_dt !== undefined) parseISODateTime(start_dt);
    if (end_dt !== undefined) parseISODateTime(end_dt);

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
      start_dt ?? null,
      end_dt ?? null,
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
