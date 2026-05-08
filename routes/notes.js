import express from "express";
import {
  getNotes,
  createNote,
  updateNote,
  deleteNote,
  toggleImportant,
} from "../controllers/notesController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.get("/", getNotes);
router.post("/", createNote);
router.put("/:id", updateNote);
router.delete("/:id", deleteNote);
router.patch("/:id/toggle-important", toggleImportant);

export default router;
