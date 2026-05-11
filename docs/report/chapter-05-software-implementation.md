# CHAPTER 5: SOFTWARE IMPLEMENTATION

## 5.1 SOFTWARE COMPONENTS

The software architecture of the Spectra inspection system consists of distinctly specialized and intricately integrated components that collectively ensure real-time analysis, robust precision measurement, and a seamless administrative user experience. Table 5.1 outlines the primary software modules, frameworks, and tools utilized across the entire system hierarchy.

_Table 5.1: Critical Software Components and Specifications_

| S.No | Component                  | Specification                            | Purpose                                                                                                        | Quantity |
| :--- | :------------------------- | :--------------------------------------- | :------------------------------------------------------------------------------------------------------------- | :------- |
| 1    | Embedded Firmware Engine   | C/C++, Arduino Framework, ESP32Servo     | Facilitates direct hardware control, Wi-Fi connectivity, and continuous image proxying.                        | 1        |
| 2    | Python Runtime Environment | Python 3.10                              | Operates as the core execution environment for the AI inference and classical computer vision calculations.    | 1        |
| 3    | AI Object Detection Models | Ultralytics YOLOv8 (PyTorch)             | Executes parallelized neural network inferences for precise defect localization and structural classification. | 2        |
| 4    | Vision Processing Library  | OpenCV, NumPy                            | Administers pixel-level image manipulation and sub-millimeter geometric dimension extraction.                  | 1        |
| 5    | Backend Application Server | Node.js, Express.js 5.0, TypeScript      | Orchestrates discrete data routing, hosts RESTful APIs, and serves as an intermediary hardware proxy.          | 1        |
| 6    | Relational Database System | PostgreSQL (Firebase)                    | Guarantees secure long-term data persistence, inspection logging, and user authentication schemas.             | 1        |
| 7    | Web Dashboard Client       | React 19, TypeScript, Vite, Tailwind CSS | Delivers the interactive single-page application (SPA) for real-time monitoring and administrative control.    | 1        |

## 5.2 SOFTWARE ARCHITECTURE OVERVIEW

The complete implementation of the Spectra system represents a tightly coupled integration of resource-constrained embedded edge devices and high-performance analytical software operating in tandem. The standard data flow initiates at the physical acquisition layer via the ESP32-CAM module, which captures localized visual data securely transmitted over a wireless TCP/IP network.

Once the visual data enters the centralized Node.js backend server, it is immediately proxied to the Python-based Artificial Intelligence engine. Here, frames are subjected to dual YOLOv8 model inference followed by algorithmic dimension estimation using OpenCV. The resulting quantified diagnostic metadata�comprising dimensional limits, defect classifications, and confidence thresholds�is passed back to the backend. Subsequently, the Express server synchronously logs these outputs into the Firebase Cloud Firestore database while broadcasting the live, heuristically annotated frames directly to the React-based Web Dashboard. This pipeline establishes a low-latency, deterministic loop bridging the initial hardware scan with immediate, visually mapped statistical results for the end-user.

![Figure 5.1: Microservices System Architecture](assets/figure-5.1-microservices.png)
_Figure 5.1: Microservices System Architecture � A detailed topology diagram mapping the communication protocols (HTTP REST, WebSockets, MJPEG streaming) between the decentralized system components._

## 5.3 ESP32-CAM FIRMWARE IMPLEMENTATION

The firmware deployed on the ESP32-CAM bridges the physical hardware interaction with the digital network. Developed entirely in C/C++, it is designed to strictly manage constrained memory environments while maintaining stable execution.

### 5.3.1 Camera Initialization

The core initialization sequence depends heavily on the `esp_camera.h` library to allocate the physical OV2640 CMOS sensor. The configuration dynamically specifies memory allocation (often relying on internal PSRAM), pixel format (JPEG), and optimal spatial resolution frames (VGA at 640�480). Proper initialization parameters are meticulously balanced to ensure the generated payload remains sufficiently detailed for reliable AI interpretation while mathematically mitigating transmission latency.

![Figure 5.4: Camera Initialization Firmware Configuration](assets/figure-5.4-cam-init.png)
_Figure 5.4: Camera Initialization Firmware Configuration � Code excerpt demonstrating the OV2640 sensor allocation, PSRAM configuration, and JPEG frame buffer setup within the Arduino framework._

