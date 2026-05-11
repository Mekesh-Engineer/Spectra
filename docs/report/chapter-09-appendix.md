# APPENDIX

## Appendix A: Source Code Snippets

This appendix provides key excerpts from the core components of the Spectra system showing the interoperability of the hardware, AI inference engine, and the backend server.

### A.1 ESP32-CAM Serial & Servo Initialization

Excerpt from the `rod_detector.ino` script showcasing camera framing constraints and the initialization of the SG90 servo motor PWM parameters.

```cpp
#include "esp_camera.h"
#include <ESP32Servo.h>

Servo panServo;
Servo tiltServo;

void setup() {
  Serial.begin(115200);

  // Initialize Servo PWM Channels
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);
  panServo.setPeriodHertz(50);
  tiltServo.setPeriodHertz(50);
  panServo.attach(14, 500, 2400); // Pan attached to GPIO 14
  tiltServo.attach(15, 500, 2400); // Tilt attached to GPIO 15

  // Initialize Camera
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  // ... (additional pin configurations omitted)
  config.frame_size = FRAMESIZE_VGA;
  config.jpeg_quality = 10;
  config.fb_count = 2;

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x", err);
    return;
  }
}
```

### A.2 FastAPI Dual-Model Inference Pipeline

Excerpt from `ai-engine/detect_service.py` where dual YOLOv8 model inference runs simultaneously on inbound network Base64 payloads.

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from ultralytics import YOLO
import base64
import cv2
import numpy as np

app = FastAPI()

# Load YOLOv8 Models
circle_model = YOLO("Model/pipe_circle_model.pt")
line_model = YOLO("Model/pipe_line_model.pt")

class InferenceRequest(BaseModel):
    frame: str
    px_per_mm: float = 1.0

@app.post("/api/inference/dual")
async def run_dual_inference(req: InferenceRequest):
    try:
        # Decode Base64 string into OpenCV matrix
        img_bytes = base64.b64decode(req.frame)
        np_arr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        # Extrapolate detections concurrently
        circ_res = circle_model.predict(img, conf=0.5)[0]
        line_res = line_model.predict(img, conf=0.5)[0]

        detections = []
        # Parse and format circle bounding boxes
        for box in circ_res.boxes:
            c = box.xywh[0].tolist()
            detections.append({
                "class": "circle",
                "confidence": float(box.conf),
                "bbox": {"x": c[0], "y": c[1], "w": c[2], "h": c[3]}
            })

        # Parse and format line bounding boxes
        for box in line_res.boxes:
            c = box.xywh[0].tolist()
            detections.append({
                "class": "line",
                "confidence": float(box.conf),
                "bbox": {"x": c[0], "y": c[1], "w": c[2], "h": c[3]}
            })

        return {"status": "success", "detections": detections}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

---

## Appendix B: Additional Technical Data

### B.1 REST API Endpoint Data Schema Overview

The Node.js Express backend standardizes inputs/outputs with the following strict JSON schema structures.

**1. Inference Merge Object (`/api/inference/detect-dual`)**

```json
{
  "status": "success",
  "circleCount": 4,
  "lineCount": 1,
  "detections": [
    {
      "model": "pipe_circle",
      "confidence": 0.942,
      "dimensions": { "diameter_mm": 26.78 },
      "bbox": [255, 660, 119, 121]
    },
    {
      "model": "pipe_line",
      "confidence": 0.659,
      "dimensions": { "length_mm": 102.4 },
      "bbox": [430, 202, 381, 45]
    }
  ]
}
```

---

