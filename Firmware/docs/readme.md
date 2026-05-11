# Spectra — Hardware System README

> **Subsystem:** Hardware & Image Acquisition
> **Version:** 1.1
> **Last Updated:** 2026-03-08
> **Status:** Active
> **Related Docs:** [01 – System Overview](01-system-overview.md) · [02 – System Architecture](02-system-architecture.md) · [05 – Measurement & Vision Processing](05-measurement-and-vision-processing.md)

---

## Table of Contents

- [Overview](#overview)
- [1. Components Required](#1-components-required)
- [2. Connection Pinout](#2-connection-pinout)
- [3. Workflow](#3-workflow)
- [4. System Integration](#4-system-integration)
- [Troubleshooting](#troubleshooting)
- [Hardware Setup Checklist](#hardware-setup-checklist)

---

## Overview

The Spectra hardware subsystem is responsible for capturing images of rods and pipes from the inspection environment and transmitting them to the AI processing pipeline. It is built around the **ESP32-CAM** embedded vision module mounted on a **servo-driven pan-tilt robotic holder**, enabling dynamic camera positioning across the inspection area.

The system supports two capture modes:

| Mode     | Device             | Use Case                                  |
| -------- | ------------------ | ----------------------------------------- |
| Embedded | ESP32-CAM (OV2640) | Industrial shop-floor deployment          |
| Desktop  | Laptop Webcam      | Development, debugging, and model testing |

**Total Estimated Hardware Cost: $25–$45** (base configuration)

---

## 1. Components Required

### Core Components

| #   | Component                           | Qty    | Estimated Cost | Purpose                                         |
| --- | ----------------------------------- | ------ | -------------- | ----------------------------------------------- |
| 1   | ESP32-CAM Module                    | 1      | $5–$8          | Primary embedded camera unit with built-in WiFi |
| 2   | SG90 Servo Motor                    | 2      | $2–$4 each     | Drive pan (horizontal) and tilt (vertical) axes |
| 3   | ESP32-CAM Robotic Holder (Pan-Tilt) | 1      | $5–$10         | 3D-printed mechanical mount for camera          |
| 4   | Mini Breadboard                     | 1      | $1–$2          | Prototyping and component wiring                |
| 5   | 3.7V Lithium Battery (18650)        | 2      | $3–$5 each     | Power supply for ESP32 and servos               |
| 6   | 2×18650 Battery Holder              | 1      | $1–$2          | Houses and connects the lithium batteries       |
| 7   | USB-to-Serial Adapter (FTDI)        | 1      | $3–$5          | Firmware flashing and serial debugging          |
| 8   | Jumper Wires (M-M and M-F)          | 1 pack | $2–$3          | General wiring connections                      |

### Optional Components

| #   | Component              | Qty | Estimated Cost | Purpose                                               |
| --- | ---------------------- | --- | -------------- | ----------------------------------------------------- |
| 9   | LCD Display 16×2 (I2C) | 1   | $3–$5          | On-device status display (WiFi, stream state)         |
| 10  | Piezo Buzzer           | 1   | $0.50–$1       | Audible alerts for startup, errors, inspection events |

### Supplier Options

- **AliExpress / Amazon** — ESP32-CAM, servo motors, breadboard, batteries
- **Adafruit / SparkFun** — FTDI adapter, jumper wires, servos
- **Local electronics stores** — Breadboards, wires, buzzers

> **Tip:** The low per-unit cost makes it practical to deploy multiple inspection stations across a facility simultaneously.

---

## 2. Connection Pinout

### ESP32-CAM GPIO Pin Assignments

| Component      | ESP32-CAM Pin | Signal Type    | Notes                       |
| -------------- | ------------- | -------------- | --------------------------- |
| Servo 1 (Pan)  | GPIO 14       | PWM Output     | Horizontal 180° rotation    |
| Servo 2 (Tilt) | GPIO 15       | PWM Output     | Vertical up/down adjustment |
| Buzzer         | GPIO 12       | Digital Output | Optional alert signal       |
| LCD SDA        | GPIO 13       | I2C Data       | Optional display            |
| LCD SCL        | GPIO 2        | I2C Clock      | Optional display            |
| LED Flash      | GPIO 4        | Digital Output | Built-in flash (HIGH = on)  |

### Servo Motor Wire Connections

| Wire Colour     | Function     | Connect To         |
| --------------- | ------------ | ------------------ |
| Red             | Power (VCC)  | 5V rail            |
| Brown / Black   | Ground (GND) | GND rail           |
| Yellow / Orange | Signal (PWM) | GPIO 14 or GPIO 15 |

### Servo PWM Parameters

| Parameter           | Value       |
| ------------------- | ----------- |
| Signal Frequency    | 50 Hz       |
| Minimum Pulse Width | 1 ms (0°)   |
| Maximum Pulse Width | 2 ms (180°) |
| Rotation Range      | 0° – 180°   |

### Camera Module Pin Mapping (AI-Thinker Variant)

```cpp
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22
```

### Power Requirements

| Component        | Operating Voltage | Active Current      |
| ---------------- | ----------------- | ------------------- |
| ESP32-CAM        | 5V                | ~310 mA             |
| Servo Motor (×2) | 5–6V              | ~160 mA each        |
| LCD Display      | 5V (I2C)          | ~30 mA              |
| **Total System** | **5V**            | **~630 mA minimum** |

> **Warning:** GPIO 0 is reserved for boot mode selection — do not connect peripherals to it, as this will prevent firmware upload. GPIO 4 controls the built-in flash LED; avoid setting it HIGH during image capture.

---

## 3. Workflow

### Step 1 — Assemble Hardware

1. Mount the ESP32-CAM onto the 3D-printed pan-tilt robotic holder.
2. Connect Servo 1 (Pan) signal wire to **GPIO 14** and Servo 2 (Tilt) signal wire to **GPIO 15**.
3. Connect both servo power wires to the **5V rail** and ground wires to **GND** on the breadboard.
4. Connect batteries to the battery holder and wire the output to the breadboard power rails.
5. Optionally, connect the LCD display (SDA → GPIO 13, SCL → GPIO 2) and buzzer (→ GPIO 12).

### Step 2 — Flash Firmware

1. Install **Arduino IDE** and add ESP32 board support via the Boards Manager.
2. Connect the ESP32-CAM to your PC using the **FTDI USB-to-Serial adapter**.
3. Set `IO0` to **GND** to enter flash mode before uploading.
4. Configure WiFi credentials in the firmware:

```cpp
const char* ssid     = "YourNetworkName";
const char* password = "YourPassword";
```

5. Set the target resolution (VGA recommended for inspection):

```cpp
config.frame_size   = FRAMESIZE_VGA;   // 640×480
config.jpeg_quality = 12;
```

6. Upload the firmware. Disconnect `IO0` from GND and reset the board.

### Step 3 — Verify Camera Stream

1. Power on the system and open the **Arduino Serial Monitor** at 115200 baud.
2. Confirm the camera initialises and WiFi connects successfully.
3. Note the assigned IP address and navigate to the streaming endpoint:

```
http://<camera-ip>/stream
```

4. Verify the video feed is visible and stable before proceeding.

### Step 4 — Calibrate Camera

1. Place a reference object of known dimensions in the camera's field of view.
2. Record the **pixel-to-real-world conversion factor** for the measurement engine.
3. Verify the calibration using a second object with a known diameter.

> See **[05 – Measurement and Vision Processing](05-measurement-and-vision-processing.md)** for full calibration procedures.

### Step 5 — Control Pan-Tilt via Web Interface

1. Navigate to the ESP32-hosted webserver (`http://<camera-ip>/`).
2. Use the web controls to position the camera:
   - **Servo 1 (Pan):** Horizontal 180° radar-style sweep for wide area coverage.
   - **Servo 2 (Tilt):** Vertical angle adjustment for close-range or multi-level inspection.
3. Confirm all target rods or pipes fall within the camera's scan range.

### Resolution vs. Performance Reference

| Resolution        | Frame Rate | Bandwidth     | Detection Quality | Recommended Use         |
| ----------------- | ---------- | ------------- | ----------------- | ----------------------- |
| QVGA (320×240)    | 30 FPS     | ~150 KB/s     | Basic             | Rapid prototyping       |
| **VGA (640×480)** | **25 FPS** | **~500 KB/s** | **Good**          | **Standard inspection** |
| SVGA (800×600)    | 15 FPS     | ~800 KB/s     | High              | Detailed measurement    |
| UXGA (1600×1200)  | 5 FPS      | ~2 MB/s       | Maximum           | Offline analysis        |

---

## 4. System Integration

The hardware subsystem feeds directly into the Spectra AI and measurement pipeline. The diagram below illustrates how each hardware component connects to the broader system:

```
┌──────────────────────────────────────────────────────────┐
│                    HARDWARE LAYER                        │
│                                                          │
│   [Battery Pack] ──► [ESP32-CAM + OV2640 Sensor]        │
│                           │                              │
│              ┌────────────┼────────────┐                 │
│              ▼            ▼            ▼                 │
│        [Servo 1]    [Servo 2]    [LCD]          │
│         (Pan)       (Tilt)                 │
└──────────────────────────────────────────────────────────┘
                            │
                    WiFi / WebRTC Stream
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│                   PROCESSING LAYER                       │
│                                                          │
│   [WebRTC Stream] ──► [Local YOLOv8 Inference]     │
│                              │                           │
│                              ▼                           │
│                   [OpenCV Measurement Engine]            │
│                              │                           │
│                              ▼                           │
│               [Node.js / Express API Gateway]            │
└──────────────────────────────────────────────────────────┘
                            │
                    REST API / WebSocket
                            │
                            ▼
┌──────────────────────────────────────────────────────────┐
│                  PRESENTATION LAYER                      │
│                                                          │
│         [React Dashboard] ──► [Firebase Firestore]        │
└──────────────────────────────────────────────────────────┘
```

### Integration Points

| Interface           | Hardware Side                     | System Side                | Protocol         |
| ------------------- | --------------------------------- | -------------------------- | ---------------- |
| Video Stream        | ESP32-CAM `/stream` endpoint      | WebRTC / HTTP ingestion    | WebRTC / MJPEG   |
| Pan-Tilt Control    | ESP32 webserver                   | Web browser or API client  | HTTP GET         |
| Measurement Trigger | Frame captured at target position | OpenCV pipeline            | Internal         |
| Results Output      | N/A (hardware-only)               | React dashboard + Firebase | REST / WebSocket |

### Camera Stream Integration Example

The backend server ingests frames from the ESP32 streaming endpoint and forwards them to the AI inference pipeline:

```python
import cv2

stream_url = "http://<camera-ip>/stream"
cap = cv2.VideoCapture(stream_url)

while cap.isOpened():
    ret, frame = cap.read()
    if ret:
        # Forward frame to YOLOv8 / OpenCV measurement pipeline
        process_frame(frame)
```

### Technology Layer Summary

| Layer        | Technology            | Role                                  |
| ------------ | --------------------- | ------------------------------------- |
| Hardware     | ESP32-CAM (OV2640)    | Image capture and WiFi streaming      |
| Streaming    | WebRTC                | Low-latency real-time video delivery  |
| AI Detection | YOLOv8 (Local FastAPI)   | Object detection and classification   |
| Measurement  | OpenCV (Python)       | Geometric analysis and dimensioning   |
| Frontend     | React 19 + TypeScript | Interactive monitoring dashboard      |
| Backend      | Node.js + Express 5   | API gateway and service orchestration |
| Database     | Firebase (Cloud Firestore) | Persistent inspection data storage    |

---

## Troubleshooting

| Symptom                     | Likely Cause                             | Solution                                                                                         |
| --------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Camera not detected at boot | Loose ribbon cable or incorrect firmware | Re-seat camera ribbon; verify pin definitions match board variant                                |
| WiFi connection fails       | Wrong credentials or weak signal         | Check `ssid`/`password` in firmware; move closer to access point; verify `WiFi.RSSI()` > −70 dBm |
| Servo not moving            | Insufficient power or wrong GPIO         | Ensure supply > 630 mA; verify signal connected to GPIO 14 / GPIO 15; check PWM at 50 Hz         |
| Blurry or dark image        | Poor focus or lighting                   | Clean lens; add controlled LED illumination; avoid GPIO 4 flash interference                     |
| Stream not accessible       | IP conflict or firewall                  | Confirm IP via Serial Monitor; check router firewall; ensure device is on same subnet            |

> **Tip:** Enable `Serial.println()` diagnostic statements in firmware and use the Arduino Serial Monitor at 115200 baud to trace exactly which initialisation step is failing.

---

## Hardware Setup Checklist

- [ ] ESP32-CAM module functional and firmware uploaded successfully
- [ ] Camera captures clear images at VGA (640×480) resolution
- [ ] WiFi connection stable with RSSI > −70 dBm
- [ ] Servo 1 (Pan) responds correctly on GPIO 14
- [ ] Servo 2 (Tilt) responds correctly on GPIO 15
- [ ] Pan range covers full 180° inspection area
- [ ] Tilt range provides optimal viewing angle for target objects
- [ ] Power supply delivers sufficient current (> 630 mA)
- [ ] Camera mounted securely with minimal vibration
- [ ] Streaming endpoint accessible from backend server (`http://<camera-ip>/stream`)
- [ ] Calibration reference measurement verified
- [ ] Optional LCD displaying correct status information (if fitted)
