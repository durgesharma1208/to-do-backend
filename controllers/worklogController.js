import WorkLog from "../models/WorkLog.js";
import XLSX from "xlsx";
import { asyncHandler } from "../middleware/errorHandler.js";
import {
  formatDateString,
  parseLocalDateString,
  normalizeToStartOfDay,
  convertTo12HourFormat,
  getDateRangeQuery,
  getDateRangeQueryPair,
} from "../utils/dateUtils.js";

// Get all work logs for a specific date (using dateStr for accurate local date handling)
export const getWorkLogsByDate = asyncHandler(async (req, res) => {
  const { date } = req.params; // Expected format: YYYY-MM-DD

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({
      success: false,
      message: "Date must be in YYYY-MM-DD format",
    });
  }

  // Query using dateStr for accurate local date handling
  const workLogs = await WorkLog.find({
    userId: req.user.id,
    dateStr: date,
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

  // Validate date formats
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(endDate)
  ) {
    return res.status(400).json({
      success: false,
      message: "Dates must be in YYYY-MM-DD format",
    });
  }

  const workLogs = await WorkLog.find({
    userId: req.user.id,
    dateStr: {
      $gte: startDate,
      $lte: endDate,
    },
  });

  // Group by date for easier processing
  const dateMap = {};
  workLogs.forEach((log) => {
    const dateKey = log.dateStr; // Use the stored dateStr
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
  const { dateStr, timeSlot, text, isDraft, wakeUpTime } = req.body;

  if (!dateStr || !timeSlot) {
    return res.status(400).json({
      success: false,
      message: "Date string (YYYY-MM-DD) and time slot are required",
    });
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return res.status(400).json({
      success: false,
      message: "Date must be in YYYY-MM-DD format",
    });
  }

  // Convert dateStr to Date object for storage (for backward compatibility)
  const dateObj = parseLocalDateString(dateStr);

  let workLog = await WorkLog.findOne({
    userId: req.user.id,
    dateStr: dateStr,
    timeSlot,
  });

  if (workLog) {
    // Update existing
    workLog.text = text || "";
    workLog.isDraft = isDraft !== undefined ? isDraft : false;
    workLog = await workLog.save();
  } else {
    // Create new
    workLog = await WorkLog.create({
      userId: req.user.id,
      dateStr: dateStr,
      date: dateObj, // For backward compatibility
      timeSlot,
      text: text || "",
      isDraft: isDraft !== undefined ? isDraft : false,
      wakeUpTime: wakeUpTime || null, // Store wake-up time if provided
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

// Get productivity stats for a date (using dateStr)
export const getProductivityStats = asyncHandler(async (req, res) => {
  const { date } = req.params; // Expected format: YYYY-MM-DD

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({
      success: false,
      message: "Date must be in YYYY-MM-DD format",
    });
  }

  const workLogs = await WorkLog.find({
    userId: req.user.id,
    dateStr: date,
  });

  // Get wake-up time from first log of the day if available
  const wakeUpTime = workLogs.find((log) => log.wakeUpTime)?.wakeUpTime;

  const filledSlots = workLogs.filter(
    (log) => log.text && log.text.trim(),
  ).length;

  // Dynamic total slots based on wake-up time (if available, otherwise 48 for full day)
  let totalSlots = 48; // 24 hours * 2 (30-min slots)
  if (wakeUpTime) {
    // Calculate total slots from wake-up time to 11 PM
    const [wakeHours, wakeMinutes] = wakeUpTime.split(":").map(Number);
    const slotsUntil11PM = (23 - wakeHours) * 2 - Math.floor(wakeMinutes / 30);
    totalSlots = Math.max(1, slotsUntil11PM);
  }

  const productivity =
    totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;

  res.status(200).json({
    success: true,
    data: {
      date,
      filledSlots,
      totalSlots,
      productivity,
      wakeUpTime: wakeUpTime || "05:00", // Return wake-up time for reference
      logs: workLogs,
    },
  });
});

// Get weekly stats
export const getWeeklyStats = asyncHandler(async (req, res) => {
  const { date } = req.params; // Expected format: YYYY-MM-DD

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({
      success: false,
      message: "Date must be in YYYY-MM-DD format",
    });
  }

  // Parse the given date and find week start (Sunday)
  const dateObj = parseLocalDateString(date);
  const dayOfWeek = dateObj.getDay();
  const weekStart = new Date(dateObj);
  weekStart.setDate(weekStart.getDate() - dayOfWeek);

  const weekStartStr = formatDateString(weekStart);
  const weekEndDate = new Date(weekStart);
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  const weekEndStr = formatDateString(weekEndDate);

  const workLogs = await WorkLog.find({
    userId: req.user.id,
    dateStr: {
      $gte: weekStartStr,
      $lte: weekEndStr,
    },
  });

  // Group by date
  const dayStats = {};
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + i);
    const dateKey = formatDateString(day);
    dayStats[dateKey] = {
      date: dateKey,
      filledSlots: 0,
      totalSlots: 48,
      productivity: 0,
    };
  }

  workLogs.forEach((log) => {
    const dateKey = log.dateStr;
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
      weekStartDate: weekStartStr,
      stats,
      weekProductivity,
    },
  });
});

// Export work logs
export const exportWorkLogs = asyncHandler(async (req, res) => {
  const { startDate, endDate, format = "xlsx" } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({
      success: false,
      message: "Start date and end date are required",
    });
  }

  // Validate date formats
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(endDate)
  ) {
    return res.status(400).json({
      success: false,
      message: "Dates must be in YYYY-MM-DD format",
    });
  }

  if (startDate > endDate) {
    return res.status(400).json({
      success: false,
      message: "Start date must be before or equal to end date",
    });
  }

  const workLogs = await WorkLog.find({
    userId: req.user.id,
    dateStr: {
      $gte: startDate,
      $lte: endDate,
    },
  }).sort({ dateStr: 1, timeSlot: 1 });

  const dateHeaders = [];
  const dateMap = {};
  const scoreMap = {};
  const timeSlotSet = new Set();

  let current = parseLocalDateString(startDate);
  const end = parseLocalDateString(endDate);

  while (current <= end) {
    const dateKey = formatDateString(current);
    dateHeaders.push(dateKey);
    dateMap[dateKey] = {};
    scoreMap[dateKey] = 0;
    current.setDate(current.getDate() + 1);
  }

  workLogs.forEach((log) => {
    const dateKey = log.dateStr;
    if (!dateHeaders.includes(dateKey)) return;

    timeSlotSet.add(log.timeSlot);
    const cellValue = log.text ? log.text.trim() : "";

    dateMap[dateKey][log.timeSlot] = cellValue;

    const yesMatches = (cellValue.match(/\byes\b/gi) || []).length;
    const noMatches = (cellValue.match(/\bno\b/gi) || []).length;
    scoreMap[dateKey] += yesMatches - noMatches;
  });

  const timeSlots = Array.from(timeSlotSet).sort((a, b) => {
    const [aH, aM] = a.split(":").map(Number);
    const [bH, bM] = b.split(":").map(Number);
    return aH === bH ? aM - bM : aH - bH;
  });

  const headerRow = [
    "Time Slot",
    ...dateHeaders.map((date) => {
      const parsedDate = parseLocalDateString(date);
      return `${parsedDate.getMonth() + 1}/${parsedDate.getDate()}/${parsedDate.getFullYear()}`;
    }),
  ];

  const rows = [headerRow];

  timeSlots.forEach((slot) => {
    const row = [convertTo12HourFormat(slot)];
    dateHeaders.forEach((date) => {
      row.push(dateMap[date][slot] || "");
    });
    rows.push(row);
  });

  const totalRow = [
    "Total Score",
    ...dateHeaders.map((date) => scoreMap[date] || 0),
  ];
  rows.push(totalRow);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");

  const headerStyle = {
    font: { bold: true },
    fill: { patternType: "solid", fgColor: { rgb: "FFDCE6F1" } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: {
      top: { style: "thin", color: { auto: 1 } },
      bottom: { style: "thin", color: { auto: 1 } },
      left: { style: "thin", color: { auto: 1 } },
      right: { style: "thin", color: { auto: 1 } },
    },
  };

  const bodyStyle = {
    alignment: { vertical: "top", wrapText: true },
    border: {
      top: { style: "thin", color: { auto: 1 } },
      bottom: { style: "thin", color: { auto: 1 } },
      left: { style: "thin", color: { auto: 1 } },
      right: { style: "thin", color: { auto: 1 } },
    },
  };

  const totalStyle = {
    font: { bold: true },
    fill: { patternType: "solid", fgColor: { rgb: "FFFFF2CC" } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: bodyStyle.border,
  };

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = worksheet[cellAddress];
      if (!cell) continue;
      if (R === range.s.r) {
        cell.s = { ...headerStyle, ...(cell.s || {}) };
      } else if (R === range.e.r) {
        cell.s = { ...totalStyle, ...(cell.s || {}) };
      } else {
        cell.s = { ...bodyStyle, ...(cell.s || {}) };
      }
    }
  }

  worksheet["!cols"] = [{ wch: 16 }, ...dateHeaders.map(() => ({ wch: 20 }))];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Productivity Sheet");

  const fileBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "buffer",
    cellStyles: true,
  });

  if (format === "csv") {
    const csvBuffer = XLSX.write(workbook, {
      bookType: "csv",
      type: "buffer",
    });
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Productivity_${startDate}_to_${endDate}.csv`,
    );
    res.setHeader("Content-Type", "text/csv");
    return res.status(200).send(csvBuffer);
  }

  res.setHeader(
    "Content-Disposition",
    `attachment; filename=Productivity_${startDate}_to_${endDate}.xlsx`,
  );
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  return res.status(200).send(fileBuffer);
});
