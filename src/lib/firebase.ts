// src/lib/firebase.ts
// ─── Firebase Client SDK Initialization (Frontend) ──────────────────────────

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

function requireEnv(key: keyof ImportMetaEnv): string {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(`Missing Firebase config: ${key}`);
  }
  return value;
}

const firebaseConfig = {
  apiKey: requireEnv("VITE_FIREBASE_API_KEY"),
  authDomain: requireEnv("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: requireEnv("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: requireEnv("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: requireEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: requireEnv("VITE_FIREBASE_APP_ID"),
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

/** Firebase Authentication instance */
export const auth = getAuth(app);

/** Cloud Firestore instance */
export const db = getFirestore(app);

export default app;
