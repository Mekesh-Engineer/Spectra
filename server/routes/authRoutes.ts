import { Router } from "express";
import { adminAuth, adminDb } from "../config/firebase";

export const authRoutes = Router();

// Get current user + profile from token
authRoutes.get("/me", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);

  try {
    // Verify Firebase ID token
    const decodedToken = await adminAuth.verifyIdToken(token);

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

    res.json({
      id: decodedToken.uid,
      email: decodedToken.email ?? profile.email,
      fullName: profile.full_name ?? null,
      role: profile.role ?? "operator",
      status: profile.status ?? "active",
    });
  } catch (err) {
    console.error("Auth /me error:", err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
});
