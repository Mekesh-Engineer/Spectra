import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { InspectionRow } from "@shared/types";
import { useDashboardStats, fetchRecentInspections } from "@/hooks/useFirebaseData";
import { useUserStore } from "@/store/userStore";

// ─── Quick Links (static) ────────────────────────────────────────────────────
const quickLinks = [
    { to: "/dashboard/inspect", label: "Start Inspection", description: "Launch live camera feed with AI detection", icon: "play_circle", gradient: "linear-gradient(135deg, var(--sys-accent), var(--sys-accent-dark))" },
    { to: "/dashboard/analytics", label: "View Analytics", description: "Charts, trends, and performance KPIs", icon: "analytics", gradient: "linear-gradient(135deg, var(--sys-info), #1d4ed8)" },
    { to: "/dashboard/inventory", label: "Manage Inventory", description: "Track measured rods and pipes", icon: "inventory_2", gradient: "linear-gradient(135deg, var(--sys-success), #047857)" },
];

// ─── Animation Variants ──────────────────────────────────────────────────────
const container = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] } },
};

// ─── Custom Tooltip ──────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
        <div
            className="rounded-xl border border-sys-border px-4 py-3 shadow-xl"
            style={{ background: "var(--sys-bg-primary)" }}
        >
            <p className="text-[12px] font-semibold text-sys-text-primary">{label}</p>
            {payload.map((p) => (
                <p key={p.name} className="text-[11px] text-sys-text-secondary">
                    {p.name}: <span className="font-semibold text-sys-text-primary">{p.value}</span>
                </p>
            ))}
        </div>
    );
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

