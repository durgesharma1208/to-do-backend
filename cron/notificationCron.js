import cron from "node-cron";
import admin, { isFirebaseInitialized } from "../config/firebaseAdmin.js";
import User from "../models/User.js";

// Every 30 minutes from 6 AM to 11 PM (India Time)
const CRON_SCHEDULE =
  process.env.NOTIFICATION_CRON || "0,30 6-23 * * *";

const NOTIFICATION_TITLE =
  process.env.NOTIFICATION_TITLE || "Reminder";

const NOTIFICATION_BODY =
  process.env.NOTIFICATION_BODY ||
  "You have pending tasks to complete.";

const NOTIFICATION_LINK =
  process.env.NOTIFICATION_LINK || "/";

const NOTIFICATION_TIMEZONE =
  process.env.NOTIFICATION_TIMEZONE || "Asia/Kolkata";

let isRunning = false;

const runNotificationJob = async () => {
  if (isRunning) {
    console.warn(
      "Notification cron already running. Skipping this tick.",
    );

    return;
  }

  if (!isFirebaseInitialized) {
    console.warn(
      "Firebase Admin not initialized. Skipping notification cron.",
    );

    return;
  }

  isRunning = true;

  try {
    // Get all users having valid FCM tokens
    const users = await User.find({
      fcmToken: {
        $ne: null,
      },
    }).select("_id fcmToken");

    if (!users.length) {
      console.log(
        "No users with FCM tokens. Skipping notification send.",
      );

      return;
    }

    // Remove duplicate tokens
    const uniqueTokens = new Set();

    users.forEach((user) => {
      const token = user.fcmToken?.trim();

      if (token) {
        uniqueTokens.add(token);
      }
    });

    const tokens = Array.from(uniqueTokens);

    if (!tokens.length) {
      console.log(
        "No valid FCM tokens found. Skipping notification send.",
      );

      return;
    }

    // Notification payload
    const multicastMessage = {
      tokens,

      notification: {
        title: NOTIFICATION_TITLE,
        body: NOTIFICATION_BODY,
      },

      webpush: {
        notification: {
          icon: "/pwa-192x192.png",
          badge: "/pwa-192x192.png",
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

    // Send notifications
    const response = await admin
      .messaging()
      .sendEachForMulticast(multicastMessage);

    console.log(
      `Notification results: ${response.successCount} success, ${response.failureCount} failed.`,
    );

    // Cleanup invalid tokens
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
          errorCode ===
            "messaging/registration-token-not-registered" ||
          errorCode ===
            "messaging/invalid-registration-token"
        ) {
          invalidTokens.push(tokens[index]);
        }
      });

      // Remove invalid tokens from database
      if (invalidTokens.length > 0) {
        const cleanupResult = await User.updateMany(
          {
            fcmToken: {
              $in: invalidTokens,
            },
          },
          {
            $set: {
              fcmToken: null,
            },
          },
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

// Schedule cron
cron.schedule(CRON_SCHEDULE, runNotificationJob, {
  scheduled: true,
  timezone: NOTIFICATION_TIMEZONE,
});

console.log(
  `Notification cron scheduled: ${CRON_SCHEDULE} (${NOTIFICATION_TIMEZONE})`,
);