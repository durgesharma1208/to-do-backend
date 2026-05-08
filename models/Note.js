import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please provide a title"],
      trim: true,
      maxlength: [100, "Title cannot be more than 100 characters"],
    },
    content: {
      type: String,
      required: [true, "Please provide content"],
      maxlength: [2000, "Content cannot be more than 2000 characters"],
    },
    color: {
      type: String,
      enum: ["yellow", "green", "blue", "pink", "purple"],
      default: "yellow",
    },
    isImportant: {
      type: Boolean,
      default: false,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Note", noteSchema);
