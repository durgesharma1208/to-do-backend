import Note from "../models/Note.js";
import { asyncHandler } from "../middleware/errorHandler.js";

export const getNotes = asyncHandler(async (req, res) => {
  const notes = await Note.find({ user: req.user.id }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: notes,
  });
});

export const createNote = asyncHandler(async (req, res) => {
  const { title, content, color, isImportant } = req.body;

  // No longer need to check for fields, validator does it
  // if (!title || !content) {
  //   return res.status(400).json({
  //     success: false,
  //     message: "Please provide title and content",
  //   });
  // }

  const note = await Note.create({
    title,
    content,
    color: color || "yellow",
    isImportant: isImportant || false,
    user: req.user.id,
  });

  res.status(201).json({
    success: true,
    data: note,
  });
});

export const updateNote = asyncHandler(async (req, res) => {
  let note = await Note.findById(req.params.id);

  if (!note) {
    return res.status(404).json({
      success: false,
      message: "Note not found",
    });
  }

  if (note.user.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to update this note",
    });
  }

  note = await Note.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: note,
  });
});

export const deleteNote = asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id);

  if (!note) {
    return res.status(404).json({
      success: false,
      message: "Note not found",
    });
  }

  if (note.user.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to delete this note",
    });
  }

  await Note.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Note deleted successfully",
  });
});

export const toggleImportant = asyncHandler(async (req, res) => {
  let note = await Note.findById(req.params.id);

  if (!note) {
    return res.status(404).json({
      success: false,
      message: "Note not found",
    });
  }

  if (note.user.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to update this note",
    });
  }

  note.isImportant = !note.isImportant;
  await note.save();

  res.status(200).json({
    success: true,
    data: note,
  });
});
