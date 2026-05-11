import { body, validationResult } from "express-validator";

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((err) => ({
        field: err.param,
        message: err.msg,
      })),
    });
  }
  next();
};

// Worklog validation
export const worklogValidation = [
  body("date")
    .notEmpty()
    .withMessage("Date is required")
    .isISO8601()
    .withMessage("Date must be a valid ISO 8601 date"),
  body("timeSlot")
    .notEmpty()
    .withMessage("Time slot is required")
    .matches(/^([0-1][0-9]|2[0-3]):([0][0]|[3]0)$/)
    .withMessage(
      "Time slot must be in HH:MM format (00:00-23:30, in 30-min intervals)",
    ),
  body("text")
    .optional({ checkFalsy: true })
    .isString()
    .withMessage("Text must be a string")
    .isLength({ max: 2000 })
    .withMessage("Text cannot exceed 2000 characters"),
  body("isDraft")
    .optional()
    .isBoolean()
    .withMessage("isDraft must be a boolean"),
];

// Register validation (placeholder)
export const registerValidation = [
  body("email").isEmail().withMessage("Please provide a valid email"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  body("name").notEmpty().withMessage("Name is required"),
];

// Login validation (placeholder)
export const loginValidation = [
  body("email").isEmail().withMessage("Please provide a valid email"),
  body("password").notEmpty().withMessage("Password is required"),
];

// Todo validation (placeholder)
export const todoValidation = [
  body("title")
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ min: 3 })
    .withMessage("Title must be at least 3 characters long"),
];

// Note validation (placeholder)
export const noteValidation = [
  body("title").notEmpty().withMessage("Title is required"),
  body("content").notEmpty().withMessage("Content is required"),
];
