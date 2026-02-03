import { Router } from "express";
import {
  listEvents,
  createEvent,
  getEvent,
  listEventCards,
  updateEventCard,
  createEventCard,
  updateEvent,
  deleteEvent,
} from "../controllers/events.controller";
import { requireAuth } from "../middleware/auth";

export const eventsRouter = Router();

/**
 * All routes below this require authentication
 * req.user.id must be populated by requireAuth
 */
eventsRouter.use(requireAuth);

/**
 * GET /api/events?start=...&end=...
 * Fetch events overlapping a date range
 */
eventsRouter.get("/", listEvents);

// GET /api/events/:id
eventsRouter.get("/:id", getEvent);
eventsRouter.get("/:id/cards", listEventCards);
eventsRouter.post("/:id/cards", createEventCard);
eventsRouter.put("/:id/cards/:cardId", updateEventCard);

/**
 * POST /api/events
 * Create a new event
 */
eventsRouter.post("/", createEvent);

/**
 * PUT /api/events/:id
 * Update an event
 */
eventsRouter.put("/:id", updateEvent);

/**
 * DELETE /api/events/:id
 * Delete an event
 */
eventsRouter.delete("/:id", deleteEvent);
