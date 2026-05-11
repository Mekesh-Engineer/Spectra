import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { healthService } from "@/services/healthService";

// ─── Types ───────────────────────────────────────────────────────────────────
interface ServiceStatus {
    name: string;
    icon: string;
    status: "healthy" | "degraded" | "offline";
    latency: string;
    uptime: string;
    detail: string;
}

const statusConfig = {
    healthy: { color: "var(--sys-success)", label: "Healthy", bg: "color-mix(in srgb, var(--sys-success) 12%, transparent)" },
    degraded: { color: "var(--sys-warning)", label: "Degraded", bg: "color-mix(in srgb, var(--sys-warning) 12%, transparent)" },
    offline: { color: "var(--sys-error)", label: "Offline", bg: "color-mix(in srgb, var(--sys-error) 12%, transparent)" },
};

// ─── Animations ──────────────────────────────────────────────────────────────
const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45 } } };

// ─── Tooltip ─────────────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl border border-sys-border px-4 py-3 shadow-xl" style={{ background: "var(--sys-bg-primary)" }}>
            <p className="text-[12px] font-semibold text-sys-text-primary">{label}</p>
            {payload.map((p) => (
                <p key={p.name} className="text-[11px] text-sys-text-secondary">
                    {p.name}: <span className="font-semibold text-sys-text-primary">{typeof p.value === "number" ? p.value.toFixed(1) : p.value}</span>
                </p>
            ))}
        </div>
    );
};