### 5.3.2 Wi-Fi Communication

Persistent communication is instantiated utilizing the embedded 802.11 b/g/n physical layers via the `WiFi.h` library. The firmware specifies a deterministic connection script to a localized router or wireless access point. It features comprehensive auto-reconnection logic�continuously monitoring operational state flags to swiftly reconnect in the presence of signal interference, which is intrinsic to harsh industrial operations.

![Figure 5.5: Wi-Fi Connection and Auto-Reconnect Implementation](assets/figure-5.5-wifi.png)
_Figure 5.5: Wi-Fi Connection and Auto-Reconnect Implementation � Firmware logic illustrating the WPA2 authentication sequence and the watchdog-driven reconnection loop._

### 5.3.3 Servo Motor Control

Pan and tilt movement mechanics are managed using Pulse Width Modulation (PWM) signal generation. The `ESP32Servo` library abstracts the hardware timer complexities, allowing the microcontroller to map integer angle requests (between 0 to 180 degrees) directly into specific duty cycle variations (e.g., 500 �s to 2400 �s). This precise articulation permits dynamic re-centering and targeted environmental scanning natively from subsequent dashboard API commands.

![Figure 5.6: Servo PWM Control Implementation](assets/figure-5.6-servo-pwm.png)
_Figure 5.6: Servo PWM Control Implementation � Code demonstrating the PWM timer allocation and angular mapping for the pan and tilt servo channels._

### 5.3.4 HTTP Server Endpoints

Upon establishing continuous network layers, the microcontroller instantiates a lightweight, localized web server offering crucial HTTP REST endpoints:

- `/capture`: Produces a solitary, fully buffered JPEG frame for static analysis.
- `/stream`: Instantiates a chunked continuous Motion JPEG (MJPEG) stream leveraging multi-part boundaries for live viewing feeds.
- `/control`: Accepts structured parameters allowing for precise servo angle displacement and hardware tuning.

![Figure 5.7: HTTP Server Endpoint Definitions](assets/figure-5.7-http-endpoints.png)
_Figure 5.7: HTTP Server Endpoint Definitions � Firmware excerpt showing the route handler registrations for the /capture, /stream, and /control endpoints on the ESP32 local web server._

## 5.4 AI DETECTION ENGINE IMPLEMENTATION

The core analytical capabilities of the Spectra architecture rely significantly on advanced Convolutional Neural Networks (CNNs). Functioning within a Python microservice, the detection engine exploits the Ultralytics YOLOv8 architecture for rapid and resilient visual discrimination.

### 5.4.1 YOLOv8 Model Integration

YOLOv8 executes continuous real-time predictions establishing an outstanding equilibrium between latency and Mean Average Precision (mAP). Leveraging the PyTorch machine learning library, the pre-trained neural network weights are statically loaded into system memory at runtime. This integration efficiently leverages localized computational power via CPU optimization or, if available, GPU hardware acceleration arrays (CUDA/MPS) to facilitate high-speed spatial inferencing.

![Figure 5.2: YOLOv8 Internal Process Flow](assets/figure-5.2-yolo-flow.png)
_Figure 5.2: YOLOv8 Internal Process Flow � A structural breakdown of the underlying deep learning architecture, segmenting the Backbone, Neck, and Detection Head layers utilized for bounding box regression in the project._

### 5.4.2 Dual-Model Detection Pipeline

To fortify detection accuracy encompassing the varied geometric profiles inherent to rods and pipes, the engine orchestrates a composite dual-model synchronization:

- **Pipe Circle Model** (`pipe_circle_model.pt`): Fine-tuned specifically to evaluate cross-sectional uniformities, focusing exclusively on detecting the circular end faces of components.
- **Pipe Line Model** (`pipe_line_model.pt`): Trained concurrently on lateral dimensions, detecting length-wise bodies to analyze superficial degradations and rod profiles.

Both models process asynchronously. The backend meticulously parses the simultaneous predictions, harmonizing them over the same frame space to generate comprehensive intelligence regarding the item's rotational position and structural integrity.

![Figure 5.8: Dual-Model Parallel Inference Workflow](assets/figure-5.8-dual-model.png)
_Figure 5.8: Dual-Model Parallel Inference Workflow � A diagram depicting the concurrent execution paths of pipe_circle_model.pt and pipe_line_model.pt, and the subsequent merging of their detection outputs per frame._

