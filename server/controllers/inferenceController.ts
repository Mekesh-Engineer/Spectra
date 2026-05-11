import type { Request, Response } from "express";
import { z } from "zod";
import { aiService } from "../services/aiService";
import { processMeasurements } from "../services/measurementProcessor";

const detectSchema = z.object({
  image: z.string().min(1, "Image data is required"),
});

const detectDualSchema = z.object({
  image: z.string().min(1, "Image data is required"),
  pixelsPerMm: z.number().positive().max(1000).optional().default(4.0),
  confidenceThreshold: z.number().min(0).max(1).optional().default(0.5),
});

const measureSchema = z.object({
  detections: z.array(z.object({
    id: z.string(),
    x: z.number(),
    y: z.number(),
    width: z.number().positive(),
    height: z.number().positive(),
    confidence: z.number().min(0).max(1),
    label: z.string(),
    model: z.enum(["circle", "line"]),
  })).min(1, "Detections array is required"),
  pixelsPerMm: z.number().positive().max(1000).optional().default(4.0),
  confidenceThreshold: z.number().min(0).max(1).optional().default(0.85),
});

export const inferenceController = {
  detect: async (req: Request, res: Response) => {
    const parsed = detectSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }

    const detections = await aiService.detect(parsed.data.image);
    res.json({ detections });
  },

  detectDual: async (req: Request, res: Response) => {
    const parsed = detectDualSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }

    try {
      const { image, pixelsPerMm, confidenceThreshold } = parsed.data;

      const result = await aiService.detectDual(image, pixelsPerMm, confidenceThreshold);

      const measurementOutput = processMeasurements(result.detections, {
        pixelsPerMm,
      });

      res.json({
        ...result,
        measurements: measurementOutput,
        frameWidth: result.frameWidth,
        frameHeight: result.frameHeight,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Inference failed";
      console.error("Dual detection error:", msg);
      res.status(502).json({ error: msg });
    }
  },

  /**
   * Dedicated measurement endpoint — process existing detections through
   * the dimensional measurement pipeline without re-running inference.
   */
  measure: async (req: Request, res: Response) => {
    const parsed = measureSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
      return;
    }

    const { detections, pixelsPerMm, confidenceThreshold } = parsed.data;

    const output = processMeasurements(detections, {
      pixelsPerMm,
      confidenceThreshold,
    });

    res.json(output);
  },

  getModelInfo: (_req: Request, res: Response) => {
    res.json({
      models: [
        { id: "pipe_circle_detection", name: "Pipe Circle Detection", type: "YOLOv8" },
        { id: "pipe_line_detection", name: "Pipe Line Detection", type: "YOLOv8" },
      ],
      status: "ready",
    });
  },

  /** Verify local AI engine connectivity by sending a tiny test request */
  testConnection: async (_req: Request, res: Response) => {
    try {
      const result = await aiService.testConnection();
      res.json(result);
    } catch (err) {
      console.error("AI engine connection test failed:", err);
      res.status(502).json({
        connected: false,
        error: err instanceof Error ? err.message : "Connection test failed",
      });
    }
  },
};
