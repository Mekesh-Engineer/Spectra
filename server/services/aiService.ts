// server/services/aiService.ts
// ─── Local YOLOv8 AI Engine Service ─────────────────────────────────────────
// Communicates with the local FastAPI + YOLOv8 inference server.

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:5000";
const FETCH_TIMEOUT_MS = 15_000;

export const aiService = {
  /** Run a single model (legacy) */
  detect: async (imageBase64: string) => {
    try {
      const res = await fetch(`${AI_SERVICE_URL}/api/inference`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageBase64 }),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error("AI Backend returned error.");
      const data = await res.json();
      return data.detections ?? [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  /** Run both circle + line models in parallel, return merged results */
  detectDual: async (imageBase64: string, pixelsPerMm: number = 4.0, confidenceThreshold: number = 0.5) => {
    try {
      const res = await fetch(`${AI_SERVICE_URL}/api/inference/dual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageBase64, pixelsPerMm, confidenceThreshold }),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error("AI Backend returned error.");
      const data = await res.json();
      return {
        detections: data.detections ?? [],
        circleCount: data.circleCount ?? 0,
        lineCount: data.lineCount ?? 0,
        frameWidth: data.frameWidth,
        frameHeight: data.frameHeight,
      };
    } catch (e) {
      console.error("AI service error:", e);
      return { detections: [], circleCount: 0, lineCount: 0 };
    }
  },

  /** Lightweight connectivity check */
  testConnection: async () => {
    try {
      const res = await fetch(`${AI_SERVICE_URL}/api/health`, { method: "GET", signal: AbortSignal.timeout(5_000) });
      if (!res.ok) throw new Error("Python AI server not healthy");
      const data = await res.json();
      return {
        connected: true,
        modelsReady: data.models,
        apiKeySet: true, // Legacy compat field
      };
    } catch {
      return {
        connected: false,
        apiKeySet: false,
        modelsReady: null,
      };
    }
  },
};
