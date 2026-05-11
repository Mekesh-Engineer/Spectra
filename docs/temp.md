# Spectra System Documentation & Analysis

## 1. Codebase Analysis

The Spectra project is an advanced, full-stack industrial inspection and measurement platform combining real-time AI computer vision (`ai-engine/`), a robust Node.js backend (`server/`), and a responsive React frontend (`src/`).

**1.1 AI Engine (`ai-engine/`)**
The core intelligence of the system resides here, built primarily in Python.

- **`calibration.py`**: Handles camera calibration, distortion correction, and pixel-to-metric conversions critical for highly accurate measurements.
- **`detect_service.py`**: Manages the inference lifecycle, loading custom PyTorch models (`pipe_circle_model.pt`, `pipe_line_model.pt`) and executing real-time object detection and segmentation.
- **`measurement_engine.py`**: Calculates precise geometric dimensions (diameters, lengths, angles) from the segmented AI outputs. It is responsible for the core vision processing tasks before data is transmitted to the backend.

**1.2 Backend Server (`server/`)**
The Node.js/Express server acts as the command center, coordinating hardware, AI, and user interfaces.

- **Controllers & Services**: `inferenceController.ts`, `measurementService.ts`, and `cameraService.ts` bridge the gap between the Python AI Engine's raw output and the frontend's operational dashboard.
- **Hardware Integration**: Endpoints in `esp32Routes.ts` and `cameraRoutes.ts` facilitate low-latency communication with the firmware (e.g., `rod_detector.ino`) and IP/USB cameras.

**1.3 Frontend Client (`src/`)**
A React-based dashboard built with Vite, utilizing WebRTC for ultra-low latency camera streams (`useWebRTC.ts`) and featuring dedicated modules for detection (`components/detection/`) and precision measurement (`components/measurement/`).

## 2. Folder & Architecture Improvements

**Current Structure Overview:**

- The `src/` directory uses a traditional type-based layout (`components/`, `hooks/`, `services/`, `pages/`, `store/`, etc.).
- The `server/` serves as the Express backend with `controllers/`, `routes/`, `services/`, and `middleware/`.

**Recommended Improvements:**

- **Feature-Based Cohesion:** Transitioning from type-based separation to a feature-based architecture (e.g., `src/features/auth`, `src/features/camera`, `src/features/measurement`) can improve maintainability. Each feature module should encapsulate its own components, hooks, associated services, and types.
- **Shared Types:** Create a `@shared` or `shared/` directory at the project root to share TS interfaces, DTOs, and database types between the `src/` frontend and `server/` backend, ensuring end-to-end type safety.
- **API Versioning:** Under `server/routes/`, namespace endpoints with version tags (e.g., `server/routes/v1/`) to stabilize API contracts for future client integrations.

## 3. Authentication & RBAC Debugging

**Current State Analysis:**

- The frontend (`src/hooks/useAuth.ts`) pulls session data and fetches `profile` records from the DB. If a profile doesn't exist, it defaults the user role to `operator` and status to `active`.
- The backend (`server/routes/authRoutes.ts`) checks the Bearer token via `Firebase.auth.getUser()`, and then manually queries the `profiles` table to determine the user's role.

**Evaluation & Suggestions:**

- **N+1 Query Overhead:** Firing a database query to `profiles` after verifying the JWT on every protected route is inefficient.
  - _Improvement:_ Inject user roles and statuses directly into the Firebase JWT as **Custom Claims** using a Postgres auth trigger. This allows both the frontend and backend to immediately derive roles by decoding the token securely without additional DB lookups.
- **Strict Role Enforcement:** The backend silently defaults users to `operator` if their profile query fails: `role: profile?.role ?? "operator"`. This approach can mask provisioning bugs and potentially provide access to unverified accounts.
  - _Improvement:_ If the profile lookup fails, the API should treat the token as unprovisioned and return `403 Forbidden` rather than granting default privileges.
- **Route Guards Consistency:** In `src/routes/guards.tsx` and protected pages inside `src/pages/`, ensure that nested routing rigidly consumes the `hasRole` property returned by `useAuth()`. Wrap operational views in an HOC (e.g., `<RequireRole role="admin" />`) to prevent unauthorized component rendering.

## 4. UI/UX Improvements

- **Responsive Data Visualizations:** Given the industrial/dashboard nature of `Spectra`, ensure `Dashboard.tsx`, `components/charts/`, and `components/measurement/` views fluidly collapse on tablet or mobile viewports. Use responsive wrappers for canvas/chart layers.
- **Accessibility (a11y) & Contrast:**
  - Introduce robust color differentiation for system statuses (e.g., Active vs. Disconnected).
  - Apply `aria-live="polite"` to critical alerts to ensure screen readers announce hardware disconnections or inference failures.
  - Ensure interactive elements (Servo controls, Camera toggles) have descriptive `aria-label` tags.
