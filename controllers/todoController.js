import Todo from "../models/Todo.js";
import { asyncHandler } from "../middleware/errorHandler.js";

export const getTodos = asyncHandler(async (req, res) => {
  const todos = await Todo.find({ user: req.user.id }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: todos,
  });
});

export const createTodo = asyncHandler(async (req, res) => {
  const { title, description, priority, category, dueDate } = req.body;

  if (!title) {
    return res.status(400).json({
      success: false,
      message: "Please provide a title",
    });
  }

  const todo = await Todo.create({
    title,
    description,
    priority,
    category,
    dueDate,
    user: req.user.id,
  });

  res.status(201).json({
    success: true,
    data: todo,
  });
});

export const updateTodo = asyncHandler(async (req, res) => {
  let todo = await Todo.findById(req.params.id);

  if (!todo) {
    return res.status(404).json({
      success: false,
      message: "Todo not found",
    });
  }

  if (todo.user.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to update this todo",
    });
  }

  todo = await Todo.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: todo,
  });
});

export const toggleTodo = asyncHandler(async (req, res) => {
  let todo = await Todo.findById(req.params.id);

  if (!todo) {
    return res.status(404).json({
      success: false,
      message: "Todo not found",
    });
  }

  if (todo.user.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to update this todo",
    });
  }

  todo.completed = !todo.completed;
  await todo.save();

  res.status(200).json({
    success: true,
    data: todo,
  });
});

export const deleteTodo = asyncHandler(async (req, res) => {
  const todo = await Todo.findById(req.params.id);

  if (!todo) {
    return res.status(404).json({
      success: false,
      message: "Todo not found",
    });
  }

  if (todo.user.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to delete this todo",
    });
  }

  await Todo.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Todo deleted successfully",
  });
});
