import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header("Authorization");
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "Missing token" });

  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) return res.status(500).json({ error: "Server misconfigured" });

  const token = header.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      userId: number;
      courseId?: number | null;
    };
    req.user = { id: payload.userId, courseId: payload.courseId ?? null };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}
