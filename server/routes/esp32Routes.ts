import { Router } from "express";
import { get as httpGet } from "http";
import { z } from "zod";
import { authMiddleware } from "../middleware/authMiddleware";

export const esp32Routes = Router();

// All ESP32 hardware routes require authentication
esp32Routes.use(authMiddleware);

const ESP32_CAM_STREAM =
  process.env.CAMERA_STREAM_URL ??
  process.env.ESP32_CAM_URL ??
  "http://10.213.235.221:81/stream";
const ESP32_CAM_CAPTURE = ESP32_CAM_STREAM.replace(/\/stream$/, "/capture");
const ESP32_BASE = ESP32_CAM_STREAM.replace(/\/stream$/, "").replace(/:81$/, "");

const UPSTREAM_TIMEOUT_MS = 15_000;

// ─── Connectivity Probe ────────────────────────────────────────────────────
esp32Routes.get("/probe", (_req, res) => {
  const startedAt = Date.now();

  const upstream = httpGet(ESP32_CAM_CAPTURE, (camRes) => {
    const statusCode = camRes.statusCode ?? 500;
    const latencyMs = Date.now() - startedAt;
    const contentType = camRes.headers["content-type"] ?? "unknown";

    // We only need headers/status for health probing, not the full JPEG body.
    camRes.resume();

    if (statusCode >= 400) {
      res.status(502).json({
        ok: false,
        error: `ESP32-CAM responded with status ${statusCode}`,
        latencyMs,
        streamUrl: ESP32_CAM_STREAM,
        captureUrl: ESP32_CAM_CAPTURE,
      });
      return;
    }

    res.json({
      ok: true,
      latencyMs,
      contentType,
      streamUrl: ESP32_CAM_STREAM,
      captureUrl: ESP32_CAM_CAPTURE,
    });
  });

  upstream.setTimeout(UPSTREAM_TIMEOUT_MS, () => {
    upstream.destroy();
    if (!res.headersSent) {
      res.status(504).json({
        ok: false,
        error: "ESP32-CAM probe timeout",
        streamUrl: ESP32_CAM_STREAM,
        captureUrl: ESP32_CAM_CAPTURE,
      });
    }
  });

  upstream.on("error", () => {
    if (!res.headersSent) {
      res.status(502).json({
        ok: false,
        error: "ESP32-CAM unreachable",
        streamUrl: ESP32_CAM_STREAM,
        captureUrl: ESP32_CAM_CAPTURE,
      });
    }
  });
});

// ─── MJPEG Stream Proxy ─────────────────────────────────────────────────────
esp32Routes.get("/stream", (req, res) => {
  const upstream = httpGet(ESP32_CAM_STREAM, (camRes) => {
    res.writeHead(200, {
      "Content-Type":
        camRes.headers["content-type"] ??
        "multipart/x-mixed-replace; boundary=frame",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Cross-Origin-Resource-Policy": "cross-origin",
    });
    camRes.pipe(res);
  });

  upstream.setTimeout(UPSTREAM_TIMEOUT_MS, () => {
    upstream.destroy();
    if (!res.headersSent) res.status(504).json({ error: "ESP32-CAM stream timeout" });
  });

  upstream.on("error", () => {
    if (!res.headersSent) res.status(502).json({ error: "ESP32-CAM unreachable" });
  });

  req.on("close", () => upstream.destroy());
});

// ─── Single Frame Capture ───────────────────────────────────────────────────
esp32Routes.get("/capture", (_req, res) => {
  const upstream = httpGet(ESP32_CAM_CAPTURE, (camRes) => {
    res.writeHead(200, {
      "Content-Type": camRes.headers["content-type"] ?? "image/jpeg",
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*",
      "Cross-Origin-Resource-Policy": "cross-origin",
    });
    camRes.pipe(res);
  });

  upstream.setTimeout(UPSTREAM_TIMEOUT_MS, () => {
    upstream.destroy();
    if (!res.headersSent) res.status(504).json({ error: "ESP32-CAM capture timeout" });
  });

  upstream.on("error", () => {
    if (!res.headersSent) res.status(502).json({ error: "ESP32-CAM unreachable" });
  });
});

// ─── Servo Control ──────────────────────────────────────────────────────────
const servoSchema = z.object({
  pan: z.number().min(0).max(180).optional().default(90),
  tilt: z.number().min(0).max(180).optional().default(90),
});

esp32Routes.post("/servo", (req, res) => {
  const parsed = servoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid servo angles", details: parsed.error.flatten() });
    return;
  }

  const { pan, tilt } = parsed.data;
  const panAngle = Math.round(pan);
  const tiltAngle = Math.round(tilt);
  const url = `${ESP32_BASE}/servo?pan=${panAngle}&tilt=${tiltAngle}`;

  const upstream = httpGet(url, (camRes) => {
    let body = "";
    camRes.on("data", (chunk: Buffer) => {
      body += chunk.toString();
      // Cap response body at 1KB to prevent memory issues
      if (body.length > 1024) {
        upstream.destroy();
        if (!res.headersSent) res.json({ success: true, pan: panAngle, tilt: tiltAngle });
      }
    });
    camRes.on("end", () => {
      if (!res.headersSent) res.json({ success: true, pan: panAngle, tilt: tiltAngle, response: body });
    });
  });

  upstream.setTimeout(UPSTREAM_TIMEOUT_MS, () => {
    upstream.destroy();
    if (!res.headersSent) res.status(504).json({ error: "ESP32-CAM servo timeout" });
  });

  upstream.on("error", () => {
    if (!res.headersSent) res.status(502).json({ error: "ESP32-CAM servo unreachable" });
  });
});

// ─── Servo Status ───────────────────────────────────────────────────────────
esp32Routes.get("/servo/status", (_req, res) => {
  const url = `${ESP32_BASE}/servo/status`;

  const upstream = httpGet(url, (camRes) => {
    let body = "";
    camRes.on("data", (chunk: Buffer) => {
      body += chunk.toString();
      if (body.length > 1024) {
        upstream.destroy();
        if (!res.headersSent) res.json({ pan: 90, tilt: 90 });
      }
    });
    camRes.on("end", () => {
      try {
        if (!res.headersSent) res.json(JSON.parse(body));
      } catch {
        if (!res.headersSent) res.json({ pan: 90, tilt: 90 });
      }
    });
  });

  upstream.setTimeout(UPSTREAM_TIMEOUT_MS, () => {
    upstream.destroy();
    if (!res.headersSent) res.json({ pan: 90, tilt: 90 });
  });

  upstream.on("error", () => {
    if (!res.headersSent) res.json({ pan: 90, tilt: 90 });
  });
});
