import { useState, useCallback, useRef, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/api$/, "") ?? "";
const SERVO_URL = `${API_BASE}/api/v1/cameras/esp32/servo`;

export interface ServoState {
  pan: number;   // 0–180, default 90 (center)
  tilt: number;  // 0–180, default 90 (center)
  connected: boolean;
  scanning: boolean;
  error: string | null;
}

export function useServoControl() {
  const [pan, setPan] = useState(90);
  const [tilt, setTilt] = useState(90);
  const [connected, setConnected] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scanDirectionRef = useRef<1 | -1>(1);
  // Use a ref for tilt so the scan interval always reads the latest value
  const tiltRef = useRef(tilt);
  useEffect(() => { tiltRef.current = tilt; }, [tilt]);

  // Send position to ESP32 via backend proxy
  const sendPosition = useCallback(async (p: number, t: number) => {
    try {
      const res = await fetch(SERVO_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pan: p, tilt: t }),
        signal: AbortSignal.timeout(5_000),
      });
      if (res.ok) {
        setConnected(true);
        setError(null);
      } else {
        const data = await res.json().catch(() => ({ error: "Servo unreachable" }));
        setError(data.error ?? "Servo command failed");
      }
    } catch {
      setConnected(false);
      setError("Cannot reach servo controller");
    }
  }, []);

  const movePan = useCallback((angle: number) => {
    const clamped = Math.max(0, Math.min(180, Math.round(angle)));
    setPan(clamped);
    sendPosition(clamped, tiltRef.current);
  }, [sendPosition]);

  const moveTilt = useCallback((angle: number) => {
    const clamped = Math.max(0, Math.min(180, Math.round(angle)));
    setTilt(clamped);
    sendPosition(pan, clamped);
  }, [pan, sendPosition]);

  const moveToPosition = useCallback((p: number, t: number) => {
    const cp = Math.max(0, Math.min(180, Math.round(p)));
    const ct = Math.max(0, Math.min(180, Math.round(t)));
    setPan(cp);
    setTilt(ct);
    sendPosition(cp, ct);
  }, [sendPosition]);

  const center = useCallback(() => {
    moveToPosition(90, 90);
  }, [moveToPosition]);

  // ─── Radar-style auto-scan (pan sweeps 0→180→0 continuously) ──────────
  const scanCountRef = useRef(0);
  const MAX_SCAN_STEPS = 360; // ~72 seconds at default 200ms interval

  const startScan = useCallback((stepDeg = 5, intervalMs = 200) => {
    if (scanning) return;
    setScanning(true);
    scanDirectionRef.current = 1;
    scanCountRef.current = 0;

    scanIntervalRef.current = setInterval(() => {
      scanCountRef.current++;
      if (scanCountRef.current >= MAX_SCAN_STEPS) {
        // Auto-stop after max duration
        if (scanIntervalRef.current) {
          clearInterval(scanIntervalRef.current);
          scanIntervalRef.current = null;
        }
        setScanning(false);
        return;
      }
      setPan((prev) => {
        let next = prev + stepDeg * scanDirectionRef.current;
        if (next >= 180) { next = 180; scanDirectionRef.current = -1; }
        if (next <= 0)   { next = 0;   scanDirectionRef.current = 1;  }
        // Use tiltRef.current to always read the latest tilt value
        sendPosition(next, tiltRef.current).catch(() => {
          // Stop scan on persistent error
          if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
          }
          setScanning(false);
        });
        return next;
      });
    }, intervalMs);
  }, [scanning, sendPosition]);

  const stopScan = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setScanning(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    };
  }, []);

  return {
    pan, tilt, connected, scanning, error,
    movePan, moveTilt, moveToPosition, center,
    startScan, stopScan,
  };
}

