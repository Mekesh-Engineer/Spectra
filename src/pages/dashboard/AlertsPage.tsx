import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { alertService } from "@/services/alertService";
import type { AlertRow } from "@shared/types";

const severityConfig = {
    critical: { color: "var(--sys-error)", icon: "error", bgClass: "bg-sys-error/10 border-sys-error/30 text-sys-error", label: "Critical" },
    warning: { color: "var(--sys-warning)", icon: "warning", bgClass: "bg-sys-warning/10 border-sys-warning/30 text-sys-warning", label: "Warning" },
    info: { color: "var(--sys-info)", icon: "info", bgClass: "bg-sys-info/10 border-sys-info/30 text-sys-info", label: "Info" },
};

type FilterType = "All" | "critical" | "warning" | "info";

function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Animations ──────────────────────────────────────────────────────────────
const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

// ─── Component ───────────────────────────────────────────────────────────────
export default function AlertsPage() {
    const [alerts, setAlerts] = useState<AlertRow[]>([]);
    const [filter, setFilter] = useState<FilterType>("All");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const unsub = alertService.subscribe({ severity: filter !== "All" ? filter : undefined }, (data) => {
            setAlerts(data);
            setLoading(false);
        });
        return () => unsub();
    }, [filter]);

    const filtered = useMemo(() => {
        if (filter === "All") return alerts;
        return alerts.filter((a) => a.severity === filter);
    }, [alerts, filter]);

    const unreadCount = alerts.filter((a) => !a.is_read).length;
    const counts = {
        All: alerts.length,
        critical: alerts.filter((a) => a.severity === "critical").length,
        warning: alerts.filter((a) => a.severity === "warning").length,
        info: alerts.filter((a) => a.severity === "info").length,
    };

    const handleMarkAllRead = async () => {
        await alertService.markAllRead();
        setAlerts((prev) => prev.map((a) => ({ ...a, is_read: true })));
    };
    const handleMarkRead = async (id: string) => {
        await alertService.markRead(id);
        setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, is_read: true } : a));
    };
    const handleDismiss = async (id: string) => {
        await alertService.dismiss(id);
        setAlerts((prev) => prev.filter((a) => a.id !== id));
    };

    return (
        <motion.div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" variants={container} initial="hidden" animate="visible">
            {/* Header */}
            <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-sys-text-primary">Alerts</h1>
                        <p className="mt-1 text-sm text-sys-text-secondary">System alerts and out-of-tolerance notifications.</p>
                    </div>
                    {unreadCount > 0 && (
                        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-sys-error px-2 text-[11px] font-bold text-white">
                            {unreadCount}
                        </span>
                    )}
                </div>
                <button
                    onClick={handleMarkAllRead}
                    disabled={unreadCount === 0}
                    className="inline-flex items-center gap-2 rounded-xl border border-sys-border bg-sys-bg-secondary px-4 py-2.5 text-sm font-medium text-sys-text-primary transition-colors hover:bg-sys-bg-tertiary disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <span className="material-icons-round text-[16px]">done_all</span>
                    Mark All Read
                </button>
            </motion.div>

            {/* Filter Tabs */}
            <motion.div variants={fadeUp} className="mt-6 flex flex-wrap gap-2">
                {(["All", "critical", "warning", "info"] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12px] font-semibold transition-all ${filter === f
                            ? f === "All"
                                ? "bg-sys-accent text-white shadow-sm"
                                : `${severityConfig[f].bgClass} border`
                            : "border border-sys-border text-sys-text-secondary hover:border-sys-accent/30 hover:text-sys-text-primary"
                            }`}
                    >
                        {f !== "All" && <span className="material-icons-round text-[14px]">{severityConfig[f].icon}</span>}
                        {f === "All" ? "All" : severityConfig[f].label}
                        <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${filter === f ? "bg-white/20" : "bg-sys-bg-tertiary"}`}>
                            {counts[f]}
                        </span>
                    </button>
                ))}
            </motion.div>

            {/* Alert List */}
            <div className="mt-6 space-y-3">
                <AnimatePresence mode="popLayout">
                    {loading ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-sys-border bg-sys-bg-secondary p-12 text-center">
                            <p className="text-sm text-sys-text-secondary">Loading alerts…</p>
                        </motion.div>
                    ) : filtered.length > 0 ? (
                        filtered.map((alert) => {
                            const cfg = severityConfig[alert.severity];
                            return (
                                <motion.div
                                    key={alert.id}
                                    layout
                                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                                    className={`rounded-2xl border bg-sys-bg-secondary p-5 transition-all hover:shadow-md ${alert.is_read ? "border-sys-border/60 opacity-70" : "border-sys-border"
                                        }`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div
                                            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                                            style={{ background: `color-mix(in srgb, ${cfg.color} 12%, transparent)` }}
                                        >
                                            <span className="material-icons-round text-[18px]" style={{ color: cfg.color }}>
                                                {cfg.icon}
                                            </span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-[14px] font-semibold text-sys-text-primary">{alert.title}</h3>
                                                {!alert.is_read && (
                                                    <span className="h-2 w-2 rounded-full bg-sys-accent" />
                                                )}
                                            </div>
                                            <p className="mt-1 text-[13px] leading-relaxed text-sys-text-secondary">{alert.message}</p>
                                            <div className="mt-3 flex items-center gap-3">
                                                <span
                                                    className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                                                    style={{
                                                        borderColor: `color-mix(in srgb, ${cfg.color} 30%, transparent)`,
                                                        background: `color-mix(in srgb, ${cfg.color} 8%, transparent)`,
                                                        color: cfg.color,
                                                    }}
                                                >
                                                    {alert.severity}
                                                </span>
                                                <span className="text-[11px] text-sys-text-secondary">{timeAgo(alert.created_at)}</span>
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 gap-1">
                                            {!alert.is_read && (
                                                <button
                                                    onClick={() => handleMarkRead(alert.id)}
                                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-sys-text-secondary transition-colors hover:bg-sys-bg-tertiary hover:text-sys-text-primary"
                                                    title="Mark as read"
                                                >
                                                    <span className="material-icons-round text-[16px]">done</span>
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDismiss(alert.id)}
                                                className="flex h-8 w-8 items-center justify-center rounded-lg text-sys-text-secondary transition-colors hover:bg-sys-error/10 hover:text-sys-error"
                                                title="Dismiss"
                                            >
                                                <span className="material-icons-round text-[16px]">close</span>
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="rounded-2xl border border-sys-border bg-sys-bg-secondary p-12 text-center"
                        >
                            <span className="material-icons-round text-[48px] text-sys-text-secondary/30">notifications_none</span>
                            <p className="mt-3 text-sm text-sys-text-secondary">No alerts matching this filter.</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
