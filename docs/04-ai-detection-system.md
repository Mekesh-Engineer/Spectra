# AI Detection System

> **Document:** 04 – AI Detection System
> **Version:** 2.0
> **Last Updated:** 2026-03-09
> **Status:** Active
> **Authors:** Spectra Development Team
> **Prerequisites:**
> [01 – System Overview](01-system-overview.md)
> [02 – System Architecture](02-system-architecture.md)
> [03 – Hardware](03-hardware-and-acquisition.md)

---

# Table of Contents

1. Overview of AI Detection
2. YOLOv8 Architecture
3. Local AI Model Framework
4. Model Training Pipeline
5. Dataset Preparation
6. Data Annotation Strategy
7. Pipe Circle Detection Model
8. Pipe Line Detection Model
9. Local Inference Workflow
10. Python Inference Engine
11. Detection Pipeline
12. Bounding Box Processing
13. Object Counting
14. Confidence Scoring
15. Prediction JSON Format
16. Performance Metrics
17. Model Evaluation
18. Improving Detection Accuracy
19. Model Version Management
20. Conclusion

---

# 1. Overview of AI Detection

The **AI Detection System** is the core analytical module of the Spectra platform.

It detects cylindrical objects such as **pipes and rods** from images captured by the camera system.

The detection subsystem performs the following tasks:

- detect circular pipe openings
- detect rod or pipe bodies
- generate bounding boxes
- compute object counts
- provide structured prediction outputs

These detection outputs are passed to the **OpenCV measurement engine** to calculate:

- pipe diameter
- pipe length
- rod inventory statistics

---

# 2. YOLOv8 Architecture

Spectra uses **YOLOv8 (You Only Look Once v8)** for real-time object detection.

YOLO is a **single-stage deep learning detection architecture** designed for high-speed inference.

### Key Characteristics

- real-time detection
- high precision
- single-pass inference
- optimized for edge devices

### YOLOv8 Model Variants

| Variant | Parameters | Speed    | Recommended Use     |
| ------- | ---------- | -------- | ------------------- |
| YOLOv8n | 3.2M       | Fastest  | Embedded systems    |
| YOLOv8s | 11.2M      | Balanced | **Spectra default** |
| YOLOv8m | 25.9M      | Slower   | High accuracy       |

Spectra uses **YOLOv8s** for optimal balance between speed and accuracy.

---

# 3. Local AI Model Framework

Unlike cloud-based systems, Spectra uses **locally stored YOLOv8 model weights**.

This eliminates network dependency and ensures **low-latency real-time detection**.

### Local Model Storage

```
spectra-ai/
│
├── models/
│   ├── pipe_circle_model.pt
│   └── pipe_line_model.pt
│
├── inference/
│   └── detect.py
```

Advantages:

- no internet dependency
- lower inference latency
- full control over model updates
- stable industrial deployment

---

# 4. Model Training Pipeline

The YOLO models are trained using **Ultralytics YOLOv8**.

Training is performed offline using:

- Google Colab
- Kaggle
- local GPU workstation

### Training Workflow

```
Dataset Collection
        ↓
Image Annotation
        ↓
Dataset Augmentation
        ↓
YOLOv8 Training
        ↓
Model Evaluation
        ↓
Export best.pt
        ↓
Local Deployment
```

Example training code:

```python
from ultralytics import YOLO

model = YOLO("yolov8s.pt")

model.train(
    data="dataset/data.yaml",
    epochs=100,
    imgsz=640,
    batch=16
)
```

Training generates:

```
runs/detect/train/weights/best.pt
```

This model is renamed and deployed as:

```
pipe_circle_model.pt
pipe_line_model.pt
```

---

# 5. Dataset Preparation

High-quality datasets are essential for accurate detection.

### Dataset Sources

Images may be collected from:

- industrial inspection environments
- laboratory setups
- production pipelines
- synthetic datasets

### Dataset Requirements

Dataset diversity improves generalization:

- different pipe sizes
- multiple lighting conditions
- different camera angles
- cluttered backgrounds

### Recommended Dataset Size

| Stage      | Images   |
| ---------- | -------- |
| Prototype  | 200–400  |
| Production | 800–1500 |
| Validation | 100–200  |
| Testing    | 100–200  |

---

# 6. Data Annotation Strategy

Images are annotated using **bounding boxes**.

Example annotation:

```json
{
  "class": "pipe_circle",
  "bbox": [210, 140, 35, 35]
}
```

### Annotation Rules