### 5.4.3 Detection Output Structure

The output generated by the AI inference manifests as a strictly typed JSON datagram. This resulting response comprehensively encapsulates:

- **Bounding Boxes**: Specific vector geometries represented by relative coordinates (e.g., [x_min, y_min, x_max, y_max]).
- **Class Labels**: Discrete integer codes mapped to specific mechanical elements or recognized anomalies.
- **Confidence Scores**: Floating-point probabilistic certainty markers denoting the network's operational conviction of a correct classification.

![Figure 5.9: Detection Output JSON Structure](assets/figure-5.9-json-output.png)
_Figure 5.9: Detection Output JSON Structure � A sample JSON datagram returned by the FastAPI inference service, showing bounding box coordinates, class labels, and confidence scores for a processed frame._

## 5.5 MEASUREMENT PROCESSING IMPLEMENTATION

Operating synchronously with the deep learning model sequences, the classical measurement processing component computes precise mechanical dimensions. Exploiting standard computer vision techniques via OpenCV, the mathematical abstractions translate bounded pixel coordinates into tangible physical metrics.

### 5.5.1 ROI Extraction

To conserve computational throughput, analytical focus is directed rigorously within specific image segments. Utilizing the [x_min, y_min, x_max, y_max] coordinates output by YOLOv8, Regions of Interest (ROIs) are computationally cropped from the parent frame. This localized focus systematically isolates the mechanical component while discarding irrelevant background artifacts.

![Figure 5.10: ROI Extraction from YOLOv8 Bounding Box](assets/figure-5.10-roi.png)
_Figure 5.10: ROI Extraction from YOLOv8 Bounding Box � An illustration showing the cropping operation applied to the full frame using the predicted bounding box coordinates to isolate the target component._

### 5.5.2 Edge Detection

Extracted ROIs undergo intensive morphological pre-processing. A Gaussian blur (`cv2.GaussianBlur`) is applied to suppress high-frequency image noise and lighting artifacts. Subsequently, the Canny Edge Detection algorithm (`cv2.Canny`) tracks sharp intensity gradients to accurately plot the geometric boundaries dictating the precise outer perimeter of the component.

![Figure 5.11: Canny Edge Detection Applied to Extracted ROI](assets/figure-5.11-canny.png)
_Figure 5.11: Canny Edge Detection Applied to Extracted ROI � A before-and-after visualization of the Gaussian blur pre-processing step followed by Canny edge gradient mapping on an isolated pipe cross-section._

### 5.5.3 Diameter and Length Estimation

Using the defined image contours, mathematical projections trace theoretical overlays�such as calculating a minimum enclosing circle draped over the contour geometry. Leveraging these abstractions, sub-program functions deterministically calculate fundamental attributes including diameter, principal axes, and cross-section eccentricity, all expressed at the sub-pixel level.

![Figure 5.12: Minimum Enclosing Circle Overlay for Diameter Estimation](assets/figure-5.12-enclosing-circle.png)
_Figure 5.12: Minimum Enclosing Circle Overlay for Diameter Estimation � A diagram demonstrating the fitted minimum enclosing circle applied over the detected contour of a pipe cross-section, with the resulting pixel diameter annotated._

### 5.5.4 Calibration Method

Crucial to industrial relevance is accurately bridging the digital-to-physical paradigm. System implementation depends on a mathematically defined pixels-per-metric ratio. By evaluating reference objects of known real-world dimensions captured at a fixed focal length, the calibration system accurately transposes arbitrary pixel counts computed by OpenCV into standardized millimeter outputs, enabling robust QA threshold comparisons.

![Figure 5.13: Pixel-to-Millimeter Calibration Ratio Calculation](assets/figure-5.13-calibration.png)
_Figure 5.13: Pixel-to-Millimeter Calibration Ratio Calculation � A visual demonstrating the reference object measurement workflow used to derive the R_ppm (pixels-per-millimeter) scaling factor at a fixed camera focal distance._

## 5.6 BACKEND SERVER IMPLEMENTATION

Engineered with Node.js and the Express.js framework, the backend foundation routes the complex intra-application pathways, linking edge hardware, relational logging mechanisms, and web clients.

### 5.6.1 API Development

