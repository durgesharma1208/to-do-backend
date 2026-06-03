import cron from "node-cron";
import admin, { isFirebaseInitialized } from "../config/firebaseAdmin.js";
import User from "../models/User.js";

const CRON_SCHEDULE = process.env.NOTIFICATION_CRON || "*/30 * * * *";
const NOTIFICATION_TITLE = process.env.NOTIFICATION_TITLE || "Reminder";
const NOTIFICATION_BODY =
  process.env.NOTIFICATION_BODY || "You have pending items.";
const NOTIFICATION_LINK = process.env.NOTIFICATION_LINK || "/";
const NOTIFICATION_TIMEZONE = process.env.NOTIFICATION_TIMEZONE || "UTC";

let isRunning = false;

const runNotificationJob = async () => {
  if (isRunning) {
    console.warn("Notification cron already running. Skipping this tick.");
    return;
  }

  if (!isFirebaseInitialized) {
    console.warn("Firebase Admin not initialized. Skipping notification cron.");
    return;
  }

  isRunning = true;

  try {
    const users = await User.find({ fcmToken: { $ne: null } }).select(
      "_id fcmToken",
    );

    if (!users.length) {
      console.log("No users with FCM tokens. Skipping notification send.");
      return;
    }

    const tokenToUserIds = new Map();

    for (const user of users) {
      const token = user.fcmToken?.trim();
      if (!token) {
        continue;
      }

      const userIds = tokenToUserIds.get(token) || [];
      userIds.push(user._id);
      tokenToUserIds.set(token, userIds);
    }

    const tokens = Array.from(tokenToUserIds.keys());

    if (!tokens.length) {
      console.log("No valid FCM tokens found. Skipping notification send.");
      return;
    }

    const multicastMessage = {
      tokens,
      notification: {
        title: NOTIFICATION_TITLE,
        body: NOTIFICATION_BODY,
      },
      webpush: {
        notification: {
          icon: "/pwa-192x192.png",
        },
        fcm_options: {
          link: NOTIFICATION_LINK,
        },
      },
      data: {
        source: "cron",
      },
    };

    console.log(
      `Sending notification to ${tokens.length} unique FCM tokens...`,
    );

    const response = await admin
      .messaging()
      .sendEachForMulticast(multicastMessage);

    console.log(
      `Notification results: ${response.successCount} success, ${response.failureCount} failed.`,
    );

    if (response.failureCount > 0) {
      const invalidTokens = [];

      response.responses.forEach((result, index) => {
        if (result.success) {
          return;
        }

        const errorCode = result.error?.code;
        console.warn(
          `Token send failed (${errorCode || "unknown"}): ${tokens[index]}`,
        );

        if (
          errorCode === "messaging/registration-token-not-registered" ||
          errorCode === "messaging/invalid-registration-token"
        ) {
          invalidTokens.push(tokens[index]);
        }
      });

      if (invalidTokens.length > 0) {
        const cleanupResult = await User.updateMany(
          { fcmToken: { $in: invalidTokens } },
          { $set: { fcmToken: null } },
        );

        console.warn(
          `Removed ${cleanupResult.modifiedCount} invalid FCM tokens from users.`,
        );
      }
    }
  } catch (error) {
    console.error("Notification cron failed:", error);
  } finally {
    isRunning = false;
  }
};

cron.schedule(CRON_SCHEDULE, runNotificationJob, {
  scheduled: true,
  timezone: NOTIFICATION_TIMEZONE,
});

console.log(`Notification cron scheduled: ${CRON_SCHEDULE}`);
