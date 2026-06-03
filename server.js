// IMPORTANT: env.js MUST be the first import to ensure dotenv loads
// before any other module reads process.env values at initialization time.
import "./config/env.js";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import connectDB from "./config/db.js";
import { errorHandler } from "./middleware/errorHandler.js";

import authRoutes from "./routes/auth.js";
import todoRoutes from "./routes/todos.js";
import notesRoutes from "./routes/notes.js";
import worklogRoutes from "./routes/worklogs.js";
import notificationsRoutes from "./routes/notifications.js";
import "./cron/notificationCron.js";
import dns from "dns";
dns.setServers(["1.1.1.1", "8.8.8.8"]);
const app = express();

connectDB();

app.use(helmet());
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});
app.use("/api/auth", authLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/todos", todoRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/worklogs", worklogRoutes);
app.use("/api/notifications", notificationsRoutes);

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Server is running" });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
