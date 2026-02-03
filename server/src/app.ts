import "dotenv/config";
import express from "express";
import cors from "cors";
import { eventsRouter } from "./routes/events.routes";

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use("/api/events", eventsRouter);

export default app;
