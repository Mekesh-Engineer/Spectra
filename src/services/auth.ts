// src/services/auth.ts
// ─── Firebase Authentication Service ────────────────────────────────────────

import { auth, db } from "@/lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  fullName?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  avatar_url: string | null;
  created_at: string;
}

/** Create or update a user's Firestore profile document */
async function ensureProfile(user: User, fullName?: string): Promise<UserProfile> {
  const profileRef = doc(db, "profiles", user.uid);
  const snap = await getDoc(profileRef);

  if (snap.exists()) {
    return { id: user.uid, ...snap.data() } as UserProfile;
  }

  // First time — create profile
  const profile: Omit<UserProfile, "id"> = {
    email: user.email ?? "",
    full_name: fullName ?? user.displayName ?? "",
    role: "operator",
    status: "active",
    avatar_url: user.photoURL ?? null,
    created_at: new Date().toISOString(),
  };
  await setDoc(profileRef, { ...profile, updated_at: serverTimestamp() });
  return { id: user.uid, ...profile };
}

export const authService = {
  /** Email/password login */
  login: async (payload: LoginPayload) => {
    const cred = await signInWithEmailAndPassword(auth, payload.email, payload.password);
    const profile = await ensureProfile(cred.user);
    return { user: profile, session: { access_token: await cred.user.getIdToken(), user: profile } };
  },

  /** Email/password registration */
  register: async (payload: RegisterPayload) => {
    const cred = await createUserWithEmailAndPassword(auth, payload.email, payload.password);
    if (payload.fullName) {
      await updateProfile(cred.user, { displayName: payload.fullName });
    }
    const profile = await ensureProfile(cred.user, payload.fullName);
    return { user: profile, session: { access_token: await cred.user.getIdToken(), user: profile } };
  },

  /** Sign out */
  logout: async () => {
    await signOut(auth);
  },

  /** Send password reset email */
  resetPassword: async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  },

  /** Get current session (Firebase user + ID token) */
  getSession: async () => {
    const user = auth.currentUser;
    if (!user) return null;
    const profile = await ensureProfile(user);
    return { access_token: await user.getIdToken(), user: profile };
  },

  /** Fetch user profile from Firestore */
  fetchProfile: async (userId: string): Promise<UserProfile | null> => {
    const profileRef = doc(db, "profiles", userId);
    const snap = await getDoc(profileRef);
    if (!snap.exists()) return null;
    return { id: userId, ...snap.data() } as UserProfile;
  },

  /** Google OAuth login */
  loginWithGoogle: async () => {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    const profile = await ensureProfile(cred.user);
    return { user: profile, session: { access_token: await cred.user.getIdToken(), user: profile } };
  },

  /** Listen to auth state changes */
  onAuthStateChanged: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
  },
};
