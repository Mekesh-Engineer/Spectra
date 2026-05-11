import os
import io
import time
import math
import base64
import signal
import cv2
import numpy as np
import uvicorn
import torch
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from ultralytics import YOLO

# Initialize FastAPI
app = FastAPI(title="Spectra AI Inference Service")

# CORS — allow Express backend proxy and local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:5173", "http://127.0.0.1:3001"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── GPU / CPU Detection ─────────────────────────────────────────────────────
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"AI Engine running on: {device.upper()}")
if device == "cuda":
    print(f"GPU: {torch.cuda.get_device_name(0)}")

# Paths and models (mock initialization as real weights might be missing initially)
MODEL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "Model"))
CIRCLE_MODEL_PATH = os.path.join(MODEL_DIR, "pipe_circle_model.pt")
LINE_MODEL_PATH = os.path.join(MODEL_DIR, "pipe_line_model.pt")

try:
    print(f"Loading YOLOv8 models from {MODEL_DIR}...")
    circle_model = YOLO(CIRCLE_MODEL_PATH) if os.path.exists(CIRCLE_MODEL_PATH) else None
    line_model = YOLO(LINE_MODEL_PATH) if os.path.exists(LINE_MODEL_PATH) else None
    print("Models loaded." if circle_model and line_model else "Warning: missing model weights. Waiting for real .pt files.")
except Exception as e:
    print("Warning: unable to load ultralytics YOLO:", e)
    circle_model = None
    line_model = None

# ─── Model Warm-up ───────────────────────────────────────────────────────────
if circle_model and line_model:
    print("Warming up models...")
    dummy = np.zeros((480, 640, 3), dtype=np.uint8)
    t0 = time.time()
    circle_model(dummy, verbose=False)
    line_model(dummy, verbose=False)
    print(f"Warm-up complete in {time.time() - t0:.2f}s")

class DetectionRequest(BaseModel):
    image: str # Base64 encoded image
    pixelsPerMm: float = 4.0
    confidenceThreshold: float = 0.5

    @field_validator("pixelsPerMm")
    @classmethod
    def validate_pixels_per_mm(cls, v: float) -> float:
        if v <= 0 or v > 1000:
            raise ValueError("pixelsPerMm must be between 0 (exclusive) and 1000")
        return v

    @field_validator("confidenceThreshold")
    @classmethod
    def validate_confidence(cls, v: float) -> float:
        if v < 0 or v > 1:
            raise ValueError("confidenceThreshold must be between 0 and 1")
        return v

    @field_validator("image")
    @classmethod
    def validate_image_size(cls, v: str) -> str:
        # Reject images larger than ~15MB base64 (~11MB decoded)
        if len(v) > 20_000_000:
            raise ValueError("Image data too large (max ~15MB)")
        return v

def generate_mock_detection(model_type, width, height, num=2):
    detections = []
    for i in range(num):
        w = max(20, width * 0.1)
        h = max(20, height * 0.1)
        cx = width / 2 + (i * 20)
        cy = height / 2 + (i * 20)
        detections.append({
            "id": f"{model_type}-{i}",
            "label": "pipe_circle" if model_type == 'circle' else "pipe_line",
            "confidence": 0.95 - (i * 0.05),
            "x": cx - w/2,
            "y": cy - h/2,
            "width": w,
            "height": h,
            "model": model_type,
            "opencv": None,
        })
    return detections