function buildChartData(inspections: InspectionRow[]) {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const map = new Map<string, { inspections: number; defects: number }>();
    for (const d of days) map.set(d, { inspections: 0, defects: 0 });
    for (const insp of inspections) {
        const day = days[new Date(insp.created_at).getDay()];
        const entry = map.get(day)!;
        entry.inspections += 1;
        entry.defects += insp.fail_count;
    }
    return days.map((day) => ({ day, ...map.get(day)! }));
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function DashboardPage() {
    const { user } = useUserStore();
    const effectiveUserId = user?.id ?? (import.meta.env.VITE_AUTH_REQUIRED === "false" ? (import.meta.env.VITE_GUEST_USER_ID || "anonymous") : undefined);
    const { stats, loading: statsLoading } = useDashboardStats();
    const [chartData, setChartData] = useState<{ day: string; inspections: number; defects: number }[]>([]);
    const [recentInspections, setRecentInspections] = useState<InspectionRow[]>([]);
    const [recentLoading, setRecentLoading] = useState(true);

    const loading = statsLoading || recentLoading;

    useEffect(() => {
        if (!effectiveUserId) return;
        let mounted = true;
        async function load() {
            try {
                const recent = await fetchRecentInspections(effectiveUserId, 7);
                if (!mounted) return;
                setRecentInspections(recent.slice(0, 5) as unknown as InspectionRow[]);
                setChartData(buildChartData(recent as unknown as InspectionRow[]));
            } catch (err) {
                console.error("Failed to fetch recent inspections:", err);
            } finally {
                if (mounted) setRecentLoading(false);
            }
        }
        load();
        return () => { mounted = false; };
    }, [effectiveUserId]);

    const statsCards = [
        { title: "Total Inspections", value: String(stats?.totalInspections || 0), delta: "", icon: "assignment", color: "var(--sys-accent)" },
        { title: "Active Cameras", value: String(stats?.activeCameras || 0), delta: "Online", icon: "videocam", color: "var(--sys-info)" },
        { title: "Open Alerts", value: String(stats?.openAlerts || 0), delta: "", icon: "notifications_active", color: "var(--sys-warning)" },
        { title: "Pass Rate", value: stats?.passRate || "0.0%", delta: "", icon: "verified", color: "var(--sys-success)" },
    ];

    const recentActivity = recentInspections.map((insp) => ({
        id: insp.id,
        action: `Inspection ${insp.status}`,
        detail: `${insp.batch_id ? `Batch ${insp.batch_id} — ` : ""}${insp.total_objects} objects, ${insp.fail_count} defects`,
        time: timeAgo(insp.created_at),
        icon: insp.status === "completed" ? "check_circle" : insp.status === "error" ? "error" : "pending",
        color: insp.status === "completed" ? "var(--sys-success)" : insp.status === "error" ? "var(--sys-error)" : "var(--sys-warning)",
    }));

    return (
        <motion.div
            className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
            variants={container}
            initial="hidden"
            animate="visible"
        >
            {/* Page Header */}
            <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-sys-text-primary">Dashboard</h1>
                    <p className="mt-1 text-sm text-sys-text-secondary">
                        Overview of your inspection system performance.
                    </p>
                </div>
                <Link
                    to="/dashboard/inspect"
                    className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all hover:shadow-lg"
                    style={{
                        background: "linear-gradient(135deg, var(--sys-accent) 0%, var(--sys-accent-dark) 100%)",
                        boxShadow: "0 2px 10px color-mix(in srgb, var(--sys-accent) 35%, transparent)",
                    }}
                >
                    <span className="material-icons-round text-[18px]">play_circle</span>
                    New Inspection
                </Link>
            </motion.div>

            {/* Stat Cards */}
            <motion.div
                variants={container}
                className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
                {statsCards.map((card) => (
                    <motion.div
                        key={card.title}
                        variants={fadeUp}
                        whileHover={{ y: -2, transition: { duration: 0.2 } }}
                        className="group rounded-2xl border border-sys-border bg-sys-bg-secondary p-5 transition-colors hover:border-sys-accent/30"
                    >
                        <div className="flex items-center justify-between">
                            <p className="text-[13px] font-medium text-sys-text-secondary">{card.title}</p>
                            <div
                                className="flex h-9 w-9 items-center justify-center rounded-xl transition-transform group-hover:scale-110"
                                style={{ background: `color-mix(in srgb, ${card.color} 12%, transparent)` }}
                            >
                                <span className="material-icons-round text-[18px]" style={{ color: card.color }}>
                                    {card.icon}
                                </span>
                            </div>
                        </div>
                        {loading ? (
                            <div className="mt-3 h-9 w-20 animate-pulse rounded-md bg-sys-border"></div>
                        ) : (
                            <p className="mt-3 text-3xl font-bold tracking-tight text-sys-text-primary">
                                {card.value}
                            </p>
                        )}
                        {card.delta && (
                            <p className="mt-1 text-[12px] font-medium" style={{ color: card.color }}>
                                {card.delta}
                            </p>
                        )}
                    </motion.div>
                ))}
            </motion.div>

            {/* Area Chart */}
            <motion.div
                variants={fadeUp}
                className="mt-8 min-w-0 rounded-2xl border border-sys-border bg-sys-bg-secondary p-6"
            >
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-sys-text-primary">Inspections This Week</h2>
                        <p className="mt-0.5 text-[13px] text-sys-text-secondary">Daily inspection count vs defects</p>
                    </div>
                    <div className="flex items-center gap-4 text-[12px]">
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "var(--sys-accent)" }} />
                            Inspections
                        </span>
                        <span className="flex items-center gap-1.5 text-sys-text-secondary">
                            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "var(--sys-warning)" }} />
                            Defects
                        </span>
                    </div>
                </div>
                <div className="h-64 w-full min-w-0 min-h-[256px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="gradientInsp" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--sys-accent)" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="var(--sys-accent)" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gradientDefects" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--sys-warning)" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="var(--sys-warning)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="var(--sys-border)"
                                vertical={false}
                            />
                            <XAxis
                                dataKey="day"
                                tick={{ fontSize: 12, fill: "var(--sys-text-secondary)" }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 12, fill: "var(--sys-text-secondary)" }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip content={<ChartTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="inspections"
                                name="Inspections"
                                stroke="var(--sys-accent)"
                                strokeWidth={2}
                                fill="url(#gradientInsp)"
                            />
                            <Area
                                type="monotone"
                                dataKey="defects"
                                name="Defects"
                                stroke="var(--sys-warning)"
                                strokeWidth={2}
                                fill="url(#gradientDefects)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>

            {/* Quick Actions + Recent Activity */}
            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-5">
                {/* Quick Actions */}
                <motion.div variants={fadeUp} className="lg:col-span-2 space-y-3">
                    <h2 className="text-lg font-semibold text-sys-text-primary">Quick Actions</h2>
                    {quickLinks.map((link) => (
                        <Link
                            key={link.to}
                            to={link.to}
                            className="group flex items-center gap-4 rounded-2xl border border-sys-border bg-sys-bg-secondary p-4 transition-all hover:border-sys-accent/30 hover:shadow-md"
                        >
                            <div
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white transition-transform group-hover:scale-105"
                                style={{ background: link.gradient }}
                            >
                                <span className="material-icons-round text-[20px]">{link.icon}</span>
                            </div>
                            <div>
                                <p className="text-[14px] font-semibold text-sys-text-primary">{link.label}</p>
                                <p className="mt-0.5 text-[12px] text-sys-text-secondary">{link.description}</p>
                            </div>
                            <span className="material-icons-round ml-auto text-[18px] text-sys-text-secondary opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100">
                                arrow_forward
                            </span>
                        </Link>
                    ))}
                </motion.div>

                {/* Recent Activity */}
                <motion.div variants={fadeUp} className="lg:col-span-3">
                    <h2 className="text-lg font-semibold text-sys-text-primary">Recent Activity</h2>
                    <div className="mt-3 rounded-2xl border border-sys-border bg-sys-bg-secondary">
                        {recentActivity.length > 0 ? recentActivity.map((item, i) => (
                            <div
                                key={item.id}
                                className={`flex items-start gap-3 px-5 py-4 transition-colors hover:bg-sys-bg-tertiary/50 ${i < recentActivity.length - 1 ? "border-b border-sys-border/60" : ""
                                    }`}
                            >
                                <div
                                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                                    style={{ background: `color-mix(in srgb, ${item.color} 12%, transparent)` }}
                                >
                                    <span className="material-icons-round text-[16px]" style={{ color: item.color }}>
                                        {item.icon}
                                    </span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[13px] font-semibold text-sys-text-primary">{item.action}</p>
                                    <p className="mt-0.5 text-[12px] leading-relaxed text-sys-text-secondary">{item.detail}</p>
                                </div>
                                <span className="shrink-0 text-[11px] text-sys-text-secondary">{item.time}</span>
                            </div>
                        )) : (
                            <div className="px-5 py-8 text-center text-sm text-sys-text-secondary">
                                No recent inspections. Start your first inspection to see activity here.
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}
