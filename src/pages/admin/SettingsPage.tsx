import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { settingsService } from "@/services/settingsService";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Tab {
    id: string;
    label: string;
    icon: string;
}

const tabs: Tab[] = [
    { id: "camera", label: "Camera", icon: "videocam" },
    { id: "ai", label: "AI Model", icon: "smart_toy" },
    { id: "calibration", label: "Calibration", icon: "straighten" },
    { id: "notifications", label: "Notifications", icon: "notifications" },
];

// ─── Animations ──────────────────────────────────────────────────────────────
const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45 } } };

// ─── Input Component ─────────────────────────────────────────────────────────
function FormField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-sm font-medium text-sys-text-primary">{label}</label>
            {hint && <p className="mt-0.5 text-[11px] text-sys-text-secondary">{hint}</p>}
            <div className="mt-2">{children}</div>
        </div>
    );
}

function TextInput({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
    return (
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-xl border border-sys-border bg-sys-bg-primary px-4 py-2.5 text-sm text-sys-text-primary outline-none transition-colors focus:border-sys-accent"
        />
    );
}

function SelectInput({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { label: string; value: string }[] }) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-xl border border-sys-border bg-sys-bg-primary px-4 py-2.5 text-sm text-sys-text-primary outline-none transition-colors focus:border-sys-accent"
        >
            {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
    );
}

