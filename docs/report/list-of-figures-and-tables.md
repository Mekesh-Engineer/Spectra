# LIST OF FIGURES, TABLES, AND BLOCK DIAGRAMS

## LIST OF FIGURES

**CHAPTER 1: INTRODUCTION**

- **Figure 1.1**: Traditional vs. Automated Inspection Workflows — A side-by-side workflow diagram comparing manual offline measurement processes with real-time automated AI inspection on a continuous manufacturing line.

**CHAPTER 2: LITERATURE REVIEW**

- **Figure 2.1**: Evolution of Object Detection Models — A timeline chart illustrating the progression from classical deterministic edge detection algorithms to two-stage CNNs (Faster R-CNN) and single-stage detectors (YOLO series).

**CHAPTER 3: PROPOSED METHODOLOGY**

- **Figure 3.1**: Block Diagram of the Proposed System Architecture — A comprehensive structural flowchart showing the data pipelines between the Hardware Layer (ESP32-CAM), the AI Inference Layer (FastAPI/YOLOv8), the Backend Server (Node.js), and the Frontend Dashboard (React).
- **Figure 3.2**: Dual-Model AI Detection Logic — A workflow diagram defining the concurrent execution paths of the `pipe_circle_model` and `pipe_line_model` via the system's parallel processing engine.
- **Figure 3.3**: Dimensional Estimation Geometry — A diagram demonstrating the extraction of Region of Interest (ROI) and the subsequent pixel-to-metric mathematical conversion using the camera calibration matrix.

**CHAPTER 4: HARDWARE IMPLEMENTATION**

- **Figure 4.1**: ESP32-CAM Module and OV2640 Sensor — An annotated image highlighting the layout of the ESP32-CAM logic board, Wi-Fi antenna, and crucial GPIO pinouts.
- **Figure 4.2**: Pan-Tilt Servo Mechanism — A mechanical diagram indicating the structural mounting and rotational axes (+/- 180 degrees) governed by the dual SG90 micro servo motors.
- **Figure 4.3**: Overall Hardware Wiring Diagram — A comprehensive schematic illustrating the power delivery from the 3.7V Lithium-Ion battery setup to the ESP32, and the PWM signal routing to the servo channels.

**CHAPTER 5: SOFTWARE IMPLEMENTATION**

- **Figure 5.1**: Microservices System Architecture — A detailed topology diagram mapping the communication protocols (HTTP REST, WebSockets, MJPEG streaming) between the decentralized system components.
- **Figure 5.2**: YOLOv8 Internal Process Flow — A flowchart segmenting the underlying neural network layers of YOLO (Backbone, Neck, and Head) adapted for bounding box regressions in the project.
- **Figure 5.3**: Spectra Dashboard User Interface — A captured visualization of the React web application interface, demonstrating the dual-feed switcher, live telemetry overlays, and active anomaly alerts.

**CHAPTER 6: RESULTS AND DISCUSSION**

- **Figure 6.1**: Assembled Final Hardware Prototype — An authentic photograph of the completely assembled Spectra camera unit, including 3D-printed chassis details and integrated battery arrays.
- **Figure 6.2**: Model Mean Average Precision (mAP) Trends — A performance line chart illustrating the convergence of training and validation loss curves and the resulting precision indices for both YOLOv8 sub-models.
- **Figure 6.3**: Bounding Box Output Comparison — A visual evaluation showing side-by-side images of pipes under optimal and sub-optimal lighting constraints, with drawn AI bounding coordinates.
- **Figure 6.4**: Real-Time Measurement Processing UI — A dashboard screenshot validating the real-time calculated sub-millimeter measurements overlaying the streaming ESP32 MJPEG video feed.

---

## LIST OF TABLES

**CHAPTER 3: PROPOSED METHODOLOGY**

- **Table 3.1**: System Tolerance Thresholds — A parameterized table defining the acceptable margin of error parameters (in millimeters) governing the software's binary Quality Assurance (Accept/Defect) logic.

**CHAPTER 4: HARDWARE IMPLEMENTATION**

- **Table 4.1**: Bill of Materials (BoM) — A comprehensive technical and economical breakdown of all hardware components, including specifications, quantities, and their individual structural roles.

**CHAPTER 5: SOFTWARE IMPLEMENTATION**

- **Table 5.1**: Technology Stack Breakdown — A summarized matrix categorizing the utilized software languages, core frameworks, libraries, and primary deployment environments for each subsystem layer.
- **Table 5.2**: Core REST API Endpoints — A structured dictionary mapping crucial HTTP routes (e.g., `/api/inference/dual`, `/stream`) against their required payloads, HTTP verbs, and functional descriptions.

**CHAPTER 6: RESULTS AND DISCUSSION**

- **Table 6.1**: System Latency Profiling Results — A performance testing layout comparing the inference times (in milliseconds) acquired across local GPU and CPU constraints against network communication delays.
- **Table 6.2**: Physical Measurement Validation Benchmark — An aggregated set of empirical measurement recordings (System Computed Dimension vs. True Physical Dimension) deriving the overall baseline accuracy percentage.

---

## LIST OF APPENDICES

- **Appendix A**: Source Code Snippets — Features highly relevant firmware configurations (C++) for the ESP32-CAM and concurrent asynchronous REST implementation (Python/FastAPI) utilized by the AI Engine.
- **Appendix B**: Additional Technical Data — Includes standard operational data schemas representing JSON transmission payloads executed during typical internal system routing.
- **Appendix C**: Sustainable Development Goals (SDG) Mapping — Explores how the Spectra project contributes to technological and industrial milestones defined by generalized SDG parameters.

