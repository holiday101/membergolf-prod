"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventsRouter = void 0;
const express_1 = require("express");
const events_controller_1 = require("../controllers/events.controller");
const auth_1 = require("../middleware/auth");
exports.eventsRouter = (0, express_1.Router)();
/**
 * All routes below this require authentication
 * req.user.id must be populated by requireAuth
 */
exports.eventsRouter.use(auth_1.requireAuth);
/**
 * GET /api/events?start=...&end=...
 * Fetch events overlapping a date range
 */
exports.eventsRouter.get("/", events_controller_1.listEvents);
// GET /api/events/:id
exports.eventsRouter.get("/:id", events_controller_1.getEvent);
exports.eventsRouter.get("/:id/cards", events_controller_1.listEventCards);
exports.eventsRouter.post("/:id/cards", events_controller_1.createEventCard);
exports.eventsRouter.put("/:id/cards/:cardId", events_controller_1.updateEventCard);
/**
 * POST /api/events
 * Create a new event
 */
exports.eventsRouter.post("/", events_controller_1.createEvent);
/**
 * PUT /api/events/:id
 * Update an event
 */
exports.eventsRouter.put("/:id", events_controller_1.updateEvent);
/**
 * DELETE /api/events/:id
 * Delete an event
 */
exports.eventsRouter.delete("/:id", events_controller_1.deleteEvent);
//# sourceMappingURL=events.routes.js.map