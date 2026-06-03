import User from "../models/User.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import admin, { isFirebaseInitialized } from "../config/firebaseAdmin.js";

// @desc    Update or save user's FCM token
// @route   POST /api/notifications/token
// @access  Private
export const updateToken = asyncHandler(async (req, res) => {
  const rawToken = req.body.fcmToken || req.body.token;
  console.log(`Received request to update FCM token for user: ${req.user.id}`);

  if (!rawToken || typeof rawToken !== "string") {
    console.warn(
      `FCM token update request for user ${req.user.id} is missing a token.`,
    );
    return res.status(400).json({
      success: false,
      message: "Please provide an FCM token",
    });
  }

  const fcmToken = rawToken.trim();

  if (!fcmToken) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid FCM token",
    });
  }

  const user = await User.findById(req.user.id);

  if (!user) {
    console.error(`User not found for ID: ${req.user.id} during token update.`);
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  if (user.fcmToken === fcmToken) {
    return res.status(200).json({
      success: true,
      message: "FCM token already up to date",
    });
  }

  user.fcmToken = fcmToken;
  await user.save();

  await User.updateMany(
    { _id: { $ne: user._id }, fcmToken },
    { $set: { fcmToken: null } },
  );

  console.log(`FCM token updated successfully for user: ${user.email}`);
  res.status(200).json({
    success: true,
    message: "FCM token updated successfully",
  });
});

// @desc    Send push notification to a specific user
// @route   POST /api/notifications/send
// @access  Private
export const sendNotification = asyncHandler(async (req, res) => {
  if (!isFirebaseInitialized) {
    return res.status(503).json({
      success: false,
      message:
        "Firebase is not configured. Push notifications are unavailable.",
    });
  }

  const { targetUserId, title, body, icon, data } = req.body;
  console.log(`Attempting to send notification to user ID: ${targetUserId}`);

  if (!targetUserId || !title || !body) {
    console.warn("Send notification request is missing required fields.");
    return res.status(400).json({
      success: false,
      message: "Please provide targetUserId, title, and body",
    });
  }

  const targetUser = await User.findById(targetUserId);

  if (!targetUser) {
    console.error(`Target user not found for ID: ${targetUserId}`);
    return res.status(404).json({
      success: false,
      message: "Target user not found",
    });
  }

  if (!targetUser.fcmToken) {
    console.warn(`User ${targetUserId} does not have an FCM token.`);
    return res.status(400).json({
      success: false,
      message: "Target user does not have an active FCM token",
    });
  }

  try {
    const message = {
      notification: {
        title,
        body,
      },
      webpush: {
        notification: {
          icon: icon || "/pwa-192x192.png",
        },
        fcm_options: {
          link: data?.link || "/",
        },
      },
      data: data
        ? Object.fromEntries(
            Object.entries(data).map(([k, v]) => [k, String(v)]),
          )
        : {},
      token: targetUser.fcmToken,
    };

    console.log("Sending Firebase message:", JSON.stringify(message, null, 2));
    const response = await admin.messaging().send(message);

    console.log("Successfully sent message:", response);
    res.status(200).json({
      success: true,
      message: "Notification sent successfully",
      messageId: response,
    });
  } catch (error) {
    console.error("Error sending Firebase notification:", error);

    const errorCode = error.code;
    if (
      errorCode === "messaging/registration-token-not-registered" ||
      errorCode === "messaging/invalid-registration-token"
    ) {
      console.log(
        `Invalid FCM token detected for user ${targetUserId}. Removing from database.`,
      );
      targetUser.fcmToken = null;
      await targetUser.save();
      console.log(`Token removed for user ${targetUserId}.`);
    }

    res.status(500).json({
      success: false,
      message: "Failed to send notification: " + error.message,
      errorCode: errorCode,
    });
  }
});
