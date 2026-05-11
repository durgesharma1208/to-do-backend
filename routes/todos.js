import express from "express";
import {
  getTodos,
  createTodo,
  updateTodo,
  toggleTodo,
  deleteTodo,
} from "../controllers/todoController.js";
import { protect } from "../middleware/auth.js";
import { validate, todoValidation } from "../middleware/validator.js";

const router = express.Router();

router.use(protect);

router.get("/", getTodos);
router.post("/", todoValidation, validate, createTodo);
router.put("/:id", todoValidation, validate, updateTodo);
router.patch("/:id/toggle", toggleTodo);
router.delete("/:id", deleteTodo);

export default router;
