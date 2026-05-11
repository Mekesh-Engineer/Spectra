import { Router } from "express";
import { authMiddleware, requireRole, type AuthRequest } from "../middleware/authMiddleware";
import { createStorage } from "../services/storageService";
import type { Response } from "express";

function getUserId(req: AuthRequest): string {
  return req.user!.id;
}

function getStorage() {
  return createStorage();
}

export const settingsRoutes = Router();
settingsRoutes.use(authMiddleware);

// GET /api/settings
settingsRoutes.get("/", async (req: AuthRequest, res: Response) => {
  const settings = await getStorage().getSettings(getUserId(req));
  // Convert array of {key, value} into a single object
  const obj: Record<string, unknown> = {};
  for (const s of settings) {
    obj[s.key as string] = s.value;
  }
  res.json(obj);
});

// PUT /api/settings/:key  (administrator only)
import { z } from "zod";

const settingKeySchema = z.string().min(1).max(100).regex(/^[a-zA-Z0-9_.]+$/);
const settingValueSchema = z.object({
  value: z.unknown(),
}).refine((data) => data.value !== undefined, { message: "value is required" });

settingsRoutes.put("/:key", requireRole(["administrator"]), async (req: AuthRequest, res: Response) => {
  const keyParsed = settingKeySchema.safeParse(req.params.key);
  if (!keyParsed.success) {
    res.status(400).json({ error: "Invalid setting key" });
    return;
  }
  const bodyParsed = settingValueSchema.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Invalid setting value" });
    return;
  }
  const setting = await getStorage().upsertSetting(getUserId(req), keyParsed.data, bodyParsed.data.value);
  res.json(setting);
});
