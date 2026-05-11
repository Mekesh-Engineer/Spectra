# Deployment, Operations, and User Guide

> Document: 08 - Deployment, Operations, and User Guide
> Version: 3.0
> Last Updated: 2026-03-26
> Status: Active
> Authors: Spectra Development Team
> Prerequisites: All previous documents (01-07)

---

## 1. Deployment Overview

Spectra production deployment includes:
- ESP32-CAM inspection source
- Local Python AI inference service (YOLOv8 + OpenCV)
- Node.js/Express backend API
- React frontend dashboard
- Firebase Authentication + Cloud Firestore

Deployment objectives:
- stable real-time operation
- secure auth and access control
- persistent inspection data in Firestore
- low-latency local inference

---

## 2. Production Architecture

```mermaid
flowchart LR
ESP32CAM --> MJPEG_Stream
MJPEG_Stream --> Python_AI_Service
Python_AI_Service --> Node_Backend
Node_Backend --> Firebase_Firestore
Node_Backend --> React_Dashboard
```

---

## 3. Build Process

```bash
npm run build
```

Expected output:
- Vite frontend build artifacts in dist/
- TypeScript backend compilation success

---

## 4. Server Deployment

### Start Backend
```bash
npm run server
```

### Production Process Manager Example
```bash
pm2 start dist/server/server.js --name spectra-api
```

---

## 5. Environment Variables

### Example .env
```env
PORT=3001
NODE_ENV=production
VITE_API_URL=http://localhost:3001/api/v1
AI_SERVICE_URL=http://127.0.0.1:5000
CAMERA_STREAM_URL=http://192.168.1.10:81/stream

# Firebase Admin SDK (backend)
FIREBASE_PROJECT_ID=spectra-4c705
FIREBASE_CLIENT_EMAIL=<service-account-email>
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Firebase Web SDK (frontend)
VITE_FIREBASE_API_KEY=<web-api-key>
VITE_FIREBASE_AUTH_DOMAIN=spectra-4c705.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=spectra-4c705
VITE_FIREBASE_STORAGE_BUCKET=spectra-4c705.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=47866075212
VITE_FIREBASE_APP_ID=<web-app-id>
```

### Environment Variable Reference
| Variable | Purpose |
| --- | --- |
| PORT | Backend server port |
| AI_SERVICE_URL | Python inference endpoint |
| CAMERA_STREAM_URL | ESP32-CAM stream URL |
| FIREBASE_PROJECT_ID | Firebase project id |
| FIREBASE_CLIENT_EMAIL | Admin SDK service-account email |
| FIREBASE_PRIVATE_KEY | Admin SDK private key |
| VITE_FIREBASE_* | Frontend Firebase config |

---

## 6. Firebase Configuration and Deployment

### Firestore Rules and Indexes
Project files:
- firestore.rules
- firestore.indexes.json
- firebase.json
- .firebaserc

Deploy:
```bash
firebase use spectra-4c705
firebase deploy --only firestore:rules,firestore:indexes --project spectra-4c705
```

### Console Validation
- Firestore Rules tab shows latest published rules
- Firestore Indexes tab shows composite indexes as enabled
- Authentication providers enabled (Email/Password, Google if used)

---

## 7. AI Inference Service Deployment

### Start AI Service
```bash
npm run ai:server
```

### Required Python Packages
- ultralytics
- opencv-python
- numpy
- fastapi
- uvicorn

---

## 8. Monitoring and Health

### Health Endpoint
```http
GET /api/v1/health
```

Expected health areas:
- API Server
- Firebase Firestore connectivity
- Local AI engine connectivity/model readiness

---

## 9. User Operation Guide

### Start Inspection
1. Open dashboard
2. Connect camera stream
3. Start inspection workflow
4. Confirm detections and measurements

### View Results
- live overlay metrics
- pass/fail indicators
- session details in history

### Export Reports
- CSV / JSON / PDF (depending on enabled endpoint)

### Manage Inventory and Alerts
- monitor generated alerts
- review inventory records tied to finalized inspections

---

## 10. Troubleshooting

### Camera Issues
- Verify stream URL and network reachability
- Confirm stable power and signal

### AI Issues
- Check AI service is running
- Validate model files exist in Model/

### Firebase Issues
- Verify Admin SDK env variables are set correctly
- Re-check Firestore rules and index deployment
- Confirm project access with firebase projects:list

---

## Deployment Checklist

### Infrastructure
- [ ] Node.js and Python installed
- [ ] AI service dependencies installed
- [ ] Backend and frontend dependencies installed

### Firebase
- [ ] Authentication providers enabled
- [ ] Firestore database created
- [ ] Rules deployed
- [ ] Indexes deployed
- [ ] Admin SDK credentials configured in .env

### Runtime Validation
- [ ] npm run build passes
- [ ] /api/v1/health returns expected statuses
- [ ] Authenticated flows work
- [ ] Inspection persistence works in Firestore
