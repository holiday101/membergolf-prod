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
import { eventsRouter } from "./routes/events.routes";
import { presignGet, presignPut, deleteObject } from "./s3";



dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:5173" }));
app.use("/api/events", eventsRouter);

app.get("/public/:courseId/events", async (req, res) => {
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

app.get("/public/:courseId/events/:eventId", async (req, res) => {
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

app.get("/public/:courseId/events/:eventId/files", async (req, res) => {
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

app.get("/public/:courseId/members", async (req, res) => {
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


app.get("/public/:courseId/moneylist", async (req, res) => {
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
          OR YEAR(COALESCE(ml.payout_date, e.start_dt, e2.start_dt, ml.created_at)) = ?
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

app.get("/public/:courseId/course", async (req, res) => {
  try {
    const courseId = Number(req.params.courseId);
    if (!Number.isFinite(courseId)) return res.status(400).json({ error: "Invalid course" });
    const [rows] = await pool.query<any[]>(
      "SELECT course_id, coursename, leagueinfo, logo, titlesponsor, website, titlesponsor_link, decimalhandicap_yn FROM courseMain WHERE course_id = ? LIMIT 1",
      [courseId]
    );
    const course = rows?.[0];
    if (!course) return res.status(404).json({ error: "Not found" });
    const logo_url = course.logo ? await presignGet(course.logo) : null;
    const titlesponsor_url = course.titlesponsor ? await presignGet(course.titlesponsor) : null;
    res.json({ ...course, logo_url, titlesponsor_url });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/course", authMiddleware, async (req, res) => {
  try {
    const payload = (req as any).user as JwtPayload;
    if (!payload?.courseId) return res.status(403).json({ error: "Forbidden" });
    const [rows] = await pool.query<any[]>(
      "SELECT course_id, coursename, decimalhandicap_yn FROM courseMain WHERE course_id = ? LIMIT 1",
      [payload.courseId]
    );
    const course = rows?.[0];
    if (!course) return res.status(404).json({ error: "Not found" });
    res.json(course);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/public/:courseId/members/:memberId", async (req, res) => {
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

    res.json({ member, groups });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/public/lead", async (req, res) => {
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
        memberId,
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
        memberId,
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

  const memberId = await findMemberIdByEmail(user.course_id ?? null, user.email);

  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      courseId: user.course_id ?? null,
      memberId,
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
      memberId,
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

    const memberId = await findMemberIdByEmail(row.course_id ?? null, row.email ?? payload.email);

    res.json({
      user: {
        userId: row.id,
        email: row.email,
        firstName: row.first_name ?? null,
        lastName: row.last_name ?? null,
        courseId: row.course_id ?? null,
        memberId,
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

app.post("/courses/manage", authMiddleware, requireAdmin, async (req, res) => {
  const payload = (req as any).user as JwtPayload;
  if (!isGlobal(payload)) return res.status(403).json({ error: "Forbidden" });

  const schema = z.object({
    coursename: z.string().min(1).max(200),
    leagueinfo: z.string().max(2000).optional().nullable(),
    website: z.string().max(250).optional().nullable(),
    titlesponsor_link: z.string().max(512).optional().nullable(),
    payout: z.number().optional().nullable(),
    cardsused: z.number().int().optional().nullable(),
    cardsmax: z.number().int().optional().nullable(),
    handicap_yn: z.number().int().optional().nullable(),
    decimalhandicap_yn: z.number().int().optional().nullable(),
    active_yn: z.number().int().optional().nullable(),
    logo: z.string().max(512).optional().nullable(),
    titlesponsor: z.string().max(512).optional().nullable(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const [result] = await pool.execute<mysql.ResultSetHeader>(
    `INSERT INTO courseMain
      (coursename, leagueinfo, website, titlesponsor_link, payout, cardsused, cardsmax, handicap_yn, decimalhandicap_yn, active_yn, logo, titlesponsor)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    leagueinfo: z.string().max(2000).optional().nullable(),
    website: z.string().max(250).optional().nullable(),
    titlesponsor_link: z.string().max(512).optional().nullable(),
    payout: z.number().optional().nullable(),
    cardsused: z.number().int().optional().nullable(),
    cardsmax: z.number().int().optional().nullable(),
    handicap_yn: z.number().int().optional().nullable(),
    decimalhandicap_yn: z.number().int().optional().nullable(),
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
        s.amount,
        s.addedmoney
      FROM subEventMain s
      LEFT JOIN eventMain e ON e.event_id = s.event_id
      LEFT JOIN subEventType t ON t.eventtype_id = s.eventtype_id
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
        s.addedmoney
      FROM subEventMain s
      LEFT JOIN eventMain e ON e.event_id = s.event_id
      LEFT JOIN subEventType t ON t.eventtype_id = s.eventtype_id
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
       SET eventtype_id = ?, eventnumhole_id = ?, roster_id = ?, amount = ?, addedmoney = ?
       WHERE subevent_id = ?`,
      [
        parsed.data.eventtype_id ?? null,
        parsed.data.eventnumhole_id ?? null,
        parsed.data.roster_id ?? null,
        parsed.data.amount ?? null,
        parsed.data.addedmoney ?? null,
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
    fields.push("rhandicap=?");
    values.push(parsed.data.handicap ?? null);
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
    "SELECT event_id FROM eventMain WHERE event_id = ? AND course_id = ? LIMIT 1",
    [id, payload.courseId]
  );
  if (!eventRows.length) return res.status(404).json({ error: "Not found" });

  try {
    const [result] = await pool.execute<mysql.ResultSetHeader>(
      "INSERT INTO eventOtherPay (event_id, member_id, amount, description) VALUES (?, ?, ?, ?)",
      [id, parsed.data.member_id, parsed.data.amount, parsed.data.description ?? null]
    );
    res.status(201).json({ id: result.insertId });
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
    email: z.string().email().max(255).optional().nullable(),
    handicap: z.number().optional().nullable(),
    handicap18: z.number().optional().nullable(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  try {
    const [result] = await pool.execute<mysql.ResultSetHeader>(
      "INSERT INTO memberMain (course_id, firstname, lastname, email, rhandicap, handicap18) VALUES (?, ?, ?, ?, ?, ?)",
      [
        payload.courseId,
        parsed.data.firstname.trim(),
        parsed.data.lastname.trim(),
        parsed.data.email ? parsed.data.email.toLowerCase().trim() : null,
        parsed.data.handicap ?? null,
        parsed.data.handicap18 ?? null,
      ]
    );
    res.status(201).json({ id: result.insertId });
  } catch {
    res.status(500).json({ error: "Server error" });
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

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => console.log(`API running on http://localhost:${port}`));