def image_from_b64(b64_str):
    if b64_str.startswith("data:image"):
        b64_str = b64_str.split(",")[1]
    try:
        img_data = base64.b64decode(b64_str)
    except Exception:
        raise ValueError("Invalid base64 image data")
    nparr = np.frombuffer(img_data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Failed to decode image")
    return img


# ─── OpenCV Measurement Helpers ──────────────────────────────────────────────

def opencv_measure_circle(img: np.ndarray, x: int, y: int, w: int, h: int, px_per_mm: float) -> dict:
    """
    Run OpenCV contour analysis on a circle (cross-section) bounding box region.
    Returns real contour area, perimeter, circularity, fitted ellipse, and diameter in mm.
    """
    # Clamp ROI to image bounds
    ih, iw = img.shape[:2]
    x1, y1 = max(0, int(x)), max(0, int(y))
    x2, y2 = min(iw, int(x + w)), min(ih, int(y + h))
    roi = img[y1:y2, x1:x2]
    if roi.size == 0:
        return _fallback_circle(w, h, px_per_mm)

    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    # Adaptive threshold for pipes against varying backgrounds
    thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                   cv2.THRESH_BINARY_INV, 11, 2)

    # Morphological close to fill small gaps
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)

    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if not contours:
        return _fallback_circle(w, h, px_per_mm)

    # Use the largest contour
    cnt = max(contours, key=cv2.contourArea)
    area = cv2.contourArea(cnt)
    perimeter = cv2.arcLength(cnt, True)
    circularity = (4 * math.pi * area) / (perimeter * perimeter) if perimeter > 0 else 0

    result = {
        "contourArea": round(area, 2),
        "perimeter": round(perimeter, 2),
        "circularity": round(min(circularity, 1.0), 4),
        "ellipse": None,
        "diameter_px": None,
        "diameter_mm": None,
        "center": None,
    }

    # Fit ellipse if enough points
    if len(cnt) >= 5:
        try:
            ellipse = cv2.fitEllipse(cnt)
            (cx_e, cy_e), (ma, MA), angle = ellipse
            avg_diameter_px = (ma + MA) / 2
            result["ellipse"] = {
                "center": [round(cx_e + x1, 1), round(cy_e + y1, 1)],
                "axes": [round(ma, 2), round(MA, 2)],
                "angle": round(angle, 2),
            }
            result["diameter_px"] = round(avg_diameter_px, 2)
            result["diameter_mm"] = round(avg_diameter_px / px_per_mm, 2) if px_per_mm > 0 else None
            result["center"] = [round(cx_e + x1, 1), round(cy_e + y1, 1)]
        except cv2.error:
            # Collinear points or degenerate contour — fallback to bbox
            avg_px = (w + h) / 2
            result["diameter_px"] = round(avg_px, 2)
            result["diameter_mm"] = round(avg_px / px_per_mm, 2) if px_per_mm > 0 else None
            result["center"] = [round(x + w / 2, 1), round(y + h / 2, 1)]
    else:
        # Fallback: use bounding box dimensions
        avg_px = (w + h) / 2
        result["diameter_px"] = round(avg_px, 2)
        result["diameter_mm"] = round(avg_px / px_per_mm, 2) if px_per_mm > 0 else None
        result["center"] = [round(x + w / 2, 1), round(y + h / 2, 1)]

    return result


def _fallback_circle(w, h, px_per_mm):
    avg_px = (w + h) / 2
    return {
        "contourArea": round(math.pi * (w / 2) * (h / 2), 2),
        "perimeter": round(math.pi * ((3 * (w / 2 + h / 2)) - math.sqrt((3 * w / 2 + h / 2) * (w / 2 + 3 * h / 2))), 2),
        "circularity": round(min(w, h) / max(w, h, 1), 4),
        "ellipse": None,
        "diameter_px": round(avg_px, 2),
        "diameter_mm": round(avg_px / px_per_mm, 2) if px_per_mm > 0 else None,
        "center": None,
    }


def opencv_measure_line(img: np.ndarray, x: int, y: int, w: int, h: int, px_per_mm: float) -> dict:
    """
    Run OpenCV contour analysis on a line (top/side view pipe) bounding box region.
    Returns contour area, min-area rect, length, width (thickness) in mm, and angle.
    """
    ih, iw = img.shape[:2]
    x1, y1 = max(0, int(x)), max(0, int(y))
    x2, y2 = min(iw, int(x + w)), min(ih, int(y + h))
    roi = img[y1:y2, x1:x2]
    if roi.size == 0:
        return _fallback_line(w, h, px_per_mm)

    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    # Edge detection for line features
    edges = cv2.Canny(blurred, 50, 150)

    # Dilate to merge close edges
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    edges = cv2.dilate(edges, kernel, iterations=1)

    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if not contours:
        return _fallback_line(w, h, px_per_mm)

    cnt = max(contours, key=cv2.contourArea)
    area = cv2.contourArea(cnt)
    perimeter = cv2.arcLength(cnt, True)

    result = {
        "contourArea": round(area, 2),
        "perimeter": round(perimeter, 2),
        "minAreaRect": None,
        "length_px": None,
        "length_mm": None,
        "thickness_px": None,
        "thickness_mm": None,
        "angle": None,
    }

    if len(cnt) >= 5:
        rect = cv2.minAreaRect(cnt)
        (cx_r, cy_r), (rw, rh), angle = rect
        # longer side = length, shorter = thickness
        length_px = max(rw, rh)
        thickness_px = min(rw, rh)

        result["minAreaRect"] = {
            "center": [round(cx_r + x1, 1), round(cy_r + y1, 1)],
            "size": [round(rw, 2), round(rh, 2)],
            "angle": round(angle, 2),
        }
        result["length_px"] = round(length_px, 2)
        result["length_mm"] = round(length_px / px_per_mm, 2) if px_per_mm > 0 else None
        result["thickness_px"] = round(thickness_px, 2)
        result["thickness_mm"] = round(thickness_px / px_per_mm, 2) if px_per_mm > 0 else None
        result["angle"] = round(angle, 2)
    else:
        length_px = float(max(w, h))
        thickness_px = float(min(w, h))
        result["length_px"] = round(length_px, 2)
        result["length_mm"] = round(length_px / px_per_mm, 2) if px_per_mm > 0 else None
        result["thickness_px"] = round(thickness_px, 2)
        result["thickness_mm"] = round(thickness_px / px_per_mm, 2) if px_per_mm > 0 else None
        result["angle"] = round(math.degrees(math.atan2(h, w)), 2)

    return result


