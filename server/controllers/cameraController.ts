import type { Response } from "express";
import { createStorage } from "../services/storageService";
import type { AuthRequest } from "../middleware/authMiddleware";

function getUserId(req: AuthRequest): string {
  return req.user!.id;
}

function getStorage() {
  return createStorage();
}

export const cameraController = {
  list: async (req: AuthRequest, res: Response) => {
    const cameras = await getStorage().getCameras(getUserId(req));
    res.json(cameras);
  },

  getById: async (req: AuthRequest, res: Response) => {
    const camera = await getStorage().getCameraById(req.params.id as string, getUserId(req));
    res.json(camera);
  },

  create: async (req: AuthRequest, res: Response) => {
    const userId = getUserId(req);
    const camera = await getStorage().createCamera({ ...req.body, user_id: userId });
    res.status(201).json(camera);
  },

  update: async (req: AuthRequest, res: Response) => {
    const camera = await getStorage().updateCamera(req.params.id as string, getUserId(req), req.body);
    res.json(camera);
  },

  delete: async (req: AuthRequest, res: Response) => {
    await getStorage().deleteCamera(req.params.id as string, getUserId(req));
    res.json({ success: true });
  },
};
