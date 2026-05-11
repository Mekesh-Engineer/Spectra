import type { Request, Response } from "express";
import { adminDb } from "../config/firebase";
import { env } from "../config/env";

const startTime = Date.now();

export const healthController = {
  check: async (_req: Request, res: Response) => {
    const services: Array<{ name: string; status: string; latency: number | null; detail: string }> = [];

    // Check Firestore
    const dbStart = Date.now();
    try {
      await adminDb.collection("profiles").limit(1).get();
      services.push({ name: "Firebase Firestore", status: "healthy", latency: Date.now() - dbStart, detail: "Cloud Firestore — Google Cloud" });
    } catch {
      services.push({ name: "Firebase Firestore", status: "offline", latency: null, detail: "Connection failed" });
    }

    // Check AI Engine reachability
    const aiStart = Date.now();
    const aiServiceUrl = process.env.AI_SERVICE_URL || "http://127.0.0.1:5000";
    try {
      const aiRes = await fetch(`${aiServiceUrl}/api/health`, { method: "GET", signal: AbortSignal.timeout(5000) });
      if (aiRes.ok) {
        const aiData = await aiRes.json();
        services.push({
          name: "AI Engine",
          status: aiData.status === "ok" ? "healthy" : "degraded",
          latency: Date.now() - aiStart,
          detail: `YOLOv8 Local — circle: ${aiData.models?.circle ? "loaded" : "missing"}, line: ${aiData.models?.line ? "loaded" : "missing"}`,
        });
      } else {
        services.push({ name: "AI Engine", status: "degraded", latency: Date.now() - aiStart, detail: "AI service returned error" });
      }
    } catch {
      services.push({ name: "AI Engine", status: "offline", latency: null, detail: "AI service unreachable (http://127.0.0.1:5000)" });
    }

    // API server itself
    services.push({ name: "API Server", status: "healthy", latency: 1, detail: `Express.js — Port ${env.port}` });

    const allHealthy = services.every((s) => s.status === "healthy");

    res.json({
      status: allHealthy ? "ok" : "degraded",
      uptime: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
      environment: env.nodeEnv,
      services,
    });
  },
};
