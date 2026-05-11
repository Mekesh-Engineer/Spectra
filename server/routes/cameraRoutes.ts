import { Router } from "express";
import { cameraController } from "../controllers/cameraController";
import { authMiddleware } from "../middleware/authMiddleware";

export const cameraRoutes = Router();

cameraRoutes.use(authMiddleware);

cameraRoutes.get("/", cameraController.list);
cameraRoutes.get("/:id", cameraController.getById);
cameraRoutes.post("/", cameraController.create);
cameraRoutes.put("/:id", cameraController.update);
cameraRoutes.delete("/:id", cameraController.delete);
