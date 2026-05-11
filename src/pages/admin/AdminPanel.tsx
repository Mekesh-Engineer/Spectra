import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { inspectionService } from "@/services/inspectionService";
import { alertService } from "@/services/alertService";

// ─── Data ────────────────────────────────────────────────────────────────────
const adminLinks = [
    { to: "/admin/settings", title: "System Settings", desc: "Configure cameras, AI models, calibration, and notification preferences.", icon: "settings", gradient: "linear-gradient(135deg, var(--sys-accent), var(--sys-accent-dark))" },
    { to: "/admin/health", title: "System Health", desc: "Monitor real-time health status of all system components.", icon: "monitor_heart", gradient: "linear-gradient(135deg, var(--sys-success), #047857)" },
    { to: "/dashboard/analytics", title: "Analytics", desc: "View inspection trends, defect categories, and performance KPIs.", icon: "analytics", gradient: "linear-gradient(135deg, var(--sys-info), #1d4ed8)" },
    { to: "/dashboard/alerts", title: "Alert Management", desc: "Review and manage system alerts and out-of-tolerance notifications.", icon: "notifications_active", gradient: "linear-gradient(135deg, var(--sys-warning), #b45309)" },
];

// ─── Animations ──────────────────────────────────────────────────────────────
const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45 } } };

interface OverviewCard { label: string; value: string; color: string; materialIcon: string; }

// ─── Component ───────────────────────────────────────────────────────────────
export default function AdminPanel() {
    const [cards, setCards] = useState<OverviewCard[]>([
        { label: "Total Inspections", value: "—", color: "var(--sys-accent)", materialIcon: "assignment" },
        { label: "Pass Rate", value: "—", color: "var(--sys-success)", materialIcon: "verified" },
        { label: "Open Alerts", value: "—", color: "var(--sys-warning)", materialIcon: "notifications" },
        { label: "Active Cameras", value: "—", color: "var(--sys-info)", materialIcon: "videocam" },
    ]);
    const [recentAlerts, setRecentAlerts] = useState<{ time: string; event: string; detail: string; icon: string; color: string }[]>([]);

    useEffect(() => {
        (async () => {
            try {
                const [stats, alerts] = await Promise.all([
                    inspectionService.getStats(),
                    alertService.list({}),
                ]);
                setCards([
                    { label: "Total Inspections", value: String(stats.totalInspections), color: "var(--sys-accent)", materialIcon: "assignment" },
                    { label: "Pass Rate", value: `${stats.passRate}%`, color: "var(--sys-success)", materialIcon: "verified" },
                    { label: "Open Alerts", value: String(stats.openAlerts), color: "var(--sys-warning)", materialIcon: "notifications" },
                    { label: "Active Cameras", value: String(stats.activeCameras), color: "var(--sys-info)", materialIcon: "videocam" },
                ]);
                setRecentAlerts(alerts.slice(0, 5).map((a) => ({
                    time: new Date(a.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
                    event: a.title,
                    detail: a.message,
                    icon: a.severity === "critical" ? "error" : a.severity === "warning" ? "warning" : "info",
                    color: a.severity === "critical" ? "var(--sys-error)" : a.severity === "warning" ? "var(--sys-warning)" : "var(--sys-info)",
                })));
            } catch { /* use defaults */ }
        })();
    }, []);
    return (
        <motion.div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" variants={container} initial="hidden" animate="visible">
            <motion.div variants={fadeUp}>
                <h1 className="text-2xl font-bold tracking-tight text-sys-text-primary">Admin Panel</h1>
                <p className="mt-1 text-sm text-sys-text-secondary">System administration and configuration centre.</p>
            </motion.div>

            {/* Overview Cards */}
            <motion.div variants={container} className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {cards.map((card) => (
                    <motion.div key={card.label} variants={fadeUp} whileHover={{ y: -2 }} className="group rounded-2xl border border-sys-border bg-sys-bg-secondary p-5 transition-all hover:border-sys-accent/30">
                        <div className="flex items-center justify-between">
                            <p className="text-[13px] font-medium text-sys-text-secondary">{card.label}</p>
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `color-mix(in srgb, ${card.color} 12%, transparent)` }}>
                                <span className="material-icons-round text-[18px]" style={{ color: card.color }}>{card.materialIcon}</span>
                            </div>
                        </div>
                        <p className="mt-3 text-3xl font-bold tracking-tight text-sys-text-primary">{card.value}</p>
                    </motion.div>
                ))}
            </motion.div>

            {/* Admin Navigation Cards */}
            <motion.div variants={container} className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {adminLinks.map((link) => (
                    <motion.div key={link.to} variants={fadeUp}>
                        <Link
                            to={link.to}
                            className="group flex items-center gap-5 rounded-2xl border border-sys-border bg-sys-bg-secondary p-6 transition-all hover:border-sys-accent/30 hover:shadow-md"
                        >
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white transition-transform group-hover:scale-105" style={{ background: link.gradient }}>
                                <span className="material-icons-round text-[22px]">{link.icon}</span>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-[15px] font-semibold text-sys-text-primary">{link.title}</h3>
                                <p className="mt-1 text-[13px] text-sys-text-secondary">{link.desc}</p>
                            </div>
                            <span className="material-icons-round text-[20px] text-sys-text-secondary opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100">arrow_forward</span>
                        </Link>
                    </motion.div>
                ))}
            </motion.div>

            {/* Recent System Events */}
            <motion.div variants={fadeUp} className="mt-8">
                <h2 className="text-lg font-semibold text-sys-text-primary">Recent Alerts</h2>
                <div className="mt-4 rounded-2xl border border-sys-border bg-sys-bg-secondary">
                    {recentAlerts.length > 0 ? recentAlerts.map((evt, i) => (
                        <div key={i} className={`flex items-center gap-4 px-5 py-4 transition-colors hover:bg-sys-bg-tertiary/50 ${i < recentAlerts.length - 1 ? "border-b border-sys-border/60" : ""}`}>
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: `color-mix(in srgb, ${evt.color} 12%, transparent)` }}>
                                <span className="material-icons-round text-[16px]" style={{ color: evt.color }}>{evt.icon}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-semibold text-sys-text-primary">{evt.event}</p>
                                <p className="text-[12px] text-sys-text-secondary">{evt.detail}</p>
                            </div>
                            <span className="shrink-0 font-mono text-[11px] text-sys-text-secondary">{evt.time}</span>
                        </div>
                    )) : (
                        <div className="px-5 py-8 text-center text-sys-text-secondary text-sm">No recent alerts</div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