- tight bounding boxes
- correct class labels
- avoid overlapping boxes
- ensure object visibility

Annotation tools may include:

- LabelImg
- CVAT
- Label Studio (annotation only)

---

# 7. Pipe Circle Detection Model

The **pipe_circle_model.pt** model detects circular pipe cross-sections.

### Model Purpose

Detect:

- pipe openings
- rod ends
- circular metallic structures

### Detection Example

```json
{
  "class": "pipe_circle",
  "confidence": 0.94,
  "bbox": [210, 140, 35, 35]
}
```

### Detection Characteristics

| Property             | Value        |
| -------------------- | ------------ |
| Typical diameter     | 20–80 pixels |
| Aspect ratio         | ~1:1         |
| Confidence threshold | 0.5          |

---

# 8. Pipe Line Detection Model

The **pipe_line_model.pt** model detects elongated rods and pipes.

### Detection Example

```json
{
  "class": "pipe_line",
  "confidence": 0.91,
  "bbox": [120, 200, 300, 50]
}
```

These detections help estimate:

- rod length
- pipe alignment
- orientation

---

# 9. Local Inference Workflow

Inference runs locally on the inspection system.

### Inference Steps

1. capture frame from camera
2. preprocess frame
3. run YOLOv8 model
4. generate bounding boxes
5. send results to measurement module

### Inference Flow

```
Camera
   ↓
Frame Capture
   ↓
YOLOv8 Detection
   ↓
Bounding Box Output
   ↓
Measurement Engine
   ↓
Web Dashboard
```

---

# 10. Python Inference Engine

Spectra uses a **Python inference engine** built with:

- Ultralytics YOLOv8
- OpenCV
- NumPy

Example detection script:

```python
from ultralytics import YOLO
import cv2

circle_model = YOLO("models/pipe_circle_model.pt")
line_model = YOLO("models/pipe_line_model.pt")

cap = cv2.VideoCapture(0)

while True:

    ret, frame = cap.read()

    circle_results = circle_model(frame)
    line_results = line_model(frame)

    frame = circle_results[0].plot()
    frame = line_results[0].plot(img=frame)

    cv2.imshow("Spectra Detection", frame)

    if cv2.waitKey(1) == 27:
        break
```

---

# 11. Detection Pipeline

```
Camera
   ↓
Video Stream
   ↓
Frame Processing
   ↓
YOLOv8 Detection
   ↓
Bounding Box Processing
   ↓
Measurement Module
   ↓
Web Visualization
```

---

# 12. Bounding Box Processing

Each bounding box contains:

- x coordinate
- y coordinate
- width
- height

These coordinates are passed to the **OpenCV measurement module**.

---

# 13. Object Counting

Object counts are derived from detection outputs.

Example output:

```json
{
  "pipe_count": 12
}
```

Used for:

- pallet inventory tracking
- batch inspection

---

# 14. Confidence Scoring

Each detection includes a confidence score.

Range:

```
0.0 – 1.0
```

Recommended threshold:

```
confidence > 0.5
```

---

# 15. Prediction JSON Format

Detection results are structured JSON objects.

Example:

```json
{
  "predictions": [
    {
      "class": "pipe_circle",
      "confidence": 0.92,
      "bbox": [210, 140, 35, 35]
    }
  ]
}
```

---

# 16. Performance Metrics

| Metric    | Value |
| --------- | ----- |
| Precision | 0.92  |
| Recall    | 0.90  |
| mAP       | 0.91  |

---

# 17. Model Evaluation

Evaluation methods include:

- validation dataset testing
- cross-validation
- real industrial testing

---

# 18. Improving Detection Accuracy

Techniques include:

### Data Augmentation

- rotation
- brightness changes
- blur
- mosaic

### Hyperparameter Tuning

| Parameter     | Default |
| ------------- | ------- |
| Learning Rate | 0.01    |
| Batch Size    | 16      |
| Epochs        | 100     |

---

# 19. Model Version Management

Model versions are stored locally.

Example:

```
models/
pipe_circle_model_v1.pt
pipe_circle_model_v2.pt
pipe_line_model_v1.pt
```

Version control ensures reproducibility.

---

# 20. Conclusion

The AI detection system forms the **intelligence layer of the Spectra platform**.

By combining:

- YOLOv8 local detection models
- OpenCV measurement algorithms
- real-time video processing

the system provides **accurate industrial pipe inspection without cloud dependency**.

The detection outputs form the foundation of the **automated measurement and inspection system** used by Spectra.
