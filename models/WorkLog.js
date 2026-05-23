import mongoose from "mongoose";

const workLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    // Local date string in YYYY-MM-DD format - PRIMARY field for all date operations
    dateStr: {
      type: String,
      required: [true, "Date string (YYYY-MM-DD) is required"],
      index: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"],
    },
    // Legacy: Date object for backward compatibility (deprecated, use dateStr instead)
    date: {
      type: Date,
      required: [true, "Date is required"],
      index: true,
    },
    timeSlot: {
      type: String,
      required: [true, "Time slot is required"],
      enum: Array.from({ length: 48 }, (_, i) => {
        const hours = Math.floor(i / 2);
        const minutes = (i % 2) * 30;
        return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
      }),
    },
    text: {
      type: String,
      default: "",
      maxlength: [2000, "Work log cannot exceed 2000 characters"],
    },
    isDraft: {
      type: Boolean,
      default: false,
    },
    // Wake-up time in HH:MM format (24-hour) - stored only on first log of the day
    wakeUpTime: {
      type: String,
      match: [/^\d{2}:\d{2}$/, "Wake-up time must be in HH:MM format"],
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Create compound index for unique slot per date per user (using dateStr as primary)
workLogSchema.index({ userId: 1, dateStr: 1, timeSlot: 1 }, { unique: true });
// Legacy index for backward compatibility
workLogSchema.index({ userId: 1, date: 1, timeSlot: 1 });

const WorkLog = mongoose.model("WorkLog", workLogSchema);

export default WorkLog;
