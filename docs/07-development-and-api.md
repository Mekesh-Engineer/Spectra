# Development and API Documentation

> Document: 07 - Development and API
> Version: 3.0
> Last Updated: 2026-03-26
> Status: Active
> Authors: Spectra Development Team
> Prerequisites: [02 - System Architecture](02-system-architecture.md), [06 - Web Application Platform](06-web-application-platform.md)

---

## 1. Environment Setup and Installation

### Prerequisites
- Node.js 18+
- Python 3.10+
- Git
- Firebase project (Firestore + Authentication enabled)

### Install
```bash
git clone <repo-url>
cd spectra
npm install
```

### AI Engine Setup
```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r ai-engine/requirements.txt
```

### Required Environment Variables
Create .env in repository root.

Backend (Firebase Admin SDK):
```env
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

Frontend (Firebase Web SDK):
```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Other core values:
```env
PORT=3001
VITE_API_URL=http://localhost:3001/api/v1
AI_SERVICE_URL=http://127.0.0.1:5000
CAMERA_STREAM_URL=http://<camera-ip>:81/stream
```

### Start Services
Run all services:
```bash
npm run dev:all
```

Run separately:
```bash
npm run dev
npm run dev:server
npm run ai:server
```

---

## 2. Tech Stack Overview

### Frontend
- React 19 + TypeScript + Vite
- Tailwind CSS 4 + Framer Motion
- Zustand
- React Router DOM v7
- Recharts
- Firebase Web SDK (Auth + Firestore)

### Backend
- Express 5 + TypeScript
- Firebase Admin SDK (token verification + Firestore access)
- Zod validation
- Helmet, CORS, express-rate-limit

### AI Engine
- FastAPI + Uvicorn
- Ultralytics YOLOv8
- OpenCV + NumPy

---

## 3. Project Structure

```text
spectra/
|-- ai-engine/
|-- docs/
|-- Firmware/
|-- Model/
|-- server/
|   |-- config/
|   |-- controllers/
|   |-- middleware/
|   |-- routes/
|   `-- services/
|-- src/
|   |-- components/
|   |-- hooks/
|   |-- pages/
|   |-- routes/
|   |-- services/
|   `-- store/
|-- firestore.rules
|-- firestore.indexes.json
|-- firebase.json
`-- .firebaserc
```

---

## 4. Backend Architecture and Express API

The backend coordinates frontend clients, local AI inference, hardware feeds, and Firestore persistence.

### Primary Route Groups
- authRoutes: Firebase ID token based identity endpoint (/me)
- inferenceRoutes: local YOLOv8 detection and measurement pipeline
- cameraRoutes / esp32Routes: camera connectivity and stream operations
- inspectionRoutes: inspection CRUD and result finalization
- inventoryRoutes: inventory operations
- alertRoutes: alert lifecycle operations
- settingsRoutes: user settings operations
- healthRoutes: API + Firestore + AI health checks

### Auth Model
- Client sends Firebase ID token in Authorization header
- authMiddleware verifies token with adminAuth.verifyIdToken
- User profile/role/status loaded from Firestore profiles collection

---

## 5. AI Engine and Inference API

The local FastAPI service runs dual model YOLOv8 inference and returns detections plus measurement metadata.

### Typical Flow
1. Frontend captures frame
2. Backend forwards or coordinates inference request
3. AI service runs circle and line models
4. Measurement processor computes calibrated dimensions
5. Backend returns structured response and optionally persists results

---

## 6. Frontend Architecture and State

### Core Services
- src/lib/firebase.ts: initializes Firebase app, exports auth and db
- src/services/auth.ts: login/register/reset/google auth and profile provisioning
- src/services/apiClient.ts: attaches Firebase ID token to backend API requests

### Hooks and Stores
- useAuth: Firebase auth state subscription and profile loading
- useCameraStream: stream/capture orchestration
- Zustand stores for user/session/inspection/camera state

---

## 7. Local Development Workflow

### Recommended Commands
```bash
npm run typecheck
npm run lint
npm run build
```

### Firebase Deployment Commands
```bash
firebase use <project-id>
firebase deploy --only firestore:rules,firestore:indexes --project <project-id>
```

---

## 8. Testing and Quality Assurance

### Automated Checks
- Type safety: npm run typecheck
- Build integrity: npm run build

### Manual Validation
- Firebase Authentication login/register/reset flows
- API protected routes with valid and invalid token
- Firestore read/write for inspections/inventory/alerts/settings
- Health endpoint shows Firestore and AI service status

---

## Document Cross-References
- [05 - Measurement and Vision Processing](05-measurement-and-vision-processing.md)
- [06 - Web Application Platform](06-web-application-platform.md)
- [08 - Deployment, Operations, and User Guide](08-deployment-operations-and-user-guide.md)