def _fallback_line(w, h, px_per_mm):
    length_px = float(max(w, h))
    thickness_px = float(min(w, h))
    return {
        "contourArea": round(w * h, 2),
        "perimeter": round(2 * (w + h), 2),
        "minAreaRect": None,
        "length_px": round(length_px, 2),
        "length_mm": round(length_px / px_per_mm, 2) if px_per_mm > 0 else None,
        "thickness_px": round(thickness_px, 2),
        "thickness_mm": round(thickness_px / px_per_mm, 2) if px_per_mm > 0 else None,
        "angle": round(math.degrees(math.atan2(h, w)), 2),
    }


# ─── Detection Pipeline ─────────────────────────────────────────────────────

INFERENCE_TIMEOUT_S = 15

def run_detection(image_b64: str, confidence_threshold: float = 0.5, px_per_mm: float = 4.0):
    img = image_from_b64(image_b64)
    h, w, _ = img.shape
    
    circle_detections = []
    line_detections = []

    if circle_model is None or line_model is None:
        raise RuntimeError("Models not loaded. Cannot perform inference.")

    try:
        c_res = circle_model(img, verbose=False)[0]
        l_res = line_model(img, verbose=False)[0]
    except Exception as e:
        raise RuntimeError(f"Model inference failed: {e}")

    for i, box in enumerate(c_res.boxes):
        conf = float(box.conf[0])
        if conf < confidence_threshold:
            continue
        cls_id = int(box.cls[0])
        label = circle_model.names.get(cls_id, "pipe_circle")
        b = box.xywh[0].tolist()
        bx, by, bw, bh = b[0] - b[2]/2, b[1] - b[3]/2, b[2], b[3]

        opencv_data = opencv_measure_circle(img, int(bx), int(by), int(bw), int(bh), px_per_mm)

        circle_detections.append({
            "id": f"circle-{i}",
            "label": label,
            "confidence": round(conf, 4),
            "x": round(bx, 2),
            "y": round(by, 2),
            "width": round(bw, 2),
            "height": round(bh, 2),
            "model": "circle",
            "opencv": opencv_data,
        })

    for i, box in enumerate(l_res.boxes):
        conf = float(box.conf[0])
        if conf < confidence_threshold:
            continue
        cls_id = int(box.cls[0])
        label = line_model.names.get(cls_id, "pipe_line")
        b = box.xywh[0].tolist()
        bx, by, bw, bh = b[0] - b[2]/2, b[1] - b[3]/2, b[2], b[3]

        opencv_data = opencv_measure_line(img, int(bx), int(by), int(bw), int(bh), px_per_mm)

        line_detections.append({
            "id": f"line-{i}",
            "label": label,
            "confidence": round(conf, 4),
            "x": round(bx, 2),
            "y": round(by, 2),
            "width": round(bw, 2),
            "height": round(bh, 2),
            "model": "line",
            "opencv": opencv_data,
        })

    all_detections = circle_detections + line_detections
    return {
        "detections": all_detections,
        "circleCount": len(circle_detections),
        "lineCount": len(line_detections),
        "frameWidth": w,
        "frameHeight": h,
    }

@app.post("/api/inference")
async def detect(req: DetectionRequest):
    try:
        results = run_detection(req.image, req.confidenceThreshold, req.pixelsPerMm)
        return {"detections": results["detections"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/inference/dual")
async def detect_dual(req: DetectionRequest):
    try:
        results = run_detection(req.image, req.confidenceThreshold, req.pixelsPerMm)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
def health():
    return {
        "status": "ok" if (circle_model is not None and line_model is not None) else "degraded",
        "models": {
            "circle": circle_model is not None,
            "line": line_model is not None,
        },
    }

if __name__ == "__main__":
    uvicorn.run("detect_service:app", host="127.0.0.1", port=5000, reload=True)
