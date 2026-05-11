import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Documentation Sections ──────────────────────────────────────────────────
interface DocSection {
    id: string;
    title: string;
    icon: string;
    subsections: { id: string; title: string; content: string }[];
}

const docs: DocSection[] = [
    {
        id: "overview", title: "System Overview", icon: "info",
        subsections: [
            { id: "purpose", title: "Purpose", content: "Spectra is an intelligent vision-based inspection platform designed to automate the detection and dimensional analysis of cylindrical industrial components such as rods and pipes. It integrates ESP32-CAM hardware, YOLOv8 detection, OpenCV measurement, and a React monitoring dashboard." },
            { id: "objectives", title: "Objectives", content: "Reduce manual QC labor by 80%, achieve sub-millimeter measurement accuracy, provide real-time defect detection with <250ms latency, and deliver comprehensive analytics for SPC compliance." },
        ],
    },
    {
        id: "architecture", title: "System Architecture", icon: "account_tree",
        subsections: [
            { id: "layers", title: "Architecture Layers", content: "The platform follows a multi-layer distributed architecture: Hardware Layer (ESP32-CAM + ESP8266), Streaming Layer (WebRTC), AI Inference Layer (Local YOLOv8), Measurement Processing Layer (OpenCV), Web Application Layer (React + Express), and Data Storage Layer (Firebase Firestore)." },
            { id: "communication", title: "Communication Protocols", content: "WebRTC for real-time video streaming, HTTP/REST for API calls, WebSocket for live dashboard updates, and MQTT for edge device communication." },
        ],
    },
    {
        id: "hardware", title: "Hardware & Acquisition", icon: "memory",
        subsections: [
            { id: "esp32", title: "ESP32-CAM Module", content: "Uses ESP32-CAM modules with OV2640 sensors for image capture at up to 2MP resolution. Supports both MJPEG and H.264 encoding for frame transmission over WiFi. Camera exposes HTTP endpoints for frame capture and configuration." },
            { id: "servo", title: "Servo Motor System", content: "Pan-tilt servo holder enables dynamic camera positioning. SG90 micro servos provide 180° rotation range, controlled via PWM from the ESP32 GPIO pins." },
        ],
    },
    {
        id: "ai-detection", title: "AI Detection System", icon: "smart_toy",
        subsections: [
            { id: "yolov8", title: "YOLOv8 Model", content: "Object detection is powered by locally hosted YOLOv8 models running on a Python FastAPI service. The system detects and classifies rods, pipes, and other cylindrical objects with bounding box predictions including confidence scores — no cloud dependency required." },
            { id: "inference", title: "Inference Workflow", content: "Frames are captured → sent to the local AI Engine (FastAPI + YOLOv8) → predictions returned as JSON → bounding boxes overlaid on the live feed → measurements triggered for detected objects." },
        ],
    },
    {
        id: "measurement", title: "Measurement & Vision", icon: "straighten",
        subsections: [
            { id: "opencv", title: "OpenCV Processing", content: "OpenCV algorithms perform geometric analysis on detected objects. Edge detection, contour analysis, and Hough transforms extract dimensions. Calibration maps pixel dimensions to real-world units (mm/cm/in)." },
            { id: "calibration", title: "Calibration System", content: "Uses reference objects of known dimensions to establish pixel-to-real unit mapping. Supports automatic recalibration when camera parameters change. Achieves ±0.1mm accuracy at optimal working distance." },
        ],
    },
    {
        id: "web-platform", title: "Web Application", icon: "web",
        subsections: [
            { id: "frontend", title: "Frontend Stack", content: "Built with React 19, TypeScript, Vite, and Tailwind CSS. Uses Framer Motion for animations, Recharts for data visualization, and Zustand for state management." },
            { id: "components", title: "UI Components", content: "Dashboard with KPI cards, live inspection view with camera feed and detection overlays, analytics charts, inspection history with search and export, inventory management, and alert system." },
        ],
    },
    {
        id: "api", title: "Development & API", icon: "api",
        subsections: [
            { id: "backend", title: "Backend Architecture", content: "Node.js with Express 5 provides REST API endpoints for inference, camera management, health monitoring, and data retrieval. Communication uses JSON payloads with JWT authentication." },
            { id: "endpoints", title: "API Endpoints", content: "POST /api/inference/detect — run detection on image. GET /api/cameras — list connected cameras. GET /api/health — system health status. POST /api/auth/login — authenticate user." },
        ],
    },
    {
        id: "deployment", title: "Deployment & Ops", icon: "cloud_upload",
        subsections: [
            { id: "modes", title: "Deployment Modes", content: "Supports local, edge, cloud, and hybrid deployment. Production builds generated with Vite, served via Node.js with optional PM2 process management and Docker containerization." },
            { id: "monitoring", title: "Monitoring", content: "Health check endpoints for all components, structured logging with Winston, performance metrics tracking, and automated alerting for component failures." },
        ],
    },
];

