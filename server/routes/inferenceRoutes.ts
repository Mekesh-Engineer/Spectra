import { Router } from "express";
import { inferenceController } from "../controllers/inferenceController";
import { authMiddleware } from "../middleware/authMiddleware";

export const inferenceRoutes = Router();

// Public health probe for UI readiness checks
inferenceRoutes.get("/test-connection", inferenceController.testConnection);

// All inference endpoints require authentication
inferenceRoutes.use(authMiddleware);

inferenceRoutes.post("/detect", inferenceController.detect);
inferenceRoutes.post("/detect-dual", inferenceController.detectDual);
inferenceRoutes.post("/measure", inferenceController.measure);
inferenceRoutes.get("/model", inferenceController.getModelInfo);
