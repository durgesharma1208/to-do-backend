import admin from "firebase-admin";

export let isFirebaseInitialized = false;

try {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is missing in .env");
  }

  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT||"* * * * *",
  );

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  isFirebaseInitialized = true;

  console.log("✅ Firebase Admin initialized successfully.");
} catch (error) {
  console.error(
    "❌ Firebase Admin initialization failed:",
    error.message,
  );
}

export default admin;