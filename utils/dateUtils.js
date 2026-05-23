/**
 * Backend Date Utilities - All functions work with local dates
 * Uses YYYY-MM-DD format for date strings to avoid timezone issues
 */

/**
 * Get today's date as YYYY-MM-DD string (local timezone)
 * @returns {string} Date string in YYYY-MM-DD format
 */
export const getTodayDateString = () => {
  const today = new Date();
  return formatDateString(today);
};

/**
 * Format a Date object to YYYY-MM-DD string (local timezone)
 * @param {Date|string} date - Date object or date string
 * @returns {string} Date string in YYYY-MM-DD format
 */
export const formatDateString = (date) => {
  let d;
  if (typeof date === "string") {
    d = new Date(date + "T00:00:00"); // Assume local time if string
  } else {
    d = new Date(date);
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

/**
 * Parse a date string (YYYY-MM-DD) and return start of day as Date object
 * Handles timezone safely - interprets as local time
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {Date} Date object set to start of day
 */
export const parseLocalDateString = (dateString) => {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  return date;
};

/**
 * Get MongoDB query range for a specific date
 * Returns $gte and $lt operators for querying all entries on a specific day
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {Object} MongoDB date range query
 */
export const getDateRangeQuery = (dateString) => {
  const startOfDay = parseLocalDateString(dateString);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  return {
    $gte: startOfDay,
    $lt: endOfDay,
  };
};

/**
 * Get MongoDB query range for a date range
 * @param {string} startDateString - Start date in YYYY-MM-DD format
 * @param {string} endDateString - End date in YYYY-MM-DD format (inclusive)
 * @returns {Object} MongoDB date range query
 */
export const getDateRangeQueryPair = (startDateString, endDateString) => {
  const startOfDay = parseLocalDateString(startDateString);
  const endOfDay = new Date(parseLocalDateString(endDateString));
  endOfDay.setDate(endOfDay.getDate() + 1);

  return {
    $gte: startOfDay,
    $lt: endOfDay,
  };
};

/**
 * Normalize a date to start of day (00:00:00)
 * @param {Date} date - Date object
 * @returns {Date} Normalized date at start of day
 */
export const normalizeToStartOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Convert 24-hour time format to 12-hour AM/PM format
 * @param {string} time24 - Time in HH:MM format (24-hour)
 * @returns {string} Time in h:MM AM/PM format (12-hour)
 */
export const convertTo12HourFormat = (time24) => {
  const [hours, minutes] = time24.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
};

/**
 * Convert 12-hour AM/PM format to 24-hour format
 * @param {string} time12 - Time in h:MM AM/PM format
 * @returns {string} Time in HH:MM format (24-hour)
 */
export const convertTo24HourFormat = (time12) => {
  const [time, period] = time12.split(" ");
  const [hours, minutes] = time.split(":").map(Number);

  let hours24 = hours;
  if (period === "PM" && hours !== 12) {
    hours24 = hours + 12;
  } else if (period === "AM" && hours === 12) {
    hours24 = 0;
  }

  return `${String(hours24).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

/**
 * Generate time slots for a specific day based on wake-up time
 * @param {string} wakeUpTime - Wake-up time in HH:MM format (24-hour), e.g., "05:00"
 * @returns {Array<{time24: string, time12: string}>} Array of time slots
 */
export const generateDynamicTimeSlots = (wakeUpTime = "05:00") => {
  const [wakeHours, wakeMinutes] = wakeUpTime.split(":").map(Number);
  const slots = [];

  // Generate slots from wake-up time to 11 PM (23:00)
  let currentHours = wakeHours;
  let currentMinutes = wakeMinutes;

  while (currentHours < 23) {
    const time24 = `${String(currentHours).padStart(2, "0")}:${String(currentMinutes).padStart(2, "0")}`;
    const time12 = convertTo12HourFormat(time24);

    slots.push({
      time24,
      time12,
      display: `${time12} - ${convertTo12HourFormat(getNextSlotTime(time24))}`,
    });

    // Add 30 minutes
    currentMinutes += 30;
    if (currentMinutes >= 60) {
      currentMinutes -= 60;
      currentHours += 1;
    }
  }

  return slots;
};

/**
 * Helper: Get next 30-minute slot time
 * @param {string} time24 - Current time in HH:MM format
 * @returns {string} Next slot time in HH:MM format
 */
const getNextSlotTime = (time24) => {
  const [hours, minutes] = time24.split(":").map(Number);
  let nextHours = hours;
  let nextMinutes = minutes + 30;

  if (nextMinutes >= 60) {
    nextMinutes -= 60;
    nextHours += 1;
  }

  return `${String(nextHours).padStart(2, "0")}:${String(nextMinutes).padStart(2, "0")}`;
};

/**
 * Get default wake-up time if not specified
 * @returns {string} Default time "05:00"
 */
export const getDefaultWakeUpTime = () => {
  return "05:00";
};
