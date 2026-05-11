import { useState, useCallback, useRef, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { API_BASE } from "@/services/apiBase";

export type CameraSource = "webcam" | "esp32" | "upload";

// Use backend proxy to avoid CORS / canvas taint issues
const API_ROOT = API_BASE
  .replace(/\/api\/v\d+$/i, "")
  .replace(/\/api$/i, "");
const ESP32_PROBE_PROXY = `${API_ROOT}/api/v1/cameras/esp32/probe`;
const ESP32_STREAM_PROXY = `${API_ROOT}/api/v1/cameras/esp32/stream`;
const ESP32_CAPTURE_PROXY = `${API_ROOT}/api/v1/cameras/esp32/capture`;

function buildEsp32StreamUrl(token: string | null) {
  if (!token) return ESP32_STREAM_PROXY;
  return `${ESP32_STREAM_PROXY}?token=${encodeURIComponent(token)}`;
}

async function parseProxyError(response: Response): Promise<string> {
  try {
    const payload = await response.json() as { error?: string };
    if (payload?.error) return payload.error;
  } catch {
    // Ignore JSON parse failures and fall back to HTTP status text.
  }
  return `HTTP ${response.status} ${response.statusText}`;
}

export function useCameraStream() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isProbing, setIsProbing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [probeMessage, setProbeMessage] = useState<string | null>(null);
  const [source, setSource] = useState<CameraSource>("webcam");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [esp32Url, setEsp32Url] = useState<string>(buildEsp32StreamUrl(null));
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const token = await user.getIdToken();
        setAccessToken(token);
        setEsp32Url(buildEsp32StreamUrl(token));
      } else {
        setAccessToken(null);
        setEsp32Url(buildEsp32StreamUrl(null));
      }
    });
    return () => unsubscribe();
  }, []);

  const stopWebcam = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  const startWebcam = useCallback(async (constraints?: MediaStreamConstraints) => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia(
        constraints ?? { video: { width: 1920, height: 1080 } }
      );
      setStream(mediaStream);
      setIsStreaming(true);
      setError(null);
      setProbeMessage(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to access webcam");
    }
  }, []);

  const probeEsp32 = useCallback(async (): Promise<boolean> => {
    setIsProbing(true);
    setError(null);
    try {
      const res = await fetch(ESP32_PROBE_PROXY, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        const reason = await parseProxyError(res);
        setProbeMessage(null);
        setError(`ESP32 probe failed: ${reason}`);
        return false;
      }

      const payload = await res.json() as { latencyMs?: number; streamUrl?: string };
      const latencyText = typeof payload.latencyMs === "number"
        ? `${payload.latencyMs} ms`
        : "ok";
      const sourceText = payload.streamUrl ? ` (${payload.streamUrl})` : "";

      setProbeMessage(`ESP32 reachable in ${latencyText}${sourceText}`);
      setError(null);
      return true;
    } catch {
      setProbeMessage(null);
      setError("ESP32 probe failed: request timed out or device is unreachable");
      return false;
    } finally {
      setIsProbing(false);
    }
  }, [accessToken]);

  const startEsp32 = useCallback(async () => {
    // Validate camera reachability first so the UI can surface useful errors.
    setIsStreaming(false);
    const ok = await probeEsp32();
    if (!ok) {
      setIsStreaming(false);
      return;
    }

    try {
      setIsStreaming(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to connect to ESP32-CAM";
      setError(`ESP32 connection failed: ${message}`);
      setIsStreaming(false);
    }
  }, [probeEsp32]);

  const startUpload = useCallback(() => {
    // Upload mode is always "ready" — streaming is set when an image is loaded
    if (uploadedImage) setIsStreaming(true);
    setError(null);
    setProbeMessage(null);
  }, [uploadedImage]);

  const start = useCallback(async (constraints?: MediaStreamConstraints) => {
    if (source === "webcam") {
      await startWebcam(constraints);
    } else if (source === "esp32") {
      await startEsp32();
    } else {
      startUpload();
    }
  }, [source, startWebcam, startEsp32, startUpload]);

  const stop = useCallback(() => {
    stopWebcam();
    setIsStreaming(false);
    setProbeMessage(null);
  }, [stopWebcam]);

  const switchSource = useCallback((newSource: CameraSource) => {
    // Stop current stream first
    if (isStreaming) {
      stopWebcam();
      setIsStreaming(false);
    }
    setSource(newSource);
    setError(null);
    setProbeMessage(null);
    // If switching to upload and we already have an image, mark as streaming
    if (newSource === "upload" && uploadedImage) {
      setIsStreaming(true);
    }
  }, [isStreaming, stopWebcam, uploadedImage]);

  const handleSetUploadedImage = useCallback((img: string | null) => {
    setUploadedImage(img);
    if (img) setIsStreaming(true);
    else setIsStreaming(false);
  }, []);

  const capture = useCallback((): string | null => {
    if (source === "upload") return uploadedImage;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    if (source === "webcam" && videoRef.current) {
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0);
      return canvas.toDataURL("image/jpeg");
    }

    // ESP32: synchronous capture may fail with tainted canvas — use captureAsync() instead
    return null;
  }, [source, uploadedImage]);

  /** Async frame capture — fetches a single JPEG from the backend proxy for ESP32 */
  const captureAsync = useCallback(async (): Promise<string | null> => {
    if (source === "webcam") return capture();
    if (source === "upload") return uploadedImage;

    // ESP32: fetch a single frame through the backend capture proxy
    try {
      const res = await fetch(ESP32_CAPTURE_PROXY, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) {
        const reason = await parseProxyError(res);
        setError(`ESP32 capture failed: ${reason}`);
        return null;
      }
      setError(null);
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch {
      setError("ESP32 capture failed: request timed out or device is unreachable");
      return null;
    }
  }, [source, capture, uploadedImage, accessToken]);

  return {
    stream, isStreaming, isProbing, error, probeMessage, source,
    videoRef, imgRef, esp32Url, uploadedImage,
    start, stop, capture, captureAsync, switchSource, setEsp32Url, probeEsp32,
    setUploadedImage: handleSetUploadedImage,
  };
}
