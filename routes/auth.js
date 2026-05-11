import express from "express";
import {
  register,
  login,
  getMe,
  changePassword,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";
import {
  validate,
  registerValidation,
  loginValidation,
} from "../middleware/validator.js";

const router = express.Router();

router.post("/register", registerValidation, validate, register);
router.post("/login", loginValidation, validate, login);
router.get("/me", protect, getMe);
router.post("/change-password", protect, changePassword);
router.post("/verify-email/:token", verifyEmail);
router.post("/resend-verification-email", resendVerificationEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

export default router;
