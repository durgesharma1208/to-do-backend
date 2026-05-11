import User from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";
import {
  generateVerificationToken,
  generateResetToken,
  getTokenExpiry,
} from "../utils/tokenGenerator.js";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../utils/emailService.js";
import { asyncHandler } from "../middleware/errorHandler.js";

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(400).json({
      success: false,
      message: "Email already registered",
    });
  }

  const verificationToken = generateVerificationToken();
  const verificationTokenExpire = getTokenExpiry(1440); // 24 hours

  const user = await User.create({
    name,
    email,
    password,
    verificationToken,
    verificationTokenExpire,
  });

  // Send verification email (non-blocking - don't await)
  sendVerificationEmail(email, verificationToken).catch((err) => {
    console.error("Failed to send verification email:", err);
  });

  const token = generateToken(user._id);

  res.status(201).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      isVerified: user.isVerified,
    },
    message: "Registration successful! You can now log in.",
  });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const user = await User.findOne({
    verificationToken: token,
    verificationTokenExpire: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: "Invalid or expired verification token",
    });
  }

  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificationTokenExpire = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Email verified successfully",
  });
});

export const resendVerificationEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Please provide an email",
    });
  }

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  if (user.isVerified) {
    return res.status(400).json({
      success: false,
      message: "Email is already verified",
    });
  }

  const verificationToken = generateVerificationToken();
  const verificationTokenExpire = getTokenExpiry(1440);

  user.verificationToken = verificationToken;
  user.verificationTokenExpire = verificationTokenExpire;
  await user.save();

  // Send verification email (non-blocking - don't await)
  sendVerificationEmail(email, verificationToken).catch((err) => {
    console.error("Failed to send verification email:", err);
  });

  res.status(200).json({
    success: true,
    message: "Verification email sent",
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Please provide email and password",
    });
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials",
    });
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials",
    });
  }

  const token = generateToken(user._id);

  res.status(200).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      isVerified: user.isVerified,
    },
  });
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      isVerified: user.isVerified,
    },
  });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "Please provide all required fields",
    });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "New passwords do not match",
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: "New password must be at least 6 characters",
    });
  }

  const user = await User.findById(req.user.id).select("+password");

  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: "Current password is incorrect",
    });
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Password changed successfully",
  });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Please provide an email",
    });
  }

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "No user found with this email",
    });
  }

  const resetPasswordToken = generateResetToken();
  const resetPasswordExpire = getTokenExpiry(60); // 1 hour

  user.resetPasswordToken = resetPasswordToken;
  user.resetPasswordExpire = resetPasswordExpire;
  await user.save();

  // Send password reset email (non-blocking - don't await)
  sendPasswordResetEmail(email, resetPasswordToken).catch((err) => {
    console.error("Failed to send password reset email:", err);
  });

  res.status(200).json({
    success: true,
    message: "Password reset email sent",
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { newPassword, confirmPassword } = req.body;

  if (!newPassword || !confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "Please provide new password and confirm password",
    });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "Passwords do not match",
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters",
    });
  }

  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: "Invalid or expired reset token",
    });
  }

  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  const authToken = generateToken(user._id);

  res.status(200).json({
    success: true,
    message: "Password reset successfully",
    token: authToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      isVerified: user.isVerified,
    },
  });
});
