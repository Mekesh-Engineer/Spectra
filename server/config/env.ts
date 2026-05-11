import dotenv from "dotenv";

dotenv.config();

const firebaseProjectId = process.env.FIREBASE_PROJECT_ID ?? "";

if (!firebaseProjectId) {
  console.warn(
    "⚠ Missing FIREBASE_PROJECT_ID — Firebase features will be unavailable"
  );
}

export const env = {
  port: Number(process.env.PORT) || 3001,
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: process.env.DATABASE_URL ?? "",
  firebaseProjectId,
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? "",
  firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY ?? "",
  aiServiceUrl: process.env.AI_SERVICE_URL ?? "http://127.0.0.1:5000",
} as const;
