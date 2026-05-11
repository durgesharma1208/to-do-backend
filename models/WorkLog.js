import mongoose from "mongoose";

const workLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
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
  },
  {
    timestamps: true,
  },
);

// Create compound index for unique slot per date per user
workLogSchema.index({ userId: 1, date: 1, timeSlot: 1 }, { unique: true });

const WorkLog = mongoose.model("WorkLog", workLogSchema);

export default WorkLog;
