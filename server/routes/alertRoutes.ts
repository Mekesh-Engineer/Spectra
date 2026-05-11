import { Router } from "express";
import { authMiddleware, type AuthRequest } from "../middleware/authMiddleware";
import { createStorage } from "../services/storageService";
import type { Response } from "express";

function getUserId(req: AuthRequest): string {
  return req.user!.id;
}

function getStorage() {
  return createStorage();
}

export const alertRoutes = Router();
alertRoutes.use(authMiddleware);

// GET /api/alerts?severity=critical
alertRoutes.get("/", async (req: AuthRequest, res: Response) => {
  const severity = req.query.severity as string | undefined;
  const alerts = await getStorage().getAlerts(getUserId(req), { severity });
  res.json(alerts);
});

// POST /api/alerts
alertRoutes.post("/", async (req: AuthRequest, res: Response) => {
  const alert = await getStorage().createAlert({ ...req.body, user_id: getUserId(req) });
  res.status(201).json(alert);
});

// PATCH /api/alerts/:id/read
alertRoutes.patch("/:id/read", async (req: AuthRequest, res: Response) => {
  const alert = await getStorage().markAlertRead(req.params.id as string, getUserId(req));
  res.json(alert);
});

// PATCH /api/alerts/read-all
alertRoutes.patch("/read-all", async (req: AuthRequest, res: Response) => {
  await getStorage().markAllAlertsRead(getUserId(req));
  res.json({ success: true });
});

// DELETE /api/alerts/:id
alertRoutes.delete("/:id", async (req: AuthRequest, res: Response) => {
  await getStorage().dismissAlert(req.params.id as string, getUserId(req));
  res.json({ success: true });
});