- **Feedback & Fallbacks:**
  - Implement **Skeleton Loaders** rather than generic spinners during data fetching inside `useInspectionData` and `useInference` hooks to reduce layout shift.
  - Offer localized toast notifications for asynchronous actions (e.g., saving settings, controlling servos) instead of relying solely on global error states.

## 5. Integration with Spectra System

The effectiveness of Spectra lies in its tightly coupled, multi-language architecture:

- **AI Engine ? Backend Communication:** The Python-based `ai-engine` operates independently for processing-intensive tasks, delivering results to the Node.js `server/` via high-speed IPC (Inter-Process Communication), WebSocket, or HTTP REST. This decoupled approach allows deploying the Python engine on Edge TPU/GPU devices while keeping the central management Node server lightweight.
- **Frontend ? Backend Stream Rendering:** Real-time visual data is streamed via WebRTC and WebSocket. The `useWebRTC.ts` and `inferenceController.ts` orchestrate latency-free video rendering augmented with bounding boxes, segmentation masks, and measurement overlays applied dynamically in the React frontend (`components/detection/`).
- **Hardware Loop:** The Node backend commands the ESP32 (running `rod_detector.ino`) which controls the servos and actuators on the physical inspection rig. As the AI Engine analyzes imagery and identifies defects or out-of-tolerance measurements, decisions flow back through the ESP32 to trigger rejection mechanisms or alert the `Dashboard.tsx` UI.

## 6. Innovative Feature Suggestions

To elevate Spectra to a state-of-the-art metrology platform, consider adding these differentiating features:

**6.1 CNC-Like Automated Measurement Pathing**
Instead of static camera inspection, integrate a CNC-style G-code interpreter in the backend to drive high-precision stepper motors via the ESP32/firmware. The application could scan a part by automatically panning, tilting, and zooming (PTZ) across a predefined macro path, stitching images together in the `ai-engine`. This creates a fully automated coordinate measuring machine (CMM) alternative.

**6.2 2D to 3D Reconstruction**
While the current models (`pipe_circle_model.pt`, `pipe_line_model.pt`) operate in 2D space, the system can be upgraded for 3D metrology using Photogrammetry or Stereo Vision:

- **Stereo Camera Integration:** Utilize dual-camera inputs processed synchronously in `ai-engine/measurement_engine.py` to generate depth maps.
- **Latent 3D Reconstruction:** Implement Neural Radiance Fields (NeRF) or 3D Gaussian Splatting for complex geometries to recreate a highly accurate 3D model of inspected parts strictly from multi-angle 2D video sweeps.
- **Point Cloud Export:** Allow generating and exporting `.obj` or `.ply` point cloud files directly from the UI for CAD comparison.

**6.3 Continual Learning Pipeline**
Introduce an integrated feedback loop in the frontend where Human-in-the-loop (HITL) operators can flag false positives or incorrect measurements. These verified images, stored via `storageService.ts` on Firebase, are fed into an automated retraining pipeline to fine-tune the PyTorch models overnight, consistently improving production line accuracy.

## 7. Performance & Scalability

- **Edge AI Optimization:** To ensure robust frames-per-second (FPS) and low inference latency, convert `.pt` PyTorch models to TensorRT (`.engine`) or ONNX (`.onnx`). This allows the `ai-engine` to leverage NVIDIA GPU/Jetson Nano hardware acceleration efficiently.
- **Horizontal Scaling & Load Balancing:** As additional factory lines are integrated, separate the `server` layer from the `ai-engine`. Deploy the backend using Docker Swarm or Kubernetes, and load-balance incoming camera streams across multiple dedicated GPU-enabled inference nodes.
- **WebRTC Offloading:** Currently relying on `useWebRTC.ts`, consider integrating an enterprise SFU (Selective Forwarding Unit) media server (like mediasoup or LiveKit) if scaling to stream high-definition inspection video to dozens of remote operator dashboards simultaneously.

## 8. Security Best Practices

An industrial OT (Operational Technology) tool like Spectra demands rigorous security standards:

- **Firmware Authenticity (ESP32):** Implement Secure Boot and encrypted OTA (Over-The-Air) updates on the `rod_detector.ino` firmware to prevent malicious logic injection capable of disrupting the physical line.
- **Video Stream Encryption:** All WebRTC media tracks must enforce SRTP (Secure Real-Time Transport Protocol) with DTLS to prevent video stream interception on the factory network.
- **Least-Privilege Database Access:** Utilize Firebase Row-Level Security (RLS) heavily. Operators should strictly have `SELECT` capabilities on reports and `INSERT` capabilities for running manual inspections, while only Admins maintain `UPDATE/DELETE` authority.
- **API Rate Limiting & Obfuscation:** Protect the Express `server/` with rate limits on intensive endpoints (like model swapping or heavy queries) to prevent compute exhaustion (DDoS on the `ai-engine`). Use environment variables (`env.ts`) for all secrets without exposing Firebase service keys to the client.