The application infrastructure dictates strictly standardized REST API architectural structures. The Express router delineates pathways parsing stateless requests, including fetching camera feeds (`GET /api/camera/stream`), receiving manual hardware overrides (`POST /api/camera/ptz`), orchestrating inference proxy routines, and saving structural metric datasets. Implemented using TypeScript, stringent request typing eliminates runtime ambiguity and inherently self-documents data transaction schemas.

![Figure 5.14: Express REST API Route Configuration](assets/figure-5.14-api-routes.png)
_Figure 5.14: Express REST API Route Configuration � A code excerpt from the Express router illustrating the endpoint definitions, HTTP method bindings, and controller delegation for the camera and inference subsystems._

### 5.6.2 AI Integration

Operating as a network proxy, the Node.js backend sequentially queues Base64-encoded visual data extracted from the ESP32 connection socket. Inter-process interaction bridges the JavaScript environment with the discrete Python inference microservice via internal HTTP commands (`POST /api/inference/dual`). The asynchronous logic halts subsequent actions until the dual YOLO models complete their structural analysis, at which point the bounding box array is merged with the local state environment.

![Figure 5.15: Node.js to Python Inference Service Bridge](assets/figure-5.15-inference-bridge.png)
_Figure 5.15: Node.js to Python Inference Service Bridge � A sequence diagram showing the Base64 frame encoding, HTTP dispatch to the FastAPI service, and the asynchronous response handling within the Express backend._

### 5.6.3 Database Integration

For durable storage, the centralized server couples with Firebase Cloud Firestore as a managed NoSQL environment. Structured CRUD operations via the `firebase-admin` SDK mutate collections for inspections, alerts, inventory, and settings. Indexed fields and timestamp-based ordering support efficient dashboard analytics and historical inspection review.

![Figure 5.16: Firebase Cloud Firestore Schema for Inspections](assets/figure-5.16-db-schema.png)
_Figure 5.16: Firebase Cloud Firestore Schema for Inspections � An entity-relationship diagram illustrating the relational table structure for Inspections, Alerts, and Inventory, including foreign key relationships and timestamp indexing._

## 5.7 WEB DASHBOARD IMPLEMENTATION

An intricate, dynamically scaling single-page application (SPA), engineered utilizing React, Vite, and extensive TypeScript bindings, fulfills analytical visualization requirements while supplying operators with an elegant control paradigm.

### 5.7.1 Frontend Architecture

Developed as a highly modular frontend application, localized state logic is separated structurally across custom hooks (`useCameraStream`, `useInference`) and contextual providers. Component isolation ensures that dense layout elements�such as interactive graphing tools or sidebars�render gracefully across platforms utilizing Tailwind CSS utility classes without invoking intrusive whole-page DOM reflows.

![Figure 5.17: React Frontend Component Architecture](assets/figure-5.17-frontend-arch.png)
_Figure 5.17: React Frontend Component Architecture � A component tree diagram illustrating the modular decomposition of the React 19 SPA, highlighting the custom hook integrations and context provider hierarchy._

### 5.7.2 Live Inspection Interface

The live viewing module consolidates visual feeds into a dominant, centralized HTML5 interface. As the HTTP proxy pipes concurrent camera streams over the network, parsed structural JSON metadata streams concurrently, translating YOLO bounding box parameters back onto an overlay HTML5 `<canvas>` element. This approach strictly synchronizes inference boxes across varying aspect ratio views, computed entirely on the client side.

![Figure 5.3: Spectra Dashboard User Interface](assets/figure-5.3-dashboard.png)
_Figure 5.3: Spectra Dashboard User Interface � Client-side visualization depicting real-time inspection feeds overlaid with bounding geometries and instantaneous diagnostic measurements._

### 5.7.3 Analytics and Alerts

Historical inspection outcomes are computed into easily readable metric models via advanced visualization libraries, mapping cumulative defect rates directly onto continuous graphical line and bar chart models. In parallel, system-wide critical discrepancies instantly hook into React notification pipelines�raising automated, universally discernible interface alerts detailing part tolerance violations�thereby reducing operator response latency.

![Figure 5.18: Analytics Dashboard and Alert Notification Panel](assets/figure-5.18-analytics.png)
_Figure 5.18: Analytics Dashboard and Alert Notification Panel � A dashboard screenshot illustrating the historical defect trend charts and the real-time toast notification system triggered upon detection of a tolerance violation._

---