function Toggle({ enabled, onChange, label }: { enabled: boolean; onChange: (v: boolean) => void; label: string }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!enabled)}
            className="flex items-center gap-3 text-left"
        >
            <div
                className={`relative h-6 w-11 rounded-full transition-colors ${enabled ? "bg-sys-accent" : "bg-sys-border"}`}
            >
                <div
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${enabled ? "translate-x-[22px]" : "translate-x-0.5"}`}
                />
            </div>
            <span className="text-sm text-sys-text-primary">{label}</span>
        </button>
    );
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState("camera");
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(true);

    // Camera settings
    const [cameraUrl, setCameraUrl] = useState("");
    const [cameraRes, setCameraRes] = useState("1280x720");
    const [cameraFps, setCameraFps] = useState("30");

    // AI settings
    const [modelId, setModelId] = useState("rods-pipes-v3");
    const [modelVersion, setModelVersion] = useState("2");
    const [confidenceThreshold, setConfidenceThreshold] = useState("0.85");
    const [provider, setProvider] = useState("local");

    // Calibration
    const [pixelsPerMm, setPixelsPerMm] = useState("12.5");
    const [refObjectDiameter, setRefObjectDiameter] = useState("25.0");
    const [measureUnit, setMeasureUnit] = useState("mm");

    // Notifications
    const [emailAlerts, setEmailAlerts] = useState(true);
    const [criticalOnly, setCriticalOnly] = useState(false);
    const [dailyReport, setDailyReport] = useState(true);
    const [alertEmail, setAlertEmail] = useState("");

    useEffect(() => {
        (async () => {
            try {
                const s = await settingsService.getAll();
                if (s.cameraUrl) setCameraUrl(String(s.cameraUrl));
                if (s.cameraRes) setCameraRes(String(s.cameraRes));
                if (s.cameraFps) setCameraFps(String(s.cameraFps));
                if (s.modelId) setModelId(String(s.modelId));
                if (s.modelVersion) setModelVersion(String(s.modelVersion));
                if (s.confidenceThreshold) setConfidenceThreshold(String(s.confidenceThreshold));
                if (s.provider) setProvider(String(s.provider));
                if (s.pixelsPerMm) setPixelsPerMm(String(s.pixelsPerMm));
                if (s.refObjectDiameter) setRefObjectDiameter(String(s.refObjectDiameter));
                if (s.measureUnit) setMeasureUnit(String(s.measureUnit));
                if (s.emailAlerts !== undefined) setEmailAlerts(Boolean(s.emailAlerts));
                if (s.criticalOnly !== undefined) setCriticalOnly(Boolean(s.criticalOnly));
                if (s.dailyReport !== undefined) setDailyReport(Boolean(s.dailyReport));
                if (s.alertEmail) setAlertEmail(String(s.alertEmail));
            } catch { /* use defaults */ }
            setLoading(false);
        })();
    }, []);

    const handleSave = async () => {
        const entries: Record<string, unknown> = {
            cameraUrl, cameraRes, cameraFps,
            modelId, modelVersion, confidenceThreshold, provider,
            pixelsPerMm, refObjectDiameter, measureUnit,
            emailAlerts, criticalOnly, dailyReport, alertEmail,
        };
        await Promise.all(Object.entries(entries).map(([k, v]) => settingsService.update(k, v)));
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    const handleReset = () => {
        setCameraUrl("");
        setCameraRes("1280x720");
        setCameraFps("30");
        setModelId("rods-pipes-v3");
        setModelVersion("2");
        setConfidenceThreshold("0.85");
        setProvider("local");
        setPixelsPerMm("12.5");
        setRefObjectDiameter("25.0");
        setMeasureUnit("mm");
        setEmailAlerts(true);
        setCriticalOnly(false);
        setDailyReport(true);
        setAlertEmail("");
    };

    if (loading) return (
        <div className="flex items-center justify-center py-20 text-sys-text-secondary">Loading settings…</div>
    );

    return (
        <motion.div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.08 } } }}>
            <motion.div variants={fadeUp}>
                <h1 className="text-2xl font-bold tracking-tight text-sys-text-primary">Settings</h1>
                <p className="mt-1 text-sm text-sys-text-secondary">Configure system parameters for cameras, AI, calibration, and notifications.</p>
            </motion.div>

            {/* Tabs */}
            <motion.div variants={fadeUp} className="mt-6 flex flex-wrap gap-1 rounded-xl border border-sys-border bg-sys-bg-secondary p-1">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold transition-all ${activeTab === tab.id ? "bg-sys-accent text-white shadow-sm" : "text-sys-text-secondary hover:text-sys-text-primary"}`}
                    >
                        <span className={`material-icons-round text-[16px] ${activeTab === tab.id ? "text-white" : ""}`}>{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </motion.div>

            {/* Tab Content */}
            <motion.div variants={fadeUp} className="mt-6 rounded-2xl border border-sys-border bg-sys-bg-secondary p-6">
                {activeTab === "camera" && (
                    <div className="space-y-5">
                        <h2 className="text-lg font-semibold text-sys-text-primary">Camera Configuration</h2>
                        <FormField label="Stream URL" hint="HTTP(S) URL for the camera MJPEG or HLS stream">
                            <TextInput value={cameraUrl} onChange={setCameraUrl} placeholder="http://..." />
                        </FormField>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField label="Resolution">
                                <SelectInput value={cameraRes} onChange={setCameraRes} options={[
                                    { label: "640×480 (VGA)", value: "640x480" },
                                    { label: "1280×720 (720p)", value: "1280x720" },
                                    { label: "1920×1080 (1080p)", value: "1920x1080" },
                                ]} />
                            </FormField>
                            <FormField label="Frame Rate (FPS)">
                                <SelectInput value={cameraFps} onChange={setCameraFps} options={[
                                    { label: "15 fps", value: "15" },
                                    { label: "24 fps", value: "24" },
                                    { label: "30 fps", value: "30" },
                                ]} />
                            </FormField>
                        </div>
                    </div>
                )}

                {activeTab === "ai" && (
                    <div className="space-y-5">
                        <h2 className="text-lg font-semibold text-sys-text-primary">AI Model Settings</h2>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField label="Model ID" hint="YOLOv8 model identifier">
                                <TextInput value={modelId} onChange={setModelId} />
                            </FormField>
                            <FormField label="Version">
                                <TextInput value={modelVersion} onChange={setModelVersion} />
                            </FormField>
                        </div>
                        <FormField label="Provider">
                            <SelectInput value={provider} onChange={setProvider} options={[
                                { label: "Local YOLOv8 (FastAPI)", value: "local" },
                                { label: "Custom (On-premise)", value: "custom" },
                            ]} />
                        </FormField>
                        <FormField label="Confidence Threshold" hint="Minimum confidence for detection acceptance (0.0 – 1.0)">
                            <TextInput value={confidenceThreshold} onChange={setConfidenceThreshold} type="number" />
                        </FormField>
                    </div>
                )}

                {activeTab === "calibration" && (
                    <div className="space-y-5">
                        <h2 className="text-lg font-semibold text-sys-text-primary">Calibration Settings</h2>
                        <FormField label="Pixels per Unit" hint="Calibrated conversion factor from pixels to physical units">
                            <TextInput value={pixelsPerMm} onChange={setPixelsPerMm} type="number" />
                        </FormField>
                        <FormField label="Reference Object Diameter" hint="Known diameter of reference calibration object">
                            <TextInput value={refObjectDiameter} onChange={setRefObjectDiameter} type="number" />
                        </FormField>
                        <FormField label="Measurement Unit">
                            <SelectInput value={measureUnit} onChange={setMeasureUnit} options={[
                                { label: "Millimeters (mm)", value: "mm" },
                                { label: "Centimeters (cm)", value: "cm" },
                                { label: "Inches (in)", value: "in" },
                            ]} />
                        </FormField>
                    </div>
                )}

                {activeTab === "notifications" && (
                    <div className="space-y-5">
                        <h2 className="text-lg font-semibold text-sys-text-primary">Notification Preferences</h2>
                        <Toggle enabled={emailAlerts} onChange={setEmailAlerts} label="Enable email alerts" />
                        <Toggle enabled={criticalOnly} onChange={setCriticalOnly} label="Critical alerts only" />
                        <Toggle enabled={dailyReport} onChange={setDailyReport} label="Daily summary report" />
                        <FormField label="Alert Email Address">
                            <TextInput value={alertEmail} onChange={setAlertEmail} type="email" placeholder="admin@spectra.dev" />
                        </FormField>
                    </div>
                )}
            </motion.div>

            {/* Actions */}
            <motion.div variants={fadeUp} className="mt-6 flex items-center gap-3">
                <button
                    onClick={handleSave}
                    className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-all"
                    style={{
                        background: "linear-gradient(135deg, var(--sys-accent), var(--sys-accent-dark))",
                        boxShadow: "0 2px 10px color-mix(in srgb, var(--sys-accent) 30%, transparent)",
                    }}
                >
                    <span className="material-icons-round text-[16px]">save</span>
                    Save Changes
                </button>
                <button
                    onClick={handleReset}
                    className="inline-flex items-center gap-2 rounded-xl border border-sys-border bg-sys-bg-secondary px-5 py-2.5 text-sm font-medium text-sys-text-primary transition-colors hover:bg-sys-bg-tertiary"
                >
                    <span className="material-icons-round text-[16px]">restart_alt</span>
                    Reset Defaults
                </button>
                {saved && (
                    <motion.span
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-1 text-[13px] font-semibold text-sys-success"
                    >
                        <span className="material-icons-round text-[16px]">check_circle</span>
                        Settings saved
                    </motion.span>
                )}
            </motion.div>
        </motion.div>
    );
}
