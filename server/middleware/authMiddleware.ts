// server/middleware/authMiddleware.ts
// ─── Firebase Auth Middleware ───────────────────────────────────────────────

import type { Request, Response, NextFunction } from "express";
import { adminAuth, adminDb } from "../config/firebase";
import type { DecodedIdToken } from "firebase-admin/auth";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    status: string;
    fullName?: string;
  };
  decodedToken?: DecodedIdToken;
}

/**
 * Verifies the Firebase ID token from the Authorization header.
 * Loads user profile from Firestore `profiles` collection.
 */
export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  const isDev = process.env.NODE_ENV === "development";
  const authRequired = process.env.AUTH_REQUIRED !== "false";
  const allowAnyDevBearer = process.env.DEV_ALLOW_ANY_BEARER_TOKEN === "true";

  const attachDevUser = () => {
    req.user = {
      id: "dev-user-id",
      email: "dev@spectra.local",
      role: "administrator",
      status: "active",
      fullName: "Dev User",
    };
  };

  if (!authRequired) {
    // Auth disabled mode: allow guest/local access while still attaching
    // a predictable user context for downstream handlers.
    attachDevUser();
    return next();
  }

  // Allow mock token in development mode for testing
  if (isDev && authHeader === "Bearer mock-token") {
    attachDevUser();
    return next();
  }

  // Optional development bypass for local workflows where Firebase Admin
  // credentials are intentionally unset/placeholders.
  if (isDev && allowAnyDevBearer && authHeader?.startsWith("Bearer ")) {
    attachDevUser();
    return next();
  }

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = authHeader.slice(7);

  try {
    // Verify the Firebase ID token
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.decodedToken = decodedToken;

    // Fetch profile from Firestore
    const profileSnap = await adminDb
      .collection("profiles")
      .doc(decodedToken.uid)
      .get();

    if (!profileSnap.exists) {
      res.status(403).json({ error: "Unprovisioned account: User profile not found" });
      return;
    }

    const profile = profileSnap.data()!;
    req.user = {
      id: decodedToken.uid,
      email: decodedToken.email ?? profile.email ?? "",
      role: profile.role ?? "operator",
      status: profile.status ?? "active",
      fullName: profile.full_name ?? undefined,
    };

    next();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const firebaseProjectLookupFailed =
      msg.includes("Unable to detect a Project Id") ||
      msg.includes("Failed to determine project ID") ||
      msg.includes("Could not load the default credentials");

    if (isDev && firebaseProjectLookupFailed) {
      attachDevUser();
      return next();
    }

    console.error("Auth middleware error:", err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Role-based access control middleware.
 * Must be used after authMiddleware.
 */
export function requireRole(roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (process.env.AUTH_REQUIRED === "false") {
      next();
      return;
    }

    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: `Access denied. Required role: ${roles.join(" or ")}`,
      });
      return;
    }
    next();
  };
}
