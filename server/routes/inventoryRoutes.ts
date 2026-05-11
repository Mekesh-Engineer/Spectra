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

export const inventoryRoutes = Router();
inventoryRoutes.use(authMiddleware);

// GET /api/inventory?page=1&limit=50&type=Rod&search=steel
inventoryRoutes.get("/", async (req: AuthRequest, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 50;
  const type = req.query.type as string | undefined;
  const search = req.query.search as string | undefined;
  const result = await getStorage().getInventory(getUserId(req), page, limit, { type, search });
  res.json(result);
});

// POST /api/inventory
inventoryRoutes.post("/", async (req: AuthRequest, res: Response) => {
  const item = await getStorage().createInventoryItem({ ...req.body, user_id: getUserId(req) });
  res.status(201).json(item);
});

// PUT /api/inventory/:id
inventoryRoutes.put("/:id", async (req: AuthRequest, res: Response) => {
  const item = await getStorage().updateInventoryItem(req.params.id as string, getUserId(req), req.body);
  res.json(item);
});

// DELETE /api/inventory/:id
inventoryRoutes.delete("/:id", async (req: AuthRequest, res: Response) => {
  await getStorage().deleteInventoryItem(req.params.id as string, getUserId(req));
  res.json({ success: true });
});
