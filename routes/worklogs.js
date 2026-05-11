import express from "express";
import {
  getWorkLogsByDate,
  getWorkLogsDateRange,
  upsertWorkLog,
  updateWorkLog,
  deleteWorkLog,
  getProductivityStats,
  getWeeklyStats,
  exportWorkLogs,
} from "../controllers/worklogController.js";
import { protect } from "../middleware/auth.js";
import { validate, worklogValidation } from "../middleware/validator.js";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// Get work logs for a specific date
router.get("/date/:date", getWorkLogsByDate);

// Get work logs for a date range (for calendar)
router.get("/range", getWorkLogsDateRange);

// Get productivity stats for a specific date
router.get("/stats/daily/:date", getProductivityStats);

// Get weekly stats
router.get("/stats/weekly/:date", getWeeklyStats);

// Export work logs
router.get("/export", exportWorkLogs);

// Create or update work log
router.post("/", worklogValidation, validate, upsertWorkLog);

// Update specific work log
router.put("/:id", validate, updateWorkLog);

// Delete work log
router.delete("/:id", deleteWorkLog);

export default router;
