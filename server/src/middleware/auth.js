"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function requireAuth(req, res, next) {
    const header = req.header("Authorization");
    if (!header?.startsWith("Bearer "))
        return res.status(401).json({ error: "Missing token" });
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET)
        return res.status(500).json({ error: "Server misconfigured" });
    const token = header.slice("Bearer ".length);
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = { id: payload.userId, courseId: payload.courseId ?? null, memberId: payload.memberId ?? null };
        next();
    }
    catch {
        return res.status(401).json({ error: "Invalid token" });
    }
}
//# sourceMappingURL=auth.js.map