import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { createServer } from "http";
import { get as httpGet, type IncomingMessage } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { inferenceRoutes } from "./routes/inferenceRoutes";
import { cameraRoutes } from "./routes/cameraRoutes";
import { esp32Routes } from "./routes/esp32Routes";
import { healthRoutes } from "./routes/healthRoutes";
import { authRoutes } from "./routes/authRoutes";
import { inspectionRoutes } from "./routes/inspectionRoutes";
import { inventoryRoutes } from "./routes/inventoryRoutes";
import { alertRoutes } from "./routes/alertRoutes";
import { settingsRoutes } from "./routes/settingsRoutes";
import { errorHandler } from "./middleware/errorHandler";
import { adminAuth } from "./config/firebase";

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3001;

// ─── Security Headers ───────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Let Vite dev proxy handle CSP
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
}));

// ─── CORS Whitelist ─────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS ?? "http://localhost:5173,http://localhost:3001")
  .split(",")
  .map((o) => o.trim());

app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
}));

// ─── Rate Limiting ──────────────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 60_000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

const authLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many auth attempts, please slow down" },
});

const inferenceLimiter = rateLimit({
  windowMs: 60_000,
  // Live inspection polls every 2s (~30 req/min). Keep headroom for
  // occasional retries / additional inference API calls in the same minute.
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Inference rate limit exceeded" },
});

app.use("/api/v1/", generalLimiter);

app.use(express.json({ limit: "10mb" }));

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use("/api/v1/auth", authLimiter, authRoutes);
app.use("/api/v1/inference", inferenceLimiter, inferenceRoutes);
app.use("/api/v1/cameras/esp32", esp32Routes);
app.use("/api/v1/cameras", cameraRoutes);
app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/inspections", inspectionRoutes);
app.use("/api/v1/inventory", inventoryRoutes);
app.use("/api/v1/alerts", alertRoutes);
app.use("/api/v1/settings", settingsRoutes);

// Error handling
app.use(errorHandler);

// ─── HTTP + WebSocket Server ─────────────────────────────────────────────────
const server = createServer(app);

// WebRTC signaling via WebSocket (with JWT auth)
const wss = new WebSocketServer({ server, path: "/ws/signaling" });

const rooms = new Map<string, Set<WebSocket>>();

wss.on("connection", (ws, req) => {
  let currentRoom: string | null = null;
  let authenticated = false;

  // Require auth within 5 seconds or disconnect
  const authTimeout = setTimeout(() => {
    if (!authenticated) {
      ws.close(4001, "Authentication timeout");
    }
  }, 5_000);

  ws.on("message", async (raw) => {
    let msg: { type: string; room?: string; token?: string; [key: string]: unknown };
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return;
    }

    // First message must be auth
    if (!authenticated) {
      if (msg.type === "auth" && typeof msg.token === "string") {
        try {
          await adminAuth.verifyIdToken(msg.token);
          authenticated = true;
          clearTimeout(authTimeout);
          ws.send(JSON.stringify({ type: "auth", status: "ok" }));
          return;
        } catch {
          ws.close(4003, "Invalid token");
          return;
        }
      }
      ws.close(4003, "First message must be auth");
      return;
    }

    if (msg.type === "join" && typeof msg.room === "string") {
      currentRoom = msg.room;
      if (!rooms.has(currentRoom)) rooms.set(currentRoom, new Set());
      rooms.get(currentRoom)!.add(ws);
      return;
    }

    // Forward signaling messages to others in room
    if (currentRoom && rooms.has(currentRoom)) {
      const payload = JSON.stringify(msg);
      for (const peer of rooms.get(currentRoom)!) {
        if (peer !== ws && peer.readyState === WebSocket.OPEN) {
          peer.send(payload);
        }
      }
    }
  });

  ws.on("close", () => {
    clearTimeout(authTimeout);
    if (currentRoom && rooms.has(currentRoom)) {
      rooms.get(currentRoom)!.delete(ws);
      if (rooms.get(currentRoom)!.size === 0) rooms.delete(currentRoom);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Spectra server running on port ${PORT}`);
  console.log(`WebSocket signaling available at ws://localhost:${PORT}/ws/signaling`);
});

export default app;