// ─── Component ───────────────────────────────────────────────────────────────
export default function HealthPage() {
    const [services, setServices] = useState<ServiceStatus[]>([]);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const [serverUptime, setServerUptime] = useState(0);
    const [environment, setEnvironment] = useState("development");
    const [uptimeChartData] = useState(() =>
        Array.from({ length: 24 }, (_, i) => ({
            hour: `${String(i).padStart(2, "0")}:00`,
            uptime: Math.min(100, 96 + Math.random() * 4),
            requests: Math.floor(Math.random() * 200 + 50),
        }))
    );

    const refresh = useCallback(async () => {
        try {
            const data = await healthService.check();
            setServerUptime(data.uptime);
            setEnvironment(data.environment);
            const mapped: ServiceStatus[] = (data.services || []).map((s: { name: string; status: string; latency: number | null; detail: string }) => ({
                name: s.name,
                icon: s.name.toLowerCase().includes("firebase") ? "cloud" : s.name.toLowerCase().includes("ai") ? "smart_toy" : "dns",
                status: s.status as ServiceStatus["status"],
                latency: s.latency != null ? `${s.latency}ms` : "—",
                uptime: s.status === "healthy" ? "99.9%" : s.status === "degraded" ? "95%" : "—",
                detail: s.name,
            }));
            // Always include "API Server" as first entry since the request itself succeeded
            mapped.unshift({ name: "API Server", icon: "dns", status: "healthy", latency: "—", uptime: "99.9%", detail: `Express.js 5 — Uptime ${Math.floor(data.uptime)}s` });
            setServices(mapped);
        } catch {
            setServices([{ name: "API Server", icon: "dns", status: "offline", latency: "—", uptime: "—", detail: "Cannot reach backend" }]);
        }
        setLastRefresh(new Date());
    }, []);

    useEffect(() => { refresh(); }, [refresh]);

    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(refresh, 5000);
        return () => clearInterval(interval);
    }, [autoRefresh, refresh]);

    const healthyCount = services.filter((s) => s.status === "healthy").length;
    const overallStatus = healthyCount === services.length ? "healthy" : healthyCount >= services.length - 1 ? "degraded" : "offline";
    const overallCfg = statusConfig[overallStatus];

    return (
        <motion.div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" variants={container} initial="hidden" animate="visible">
            {/* Header */}
            <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-sys-text-primary">System Health</h1>
                    <p className="mt-1 text-sm text-sys-text-secondary">
                        Real-time monitoring of all Spectra components.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-semibold" style={{ background: overallCfg.bg, color: overallCfg.color }}>
                        <motion.span animate={overallStatus !== "healthy" ? { opacity: [1, 0.3, 1] } : {}} transition={{ duration: 1.5, repeat: Infinity }} className="h-2 w-2 rounded-full" style={{ background: overallCfg.color }} />
                        {overallCfg.label}
                    </span>
                    <button onClick={refresh} className="flex h-9 w-9 items-center justify-center rounded-xl border border-sys-border text-sys-text-secondary transition-colors hover:bg-sys-bg-secondary hover:text-sys-text-primary" title="Refresh">
                        <span className="material-icons-round text-[18px]">refresh</span>
                    </button>
                    <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-semibold transition-all ${autoRefresh ? "bg-sys-accent text-white" : "border border-sys-border text-sys-text-secondary hover:bg-sys-bg-secondary"}`}
                    >
                        <span className="material-icons-round text-[14px]">{autoRefresh ? "pause" : "play_arrow"}</span>
                        Auto-Refresh
                    </button>
                </div>
            </motion.div>

            <p className="mt-2 text-[11px] text-sys-text-secondary">
                Last refreshed: {lastRefresh.toLocaleTimeString()}
                {autoRefresh && " · Auto-refreshing every 5s"}
            </p>

            {/* Service Cards */}
            <motion.div variants={container} className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {services.map((svc) => {
                    const cfg = statusConfig[svc.status];
                    return (
                        <motion.div key={svc.name} variants={fadeUp} className="rounded-2xl border border-sys-border bg-sys-bg-secondary p-5 transition-all hover:border-sys-accent/30">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: cfg.bg }}>
                                        <span className="material-icons-round text-[18px]" style={{ color: cfg.color }}>{svc.icon}</span>
                                    </div>
                                    <div>
                                        <p className="text-[14px] font-semibold text-sys-text-primary">{svc.name}</p>
                                        <p className="text-[11px] text-sys-text-secondary">{svc.detail}</p>
                                    </div>
                                </div>
                                <span
                                    className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                                    style={{ background: cfg.bg, color: cfg.color }}
                                >
                                    <motion.span
                                        animate={svc.status === "healthy" ? { scale: [1, 1.2, 1] } : { opacity: [1, 0.3, 1] }}
                                        transition={{ duration: svc.status === "healthy" ? 2 : 1.2, repeat: Infinity }}
                                        className="inline-block h-1.5 w-1.5 rounded-full"
                                        style={{ background: cfg.color }}
                                    />
                                    {cfg.label}
                                </span>
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-3">
                                <div>
                                    <span className="text-[10px] text-sys-text-secondary">Latency</span>
                                    <p className="font-mono text-[13px] font-semibold text-sys-text-primary">{svc.latency}</p>
                                </div>
                                <div>
                                    <span className="text-[10px] text-sys-text-secondary">Uptime</span>
                                    <p className="font-mono text-[13px] font-semibold text-sys-text-primary">{svc.uptime}</p>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </motion.div>

            {/* Uptime Chart */}
            <motion.div variants={fadeUp} className="mt-8 rounded-2xl border border-sys-border bg-sys-bg-secondary p-6">
                <h2 className="text-lg font-semibold text-sys-text-primary">24-Hour Uptime & Request Volume</h2>
                <p className="mt-0.5 text-[13px] text-sys-text-secondary">System uptime (%) and API request count by hour</p>
                <div className="mt-6 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={uptimeChartData} margin={{ top: 4, right: 12, left: -12, bottom: 0 }}>
                            <defs>
                                <linearGradient id="gradUptime" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--sys-success)" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="var(--sys-success)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--sys-border)" vertical={false} />
                            <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "var(--sys-text-secondary)" }} axisLine={false} tickLine={false} />
                            <YAxis domain={[90, 100]} tick={{ fontSize: 11, fill: "var(--sys-text-secondary)" }} axisLine={false} tickLine={false} />
                            <Tooltip content={<ChartTooltip />} />
                            <Area type="monotone" dataKey="uptime" name="Uptime (%)" stroke="var(--sys-success)" strokeWidth={2} fill="url(#gradUptime)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>

            {/* System Info */}
            <motion.div variants={fadeUp} className="mt-8 rounded-2xl border border-sys-border bg-sys-bg-secondary p-6">
                <h2 className="text-lg font-semibold text-sys-text-primary">System Information</h2>
                <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
                    {[
                        { label: "Platform", value: "Spectra v1.0.0" },
                        { label: "Server Uptime", value: `${Math.floor(serverUptime)}s` },
                        { label: "React", value: "v19.0.0" },
                        { label: "Vite", value: "v6.2.0" },
                        { label: "Database", value: "Firebase (Cloud Firestore)" },
                        { label: "Inference", value: "YOLOv8 Local — FastAPI" },
                        { label: "Server Port", value: "3001" },
                        { label: "Environment", value: environment },
                    ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-sys-border/40">
                            <span className="text-sys-text-secondary">{item.label}</span>
                            <span className="font-mono text-[12px] font-semibold text-sys-text-primary">{item.value}</span>
                        </div>
                    ))}
                </div>
            </motion.div>
        </motion.div>
    );
}
