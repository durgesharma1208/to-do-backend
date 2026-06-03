import admin from "firebase-admin";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Get the directory of the current file so we can resolve relative paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Initialize Firebase Admin SDK using the serviceAccountKey.json file.
 *
 * This approach is more secure than embedding the private key in .env
 * because the JSON file is kept in the backend root and should be
 * added to .gitignore to prevent accidental commits.
 */
export let isFirebaseInitialized = false;

try {
  // Path resolves to: backend/serviceAccountKey.json
  const serviceAccountPath = join(__dirname, "..", "serviceAccountKey.json");
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  isFirebaseInitialized = true;
  console.log("✅ Firebase Admin initialized successfully.");
} catch (error) {
  console.error(
    "❌ Firebase Admin initialization failed:",
    error.message,
    "\n   Make sure backend/serviceAccountKey.json exists.",
  );
}

export default admin;
