import WorkLog from "../models/WorkLog.js";
import { asyncHandler } from "../middleware/errorHandler.js";

// Get all work logs for a specific date
export const getWorkLogsByDate = asyncHandler(async (req, res) => {
  const { date } = req.params;
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const workLogs = await WorkLog.find({
    userId: req.user.id,
    date: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
  }).sort({ timeSlot: 1 });

  res.status(200).json({
    success: true,
    data: workLogs,
  });
});

// Get work logs for a date range (for calendar highlights)
export const getWorkLogsDateRange = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({
      success: false,
      message: "Start date and end date are required",
    });
  }

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const workLogs = await WorkLog.find({
    userId: req.user.id,
    date: {
      $gte: start,
      $lte: end,
    },
  });

  // Group by date for easier processing
  const dateMap = {};
  workLogs.forEach((log) => {
    const dateKey = new Date(log.date).toISOString().split("T")[0];
    if (!dateMap[dateKey]) {
      dateMap[dateKey] = [];
    }
    dateMap[dateKey].push(log);
  });

  res.status(200).json({
    success: true,
    data: dateMap,
  });
});

// Create or update work log for a specific time slot
export const upsertWorkLog = asyncHandler(async (req, res) => {
  const { date, timeSlot, text, isDraft } = req.body;

  if (!date || !timeSlot) {
    return res.status(400).json({
      success: false,
      message: "Date and time slot are required",
    });
  }

  const dateObj = new Date(date);
  dateObj.setHours(0, 0, 0, 0);

  let workLog = await WorkLog.findOne({
    userId: req.user.id,
    date: dateObj,
    timeSlot,
  });

  if (workLog) {
    // Update existing
    workLog.text = text || "";
    workLog.isDraft = isDraft !== undefined ? isDraft : false;
    workLog.save();
  } else {
    // Create new
    workLog = await WorkLog.create({
      userId: req.user.id,
      date: dateObj,
      timeSlot,
      text: text || "",
      isDraft: isDraft !== undefined ? isDraft : false,
    });
  }

  res.status(201).json({
    success: true,
    data: workLog,
  });
});

// Update work log
export const updateWorkLog = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { text, isDraft } = req.body;

  let workLog = await WorkLog.findById(id);

  if (!workLog) {
    return res.status(404).json({
      success: false,
      message: "Work log not found",
    });
  }

  if (workLog.userId.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to update this work log",
    });
  }

  if (text !== undefined) workLog.text = text;
  if (isDraft !== undefined) workLog.isDraft = isDraft;

  workLog = await workLog.save();

  res.status(200).json({
    success: true,
    data: workLog,
  });
});

// Delete work log
export const deleteWorkLog = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const workLog = await WorkLog.findById(id);

  if (!workLog) {
    return res.status(404).json({
      success: false,
      message: "Work log not found",
    });
  }

  if (workLog.userId.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to delete this work log",
    });
  }

  await WorkLog.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: "Work log deleted successfully",
  });
});

// Get productivity stats for a date
export const getProductivityStats = asyncHandler(async (req, res) => {
  const { date } = req.params;
  const dateObj = new Date(date);
  dateObj.setHours(0, 0, 0, 0);

  const endDate = new Date(dateObj);
  endDate.setDate(endDate.getDate() + 1);

  const workLogs = await WorkLog.find({
    userId: req.user.id,
    date: {
      $gte: dateObj,
      $lt: endDate,
    },
  });

  const filledSlots = workLogs.filter(
    (log) => log.text && log.text.trim(),
  ).length;
  const totalSlots = 48; // 24 hours * 2 (30-min slots)
  const productivity = Math.round((filledSlots / totalSlots) * 100);

  res.status(200).json({
    success: true,
    data: {
      date,
      filledSlots,
      totalSlots,
      productivity,
      logs: workLogs,
    },
  });
});

// Get weekly stats
export const getWeeklyStats = asyncHandler(async (req, res) => {
  const { date } = req.params;
  const startDate = new Date(date);
  startDate.setDate(startDate.getDate() - startDate.getDay());
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 7);

  const workLogs = await WorkLog.find({
    userId: req.user.id,
    date: {
      $gte: startDate,
      $lt: endDate,
    },
  });

  // Group by date
  const dayStats = {};
  for (let i = 0; i < 7; i++) {
    const day = new Date(startDate);
    day.setDate(day.getDate() + i);
    const dateKey = day.toISOString().split("T")[0];
    dayStats[dateKey] = {
      date: dateKey,
      filledSlots: 0,
      totalSlots: 48,
      productivity: 0,
    };
  }

  workLogs.forEach((log) => {
    const dateKey = new Date(log.date).toISOString().split("T")[0];
    if (dateKey in dayStats && log.text && log.text.trim()) {
      dayStats[dateKey].filledSlots++;
    }
  });

  // Calculate productivity percentages
  Object.keys(dayStats).forEach((key) => {
    dayStats[key].productivity = Math.round(
      (dayStats[key].filledSlots / dayStats[key].totalSlots) * 100,
    );
  });

  const stats = Object.values(dayStats);
  const weekProductivity =
    stats.length > 0
      ? Math.round(
          stats.reduce((sum, day) => sum + day.productivity, 0) / stats.length,
        )
      : 0;

  res.status(200).json({
    success: true,
    data: {
      weekStartDate: startDate.toISOString().split("T")[0],
      stats,
      weekProductivity,
    },
  });
});

// Export work logs
export const exportWorkLogs = asyncHandler(async (req, res) => {
  const { startDate, endDate, format } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({
      success: false,
      message: "Start date and end date are required",
    });
  }

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const workLogs = await WorkLog.find({
    userId: req.user.id,
    date: {
      $gte: start,
      $lte: end,
    },
  }).sort({ date: 1, timeSlot: 1 });

  // Transform data for export
  const exportData = workLogs.map((log) => ({
    Date: new Date(log.date).toLocaleDateString(),
    "Time Slot": log.timeSlot,
    "Work Description": log.text,
    Status: log.isDraft ? "Draft" : "Completed",
    "Created At": new Date(log.createdAt).toLocaleString(),
    "Updated At": new Date(log.updatedAt).toLocaleString(),
  }));

  res.status(200).json({
    success: true,
    data: exportData,
  });
});
