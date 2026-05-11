import express from "express";
import {
  getNotes,
  createNote,
  updateNote,
  deleteNote,
  toggleImportant,
} from "../controllers/notesController.js";
import { protect } from "../middleware/auth.js";
import { validate, noteValidation } from "../middleware/validator.js";

const router = express.Router();

router.use(protect);

router.get("/", getNotes);
router.post("/", noteValidation, validate, createNote);
router.put("/:id", noteValidation, validate, updateNote);
router.delete("/:id", deleteNote);
router.patch("/:id/toggle-important", toggleImportant);

export default router;
