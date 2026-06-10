<p align="center">
  <img src="https://img.shields.io/badge/Spectra-AI%20Inspection%20Platform-blueviolet?style=for-the-badge&logo=opencv&logoColor=white" alt="Spectra Badge" />
</p>

<h1 align="center">🔬 Spectra</h1>

<p align="center">
  <strong>Intelligent Vision-Based Industrial Inspection Platform</strong><br/>
  Real-time AI detection, dimensional measurement, and monitoring for cylindrical components
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite" alt="Vite" />
  <img src="https://img.shields.io/badge/Firebase-12-FFCA28?style=flat-square&logo=firebase" alt="Firebase" />
  <img src="https://img.shields.io/badge/YOLOv8-Ultralytics-00FFFF?style=flat-square&logo=yolo" alt="YOLOv8" />
  <img src="https://img.shields.io/badge/OpenCV-Python-5C3EE8?style=flat-square&logo=opencv" alt="OpenCV" />
  <img src="https://img.shields.io/badge/Node.js-Express%205-339933?style=flat-square&logo=node.js" alt="Node.js" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="MIT License" />
</p>

---

## 📋 Table of Contents

- [Project Overview](#-project-overview)
- [Key Features](#-key-features)
- [System Overview](#-system-overview)
- [System Architecture](#-system-architecture)
- [Hardware & Image Acquisition](#-hardware--image-acquisition)
- [AI Detection System](#-ai-detection-system)
- [Measurement & Vision Processing](#-measurement--vision-processing)
- [Web Application Platform](#-web-application-platform)
- [Development & API](#-development--api)
- [Getting Started](#-getting-started)
- [Deployment & Operations](#-deployment--operations)
- [Project Structure](#-project-structure)
- [Tech Stack](#-tech-stack)
- [Documentation](#-documentation)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Project Overview

**Spectra** is an intelligent, end-to-end **vision-based inspection platform** purpose-built for the automated detection and dimensional analysis of cylindrical industrial components — including steel rods, hollow pipes, aluminum tubes, and structural reinforcement bars.

### The Problem

Modern manufacturing environments demand rapid and precise inspection, yet traditional methods are:

- ❌ **Slow** — manual caliper measurements can't keep up with production lines
- ❌ **Inconsistent** — operator fatigue and subjective judgment introduce variability
- ❌ **Delayed** — quality defects detected only _after_ production, increasing waste
- ❌ **Non-scalable** — manual inspection is impractical for high-throughput operations

### The Solution

Spectra solves these challenges through a fully automated inspection pipeline that combines:

- 🔧 **Embedded vision hardware** (ESP32-CAM with servo-controlled pan-tilt)
- 🧠 **Deep learning object detection** (YOLOv8, running locally for zero-latency inference)
- 📐 **Classical computer vision measurement** (OpenCV geometric algorithms)
- 📊 **Web-based monitoring dashboards** (React 19 + TypeScript, real-time analytics)

> **Unlike cloud-based inspection systems, Spectra performs all AI inference locally**, ensuring low latency, reliable operation in air-gapped industrial environments, and no internet dependency during inspection.

### Supported Industries

| Industry                 | Application                           |
| ------------------------ | ------------------------------------- |
| Steel Manufacturing      | Rod and pipe quality control          |
| Pipe Extrusion           | Diameter and length verification      |
| Construction Materials   | Reinforcement bar counting and sizing |
| Automotive Manufacturing | Component dimensional inspection      |

📄 _Full details:_ [`docs/01-system-overview.md`](docs/01-system-overview.md)

---

## ✨ Key Features

| Feature                           | Description                                                    |
| --------------------------------- | -------------------------------------------------------------- |
| 🎯 **Real-Time Object Detection** | YOLOv8s detects pipes and rods at production-line speed        |
| 📏 **Dimensional Measurement**    | Automated diameter and length measurement via OpenCV           |
| 📹 **Live Camera Streaming**      | MJPEG HTTP stream from ESP32-CAM or USB webcam                 |
| 🤖 **Local AI Inference**         | No cloud dependency — models run on-premise                    |
| 📊 **Analytics Dashboard**        | Interactive charts, inventory tracking, and inspection history |
| 🔐 **Role-Based Access Control**  | Admin and customer roles with secure Firebase authentication   |
| 📱 **Responsive PWA**             | Progressive Web App — works on desktop, tablet, and mobile     |
| 🔔 **Alert System**               | Configurable alerts for out-of-tolerance measurements          |
| 📦 **Inventory Management**       | Track rod/pipe counts, dimensions, and inspection status       |
| 🛡️ **Fault Tolerance**            | Robust error handling and health check mechanisms              |

---

## 🔍 System Overview

Spectra is an **Industry 4.0** automated inspection system consisting of five major subsystems that work together in a real-time pipeline:

```mermaid
flowchart LR
    A["🔧 Hardware\n(ESP32-CAM)"] --> B["📡 Streaming\n(MJPEG)"]
    B --> C["🧠 AI Engine\n(YOLOv8)"]
    C --> D["📐 Measurement\n(OpenCV)"]
    D --> E["💻 Dashboard\n(React)"]
    E --> F["🗄️ Database\n(Firestore)"]
```

### Technology Stack at a Glance

| Layer            | Technology               | Purpose                             |
| ---------------- | ------------------------ | ----------------------------------- |
| **Hardware**     | ESP32-CAM (OV2640)       | Image capture & WiFi streaming      |
| **Streaming**    | MJPEG HTTP Stream        | Real-time camera video transmission |
| **AI Detection** | YOLOv8 (Local Models)    | Real-time object detection          |
| **Measurement**  | OpenCV (Python)          | Geometric dimensional analysis      |
| **Backend**      | Node.js + Express 5      | API server & data processing        |
| **Frontend**     | React 19 + TypeScript    | Monitoring dashboard                |
| **Database**     | Firebase Cloud Firestore | Persistent inspection data          |
| **Auth**         | Firebase Authentication  | Secure user access                  |

### Core Capabilities

- **Pipe circle detection** — identifies pipe openings (cross-sections)
- **Pipe line detection** — detects rod/pipe bodies (longitudinal)
- **Bounding box generation** — precise localization of detected objects
- **Object counting** — automatic inventory of rods and pipes per frame
- **Dimensional measurement** — pixel-to-real-world calibrated diameter and length
- **Confidence scoring** — quantified detection reliability per object

📄 _Full details:_ [`docs/01-system-overview.md`](docs/01-system-overview.md)

---

## 🏗️ System Architecture

Spectra follows a **modular pipeline architecture** where camera frames move through several processing stages. Each layer performs specialized tasks while interacting through well-defined interfaces.

### High-Level Architecture

```mermaid
flowchart LR
    Camera["ESP32-CAM / Webcam"] --> Stream["MJPEG Stream"]
    Stream --> AI["YOLOv8 AI Engine"]
    AI --> Vision["OpenCV Measurement"]
    Vision --> Backend["Node.js Backend"]
    Backend --> Dashboard["React Dashboard"]
    Backend --> Database["Firebase Firestore"]
```

### Architecture Layers

| #   | Layer                      | Responsibility                                       |
| --- | -------------------------- | ---------------------------------------------------- |
| 1   | **Hardware Layer**         | Image capture from the inspection environment        |
| 2   | **Edge Device Layer**      | Frame capture, encoding, and network transmission    |
| 3   | **Streaming Layer**        | MJPEG real-time video delivery                       |
| 4   | **AI Inference Layer**     | YOLOv8 object detection (local, zero-latency)        |
| 5   | **Measurement Processing** | OpenCV geometric analysis and dimensional output     |
| 6   | **Backend Application**    | REST API, session management, database communication |
| 7   | **Web Application**        | Interactive dashboard and visualization              |
| 8   | **Data Storage**           | Firebase Firestore for persistent inspection records |

### Design Advantages

- **Modular design** — each component can be upgraded independently
- **Easier debugging** — isolated layers simplify fault diagnosis
- **Scalable deployments** — add cameras or processing nodes as needed
- **Independent upgrades** — swap AI models or frontend without system downtime

📄 _Full details:_ [`docs/02-system-architecture.md`](docs/02-system-architecture.md)

---

## 🔧 Hardware & Image Acquisition

The Spectra hardware subsystem is designed around **low-cost, widely available components**, making it ideal for deploying multiple inspection stations across a facility.

### Hardware Components

| Component                       | Purpose                  | Est. Cost  |
| ------------------------------- | ------------------------ | ---------- |
| ESP32-CAM Module                | Image capture device     | $5–$8      |
| SG90 Servo Motors (×2)          | Camera pan-tilt control  | $2–$4 each |
| Mini Breadboard                 | Electrical prototyping   | $1–$2      |
| 3.7V Lithium Battery 18650 (×2) | Power supply             | $3–$5 each |
| Battery Holder (2×18650)        | Battery mounting         | $1–$2      |
| USB-to-Serial Adapter (FTDI)    | Firmware programming     | $3–$5      |
| 3D Printed Camera Holder        | Camera mounting platform | $5–$10     |
| LCD Display 16×2 _(optional)_   | Status display           | $3–$5      |
| Piezo Buzzer _(optional)_       | Alert notifications      | $0.50–$1   |

> 💰 **Total Estimated Cost: $25–$45** (base configuration)

### Camera Specifications (OV2640)

| Feature                | Value                                              |
| ---------------------- | -------------------------------------------------- |
| Sensor                 | OV2640                                             |
| Max Resolution         | 1600×1200 (UXGA)                                   |
| Frame Rate             | Up to 30 FPS                                       |
| Field of View          | ~65°                                               |
| Recommended Resolution | **640×480 (VGA)** — optimal speed/accuracy balance |

### Hardware Architecture

```mermaid
flowchart LR
    Power[Battery System] --> Camera[ESP32-CAM]
    Power --> Servos[Servo Motors]
    Controller[ESP32 Controller] --> Servos
    Holder[Camera Holder] --> Camera
    Camera --> Streaming[WiFi MJPEG Stream]
```

### Key Features

- **Pan-tilt servo mechanism** for adjustable camera positioning
- **WiFi 802.11 b/g/n** built-in streaming — no extra networking hardware needed
- **Arduino IDE programmable** — familiar firmware development workflow
- **Camera calibration support** — pixel-to-real-world mapping for accurate measurements

📄 _Full details:_ [`docs/03-hardware-and-acquisition.md`](docs/03-hardware-and-acquisition.md)

---

## 🧠 AI Detection System

The AI Detection System is the **core analytical module** of Spectra. It uses **YOLOv8 (You Only Look Once v8)** for real-time, single-stage object detection optimized for edge deployment.

### Detection Capabilities

| Task                    | Description                                        |
| ----------------------- | -------------------------------------------------- |
| Pipe Circle Detection   | Identifies circular pipe openings (cross-sections) |
| Pipe Line Detection     | Detects rod/pipe bodies (longitudinal view)        |
| Bounding Box Generation | Precise localization of each detected object       |
| Object Counting         | Automatic per-frame inventory                      |
| Confidence Scoring      | Quantified reliability per detection               |

### YOLOv8 Model Configuration

| Variant     | Parameters | Speed        | Usage                   |
| ----------- | ---------- | ------------ | ----------------------- |
| YOLOv8n     | 3.2M       | Fastest      | Embedded systems        |
| **YOLOv8s** | **11.2M**  | **Balanced** | **Spectra default**     |
| YOLOv8m     | 25.9M      | Slower       | High accuracy scenarios |

### Local Inference — No Cloud Required

```
spectra-ai/
├── models/
│   ├── pipe_circle_model.pt    # Circle detection weights
│   └── pipe_line_model.pt      # Line detection weights
└── inference/
    └── detect.py               # Inference engine
```

**Advantages of local inference:**

- ✅ No internet dependency — works in air-gapped environments
- ✅ Lower latency — sub-second detection response
- ✅ Full control over model updates and versioning
- ✅ Stable industrial deployment without cloud outages

### Model Training Pipeline

```
Dataset Collection → Image Annotation → Data Augmentation → YOLOv8 Training → Model Evaluation → Export best.pt → Local Deployment
```

Training is performed offline using **Google Colab**, **Kaggle**, or **local GPU workstations** with the Ultralytics framework.

### Example Prediction Output

```json
{
  "class": "pipe_circle",
  "confidence": 0.93,
  "bbox": [210, 140, 40, 40]
}
```

📄 _Full details:_ [`docs/04-ai-detection-system.md`](docs/04-ai-detection-system.md)

---

## 📐 Measurement & Vision Processing

While YOLOv8 identifies and localizes objects, the **Measurement and Vision Processing module** computes their actual physical dimensions using **classical computer vision algorithms with OpenCV**.

### Hybrid Architecture

This two-stage approach combines the best of both worlds:

- **Deep learning** → object detection (what and where)
- **Geometry-based measurement** → dimensional analysis (how big)

### OpenCV Processing Pipeline

```mermaid
flowchart LR
    Frame --> ROI[ROI Extraction]
    ROI --> Pre[Preprocessing]
    Pre --> Edge[Edge Detection]
    Edge --> Contours
    Contours --> Geometry
    Geometry --> Measurement
```

### Key Algorithms

| Algorithm            | Purpose              | Spectra Usage          |
| -------------------- | -------------------- | ---------------------- |
| Canny Edge Detection | Boundary detection   | Pre-processing         |
| HoughCircles         | Detect pipe openings | Diameter estimation    |
| HoughLinesP          | Detect rod segments  | Length estimation      |
| findContours         | Shape extraction     | Measurement refinement |
| minAreaRect          | Bounding rectangle   | Length estimation      |

### Measurement Capabilities

| Measurement            | Method                                        | Output  |
| ---------------------- | --------------------------------------------- | ------- |
| **Pipe Diameter**      | Hough Circle Transform → radius calculation   | mm/cm   |
| **Rod Length**         | Hough Line Transform → minimum area rectangle | mm/cm   |
| **Object Orientation** | Contour analysis                              | degrees |

### Calibration

Spectra uses **pixel-to-real-world calibration** to convert pixel measurements into physical units (mm, cm). Calibration is performed using a reference object of known dimensions placed in the camera's field of view.

📄 _Full details:_ [`docs/05-measurement-and-vision-processing.md`](docs/05-measurement-and-vision-processing.md)

---

## 💻 Web Application Platform

The Spectra Web Application Platform provides the **interactive interface** used by operators and engineers to monitor the inspection system in real time.

### Frontend Technology Stack

| Technology      | Purpose                           |
| --------------- | --------------------------------- |
| React 19        | UI framework                      |
| TypeScript      | Type-safe development             |
| Vite 6          | Build tool & dev server           |
| Tailwind CSS 4  | Utility-first styling             |
| Framer Motion   | UI animations                     |
| Recharts        | Data visualization & charting     |
| Zustand         | Lightweight state management      |
| React Router v7 | Client-side routing               |
| Firebase SDK    | Authentication & Firestore client |

### Three-Tier Architecture

```mermaid
flowchart LR
    Browser --> ReactFrontend[React Frontend]
    ReactFrontend --> NodeBackend[Node.js Backend]
    NodeBackend --> PythonAI[Python AI Service]
    PythonAI --> DetectionResults
    NodeBackend --> Database[Firebase Firestore]
    DetectionResults --> ReactFrontend
```

### Platform Features

| Feature                        | Description                                      |
| ------------------------------ | ------------------------------------------------ |
| 📹 **Camera Interface**        | Live MJPEG stream viewer with controls           |
| 🎯 **Detection Visualization** | Real-time bounding box overlay on video feed     |
| 📏 **Measurement Display**     | Dimensional results with confidence indicators   |
| 📊 **Analytics Dashboard**     | Charts for detection trends, measurement history |
| 📦 **Inventory Management**    | Rod/pipe tracking with counts and dimensions     |
| 🔔 **Alert System**            | Configurable tolerance-based notifications       |
| ⚙️ **Settings Configuration**  | Camera, AI model, and calibration parameters     |
| 🔐 **Admin Panel**             | User management and system configuration         |

### Application Structure

```
src/
├── components/     # Reusable UI components
├── pages/          # Route-level page components
├── hooks/          # Custom React hooks
├── services/       # API and Firebase service layer
├── stores/         # Zustand state management
├── routes/         # Routing configuration
├── features/       # Feature-specific modules (auth, etc.)
├── forms/          # Form components and validation
├── types/          # TypeScript type definitions
└── utils/          # Shared utility functions
```

### Authentication & RBAC

- Firebase Authentication with email/password
- Role-based access control: **admin** and **customer**
- Secure post-login routing:
  - `admin` → `/dashboard/admin`
  - `customer` → `/dashboard/customer`

📄 _Full details:_ [`docs/06-web-application-platform.md`](docs/06-web-application-platform.md)

---

## 🛠️ Development & API

### Prerequisites

| Requirement      | Version                            |
| ---------------- | ---------------------------------- |
| Node.js          | 18+                                |
| Python           | 3.10+                              |
| Git              | Latest                             |
| Firebase Project | Firestore + Authentication enabled |

### Backend API Stack

| Technology         | Purpose                               |
| ------------------ | ------------------------------------- |
| Express 5          | HTTP server framework                 |
| TypeScript         | Type-safe backend code                |
| Firebase Admin SDK | Token verification & Firestore access |
| Zod                | Request/response validation           |
| Helmet             | Security headers                      |
| CORS               | Cross-origin resource sharing         |
| express-rate-limit | API rate limiting                     |

### AI Engine Stack

| Technology         | Purpose                       |
| ------------------ | ----------------------------- |
| FastAPI + Uvicorn  | Python API server             |
| Ultralytics YOLOv8 | Object detection framework    |
| OpenCV             | Computer vision & measurement |
| NumPy              | Numerical computation         |

### API Architecture

```
server/
├── config/         # Server configuration
├── controllers/    # Request handlers
├── middleware/      # Auth, validation, error handling
├── routes/         # API route definitions
└── services/       # Business logic layer
```

📄 _Full details:_ [`docs/07-development-and-api.md`](docs/07-development-and-api.md)

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Mekesh-Engineer/Spectra.git
cd spectra
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up the AI Engine

```bash
python -m venv .venv

# Windows
.\.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate

pip install -r ai-engine/requirements.txt
```

### 4. Configure Environment Variables

Create a `.env` file in the repository root:

```env
# Server
PORT=3001
NODE_ENV=development

# API URLs
VITE_API_URL=http://localhost:3001/api/v1
AI_SERVICE_URL=http://127.0.0.1:5000
CAMERA_STREAM_URL=http://<camera-ip>:81/stream

# Firebase Admin SDK (Backend)
FIREBASE_PROJECT_ID=<your-project-id>
FIREBASE_CLIENT_EMAIL=<service-account-email>
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Firebase Web SDK (Frontend)
VITE_FIREBASE_API_KEY=<web-api-key>
VITE_FIREBASE_AUTH_DOMAIN=<project>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=<your-project-id>
VITE_FIREBASE_STORAGE_BUCKET=<project>.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=<sender-id>
VITE_FIREBASE_APP_ID=<web-app-id>
```

### 5. Start All Services

```bash
# Start all services simultaneously
npm run dev:all
```

Or run individually:

```bash
# Frontend (Vite dev server)
npm run dev

# Backend (Node.js/Express)
npm run dev:server

# AI Service (FastAPI/Uvicorn)
npm run ai:server
```

### 6. Open the Dashboard

Navigate to **`http://localhost:5173`** in your browser.

---

## 📦 Deployment & Operations

### Production Build

```bash
npm run build
```

### Start Production Server

```bash
# Direct
npm run server

# With PM2 process manager (recommended)
pm2 start dist/server/server.js --name spectra-api
```

### Production Architecture

```mermaid
flowchart LR
    ESP32CAM[ESP32-CAM] --> MJPEG[MJPEG Stream]
    MJPEG --> AI[Python AI Service]
    AI --> Backend[Node.js Backend]
    Backend --> Firestore[Firebase Firestore]
    Backend --> Dashboard[React Dashboard]
```

### Deployment Objectives

- ✅ Stable real-time operation in industrial environments
- ✅ Secure authentication and role-based access control
- ✅ Persistent inspection data in Firebase Firestore
- ✅ Low-latency local AI inference (no cloud dependency)

### Firebase Deployment

```bash
# Deploy everything
firebase deploy --project <project-id>

# Deploy hosting only
firebase deploy --only hosting --project <project-id>

# Deploy Firestore rules
firebase deploy --only firestore:rules --project <project-id>
```

📄 _Full details:_ [`docs/08-deployment-operations-and-user-guide.md`](docs/08-deployment-operations-and-user-guide.md)

---

## 📁 Project Structure

```
spectra/
├── ai-engine/              # Python AI inference service
│   ├── models/             # YOLOv8 trained model weights
│   ├── inference/           # Detection and measurement scripts
│   └── requirements.txt    # Python dependencies
├── docs/                   # Comprehensive documentation (8 documents)
├── Firmware/               # ESP32-CAM Arduino firmware
├── Model/                  # Model training resources
├── server/                 # Node.js/Express backend
│   ├── config/             # Server configuration
│   ├── controllers/        # Request handlers
│   ├── middleware/          # Auth, validation, error handling
│   ├── routes/             # API route definitions
│   └── services/           # Business logic layer
├── src/                    # React frontend application
│   ├── components/         # Reusable UI components
│   ├── features/           # Feature modules (auth, etc.)
│   ├── hooks/              # Custom React hooks
│   ├── pages/              # Page components
│   ├── routes/             # Routing configuration
│   ├── services/           # API service layer
│   ├── stores/             # Zustand state stores
│   ├── types/              # TypeScript definitions
│   └── utils/              # Utility functions
├── firebase.json           # Firebase hosting configuration
├── firestore.rules         # Firestore security rules
├── firestore.indexes.json  # Firestore index configuration
├── package.json            # Node.js dependencies & scripts
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite build configuration
└── vitest.config.ts        # Vitest test configuration
```

---

## 🧪 Tech Stack

### Frontend

| Technology            | Version | Purpose                    |
| --------------------- | ------- | -------------------------- |
| React                 | 19      | UI framework               |
| TypeScript            | 5.8     | Type safety                |
| Vite                  | 6       | Build tool & HMR           |
| Tailwind CSS          | 4       | Styling                    |
| Framer Motion         | 12      | Animations                 |
| Zustand               | 5       | State management           |
| React Router DOM      | 7       | Client-side routing        |
| Recharts              | 3       | Data visualization         |
| React Hook Form + Zod | Latest  | Form handling & validation |
| Firebase SDK          | 12      | Auth & Firestore client    |
| Three.js + R3F        | Latest  | 3D visualizations          |

### Backend

| Technology         | Version | Purpose                     |
| ------------------ | ------- | --------------------------- |
| Express            | 5       | HTTP server                 |
| Firebase Admin SDK | Latest  | Server-side Firebase access |
| Zod                | 3       | Schema validation           |
| Helmet             | Latest  | Security headers            |

### AI Engine

| Technology         | Purpose              |
| ------------------ | -------------------- |
| FastAPI + Uvicorn  | Python API server    |
| Ultralytics YOLOv8 | Object detection     |
| OpenCV             | Computer vision      |
| NumPy              | Numerical processing |

### Testing

| Technology      | Purpose                    |
| --------------- | -------------------------- |
| Vitest          | Unit & integration testing |
| Testing Library | React component testing    |
| MSW             | API mocking                |

### DevOps & Quality

| Tool             | Purpose               |
| ---------------- | --------------------- |
| ESLint           | Code linting          |
| Prettier         | Code formatting       |
| Husky            | Git hooks             |
| lint-staged      | Pre-commit checks     |
| Firebase Hosting | Production deployment |

---

## 📚 Documentation

Spectra includes **8 comprehensive technical documents** covering every aspect of the platform:

| #   | Document                                                                   | Description                                                               |
| --- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 01  | [System Overview](docs/01-system-overview.md)                              | Project introduction, problem statement, objectives, and feature overview |
| 02  | [System Architecture](docs/02-system-architecture.md)                      | Modular pipeline architecture, layer descriptions, and data flow          |
| 03  | [Hardware & Acquisition](docs/03-hardware-and-acquisition.md)              | ESP32-CAM setup, servo control, wiring, firmware, and calibration         |
| 04  | [AI Detection System](docs/04-ai-detection-system.md)                      | YOLOv8 models, training pipeline, inference engine, and evaluation        |
| 05  | [Measurement & Vision](docs/05-measurement-and-vision-processing.md)       | OpenCV algorithms, calibration, diameter/length measurement               |
| 06  | [Web Application Platform](docs/06-web-application-platform.md)            | React dashboard, state management, UI components, and RBAC                |
| 07  | [Development & API](docs/07-development-and-api.md)                        | Setup instructions, tech stack, project structure, and API reference      |
| 08  | [Deployment & User Guide](docs/08-deployment-operations-and-user-guide.md) | Production deployment, environment configuration, and operations          |

---

## 🤝 Contributing

Contributions are welcome! To contribute:

1. **Fork** the repository
2. **Create** a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Commit** your changes with descriptive messages:
   ```bash
   git commit -m "feat: add new measurement visualization"
   ```
4. **Push** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
5. **Open a Pull Request** — describe what you changed and why

### Development Guidelines

- Follow the existing code style (ESLint + Prettier enforced via Husky)
- Write tests for new features using Vitest
- Update documentation when adding or changing functionality
- Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

```
MIT License © 2026 Mekesh Engineer
```

---

<p align="center">
  <strong>Built with ❤️ by <a href="https://github.com/Mekesh-Engineer">Mekesh Engineer</a></strong>
</p>