// ─── Animations ──────────────────────────────────────────────────────────────
const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

// ─── Component ───────────────────────────────────────────────────────────────
export default function DocsPage() {
    const [activeSection, setActiveSection] = useState("overview");
    const [activeSubsection, setActiveSubsection] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const current = docs.find((d) => d.id === activeSection) ?? docs[0];

    const filteredDocs = searchQuery
        ? docs.filter((d) =>
            d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.subsections.some((s) =>
                s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.content.toLowerCase().includes(searchQuery.toLowerCase())
            )
        )
        : docs;

    return (
        <motion.div
            className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        >
            <motion.div variants={fadeUp}>
                <h1 className="text-3xl font-bold tracking-tight text-sys-text-primary sm:text-4xl">Documentation</h1>
                <p className="mt-2 text-sys-text-secondary">Comprehensive technical reference for the Spectra platform.</p>
            </motion.div>

            {/* Search */}
            <motion.div variants={fadeUp} className="mt-6">
                <div className="relative max-w-md">
                    <span className="material-icons-round pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-sys-text-secondary">search</span>
                    <input
                        type="text"
                        placeholder="Search documentation…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-xl border border-sys-border bg-sys-bg-secondary py-2.5 pl-10 pr-4 text-sm text-sys-text-primary placeholder-sys-text-secondary outline-none focus:border-sys-accent"
                    />
                </div>
            </motion.div>

            <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-4">
                {/* Sidebar Nav */}
                <motion.nav variants={fadeUp} className="lg:col-span-1">
                    <ul className="space-y-1">
                        {filteredDocs.map((section) => (
                            <li key={section.id}>
                                <button
                                    onClick={() => { setActiveSection(section.id); setActiveSubsection(null); }}
                                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition-all ${activeSection === section.id
                                        ? "bg-sys-accent text-white shadow-sm"
                                        : "text-sys-text-secondary hover:bg-sys-bg-secondary hover:text-sys-text-primary"
                                        }`}
                                >
                                    <span className={`material-icons-round text-[16px] ${activeSection === section.id ? "text-white" : "text-sys-text-secondary"}`}>{section.icon}</span>
                                    {section.title}
                                </button>
                            </li>
                        ))}
                    </ul>
                </motion.nav>

                {/* Content */}
                <div className="lg:col-span-3">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={current.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div
                                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                                    style={{ background: "linear-gradient(135deg, var(--sys-accent), var(--sys-accent-dark))" }}
                                >
                                    <span className="material-icons-round text-[20px] text-white">{current.icon}</span>
                                </div>
                                <h2 className="text-2xl font-bold tracking-tight text-sys-text-primary">{current.title}</h2>
                            </div>

                            <div className="space-y-4">
                                {current.subsections.map((sub) => (
                                    <motion.div
                                        key={sub.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="rounded-2xl border border-sys-border bg-sys-bg-secondary overflow-hidden"
                                    >
                                        <button
                                            onClick={() => setActiveSubsection(activeSubsection === sub.id ? null : sub.id)}
                                            className="flex w-full items-center justify-between px-6 py-4 text-left"
                                        >
                                            <h3 className="text-[15px] font-semibold text-sys-text-primary">{sub.title}</h3>
                                            <span className={`material-icons-round text-[20px] text-sys-text-secondary transition-transform ${activeSubsection === sub.id ? "rotate-180" : ""}`}>
                                                expand_more
                                            </span>
                                        </button>
                                        <AnimatePresence>
                                            {activeSubsection === sub.id && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.25 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="border-t border-sys-border px-6 py-4">
                                                        <p className="text-[14px] leading-relaxed text-sys-text-secondary">{sub.content}</p>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
}
