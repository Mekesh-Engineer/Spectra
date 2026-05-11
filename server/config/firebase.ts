// server/config/firebase.ts
// ─── Firebase Admin SDK Initialization (Backend) ────────────────────────────

import { initializeApp, cert, getApps, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { env } from "./env";

const serviceAccount: ServiceAccount = {
  projectId: env.firebaseProjectId,
  clientEmail: env.firebaseClientEmail,
  privateKey: env.firebasePrivateKey?.replace(/\\n/g, "\n"),
};

const privateKey = serviceAccount.privateKey ?? "";

const hasUsableServiceAccount =
  Boolean(serviceAccount.projectId) &&
  Boolean(serviceAccount.clientEmail) &&
  Boolean(privateKey) &&
  privateKey.includes("BEGIN PRIVATE KEY") &&
  !privateKey.includes("YOUR_PRIVATE_KEY_HERE");

// Only initialize once (prevents duplicate-app errors in hot-reload)
if (getApps().length === 0) {
  try {
    if (hasUsableServiceAccount) {
      initializeApp({ credential: cert(serviceAccount) });
    } else {
      // Dev fallback: allow local API startup when .env still has placeholder credentials.
      initializeApp();
      console.warn("Firebase Admin initialized without explicit credentials (development fallback).");
    }
  } catch (err) {
    if (env.nodeEnv === "development") {
      initializeApp();
      console.warn("Firebase Admin credential load failed; using development fallback.", err);
    } else {
      throw err;
    }
  }
}

/** Firebase Admin Auth — for verifying ID tokens */
export const adminAuth = getAuth();

/** Firebase Admin Firestore — for server-side DB operations */
export const adminDb = getFirestore();
